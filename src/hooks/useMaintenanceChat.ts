"use client";

import { useCallback, useRef, useState } from "react";
import {
  maintenanceAiChatTurn,
  createMaintenanceTicket,
  type AiSummaryState,
  type MaintenanceTicket,
} from "@/lib/api/resident";
import { ApiClientError } from "@/lib/apiClient";
import { deriveReportFields, diffNewlyCollected, type UnderstoodItem } from "@/lib/maintenanceReport";

export type ChatRole = "ai" | "user";

export interface ChatMessageData {
  id: string;
  role: ChatRole;
  text: string;
  isError?: boolean;
  understood?: UnderstoodItem[];
}

export interface ChatAttachment {
  file: File;
  previewUrl: string;
}

export type WorkspacePhase = "empty" | "conversation" | "review" | "success";

export interface RequestDraft {
  subject: string;
  category: string;
  location: string;
  description: string;
  urgency: string;
  preferredDate: string;
}

const FALLBACK_MESSAGE =
  "I couldn't reach the assistant right now. You can still continue by completing the maintenance request manually.";

const MAX_ATTACHMENTS = 4;

/**
 * Dev-only fixtures so the review/success layouts can be inspected without a live AI backend.
 * Never reachable in production — gated both here and at the trigger UI (DevPreviewBar).
 */
const PREVIEW_SUMMARY: AiSummaryState = {
  category: "Plumbing",
  urgency_level: "High",
  subject: "Kitchen sink leaking steadily",
  location: "Kitchen, under the sink",
  gathered_detail:
    "The kitchen sink has been leaking steadily since this morning, with water pooling under the cabinet.",
  confidence_score: 0.93,
};

const PREVIEW_TICKET: MaintenanceTicket = {
  id: 8492,
  subject: "Kitchen sink leaking steadily",
  category: "Plumbing",
  priority_level: "High",
  detailed_description:
    "The kitchen sink has been leaking steadily since this morning, with water pooling under the cabinet. (Location: Kitchen, under the sink)",
  status: "Submitted",
  created_at: new Date().toISOString(),
};

export function useMaintenanceChat() {
  const [phase, setPhase] = useState<WorkspacePhase>("empty");
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [summaryState, setSummaryState] = useState<AiSummaryState | null>(null);
  const [suggestedOptions, setSuggestedOptions] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);

  const [draft, setDraft] = useState<RequestDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedTicket, setSubmittedTicket] = useState<MaintenanceTicket | null>(null);

  const lastFieldsRef = useRef(deriveReportFields(null, false));

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setPhase((p) => (p === "empty" ? "conversation" : p));
      setInput("");
      setSuggestedOptions([]);
      setMessages((prev) => [...prev, { id: `${Date.now()}-u`, role: "user", text: trimmed }]);
      setLoading(true);

      try {
        const result = await maintenanceAiChatTurn(trimmed, sessionId);
        setSessionId(result.session_id);
        setSummaryState(result.summary_state);
        setSuggestedOptions(result.suggested_options);
        setIsComplete(result.is_complete);

        const nextFields = deriveReportFields(result.summary_state, result.is_complete);
        const understood = diffNewlyCollected(lastFieldsRef.current, nextFields);
        lastFieldsRef.current = nextFields;

        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-a`, role: "ai", text: result.reply_message, understood },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-a`, role: "ai", text: FALLBACK_MESSAGE, isError: true },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, sessionId]
  );

  const sendMessage = useCallback(() => {
    void sendText(input);
  }, [input, sendText]);

  const sendSuggestedOption = useCallback(
    (text: string) => {
      void sendText(text);
    },
    [sendText]
  );

  const pickSuggestion = useCallback((text: string) => {
    setInput(text);
  }, []);

  const attachImage = useCallback((file: File) => {
    setAttachments((prev) => {
      if (prev.length >= MAX_ATTACHMENTS) return prev;
      return [...prev, { file, previewUrl: URL.createObjectURL(file) }];
    });
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const beginReview = useCallback(() => {
    setDraft({
      subject: summaryState?.subject ?? "",
      category: summaryState?.category ?? "",
      location: summaryState?.location ?? "",
      description: summaryState?.gathered_detail ?? "",
      urgency: summaryState?.urgency_level ?? "Medium",
      preferredDate: "",
    });
    setSubmitError("");
    setPhase("review");
  }, [summaryState]);

  const backToConversation = useCallback(() => {
    setPhase("conversation");
  }, []);

  const updateDraft = useCallback((patch: Partial<RequestDraft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }, []);

  /** Dev-only: jump straight to the review or success layout using fixture data. */
  const previewPhase = useCallback((target: "review" | "success") => {
    if (process.env.NODE_ENV === "production") return;

    if (target === "review") {
      setSummaryState(PREVIEW_SUMMARY);
      setIsComplete(true);
      setDraft({
        subject: PREVIEW_SUMMARY.subject ?? "",
        category: PREVIEW_SUMMARY.category ?? "",
        location: PREVIEW_SUMMARY.location ?? "",
        description: PREVIEW_SUMMARY.gathered_detail ?? "",
        urgency: PREVIEW_SUMMARY.urgency_level ?? "Medium",
        preferredDate: "",
      });
      setSubmitError("");
      setPhase("review");
    } else {
      setSubmittedTicket(PREVIEW_TICKET);
      setPhase("success");
    }
  }, []);

  const submitRequest = useCallback(async () => {
    if (!draft || submitting) return;
    setSubmitting(true);
    setSubmitError("");

    const description = draft.location
      ? `${draft.description} (Location: ${draft.location})`.trim()
      : draft.description;

    try {
      const ticket = await createMaintenanceTicket({
        subject: draft.subject || "Maintenance Request",
        category: draft.category || "Other",
        priority_level: draft.urgency || "Medium",
        detailed_description: description,
        preferred_date: draft.preferredDate || undefined,
        images: attachments.map((a) => a.file),
      });
      setSubmittedTicket(ticket);
      setPhase("success");
    } catch (err) {
      setSubmitError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to submit request."
      );
    } finally {
      setSubmitting(false);
    }
  }, [draft, attachments, submitting]);

  return {
    phase,
    messages,
    input,
    setInput,
    summaryState,
    suggestedOptions,
    isComplete,
    loading,
    attachments,
    sendMessage,
    sendSuggestedOption,
    pickSuggestion,
    attachImage,
    removeAttachment,
    draft,
    beginReview,
    backToConversation,
    updateDraft,
    submitting,
    submitError,
    submittedTicket,
    submitRequest,
    previewPhase,
    maxAttachments: MAX_ATTACHMENTS,
  };
}

export type UseMaintenanceChatResult = ReturnType<typeof useMaintenanceChat>;
