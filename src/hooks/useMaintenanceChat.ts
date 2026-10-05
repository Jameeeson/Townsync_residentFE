"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  maintenanceAiChatTurn,
  cancelMaintenanceChat,
  createMaintenanceTicket,
  sendTicketChatMessage,
  type AiSummaryState,
  type MaintenanceTicket,
} from "@/lib/api/resident";
import { ApiClientError } from "@/lib/apiClient";

export type ChatRole = "ai" | "user";

export interface ChatMessageData {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: string;
  isError?: boolean;
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
  entryPermission: boolean;
  entryNotes: string;
}

const FALLBACK_MESSAGE =
  "I couldn't reach the assistant right now. You can still continue by completing the maintenance request manually.";

const MAX_ATTACHMENTS = 4;

export function useMaintenanceChat() {
  const router = useRouter();
  const [phase, setPhase] = useState<WorkspacePhase>("empty");
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [summaryState, setSummaryState] = useState<AiSummaryState | null>(null);
  const [suggestedOptions, setSuggestedOptions] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);

  // "Talk to a person" escalation
  const [emergencyDetected, setEmergencyDetected] = useState(false);
  const [emergencyDismissed, setEmergencyDismissed] = useState(false);
  const [notHelpful, setNotHelpful] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [escalateError, setEscalateError] = useState("");

  const [draft, setDraft] = useState<RequestDraft | null>(null);
  const [draftStartedAt, setDraftStartedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedTicket, setSubmittedTicket] = useState<MaintenanceTicket | null>(null);

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setPhase((p) => (p === "empty" ? "conversation" : p));
      setInput("");
      setSuggestedOptions([]);
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-u`, role: "user", text: trimmed, timestamp: new Date().toISOString() },
      ]);
      setLoading(true);

      try {
        const result = await maintenanceAiChatTurn(trimmed, sessionId);
        setSessionId(result.session_id);
        setSummaryState(result.summary_state);
        setSuggestedOptions(result.suggested_options);
        setIsComplete(result.is_complete);
        // Follows the server every turn: when the conversation shows it was not an emergency, the banner goes
        // away, and a resident's dismissal is forgotten so a later, real alarm shows again.
        setEmergencyDetected(Boolean(result.emergency));
        if (!result.emergency) setEmergencyDismissed(false);

        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-a`,
            role: "ai",
            text: result.reply_message,
            timestamp: new Date().toISOString(),
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-a`,
            role: "ai",
            text: FALLBACK_MESSAGE,
            timestamp: new Date().toISOString(),
            isError: true,
          },
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
      entryPermission: false,
      entryNotes: "",
    });
    setDraftStartedAt(Date.now());
    setSubmitError("");
    setPhase("review");
  }, [summaryState]);

  const backToConversation = useCallback(() => {
    setPhase("conversation");
  }, []);

  const discardRequest = useCallback(() => {
    // Nothing is filed while chatting, so there is no ticket to cancel: the conversation is just
    // closed. Best-effort and not awaited: the resident expects an instant exit.
    if (sessionId) {
      cancelMaintenanceChat(sessionId).catch(() => {
        // ignored - nothing left in this flow to show the error on
      });
    }
    setDraft(null);
    setDraftStartedAt(null);
    setSubmitError("");
    setPhase("empty");
    setMessages([]);
    setSessionId(null);
    setSummaryState(null);
    setSuggestedOptions([]);
    setIsComplete(false);
    setEmergencyDetected(false);
    setEmergencyDismissed(false);
    setNotHelpful(false);
    setEscalateError("");
  }, [sessionId]);

  const updateDraft = useCallback((patch: Partial<RequestDraft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }, []);

  const submitRequest = useCallback(async () => {
    if (!draft || submitting) return;
    setSubmitting(true);
    setSubmitError("");

    let description = draft.location
      ? `${draft.description} (Location: ${draft.location})`.trim()
      : draft.description;
    if (draft.entryPermission) {
      description += ` (Entry permission granted if resident is not home${
        draft.entryNotes.trim() ? `: ${draft.entryNotes.trim()}` : "."
      })`;
    }

    try {
      const ticket = await createMaintenanceTicket({
        subject: draft.subject || "Maintenance Request",
        category: draft.category || "Other",
        priority_level: draft.urgency || "Medium",
        detailed_description: description,
        preferred_date: draft.preferredDate || undefined,
        session_id: sessionId,
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
  }, [draft, attachments, submitting, sessionId]);

  /** Hidden by default; the AI decides. The backend sets `emergency` when the
   * model flags `needs_human` (or a safety keyword matches). */
  const canTalkToPerson = useMemo(
    () => (emergencyDetected && !emergencyDismissed) || notHelpful,
    [emergencyDetected, emergencyDismissed, notHelpful],
  );
  const dismissEmergency = useCallback(() => {
    setEmergencyDismissed(true);
    setNotHelpful(false);
  }, []);

  const markNotHelpful = useCallback(() => {
    setNotHelpful(true);
  }, []);

  const escalateToHuman = useCallback(async () => {
    if (escalating) return;
    setEscalating(true);
    setEscalateError("");

    const gathered =
      summaryState?.gathered_detail ||
      messages.filter((m) => m.role === "user").map((m) => m.text).join(" ") ||
      "Resident requested a person before AI triage could gather full details.";
    const location = summaryState?.location;
    const description = [
      gathered,
      location ? `(Location: ${location})` : null,
      "Resident asked to speak with a person about this issue.",
    ]
      .filter(Boolean)
      .join(" ");

    try {
      const ticket = await createMaintenanceTicket({
        subject: summaryState?.subject || "Maintenance Request",
        category: summaryState?.category || "Other",
        priority_level: summaryState?.urgency_level || "Medium",
        detailed_description: description,
        human_requested: true,
        session_id: sessionId,
      });

      // Best-effort: seed the human thread with context so whoever picks it
      // up isn't starting from a blank chat. The ticket is already the
      // source of truth if this one post fails - the resident can still
      // type into the thread themselves once it opens.
      try {
        const opening = emergencyDetected
          ? `This may be an emergency: ${gathered}`
          : `I'd like to talk to someone about this: ${gathered}`;
        await sendTicketChatMessage(ticket.id, opening);
      } catch {
        // ignored - see comment above
      }

      router.push(`/resident/maintenance/chat?id=${ticket.id}`);
    } catch (err) {
      setEscalateError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not reach a person right now. Please try again."
      );
    } finally {
      setEscalating(false);
    }
  }, [escalating, summaryState, messages, emergencyDetected, sessionId, router]);

  return {
    phase,
    messages,
    input,
    setInput,
    sessionId,
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
    draftStartedAt,
    beginReview,
    backToConversation,
    discardRequest,
    updateDraft,
    submitting,
    submitError,
    submittedTicket,
    emergencyDetected: emergencyDetected && !emergencyDismissed,
    dismissEmergency,
    notHelpful,
    canTalkToPerson,
    markNotHelpful,
    escalating,
    escalateError,
    escalateToHuman,
    submitRequest,
    maxAttachments: MAX_ATTACHMENTS,
  };
}

export type UseMaintenanceChatResult = ReturnType<typeof useMaintenanceChat>;
