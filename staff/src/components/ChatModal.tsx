"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { parseServerDate } from "@/lib/datetime";
import { getTicketChat, sendTicketChatMessage, type TicketChatThread } from "@/lib/services/staff";
import { ChatDialog } from "@/components/chat-kit/ChatDialog";
import { ChatPanel } from "@/components/chat-kit/ChatPanel";
import { initialsOf, type ChatLine } from "@/components/chat-kit/chatKit";

const POLL_INTERVAL_MS = 4000;

type Props = {
  ticketId: number;
  onClose: () => void;
};

type Message = TicketChatThread["messages"][number];

/** The technician's view: their own messages on the right; the resident and management are named. */
function toLine(message: Message, index: number): ChatLine {
  const base = { key: `${message.timestamp}-${index}`, text: message.content, at: parseServerDate(message.timestamp) };
  // Admin can also post in this thread, so "mine" is the staff or maintenance role only.
  if (message.sender_role === "Staff" || message.sender_role === "Maintenance") return { ...base, side: "mine", name: "You", badge: null };
  if (message.sender_role === "Resident") return { ...base, side: "theirs", name: message.sender_name, badge: "Resident" };
  return { ...base, side: "theirs", name: "Management", badge: "Management" };
}

export function ChatModal({ ticketId, onClose }: Props) {
  const [thread, setThread] = useState<TicketChatThread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getTicketChat(ticketId);
        if (!cancelled) {
          setThread(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Could not load conversation.");
      }
    }
    void load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ticketId]);

  const lines = useMemo(() => (thread?.messages ?? []).map(toLine), [thread?.messages]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput("");
    try {
      setThread(await sendTicketChatMessage(ticketId, trimmed));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not send message.");
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  }

  return (
    <ChatDialog onClose={onClose} label="Conversation about this task">
      <ChatPanel
        variant="dialog"
        label="Conversation about this task"
        header={{
          avatar: initialsOf(thread?.resident_name ?? "Resident"),
          title: thread ? thread.subject : "Conversation",
          subtitle: `Ticket #${ticketId}${thread ? ` · ${thread.resident_name}` : ""}`,
          onClose,
        }}
        lines={lines}
        ready={Boolean(thread)}
        error={error}
        empty={<p>No messages yet. Say hello to the resident.</p>}
        input={input}
        onInput={setInput}
        onSend={() => void handleSend()}
        placeholder={`Message ${(thread?.resident_name ?? "the resident").split(" ")[0]}`}
        sending={sending}
        readOnly={Boolean(thread?.read_only)}
        autoFocus
      />
    </ChatDialog>
  );
}

export default ChatModal;
