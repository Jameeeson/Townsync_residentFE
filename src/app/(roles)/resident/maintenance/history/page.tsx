"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  Droplet,
  Lightbulb,
  Lock,
  Snowflake,
  Wrench,
} from "lucide-react";
import styles from "@/styles/maintenance.module.css";
import { listMaintenanceTickets, type MaintenanceTicket } from "@/lib/api/resident";
import { badgeClassName, statusTone } from "@/lib/maintenanceStatus";
import { parseServerDate } from "@/lib/datetime";
import ListControls from "@/components/ui/ListControls";

type FilterKey = "all" | "active" | "completed" | "cancelled";

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
  const then = parseServerDate(iso)?.getTime() ?? NaN;
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `today at ${parseServerDate(iso)?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  const days = Math.round(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return parseServerDate(iso)?.toLocaleDateString([], { month: "short", day: "numeric" }) ?? "";
}

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "status", label: "Status (active first)" },
  { value: "category", label: "Category (A-Z)" },
];

const STATUS_ORDER: Record<string, number> = { Open: 0, Assigned: 1, Ongoing: 2, Completed: 3, Cancelled: 4 };

/** Full, unbounded maintenance history — every request the resident has ever filed. */
export default function MaintenanceHistoryPage() {
  const [tickets, setTickets] = useState<MaintenanceTicket[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [order, setOrder] = useState("newest");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    listMaintenanceTickets()
      .then((data) => {
        if (!cancelled) setTickets(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your maintenance history.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...Array.from(new Set((tickets ?? []).map((t) => t.category).filter(Boolean)))
        .sort()
        .map((value) => ({ value, label: value })),
    ],
    [tickets]
  );

  const filtered = useMemo(() => {
    if (!tickets) return [];
    const term = search.trim().toLowerCase();
    const matches = tickets.filter((t) => {
      if (filter === "completed" && t.status !== "Completed") return false;
      if (filter === "cancelled" && t.status !== "Cancelled") return false;
      if (filter === "active" && !ACTIVE_STATUSES.has(t.status)) return false;
      if (category !== "all" && t.category !== category) return false;
      return !term || t.subject.toLowerCase().includes(term) || String(t.id) === term.replace(/^#?(tc-)?/i, "");
    });
    // Ticket numbers only ever grow, so they are the filing order (newest first by default).
    const sorted = [...matches].sort((a, b) => b.id - a.id);
    if (order === "oldest") sorted.reverse();
    if (order === "status") sorted.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || b.id - a.id);
    if (order === "category") sorted.sort((a, b) => a.category.localeCompare(b.category) || b.id - a.id);
    return sorted;
  }, [tickets, filter, category, search, order]);

  const loading = !tickets && !error;
  const activeCount = tickets ? tickets.filter((t) => ACTIVE_STATUSES.has(t.status)).length : 0;
  const completedCount = tickets ? tickets.filter((t) => t.status === "Completed").length : 0;
  const cancelledCount = tickets ? tickets.filter((t) => t.status === "Cancelled").length : 0;

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: `All Requests${tickets ? ` (${tickets.length})` : ""}` },
    { key: "active", label: `Active (${activeCount})` },
    { key: "completed", label: `Completed (${completedCount})` },
    { key: "cancelled", label: `Cancelled (${cancelledCount})` },
  ];

  return (
    <div className={styles.container}>
      <header className={`${styles.pageHeader} ts-fade-in-up`}>
        <div>
          <Link href="/resident/maintenance" className={styles.historyFooterLink}>
            <ArrowLeft size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Back to Maintenance
          </Link>
          <h1 className={styles.pageTitle} style={{ marginTop: "var(--space-2)" }}>
            Maintenance History
          </h1>
          <p className={styles.pageDesc}>Every request you&apos;ve ever filed, in one place.</p>
        </div>
      </header>

      <div className={styles.historyPanel}>
        <div className={styles.historyPanelHeader}>
          <span className={styles.caseFileEyebrow}>All maintenance logs</span>
          {tickets ? (
            <span className={badgeClassName("neutral")}>
              {filtered.length} of {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
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

        <div style={{ padding: "0 var(--space-4)" }}>
          <ListControls
            search={{ value: search, onChange: setSearch, placeholder: "Search by subject or ticket number" }}
            sort={{ value: order, options: SORTS, onChange: setOrder }}
            filters={[{ id: "category", label: "Category", value: category, options: categoryOptions, onChange: setCategory }]}
            onReset={() => {
              setOrder("newest");
              setCategory("all");
              setSearch("");
            }}
          />
        </div>

        <div className={styles.historyList} style={{ maxHeight: "none" }}>
          {loading ? (
            [0, 1, 2, 3].map((i) => (
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
              <p>{filter === "all" ? "No requests yet." : `No ${filter} requests.`}</p>
            </div>
          ) : (
            filtered.map((ticket) => {
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
      </div>
    </div>
  );
}
