"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "@/styles/chat.module.css";
import { ArrowLeft, ArrowUp, Phone } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { getTicketChat, sendTicketChatMessage, type TicketChatThread } from "@/lib/api/resident";

const POLL_INTERVAL_MS = 4000;

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function TicketMessaging() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const ticketId = idParam ? Number(idParam) : NaN;
  const hasTicket = Number.isFinite(ticketId);

  const [thread, setThread] = useState<TicketChatThread | null>(null);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasTicket) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await getTicketChat(ticketId);
        if (!cancelled) {
          setThread(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to load conversation."
          );
        }
      }
    }

    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [hasTicket, ticketId]);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight });
  }, [thread?.messages.length]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending || !hasTicket) return;

    setSending(true);
    setInput("");
    try {
      const data = await sendTicketChatMessage(ticketId, trimmed);
      setThread(data);
      setError("");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to send message."
      );
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

  const backHref = hasTicket ? `/resident/maintenance/ticket?id=${ticketId}` : "/resident/maintenance";

  if (!hasTicket) {
    return (
      <div className={styles.container}>
        <p className={styles.errorBanner} role="alert">
          Missing ticket id. Open messaging from a ticket.
        </p>
        <Link href="/resident/maintenance" className="ts-btn ts-btn-secondary">
          <ArrowLeft size={16} /> Back to maintenance
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Link href={backHref} aria-label="Back to ticket" className={styles.backLink}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className={styles.titleMain}>{thread ? thread.subject : "Messages"}</div>
            <div className={styles.titleSub}>
              Ticket #{ticketId}
              {thread?.staff_assigned ? ` · ${thread.staff_name}` : " · Not yet assigned"}
            </div>
          </div>
        </div>
      </header>

      {error ? (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      ) : null}

      {thread && !thread.staff_assigned ? (
        <p className={styles.noticeBanner}>
          No technician has been assigned to this request yet. Your message will be waiting for
          them once they are.
        </p>
      ) : null}

      <div className={styles.stream} ref={streamRef}>
        {!thread ? (
          <div className={styles.streamEmpty} aria-busy="true">
            <div className="ts-skeleton" style={{ width: "60%", height: 14, marginBottom: 10 }}>
              Loading
            </div>
            <div className="ts-skeleton" style={{ width: "40%", height: 14 }}>
              Loading
            </div>
          </div>
        ) : thread.messages.length === 0 ? (
          <div className={styles.streamEmpty}>
            <p>No messages yet. Say hello to get the conversation started.</p>
          </div>
        ) : (
          thread.messages.map((message, i) => {
            const mine = message.sender_role === "Resident";
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
        <div className={styles.composerWrapper}>
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
            <ArrowUp size={16} />
          </button>
        </div>
      </form>
      <p className={styles.composerHint}>
        For emergencies, please call the resident hotline instead of waiting on a reply.{" "}
        <a href="tel:+15550123456" className={styles.hotlineLink}>
          <Phone size={12} /> Call hotline
        </a>
      </p>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className={styles.container} aria-busy="true" />}>
      <TicketMessaging />
    </Suspense>
  );
}
