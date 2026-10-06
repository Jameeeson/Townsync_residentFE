"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, ClipboardList, Droplet, Lightbulb, Lock, Snowflake, Wrench } from "lucide-react";
import styles from "@/styles/maintenance.module.css";
import { listMaintenanceTickets, type MaintenanceTicket } from "@/lib/api/resident";
import { badgeClassName, statusTone } from "@/lib/maintenanceStatus";
import { parseServerDate } from "@/lib/datetime";

type FilterKey = "all" | "active" | "completed";

const ACTIVE_STATUSES = new Set(["Open", "Assigned", "Ongoing"]);

const CATEGORY_ICONS: Array<{ match: RegExp; icon: typeof Droplet }> = [
  { match: /plumb|water|leak|sink|pipe/i, icon: Droplet },
  { match: /electric|light|power|breaker/i, icon: Lightbulb },
  { match: /hvac|air|heat|cool/i, icon: Snowflake },
  { match: /lock|door|security|access/i, icon: Lock },
];

function categoryIcon(category: string) {
  return CATEGORY_ICONS.find((c) => c.match.test(category))?.icon ?? Wrench;
}

function relativeTime(iso: string): string {
  const parsed = parseServerDate(iso);
  const then = parsed?.getTime() ?? NaN;
  if (!parsed || Number.isNaN(then)) return "";
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const dayNumber = (date: Date) => {
    const parts = Object.fromEntries(dateParts.formatToParts(date).map(({ type, value }) => [type, value]));
    return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  };
  const calendarDaysAgo = Math.floor((dayNumber(now) - dayNumber(parsed)) / 86400000);
  const diffMs = now.getTime() - then;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (calendarDaysAgo > 0) {
    if (calendarDaysAgo === 1) return "yesterday";
    if (calendarDaysAgo < 30) return `${calendarDaysAgo} days ago`;
    return parsed.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `today at ${parsed.toLocaleTimeString([], { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" })}`;
  return parsed.toLocaleDateString([], { month: "short", day: "numeric" });
}

/**
 * The full request history, always visible next to the AI intake workspace —
 * this replaces the separate "Maintenance History" tab entirely.
 */
export function TicketHistoryPanel() {
  const [tickets, setTickets] = useState<MaintenanceTicket[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    let cancelled = false;
    listMaintenanceTickets()
      .then((data) => {
        if (!cancelled) setTickets(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your requests.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!tickets) return [];
    // Newest first: ticket numbers only ever grow, so they are the filing order.
    const newest = [...tickets].sort((a, b) => b.id - a.id);
    if (filter === "completed") return newest.filter((t) => t.status === "Completed");
    if (filter === "active") return newest.filter((t) => ACTIVE_STATUSES.has(t.status));
    return newest;
  }, [tickets, filter]);

  const visible = filtered.slice(0, 3);
  const loading = !tickets && !error;
  const activeCount = tickets ? tickets.filter((t) => ACTIVE_STATUSES.has(t.status)).length : 0;
  const completedCount = tickets ? tickets.filter((t) => t.status === "Completed").length : 0;

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All Requests" },
    { key: "active", label: `Active (${activeCount})` },
    { key: "completed", label: `Completed (${completedCount})` },
  ];

  return (
    <div className={styles.historyPanel}>
      <div className={styles.historyPanelHeader}>
        <span className={styles.caseFileEyebrow}>Your maintenance history</span>
        {tickets ? (
          <span className={badgeClassName("neutral")}>
            {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className={styles.historyFilters}>
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`${styles.historyFilterBtn} ${filter === f.key ? styles.historyFilterBtnActive : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={styles.historyList}>
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className={styles.historyItem}>
              <div className="ts-skeleton" style={{ width: "70%", height: 14, marginBottom: 8 }}>
                Loading
              </div>
              <div className="ts-skeleton" style={{ width: "40%", height: 11 }}>
                Loading
              </div>
            </div>
          ))
        ) : error ? (
          <p className={styles.historyError} role="alert">
            {error}
          </p>
        ) : visible.length === 0 ? (
          <div className={styles.historyEmpty}>
            <ClipboardList size={20} aria-hidden="true" />
            <p>
              {filter === "all"
                ? "No requests yet. Start one above."
                : `No ${filter} requests.`}
            </p>
          </div>
        ) : (
          visible.map((ticket) => {
            const Icon = categoryIcon(ticket.category);
            return (
              <Link
                key={ticket.id}
                href={`/resident/maintenance/ticket?id=${ticket.id}`}
                className={styles.historyItem}
              >
                <span className={styles.historyItemIcon}>
                  <Icon size={16} aria-hidden="true" />
                </span>
                <span className={styles.historyItemBody}>
                  <span className={styles.historyItemTop}>
                    <span className={styles.historyItemSubject}>{ticket.subject}</span>
                    <span className={badgeClassName(statusTone(ticket.status))}>{ticket.status}</span>
                  </span>
                  <span className={styles.historyItemMeta}>
                    <span>{ticket.category}</span>
                    <span>#TC-{ticket.id}</span>
                    <span>Reported {relativeTime(ticket.created_at)}</span>
                  </span>
                </span>
                <ChevronRight size={16} className={styles.historyItemChevron} aria-hidden="true" />
              </Link>
            );
          })
        )}
      </div>

      {tickets && tickets.length > 0 ? (
        <div className={styles.historyFooter}>
          <span>
            Showing latest {visible.length} of {filtered.length} requests
          </span>
          <Link href="/resident/maintenance/history" className={styles.historyFooterLink}>
            View historical maintenance logs →
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default TicketHistoryPanel;
