"use client";

import { useCallback, useState, type ReactNode } from "react";
import { IconArrowLeft, IconClose } from "./ChatIcons";
import { ChatComposer } from "./ChatComposer";
import { ChatStream } from "./ChatStream";
import type { ChatLine } from "./chatKit";
import styles from "./chatKit.module.css";

type Header = {
  /** Initials (text) or an icon. */
  avatar: ReactNode;
  title: string;
  subtitle?: string;
  titleId?: string;
  /** Tags or buttons on the right of the header. */
  extra?: ReactNode;
  onBack?: () => void;
  /** Show the back button only on narrow screens (when a list and a conversation take turns). */
  backOnNarrowOnly?: boolean;
  onClose?: () => void;
};

type Props = {
  header?: Header;
  /** A short note under the header (for example "No technician is assigned right now"). */
  notice?: string | null;
  lines: ChatLine[];
  ready: boolean;
  error?: string | null;
  intro?: ReactNode;
  empty?: ReactNode;
  input: string;
  onInput: (value: string) => void;
  onSend: () => void;
  placeholder: string;
  sending?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  /** "pane" sits in a page, "dialog" fits a pop-up, "fill" takes the height its parent gives it. */
  variant?: "pane" | "dialog" | "fill";
  label: string;
  className?: string;
};

/** One conversation: header, optional note, message list and message box. Every chat in the three apps is this. */
export function ChatPanel({
  header,
  notice,
  lines,
  ready,
  error,
  intro,
  empty,
  input,
  onInput,
  onSend,
  placeholder,
  sending = false,
  readOnly = false,
  autoFocus = false,
  variant = "pane",
  label,
  className,
}: Props) {
  const [jump, setJump] = useState(0);
  const send = useCallback(() => {
    setJump((n) => n + 1);
    onSend();
  }, [onSend]);

  return (
    <section className={`${styles.panel} ${styles[variant]} ${className ?? ""}`} aria-label={label}>
      {header ? (
        <header className={styles.head}>
          {header.onBack ? (
            <button type="button" className={`${styles.back} ${header.backOnNarrowOnly ? styles.backNarrow : ""}`} onClick={header.onBack}>
              <IconArrowLeft size={17} /> Back
            </button>
          ) : null}
          <span className={styles.avatar} aria-hidden="true">
            {header.avatar}
          </span>
          <div className={styles.who}>
            <h2 id={header.titleId}>{header.title}</h2>
            {header.subtitle ? <p>{header.subtitle}</p> : null}
          </div>
          {header.extra ? <div className={styles.extra}>{header.extra}</div> : null}
          {header.onClose ? (
            <button type="button" className={styles.close} onClick={header.onClose} aria-label="Close messages">
              <IconClose size={20} />
            </button>
          ) : null}
        </header>
      ) : null}

      {notice ? <p className={styles.notice}>{notice}</p> : null}

      <ChatStream lines={lines} ready={ready} error={error} intro={intro} empty={empty} jumpKey={jump} />

      <ChatComposer
        value={input}
        onChange={onInput}
        onSend={send}
        placeholder={placeholder}
        loading={!ready}
        sending={sending}
        readOnly={readOnly}
        autoFocus={autoFocus}
      />
    </section>
  );
}
