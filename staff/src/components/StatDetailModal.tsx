"use client";

import { useCallback, useRef } from "react";
import { IconX } from "@/components/icons";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import styles from "./StatDetailModal.module.css";

export type StatDetailRow = {
  /** Stable key for the list. */
  id: string | number;
  title: string;
  /** Short qualifier shown next to the title, e.g. a unit or a time. */
  lead?: string | null;
  /** Secondary lines under the title; nullish entries are dropped. */
  lines?: (string | null | undefined)[];
  /** Optional right-hand pill, e.g. status or priority. */
  badge?: string | null;
  badgeTone?: "neutral" | "success" | "warning" | "danger" | "info";
};

type Props = {
  title: string;
  subtitle?: string;
  rows: StatDetailRow[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRetry?: () => void;
  onClose: () => void;
  /** Makes rows clickable — used to open the record's full view. */
  onRowSelect?: (row: StatDetailRow) => void;
  rowActionLabel?: string;
};

export function StatDetailModal({
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
  const modalRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => onClose(), [onClose]);
  useDialogA11y(true, handleClose, modalRef);

  return (
    <div className={styles.overlay} role="presentation" onClick={handleClose}>
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stat-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <h2 id="stat-detail-title">{title}</h2>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={handleClose}
            aria-label="Close"
          >
            <IconX size={20} />
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
                const lines = (row.lines ?? []).filter(Boolean) as string[];
                const body = (
                  <>
                    <div className={styles.rowMain}>
                      <p className={styles.rowTitle}>
                        {row.title}
                        {row.lead ? <span className={styles.lead}>{row.lead}</span> : null}
                      </p>
                      {lines.map((line, i) => (
                        <span key={i} className={styles.rowLine}>
                          {line}
                        </span>
                      ))}
                    </div>
                    <span className={styles.rowRight}>
                      {row.badge ? (
                        <span
                          className={`${styles.badge} ${styles[row.badgeTone ?? "neutral"]}`}
                        >
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

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
