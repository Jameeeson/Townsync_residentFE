"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel } from "@/components/chat-kit/ChatPanel";
import { IconChat } from "@/components/chat-kit/ChatIcons";
import type { ChatLine } from "@/components/chat-kit/chatKit";
import { ApiError } from "@/lib/api-client";
import { parseServerDate } from "@/lib/datetime";
import { getAdminThread, sendAdminMessage, type AdminChatMessage } from "@/lib/services/staff";
import styles from "./messages.module.css";

const POLL_MS = 4000;

/** The staff member's conversation with the admin team. */
export default function StaffMessagesPage() {
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const lastId = useRef(0);

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

  // The staff member's view: their own messages on the right, the admin team named on the left.
  const lines = useMemo<ChatLine[]>(
    () =>
      messages.map((m) => ({
        key: String(m.id),
        side: m.sender_side === "staff" ? "mine" : "theirs",
        name: m.sender_side === "staff" ? "You" : m.sender_name,
        badge: m.sender_side === "staff" ? null : "Management",
        text: m.body,
        at: parseServerDate(m.created_at),
      })),
    [messages],
  );

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

      <ChatPanel
        variant="pane"
        label="Conversation with the admin team"
        header={{ avatar: <IconChat size={20} />, title: "Admin Team", subtitle: "Any administrator on duty can reply here" }}
        lines={lines}
        ready={loaded || Boolean(error)}
        error={error}
        empty={<p>No messages yet. Send the admin team a message and their reply will appear here.</p>}
        input={draft}
        onInput={setDraft}
        onSend={() => void send()}
        placeholder="Write a message to the admin team"
        sending={sending}
      />
    </div>
  );
}
