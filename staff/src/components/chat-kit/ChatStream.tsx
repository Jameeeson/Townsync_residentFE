"use client";

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { clockLabel, groupLines, type ChatLine } from "./chatKit";
import styles from "./chatKit.module.css";

type Props = {
  lines: ChatLine[];
  /** False until the first load finishes: shows a placeholder instead of the empty state. */
  ready: boolean;
  error?: string | null;
  /** Shown above the messages (for example the original request). */
  intro?: ReactNode;
  /** Shown when there are no messages yet. */
  empty?: ReactNode;
  /** Changes when the viewer sends a message, so the list jumps to the newest one even if they had scrolled up. */
  jumpKey?: number;
};

/** The scrolling message list: day dividers, grouped bubbles, and "follow the newest message unless the reader scrolled up". */
export function ChatStream({ lines, ready, error, intro, empty, jumpKey = 0 }: Props) {
  const items = useMemo(() => groupLines(lines), [lines]);
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    const node = ref.current;
    if (node && stick.current) node.scrollTo({ top: node.scrollHeight });
  }, [lines.length]);

  useEffect(() => {
    if (jumpKey === 0) return;
    stick.current = true;
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [jumpKey]);

  const onScroll = useCallback(() => {
    const node = ref.current;
    if (node) stick.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
  }, []);

  return (
    <div className={styles.stream} ref={ref} onScroll={onScroll} role="log" aria-live="polite" aria-label="Messages">
      {intro}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {!ready ? (
        <div className={styles.loading} aria-busy="true" aria-label="Loading messages">
          <span className={styles.skel} style={{ width: "52%" }} />
          <span className={styles.skel} style={{ width: "38%", alignSelf: "flex-end" }} />
        </div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>{empty ?? <p>No messages yet.</p>}</div>
      ) : (
        items.map((item, index) =>
          item.kind === "day" ? (
            <div key={`d${index}`} className={styles.day}>
              <span>{item.label}</span>
            </div>
          ) : (
            <div key={`r${index}`} className={`${styles.run} ${item.side === "mine" ? styles.mine : styles.theirs}`}>
              {item.side === "theirs" ? (
                <span className={styles.name}>
                  {item.name}
                  {item.badge ? <em data-badge={item.badge}>{item.badge}</em> : null}
                </span>
              ) : null}
              {item.lines.map((line) => (
                <p key={line.key} className={styles.bubble}>
                  {line.text}
                </p>
              ))}
              <time className={styles.time}>
                {item.side === "mine" ? "You · " : ""}
                {clockLabel(item.end)}
              </time>
            </div>
          ),
        )
      )}
    </div>
  );
}

/** Quick things to say, shown in an empty conversation. */
export function ChatQuickReplies({ items, onPick, disabled }: { items: string[]; onPick: (text: string) => void; disabled?: boolean }) {
  return (
    <div className={styles.quick}>
      {items.map((text) => (
        <button key={text} type="button" onClick={() => onPick(text)} disabled={disabled}>
          {text}
        </button>
      ))}
    </div>
  );
}
