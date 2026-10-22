"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { getTicketChat, sendTicketChatMessage, type TicketChatThread } from "@/lib/chat";
import { ChatDialog } from "@/components/chat-kit/ChatDialog";
import TicketChatPane from "@/components/admin/ticket-chat-pane";

const POLL_MS = 4000;

/**
 * The ticket conversation as a pop-up, for tickets that are no longer in the dispatch lists but still take messages
 * (a Resolved ticket waiting for the resident). Closed and cancelled tickets show the history and stop taking messages.
 */
export default function TicketChatDialog({
  ticketId,
  residentName,
  residentUnit,
  request,
  onClose,
}: {
  ticketId: number;
  residentName: string;
  residentUnit: string;
  request: { text: string; filedAt: string | null };
  onClose: () => void;
}) {
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
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Could not load the conversation.");
      }
    }
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ticketId]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      setThread(await sendTicketChatMessage(ticketId, text));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not send the message.");
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, sending, ticketId]);

  return (
    <ChatDialog onClose={onClose} label={`Conversation with ${residentName}`}>
      <TicketChatPane
        variant="dialog"
        residentName={residentName}
        residentUnit={residentUnit}
        request={request}
        thread={thread}
        error={error}
        input={input}
        sending={sending}
        onInput={setInput}
        onSend={() => void send()}
        onBack={onClose}
      />
    </ChatDialog>
  );
}
