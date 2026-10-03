"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconChatBubble, IconSend } from "@/components/icons";
import { ApiError } from "@/lib/api-client";
import { parseServerDate } from "@/lib/datetime";
import { getAdminThread, sendAdminMessage, type AdminChatMessage } from "@/lib/services/staff";
import styles from "./messages.module.css";

const POLL_MS = 4000;
const MAX_LENGTH = 2000;

function timeLabel(value: string): string {
  const d = parseServerDate(value);
  if (!d) return "";
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** The staff member's conversation with the admin team. */
export default function StaffMessagesPage() {
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const lastId = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  const append = useCallback((incoming: AdminChatMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const merged = [...prev, ...incoming.filter((m) => !seen.has(m.id))];
      lastId.current = merged.length ? merged[merged.length - 1].id : 0;
      return merged;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await getAdminThread(lastId.current);
        if (cancelled) return;
        append(data.messages);
        setLoaded(true);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Could not load messages.");
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [append]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      append([await sendAdminMessage(body)]);
      setDraft("");
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not send the message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Messages</p>
        <h1>Admin Team</h1>
        <p className={styles.lede}>
          Ask about access, shifts, schedules or a job. Any administrator on duty can reply here.
        </p>
      </header>

      <section className={styles.chat} aria-label="Conversation with the admin team">
        <div className={styles.messages} ref={listRef} aria-live="polite">
          {!loaded && !error ? <p className={styles.empty}>Loading messages…</p> : null}
          {loaded && messages.length === 0 ? (
            <div className={styles.empty}>
              <IconChatBubble size={26} />
              <p>No messages yet. Send the admin team a message and their reply will appear here.</p>
            </div>
          ) : null}
          {messages.map((m) => (
            <div key={m.id} className={`${styles.row} ${m.sender_side === "staff" ? styles.mine : ""}`}>
              <div className={styles.bubble}>
                <p>{m.body}</p>
                <span>
                  {m.sender_side === "staff" ? "You" : m.sender_name} · {timeLabel(m.created_at)}
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
            rows={2}
            maxLength={MAX_LENGTH}
            placeholder="Write a message to the admin team…"
            aria-label="Message"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message">
            <IconSend size={18} />
          </button>
        </form>
      </section>
    </div>
  );
}
