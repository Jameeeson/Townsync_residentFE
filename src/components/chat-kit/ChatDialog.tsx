"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./chatKit.module.css";

/**
 * A pop-up around a conversation: Escape closes it, the page behind stays put, Tab stays inside, and focus goes back
 * to whatever opened it.
 */
export function ChatDialog({ children, onClose, label }: { children: ReactNode; onClose: () => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // Parents often pass a new onClose on every render; a ref keeps the focus and scroll lock from restarting.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab" && ref.current) {
        const items = ref.current.querySelectorAll<HTMLElement>("button:not(:disabled), textarea:not(:disabled), a[href]");
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

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div ref={ref} className={styles.sheet} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
