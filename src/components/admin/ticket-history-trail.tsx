"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  ClipboardCheck,
  FilePlus2,
  RotateCcw,
  Shuffle,
  TimerOff,
  UserCheck,
  UserMinus,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatServerDateTime } from "@/lib/datetime";
import AuthImageGallery from "@/components/ui/auth-image-gallery";
import styles from "./ticket-history-trail.module.css";

export type TrailEntry = {
  id: number;
  kind: string;
  title: string;
  description: string;
  timestamp: string;
  actor?: string | null;
  internal_note?: string | null;
  attachments: { id: number; url: string }[];
};

type Trail = { ticket_id: number; status: string; stage: string; timeline: TrailEntry[] };

const KINDS: Record<string, { icon: LucideIcon; tone: string }> = {
  filed: { icon: FilePlus2, tone: "blue" },
  assigned: { icon: UserCheck, tone: "blue" },
  work_report: { icon: ClipboardCheck, tone: "amber" },
  reopened: { icon: RotateCcw, tone: "red" },
  reassigned: { icon: Shuffle, tone: "blue" },
  closed: { icon: BadgeCheck, tone: "green" },
  closed_auto: { icon: TimerOff, tone: "slate" },
  technician_removed: { icon: UserMinus, tone: "red" },
  cancelled: { icon: XCircle, tone: "slate" },
};

/**
 * Everything that happened to one ticket, newest first: who was assigned, the technician's work report with its
 * photos, the resident's "not fixed" report, reassignments. The resident sees the same steps in their own app.
 */
export default function TicketHistoryTrail({ ticketId, refreshKey = 0 }: { ticketId: string | number; refreshKey?: number }) {
  const [state, setState] = useState<{ key: string; trail?: Trail; error?: string } | null>(null);
  const key = `${ticketId}:${refreshKey}`;

  useEffect(() => {
    let cancelled = false;
    apiGet<Trail>(`/api/v1/admin/maintenance/tickets/${ticketId}/timeline`)
      .then((trail) => !cancelled && setState({ key, trail }))
      .catch((err) => !cancelled && setState({ key, error: err instanceof Error ? err.message : "Could not load the history." }));
    return () => {
      cancelled = true;
    };
  }, [ticketId, key]);

  const current = state && state.key === key ? state : null;
  if (!current) return <div className={styles.skeleton} aria-busy="true" aria-label="Loading the history" />;
  if (current.error) return <p className={styles.error} role="alert">{current.error}</p>;
  const entries = current.trail?.timeline ?? [];
  if (entries.length === 0) return <p className={styles.empty}>No history yet.</p>;

  return (
    <ol className={styles.trail} aria-label="Ticket history">
      {entries.map((entry) => {
        const meta = KINDS[entry.kind] ?? { icon: ClipboardCheck, tone: "slate" };
        const Icon = meta.icon;
        return (
          <li key={entry.id} className={`${styles.entry} ${styles[`tone_${meta.tone}`]}`}>
            <span className={styles.dot}><Icon size={14} /></span>
            <div className={styles.content}>
              <div className={styles.head}>
                <strong>{entry.title}</strong>
                <time dateTime={entry.timestamp}>{formatServerDateTime(entry.timestamp)}</time>
              </div>
              {entry.actor && entry.kind === "work_report" ? <p className={styles.actor}>{entry.actor}</p> : null}
              {entry.description ? <p className={styles.text}>{entry.description}</p> : null}
              {entry.internal_note ? <p className={styles.note}>Admin note: {entry.internal_note}</p> : null}
              {entry.attachments.length > 0 ? (
                <AuthImageGallery
                  paths={entry.attachments.map((a) => a.url)}
                  label={entry.kind === "reopened" ? "Photos from the resident" : "Photos from the technician"}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
