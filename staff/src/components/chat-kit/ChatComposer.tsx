"use client";

import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { IconArrowUp } from "./ChatIcons";
import styles from "./chatKit.module.css";

const MAX_LENGTH = 2000;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder: string;
  /** The conversation has not loaded yet. */
  loading?: boolean;
  sending?: boolean;
  /** A closed request keeps its history but takes no new messages. */
  readOnly?: boolean;
  autoFocus?: boolean;
};

/** The message box: grows with the text, Enter sends, Shift and Enter adds a line. */
export function ChatComposer({ value, onChange, onSend, placeholder, loading = false, sending = false, readOnly = false, autoFocus = false }: Props) {
  const field = useRef<HTMLTextAreaElement>(null);
  const blocked = loading || sending || readOnly;

  // Grow with the text, and shrink back after a send.
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    // A scrollbar only when the text is taller than the box; otherwise it shows as stray arrows on a one-line message.
    el.style.overflowY = el.scrollHeight > 140 ? "auto" : "hidden";
  }, [value]);

  // The box is disabled until the conversation loads, so focus it the moment it can take focus.
  useEffect(() => {
    if (autoFocus && !loading && !readOnly) field.current?.focus();
  }, [autoFocus, loading, readOnly]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!blocked && value.trim()) onSend();
  }

  function keys(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!blocked && value.trim()) onSend();
    }
  }

  return (
    <>
      <form className={styles.composer} onSubmit={submit}>
        <textarea
          ref={field}
          rows={1}
          maxLength={MAX_LENGTH}
          placeholder={readOnly ? "This request is closed, so new messages are off" : placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={keys}
          disabled={blocked}
          aria-label="Message"
        />
        <button type="submit" className={styles.send} aria-label="Send message" disabled={blocked || !value.trim()}>
          <IconArrowUp size={18} />
        </button>
      </form>
      <p className={styles.hint}>Enter to send, Shift and Enter for a new line</p>
    </>
  );
}
