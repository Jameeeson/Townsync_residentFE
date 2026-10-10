"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CircleDollarSign,
  ClipboardCheck,
  FilePlus2,
  RotateCcw,
  Shuffle,
  TimerOff,
  UserCheck,
  UserMinus,
  type LucideIcon,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatServerDateTime, parseServerDate } from "@/lib/datetime";
import type { Feed, FeedItem } from "@/lib/insights";
import styles from "./report-timeline.module.css";

type Filter = "all" | "tickets" | "billing";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "tickets", label: "Requests" },
  { key: "billing", label: "Payments" },
];

const KINDS: Record<string, { icon: LucideIcon; tone: string }> = {
  filed: { icon: FilePlus2, tone: "blue" },
  assigned: { icon: UserCheck, tone: "blue" },
  work_report: { icon: ClipboardCheck, tone: "amber" },
  reopened: { icon: RotateCcw, tone: "red" },
  reassigned: { icon: Shuffle, tone: "blue" },
  closed: { icon: BadgeCheck, tone: "green" },
  closed_auto: { icon: TimerOff, tone: "slate" },
  technician_removed: { icon: UserMinus, tone: "red" },
  payment: { icon: CircleDollarSign, tone: "green" },
};

function dayLabel(at: string): string {
  const date = parseServerDate(at);
  if (!date) return at.slice(0, 10);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function timeOnly(at: string): string {
  return formatServerDateTime(at, "", { hour: "numeric", minute: "2-digit" });
}

export default function ReportTimeline() {
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<{ filter: Filter; rows: FeedItem[]; next: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet<Feed>(`/api/v1/admin/insights/timeline?kind=${filter}&limit=40`)
      .then((feed) => {
        if (cancelled) return;
        setError(null);
        setItems({ filter, rows: feed.items, next: feed.next_before });
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Could not load the timeline."));
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const loadMore = useCallback(async () => {
    if (!items?.next) return;
    setMore(true);
    try {
      const feed = await apiGet<Feed>(
        `/api/v1/admin/insights/timeline?kind=${items.filter}&limit=40&before=${encodeURIComponent(items.next)}`,
      );
      setItems({ filter: items.filter, rows: [...items.rows, ...feed.items], next: feed.next_before });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load more.");
    } finally {
      setMore(false);
    }
  }, [items]);

  const rows = items && items.filter === filter ? items.rows : null;
  const groups: { label: string; rows: FeedItem[] }[] = [];
  for (const row of rows ?? []) {
    const label = dayLabel(row.at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(row);
    else groups.push({ label, rows: [row] });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.segment} role="group" aria-label="Show">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" aria-pressed={filter === f.key} className={filter === f.key ? styles.on : undefined} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {!rows && !error ? <div className={styles.skeleton} aria-busy="true" aria-label="Loading the timeline" /> : null}
      {rows && rows.length === 0 ? <p className={styles.empty}>Nothing has happened yet.</p> : null}

      {groups.map((group) => (
        <section key={group.label} className={styles.day} aria-label={group.label}>
          <h3>{group.label}</h3>
          <ol className={styles.list}>
            {group.rows.map((row, index) => {
              const meta = KINDS[row.kind] ?? { icon: ClipboardCheck, tone: "slate" };
              const Icon = meta.icon;
              return (
                <li key={`${row.at}-${row.kind}-${row.ticket_id ?? index}-${index}`} className={`${styles.item} ${styles[`tone_${meta.tone}`]}`}>
                  <span className={styles.dot}><Icon size={15} /></span>
                  <Link href={row.href} className={styles.body}>
                    <span className={styles.title}>
                      {row.title}
                      {row.ticket_id ? <em> #{row.ticket_id}</em> : null}
                    </span>
                    {row.detail ? <span className={styles.detail}>{row.detail}</span> : null}
                  </Link>
                  <time className={styles.time} dateTime={row.at}>{timeOnly(row.at)}</time>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      {items?.next && rows ? (
        <button type="button" className={styles.more} onClick={loadMore} disabled={more}>
          {more ? "Loading…" : "Show older activity"}
        </button>
      ) : null}
    </div>
  );
}
