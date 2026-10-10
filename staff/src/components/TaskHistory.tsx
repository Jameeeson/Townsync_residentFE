"use client";

import { useEffect, useState } from "react";
import { getTaskTimeline, type TaskHistoryEntry } from "@/lib/services/staff";
import { formatServerDateTime } from "@/lib/datetime";
import { TaskPhotos } from "./TaskPhotos";
import styles from "./TaskHistory.module.css";

/** What has happened to this ticket, newest first, with the photos that go with each step. */
export function TaskHistory({ taskId }: { taskId: number }) {
  const [state, setState] = useState<{ id: number; rows?: TaskHistoryEntry[]; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTaskTimeline(taskId)
      .then((res) => !cancelled && setState({ id: taskId, rows: res.timeline }))
      .catch((err) => !cancelled && setState({ id: taskId, error: err instanceof Error ? err.message : "Could not load the history." }));
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const current = state && state.id === taskId ? state : null;

  return (
    <section className={styles.wrap} aria-label="Ticket history">
      <h3>History</h3>
      {!current ? <div className={styles.skeleton} aria-busy="true" /> : null}
      {current?.error ? <p className={styles.error} role="alert">{current.error}</p> : null}
      {current?.rows && current.rows.length === 0 ? <p className={styles.empty}>No history yet.</p> : null}
      {current?.rows && current.rows.length > 0 ? (
        <ol className={styles.list}>
          {current.rows.map((entry) => (
            <li key={entry.id} className={`${styles.item} ${entry.kind === "reopened" ? styles.alert : ""}`}>
              <div className={styles.head}>
                <strong>{entry.title}</strong>
                <time dateTime={entry.timestamp}>{formatServerDateTime(entry.timestamp)}</time>
              </div>
              {entry.description ? <p>{entry.description}</p> : null}
              {entry.attachments.length > 0 ? (
                <TaskPhotos
                  paths={entry.attachments.map((a) => a.url)}
                  title={entry.kind === "reopened" ? "Photos from the resident" : "Photos from the technician"}
                />
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
