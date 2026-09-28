"use client";

import { useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import styles from "./detail-modal.module.css";

export type DetailTone = "neutral" | "success" | "warning" | "danger" | "info";

export type DetailRow = {
  id: string | number;
  /** Main line, e.g. a name or ticket reference. */
  primary: string;
  /** Supporting line, e.g. a unit or location. */
  secondary?: string | null;
  /** Free-text third line, e.g. a description or timestamp. */
  meta?: string | null;
  badge?: string | null;
  tone?: DetailTone | null;
  /** Extra text revealed when the row is expanded in place. */
  expanded?: string | null;
};

type Props = {
  title: string;
  subtitle?: string | null;
  rows: DetailRow[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRetry?: () => void;
  onClose: () => void;
  /** Makes rows clickable — used to open the record's full view. */
  onRowSelect?: (row: DetailRow) => void;
  /** Label for the row affordance, e.g. "Open ticket". */
  rowActionLabel?: string;
};

export default function DetailModal({
  title,
  subtitle,
  rows,
  loading = false,
  error = null,
  emptyMessage = "Nothing to show here.",
  onRetry,
  onClose,
  onRowSelect,
  rowActionLabel = "Open",
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [handleClose]);

  return (
    <div className={styles.overlay} role="presentation" onClick={handleClose}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h2 id="detail-modal-title">{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className={styles.body}>
          {loading ? (
            <p className={styles.state} role="status">
              Loading…
            </p>
          ) : error ? (
            <p className={styles.stateError} role="alert">
              {error}
              {onRetry ? (
                <>
                  {" "}
                  <button type="button" className={styles.retry} onClick={onRetry}>
                    Retry
                  </button>
                </>
              ) : null}
            </p>
          ) : rows.length === 0 ? (
            <p className={styles.state} role="status">
              {emptyMessage}
            </p>
          ) : (
            <ul className={styles.list}>
              {rows.map((row) => {
                const body = (
                  <>
                    <div className={styles.rowText}>
                      <strong>{row.primary}</strong>
                      {row.secondary ? <span>{row.secondary}</span> : null}
                      {row.meta ? <span className={styles.meta}>{row.meta}</span> : null}
                      {row.expanded ? (
                        <span className={styles.expanded}>{row.expanded}</span>
                      ) : null}
                    </div>
                    <span className={styles.rowRight}>
                      {row.badge ? (
                        <span className={`${styles.badge} ${styles[row.tone ?? "neutral"]}`}>
                          {row.badge}
                        </span>
                      ) : null}
                      {onRowSelect ? (
                        <span className={styles.rowAction}>{rowActionLabel} →</span>
                      ) : null}
                    </span>
                  </>
                );

                return onRowSelect ? (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={`${styles.row} ${styles.rowButton}`}
                      onClick={() => onRowSelect(row)}
                    >
                      {body}
                    </button>
                  </li>
                ) : (
                  <li key={row.id} className={styles.row}>
                    {body}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
