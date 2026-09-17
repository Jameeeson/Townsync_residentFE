"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { IconSend, IconX } from "@/components/icons";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { ApiError } from "@/lib/api-client";
import { getTicketChat, sendTicketChatMessage, type TicketChatThread } from "@/lib/services/staff";
import styles from "./ChatModal.module.css";

const POLL_INTERVAL_MS = 4000;

type Props = {
  ticketId: number;
  onClose: () => void;
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function ChatModal({ ticketId, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => onClose(), [onClose]);
  useDialogA11y(true, handleClose, modalRef);

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

    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ticketId]);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight });
  }, [thread?.messages.length]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setInput("");
    try {
      const data = await sendTicketChatMessage(ticketId, trimmed);
      setThread(data);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not send message.");
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSend(event as unknown as FormEvent);
    }
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={handleClose}>
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <h2 id="chat-modal-title">{thread ? thread.subject : "Conversation"}</h2>
            <p className={styles.subtitle}>
              Ticket #{ticketId}
              {thread ? ` · ${thread.resident_name}` : ""}
            </p>
          </div>
          <button type="button" className={styles.close} onClick={handleClose} aria-label="Close">
            <IconX size={20} />
          </button>
        </header>

        {error ? (
          <p className={styles.errorBanner} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.stream} ref={streamRef}>
          {!thread ? (
            <p className={styles.streamEmpty} aria-busy="true">
              Loading…
            </p>
          ) : thread.messages.length === 0 ? (
            <p className={styles.streamEmpty}>No messages yet. Say hello to the resident.</p>
          ) : (
            thread.messages.map((message, i) => {
              // Admin can also post in this thread, so "mine" must check for the
              // viewer's own role specifically — not just "anyone who isn't the resident".
              const mine = message.sender_role === "Staff" || message.sender_role === "Maintenance";
              return (
                <div
                  key={`${message.timestamp}-${i}`}
                  className={`${styles.moment} ${mine ? styles.momentMine : styles.momentTheirs}`}
                >
                  <div className={styles.momentLabel}>
                    {mine ? "You" : message.sender_name} · {formatTime(message.timestamp)}
                  </div>
                  <p className={styles.momentText}>{message.content}</p>
                </div>
              );
            })
          )}
        </div>

        <form className={styles.composerForm} onSubmit={handleSend}>
          <input
            className={styles.composerField}
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!thread || sending}
            aria-label="Message"
          />
          <button
            type="submit"
            className={styles.composerSendBtn}
            aria-label="Send message"
            disabled={!thread || sending || !input.trim()}
          >
            <IconSend size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatModal;
