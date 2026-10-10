"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, HardHat, Headset, X } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { getTicketChat, sendTicketChatMessage, type TicketChatMessage, type TicketChatThread } from "@/lib/api/resident";
import { parseServerDate } from "@/lib/datetime";
import styles from "./ticketChatDialog.module.css";

const POLL_MS = 4000;
const GROUP_GAP_MS = 5 * 60 * 1000;

const STARTERS = [
  "When is the technician coming?",
  "I want to add more details.",
  "Can the visit be moved to another day?",
];

type Props = {
  ticketId: number;
  onClose: () => void;
};

type Run = { mine: boolean; sender: string; role: string; messages: TicketChatMessage[]; at: Date | null };

function whenOf(message: TicketChatMessage): Date | null {
  return parseServerDate(message.timestamp);
}

function timeLabel(date: Date | null): string {
  return date ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
}

function dayLabel(date: Date | null): string {
  if (!date) return "";
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

/** Management is a team, not a person: the admin shows as "Management", a technician by name. */
function senderLabel(message: TicketChatMessage): { name: string; role: "resident" | "management" | "technician" } {
  if (message.sender_role === "Resident") return { name: "You", role: "resident" };
  if (message.sender_role === "Administrator" || message.sender_name === "Property Admin") return { name: "Management", role: "management" };
  return { name: message.sender_name, role: "technician" };
}

/** Groups consecutive messages from the same sender, and starts a new group after a pause or a new day. */
function toRuns(messages: TicketChatMessage[]): (Run | { day: string })[] {
  const out: (Run | { day: string })[] = [];
  let lastDay = "";
  let current: Run | null = null;
  let lastAt: Date | null = null;
  for (const message of messages) {
    const at = whenOf(message);
    const day = at ? at.toDateString() : "";
    if (day !== lastDay) {
      out.push({ day: dayLabel(at) });
      lastDay = day;
      current = null;
    }
    const { name, role } = senderLabel(message);
    const paused = at && lastAt ? at.getTime() - lastAt.getTime() > GROUP_GAP_MS : false;
    if (current && current.sender === name && !paused) {
      current.messages.push(message);
    } else {
      current = { mine: role === "resident", sender: name, role, messages: [message], at };
      out.push(current);
    }
    lastAt = at;
  }
  return out;
}

export default function TicketChatDialog({ ticketId, onClose }: Props) {
  const [thread, setThread] = useState<TicketChatThread | null>(null);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  // The parent passes a fresh onClose on every render; keeping it in a ref stops the focus and scroll-lock effect re-running.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

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

  // A modal: Escape closes it, the page behind stays put, and focus returns to what opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fieldRef.current?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab" && dialogRef.current) {
        const items = dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), textarea:not(:disabled), a[href]");
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, []);

  // The box is disabled until the thread loads, so focus it the moment it can take focus.
  const ready = Boolean(thread);
  useEffect(() => {
    if (ready) fieldRef.current?.focus();
  }, [ready]);

  // Follow new messages, unless the resident scrolled up to read.
  useEffect(() => {
    const node = streamRef.current;
    if (node && stickToBottom.current) node.scrollTo({ top: node.scrollHeight });
  }, [thread?.messages.length]);

  const onScroll = useCallback(() => {
    const node = streamRef.current;
    if (node) stickToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
  }, []);

  const runs = useMemo(() => toRuns(thread?.messages ?? []), [thread?.messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput("");
    stickToBottom.current = true;
    try {
      setThread(await sendTicketChatMessage(ticketId, trimmed));
      setError("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : "Could not send your message.");
      setInput(trimmed);
    } finally {
      setSending(false);
      fieldRef.current?.focus();
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(input);
    }
  }

  function grow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  const technician = thread?.staff_assigned ? thread.staff_name : null;

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="ticket-chat-title" onClick={(e) => e.stopPropagation()}>
        <header className={styles.head}>
          <span className={styles.avatar}>{technician ? <HardHat size={20} aria-hidden="true" /> : <Headset size={20} aria-hidden="true" />}</span>
          <div className={styles.headText}>
            <h2 id="ticket-chat-title">{technician ? `Management and ${technician}` : "Management"}</h2>
            <p>
              Ticket #{ticketId}
              {thread ? ` · ${thread.subject}` : ""}
            </p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close messages">
            <X size={20} />
          </button>
        </header>

        {thread && !thread.staff_assigned ? (
          <p className={styles.notice}>No technician is assigned right now. Management sees your messages and will pass them on.</p>
        ) : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        <div className={styles.stream} ref={streamRef} onScroll={onScroll} role="log" aria-live="polite" aria-label="Messages">
          {!thread ? (
            <div className={styles.loading} aria-busy="true">
              <span className="ts-skeleton" style={{ width: "58%", height: 40 }}>Loading</span>
              <span className="ts-skeleton" style={{ width: "40%", height: 40, alignSelf: "flex-end" }}>Loading</span>
            </div>
          ) : runs.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Start the conversation</p>
              <p>Ask a question or add details. Management replies here, and the technician joins once one is assigned.</p>
              <div className={styles.starters}>
                {STARTERS.map((text) => (
                  <button key={text} type="button" onClick={() => void send(text)} disabled={sending}>
                    {text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            runs.map((run, index) =>
              "day" in run ? (
                <div key={`d${index}`} className={styles.day}><span>{run.day}</span></div>
              ) : (
                <div key={`r${index}`} className={`${styles.run} ${run.mine ? styles.mine : styles.theirs}`}>
                  {!run.mine ? (
                    <span className={styles.who}>
                      {run.sender}
                      {run.role === "technician" ? <em>Technician</em> : null}
                    </span>
                  ) : null}
                  {run.messages.map((message, i) => (
                    <p key={`${message.timestamp}-${i}`} className={styles.bubble}>{message.content}</p>
                  ))}
                  <time className={styles.time}>{timeLabel(whenOf(run.messages[run.messages.length - 1]))}</time>
                </div>
              ),
            )
          )}
        </div>

        <form className={styles.composer} onSubmit={onSubmit}>
          <textarea
            ref={fieldRef}
            rows={1}
            maxLength={2000}
            placeholder="Write a message"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              grow(e.target);
            }}
            onKeyDown={onKeyDown}
            disabled={!thread || sending}
            aria-label="Message"
          />
          <button type="submit" className={styles.send} aria-label="Send message" disabled={!thread || sending || !input.trim()}>
            <ArrowUp size={18} />
          </button>
        </form>
        <p className={styles.hint}>Enter to send, Shift and Enter for a new line</p>
      </div>
    </div>
  );
}
