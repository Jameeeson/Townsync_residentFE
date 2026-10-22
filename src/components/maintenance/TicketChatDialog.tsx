"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiClientError } from "@/lib/apiClient";
import { getTicketChat, sendTicketChatMessage, type TicketChatMessage, type TicketChatThread } from "@/lib/api/resident";
import { parseServerDate } from "@/lib/datetime";
import { ChatDialog } from "@/components/chat-kit/ChatDialog";
import { IconChat } from "@/components/chat-kit/ChatIcons";
import { ChatPanel } from "@/components/chat-kit/ChatPanel";
import { ChatQuickReplies } from "@/components/chat-kit/ChatStream";
import type { ChatLine } from "@/components/chat-kit/chatKit";

const POLL_MS = 4000;

const STARTERS = [
  "When is the technician coming?",
  "I want to add more details.",
  "Can the visit be moved to another day?",
];

type Props = {
  ticketId: number;
  onClose: () => void;
};

/** The resident's view: their own messages on the right; management is a team ("Management"), a technician is named. */
function toLine(message: TicketChatMessage, index: number): ChatLine {
  const base = { key: `${message.timestamp}-${index}`, text: message.content, at: parseServerDate(message.timestamp) };
  if (message.sender_role === "Resident") return { ...base, side: "mine", name: "You", badge: null };
  if (/admin/i.test(message.sender_role) || message.sender_name === "Property Admin") {
    return { ...base, side: "theirs", name: "Management", badge: "Management" };
  }
  return { ...base, side: "theirs", name: message.sender_name, badge: "Technician" };
}

export default function TicketChatDialog({ ticketId, onClose }: Props) {
  const [thread, setThread] = useState<TicketChatThread | null>(null);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (document.hidden) return;
      try {
        const data = await getTicketChat(ticketId);
        if (!cancelled) {
          setThread(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : "Could not load the conversation.");
      }
    }
    void load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ticketId]);

  const lines = useMemo(() => (thread?.messages ?? []).map(toLine), [thread?.messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput("");
    try {
      setThread(await sendTicketChatMessage(ticketId, trimmed));
      setError("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : "Could not send your message.");
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  }

  const technician = thread?.staff_assigned ? thread.staff_name : null;

  return (
    <ChatDialog onClose={onClose} label="Messages about your request">
      <ChatPanel
        variant="dialog"
        label="Conversation about your request"
        header={{
          avatar: <IconChat size={20} />,
          title: technician ? `Management and ${technician}` : "Management",
          subtitle: `Ticket #${ticketId}${thread ? ` · ${thread.subject}` : ""}`,
          onClose,
        }}
        notice={thread && !thread.staff_assigned ? "No technician is assigned right now. Management sees your messages and will pass them on." : null}
        lines={lines}
        ready={Boolean(thread)}
        error={error}
        empty={
          <>
            <p>
              <strong>Start the conversation</strong>
            </p>
            <p>Ask a question or add details. Management replies here, and the technician joins once one is assigned.</p>
            <ChatQuickReplies items={STARTERS} onPick={(text) => void send(text)} disabled={sending} />
          </>
        }
        input={input}
        onInput={setInput}
        onSend={() => void send(input)}
        placeholder="Write a message"
        sending={sending}
        readOnly={Boolean(thread?.read_only)}
        autoFocus
      />
    </ChatDialog>
  );
}
