"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef } from "react";
import { ArrowLeft, ArrowUp, HardHat, Phone } from "lucide-react";
import { parseServerDate } from "@/lib/datetime";
import type { TicketChatMessage, TicketChatThread } from "@/lib/chat";
import styles from "./ticket-chat-pane.module.css";

const GROUP_GAP_MS = 5 * 60 * 1000;

type Props = {
  residentName: string;
  residentUnit: string;
  residentPhone?: string | null;
  /** The ticket as the resident described it, shown as the opening card. */
  request: { text: string; filedAt: string | null };
  thread: TicketChatThread | null;
  error: string | null;
  input: string;
  sending: boolean;
  onInput: (value: string) => void;
  onSend: () => void;
  onBack: () => void;
};

type Who = "resident" | "management" | "technician";
type Run = { who: Who; name: string; messages: TicketChatMessage[]; end: Date | null };
type Item = Run | { day: string };

function whoIs(message: TicketChatMessage): { who: Who; name: string } {
  if (message.sender_role === "Resident") return { who: "resident", name: message.sender_name };
  if (/admin/i.test(message.sender_role) || message.sender_name === "Property Admin") return { who: "management", name: "Management" };
  return { who: "technician", name: message.sender_name };
}

function dayLabel(date: Date | null): string {
  if (!date) return "";
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function clock(date: Date | null): string {
  return date ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
}

function toItems(messages: TicketChatMessage[]): Item[] {
  const items: Item[] = [];
  let lastDay = "";
  let current: Run | null = null;
  let lastAt: Date | null = null;
  for (const message of messages) {
    const at = parseServerDate(message.timestamp);
    const day = at ? at.toDateString() : "";
    if (day !== lastDay) {
      items.push({ day: dayLabel(at) });
      lastDay = day;
      current = null;
    }
    const { who, name } = whoIs(message);
    const paused = at && lastAt ? at.getTime() - lastAt.getTime() > GROUP_GAP_MS : false;
    if (current && current.who === who && current.name === name && !paused) {
      current.messages.push(message);
      current.end = at;
    } else {
      current = { who, name, messages: [message], end: at };
      items.push(current);
    }
    lastAt = at;
  }
  return items;
}

/** The administrator's view of a ticket conversation: the resident on the left, management (you) on the right. */
export default function TicketChatPane({
  residentName,
  residentUnit,
  residentPhone,
  request,
  thread,
  error,
  input,
  sending,
  onInput,
  onSend,
  onBack,
}: Props) {
  const streamRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const items = useMemo(() => toItems(thread?.messages ?? []), [thread?.messages]);
  const initials =
    residentName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";

  useEffect(() => {
    const node = streamRef.current;
    if (node && stick.current) node.scrollTo({ top: node.scrollHeight });
  }, [thread?.messages.length]);

  const onScroll = useCallback(() => {
    const node = streamRef.current;
    if (node) stick.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    stick.current = true;
    onSend();
    if (fieldRef.current) fieldRef.current.style.height = "auto";
  }

  function keys(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      stick.current = true;
      onSend();
      if (fieldRef.current) fieldRef.current.style.height = "auto";
    }
  }

  const filed = parseServerDate(request.filedAt);

  return (
    <section className={styles.pane} aria-label={`Conversation with ${residentName}`}>
      <header className={styles.head}>
        <button type="button" className={styles.back} onClick={onBack}>
          <ArrowLeft size={17} aria-hidden="true" /> Back
        </button>
        <span className={styles.avatar} aria-hidden="true">{initials}</span>
        <div className={styles.who}>
          <strong>{residentName}</strong>
          <span>Resident · {residentUnit}</span>
        </div>
        {thread ? (
          <span className={thread.staff_assigned ? styles.techOn : styles.techOff}>
            <HardHat size={14} aria-hidden="true" />
            {thread.staff_assigned ? thread.staff_name : "No technician assigned"}
          </span>
        ) : null}
        {residentPhone ? (
          <a className={styles.call} href={`tel:${residentPhone}`} aria-label={`Call ${residentName}`}>
            <Phone size={18} aria-hidden="true" />
          </a>
        ) : null}
      </header>

      <div className={styles.stream} ref={streamRef} onScroll={onScroll} role="log" aria-live="polite" aria-label="Messages">
        <div className={styles.request}>
          <span>Original request{filed ? ` · ${filed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}` : ""}</span>
          <p>{request.text}</p>
        </div>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        {!thread ? (
          <div className={styles.loading} aria-busy="true">
            <span className="ts-skeleton" style={{ width: "46%", height: 38 }}>Loading</span>
            <span className="ts-skeleton" style={{ width: "34%", height: 38, alignSelf: "flex-end" }}>Loading</span>
          </div>
        ) : items.length === 0 ? (
          <p className={styles.empty}>No messages yet. Write to {residentName.split(" ")[0] || "the resident"} below.</p>
        ) : (
          items.map((item, index) =>
            "day" in item ? (
              <div key={`d${index}`} className={styles.day}><span>{item.day}</span></div>
            ) : (
              <div key={`r${index}`} className={`${styles.run} ${item.who === "management" ? styles.mine : styles.theirs} ${item.who === "technician" ? styles.tech : ""}`}>
                {item.who !== "management" ? (
                  <span className={styles.name}>
                    {item.name}
                    {item.who === "technician" ? <em>Technician</em> : null}
                  </span>
                ) : null}
                {item.messages.map((message, i) => (
                  <p key={`${message.timestamp}-${i}`} className={styles.bubble}>{message.content}</p>
                ))}
                <time className={styles.time}>{item.who === "management" ? "You · " : ""}{clock(item.end)}</time>
              </div>
            ),
          )
        )}
      </div>

      <form className={styles.composer} onSubmit={submit}>
        <textarea
          ref={fieldRef}
          rows={1}
          maxLength={2000}
          placeholder={`Message ${residentName.split(" ")[0] || "the resident"}`}
          value={input}
          onChange={(e) => {
            onInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
          }}
          onKeyDown={keys}
          disabled={!thread || sending}
          aria-label="Message"
        />
        <button type="submit" className={styles.send} aria-label="Send message" disabled={!thread || sending || !input.trim()}>
          <ArrowUp size={18} />
        </button>
      </form>
      <p className={styles.hint}>Enter to send, Shift and Enter for a new line</p>
    </section>
  );
}
