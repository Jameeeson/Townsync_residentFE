"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import styles from "@/styles/maintenance.module.css";
import { listMaintenanceTickets, type MaintenanceTicket } from "@/lib/api/resident";
import { badgeClassName, statusTone } from "@/lib/maintenanceStatus";

type FilterKey = "all" | "active" | "completed";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

const ACTIVE_STATUSES = new Set(["Open", "Assigned", "Ongoing"]);

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
    if (filter === "completed") return tickets.filter((t) => t.status === "Completed");
    if (filter === "active") return tickets.filter((t) => ACTIVE_STATUSES.has(t.status));
    return tickets;
  }, [tickets, filter]);

  const loading = !tickets && !error;

  return (
    <div className={styles.historyPanel}>
      <div className={styles.historyPanelHeader}>
        <span className={styles.caseFileEyebrow}>Your requests</span>
        {tickets ? <span className={styles.caseFileCount}>{tickets.length}</span> : null}
      </div>

      <div className={styles.historyFilters}>
        {FILTERS.map((f) => (
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
        ) : filtered.length === 0 ? (
          <div className={styles.historyEmpty}>
            <ClipboardList size={20} aria-hidden="true" />
            <p>
              {filter === "all"
                ? "No requests yet. Start one on the left."
                : `No ${filter} requests.`}
            </p>
          </div>
        ) : (
          filtered.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/resident/maintenance/ticket?id=${ticket.id}`}
              className={styles.historyItem}
            >
              <div className={styles.historyItemTop}>
                <span className={styles.historyItemSubject}>{ticket.subject}</span>
                <span className={badgeClassName(statusTone(ticket.status))}>{ticket.status}</span>
              </div>
              <div className={styles.historyItemMeta}>
                <span>{ticket.category}</span>
                <span>#{ticket.id}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export default TicketHistoryPanel;
