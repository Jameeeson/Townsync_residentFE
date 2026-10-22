"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { parseServerDate } from "@/lib/datetime";
import { ChatDialog } from "@/components/chat-kit/ChatDialog";
import { ChatPanel } from "@/components/chat-kit/ChatPanel";
import { initialsOf, type ChatLine } from "@/components/chat-kit/chatKit";

export type StaffChatMessage = {
  id: number;
  body: string;
  sender_side: "admin" | "staff";
  sender_name: string;
  created_at: string;
};

type StaffThread = {
  staff_user_id: number;
  staff_name: string;
  staff_email: string;
  staff_type: string | null;
  messages: StaffChatMessage[];
  unread: number;
};

type ChatHeaderOptions = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Show the back button only on narrow screens (the list and the conversation take turns there). */
  backOnNarrowOnly?: boolean;
  onClose?: () => void;
};

const POLL_MS = 4000;

/**
 * The admin team's conversation with one staff/maintenance account. Polls for
 * new messages while open; opening it marks the staff member's messages read.
 */
export function StaffChat({
  staffUserId,
  onActivity,
  autoFocus = false,
  header,
  variant = "fill",
}: {
  staffUserId: number;
  /** Called after messages are read or sent, so a parent can refresh unread counts. */
  onActivity?: () => void;
  autoFocus?: boolean;
  header?: ChatHeaderOptions;
  variant?: "pane" | "dialog" | "fill";
}) {
  const [thread, setThread] = useState<StaffThread | null>(null);
  const [messages, setMessages] = useState<StaffChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const lastId = useRef(0);
  const onActivityRef = useRef(onActivity);
  useEffect(() => {
    onActivityRef.current = onActivity;
  }, [onActivity]);

  const append = useCallback((incoming: StaffChatMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const merged = [...prev, ...incoming.filter((m) => !seen.has(m.id))];
      lastId.current = merged.length ? merged[merged.length - 1].id : 0;
      return merged;
    });
  }, []);

  useEffect(() => {
    // Render this component with key={staffUserId} so switching staff starts clean.
    let cancelled = false;
    lastId.current = 0;

    const poll = async (initial: boolean) => {
      try {
        const data = await apiGet<StaffThread>(`/api/v1/admin/staff-messages/${staffUserId}?after_id=${lastId.current}`);
        if (cancelled) return;
        if (initial) setThread(data);
        append(data.messages);
        setError(null);
        if (initial || data.messages.length) onActivityRef.current?.();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load messages.");
      }
    };

    void poll(true);
    const timer = window.setInterval(() => void poll(false), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [staffUserId, append]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const saved = await apiPost<StaffChatMessage>(`/api/v1/admin/staff-messages/${staffUserId}`, { body });
      append([saved]);
      setDraft("");
      onActivityRef.current?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the message.");
    } finally {
      setSending(false);
    }
  };

  // The administrator's view: the admin team on the right, the staff member named on the left.
  const staffBadge = thread?.staff_type ?? "Staff";
  const lines = useMemo<ChatLine[]>(
    () =>
      messages.map((m) => ({
        key: String(m.id),
        side: m.sender_side === "admin" ? "mine" : "theirs",
        name: m.sender_side === "admin" ? "Management" : m.sender_name,
        badge: m.sender_side === "admin" ? null : staffBadge,
        text: m.body,
        at: parseServerDate(m.created_at),
      })),
    [messages, staffBadge],
  );

  const staffName = thread?.staff_name ?? header?.title ?? "staff";

  return (
    <ChatPanel
      variant={variant}
      label={`Conversation with ${staffName}`}
      header={
        header
          ? {
              avatar: initialsOf(header.title),
              title: header.title,
              subtitle: header.subtitle,
              onBack: header.onBack,
              backOnNarrowOnly: header.backOnNarrowOnly,
              onClose: header.onClose,
            }
          : undefined
      }
      lines={lines}
      ready={Boolean(thread) || Boolean(error)}
      error={error}
      empty={
        <p>
          No messages with {thread?.staff_name ?? "this person"} yet. Anything you send appears in their staff portal under Messages.
        </p>
      }
      input={draft}
      onInput={setDraft}
      onSend={() => void send()}
      placeholder={thread ? `Message ${thread.staff_name}` : "Write a message"}
      sending={sending}
      autoFocus={autoFocus}
    />
  );
}

/** StaffChat in a dialog, for "Contact" / "Message" buttons. */
export function StaffChatModal({
  staffUserId,
  staffName,
  subtitle,
  onClose,
}: {
  staffUserId: number;
  staffName: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <ChatDialog onClose={onClose} label={`Conversation with ${staffName}`}>
      <StaffChat staffUserId={staffUserId} autoFocus variant="dialog" header={{ title: staffName, subtitle, onClose }} />
    </ChatDialog>
  );
}
