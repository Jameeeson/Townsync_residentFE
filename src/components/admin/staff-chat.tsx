"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { parseServerDate } from "@/lib/datetime";
import styles from "./staff-chat.module.css";

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

const POLL_MS = 4000;
const MAX_LENGTH = 2000;

function timeLabel(value: string): string {
  const d = parseServerDate(value);
  if (!d) return "";
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * The admin team's conversation with one staff/maintenance account. Polls for
 * new messages while open; opening it marks the staff member's messages read.
 */
export function StaffChat({
  staffUserId,
  onActivity,
  autoFocus = false,
}: {
  staffUserId: number;
  /** Called after messages are read or sent, so a parent can refresh unread counts. */
  onActivity?: () => void;
  autoFocus?: boolean;
}) {
  const [thread, setThread] = useState<StaffThread | null>(null);
  const [messages, setMessages] = useState<StaffChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const lastId = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
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
        const data = await apiGet<StaffThread>(
          `/api/v1/admin/staff-messages/${staffUserId}?after_id=${lastId.current}`,
        );
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

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

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

  return (
    <div className={styles.chat}>
      <div className={styles.messages} ref={listRef} aria-live="polite">
        {!thread && !error ? <p className={styles.empty}>Loading conversation…</p> : null}
        {thread && messages.length === 0 ? (
          <div className={styles.empty}>
            <MessageSquare size={22} aria-hidden="true" />
            <p>
              No messages with {thread.staff_name} yet. Anything you send appears in their staff portal under
              Messages.
            </p>
          </div>
        ) : null}
        {messages.map((m) => (
          <div key={m.id} className={`${styles.bubbleRow} ${m.sender_side === "admin" ? styles.mine : ""}`}>
            <div className={styles.bubble}>
              <p>{m.body}</p>
              <span>
                {m.sender_name} · {timeLabel(m.created_at)}
              </span>
            </div>
          </div>
        ))}
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          value={draft}
          maxLength={MAX_LENGTH}
          rows={2}
          placeholder={thread ? `Message ${thread.staff_name}…` : "Write a message…"}
          aria-label="Message"
          autoFocus={autoFocus}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message">
          <Send size={16} />
        </button>
      </form>
    </div>
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-chat-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.dialogHead}>
          <div>
            <h2 id="staff-chat-title">{staffName}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className={styles.closeBtn} aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <StaffChat staffUserId={staffUserId} autoFocus />
      </div>
    </div>
  );
}
