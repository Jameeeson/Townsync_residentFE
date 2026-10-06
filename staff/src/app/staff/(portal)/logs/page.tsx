"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconClipboardCheck,
  IconSearch,
  IconUserSlash,
} from "@/components/icons";
import { ApiError } from "@/lib/api-client";
import {
  getVisitorLogDetail,
  getVisitorLogs,
  type VisitorLog,
  type VisitorLogDetail,
  type VisitorLogFilter,
  type VisitorLogSort,
} from "@/lib/services/staff";
import { ListControls } from "@/components/ListControls";
import { StatDetailModal, type StatDetailRow } from "@/components/StatDetailModal";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import styles from "./logs.module.css";
import { parseServerDate } from "@/lib/datetime";

type UiStatus = "checked-in" | "departed" | "denied" | "pending" | "upcoming" | "expired";

const STATUS_LABEL: Record<UiStatus, string> = {
  "checked-in": "Approved",
  departed: "Departed",
  denied: "Denied",
  pending: "Awaiting approval",
  upcoming: "Upcoming",
  expired: "Expired",
};

function toUiStatus(status: string): UiStatus {
  if (status === "Checked In") return "checked-in";
  if (status.startsWith("Departed")) return "departed";
  if (status === "Rejected") return "denied";
  if (status === "Approved") return "upcoming";
  if (status === "Pending") return "pending";
  return "expired";
}

const STATUS_CHIPS: { value: VisitorLogFilter; label: string }[] = [
  { value: "All", label: "All" },
  { value: "CheckedIn", label: "Inside now" },
  { value: "Departed", label: "Departed" },
  { value: "Upcoming", label: "Upcoming" },
  { value: "Pending", label: "Awaiting approval" },
  { value: "Rejected", label: "Denied" },
];

const SORTS: { value: VisitorLogSort; label: string }[] = [
  { value: "recent", label: "Most recent first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Visitor name (A-Z)" },
  { value: "unit", label: "Unit / destination" },
];

function initialsFor(name: string) {
  if (!name || name === "Unknown Visitor") return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function dayGroupFor(timestamp: string): string {
  const parsed = parseServerDate(timestamp);
  if (!parsed) return "Recent";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(parsed, today)) return "Today";
  if (sameDay(parsed, yesterday)) return "Yesterday";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function StaffLogsPage() {
  const router = useRouter();
  const { loading: sessionLoading, canUseLogs } = useStaffSession();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<VisitorLogFilter>("All");
  const [sort, setSort] = useState<VisitorLogSort>("recent");
  // "Upcoming" is judged against the moment the page opened; a stale minute does not matter here.
  const [loadedAt] = useState(() => Date.now());
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !canUseLogs) router.replace("/staff/dashboard");
  }, [sessionLoading, canUseLogs, router]);

  useEffect(() => {
    if (sessionLoading || !canUseLogs) return;
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getVisitorLogs(query.trim() || undefined, { status: statusFilter, sort });
        if (!cancelled) setLogs(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Could not load visitor logs.");
          setLogs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, statusFilter, sort, sessionLoading, canUseLogs]);

  const [detailFor, setDetailFor] = useState<VisitorLog | null>(null);
  const [detail, setDetail] = useState<VisitorLogDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const openDetail = async (log: VisitorLog) => {
    setDetailFor(log);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      setDetail(await getVisitorLogDetail(log.id));
    } catch (e) {
      setDetailError(e instanceof ApiError ? e.message : "Could not load visitor details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const detailRows: StatDetailRow[] = detail
    ? [
        { id: "status", title: "Status", lines: [detail.status] },
        { id: "unit", title: "Destination", lines: [detail.unit_destination] },
        { id: "in", title: "Entered", lines: [detail.entry_timestamp ?? "Not yet"] },
        {
          id: "out",
          title: "Exited",
          lines: [
            detail.exit_timestamp ?? "Still inside / not yet",
            detail.exit_method === "auto_unverified"
              ? "Closed automatically — the exit was not scanned."
              : null,
          ],
        },
        {
          id: "party",
          title: `Party of ${detail.party_size}`,
          lines: [detail.companions.length ? detail.companions.join(", ") : "No companions"],
        },
        { id: "vehicle", title: "Vehicle", lines: [detail.vehicle_details] },
        { id: "idv", title: "ID verified at gate", lines: [detail.id_verified ? "Yes" : "No"] },
      ]
    : [];

  const groups = useMemo(() => {
    const timeOf = (log: VisitorLog) => {
      const t = parseServerDate(log.timestamp)?.getTime() ?? NaN;
      return Number.isNaN(t) ? -Infinity : t;
    };

    // Time-based orders are grouped by day; name and unit orders are one flat, server-sorted list.
    if (sort === "name" || sort === "unit") return [["All visitors", logs]] as [string, VisitorLog[]][];

    const byDay = new Map<string, VisitorLog[]>();
    for (const log of logs) {
      const key = dayGroupFor(log.timestamp);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(log);
    }

    const direction = sort === "oldest" ? 1 : -1;
    const entries = Array.from(byDay.entries()).map(
      ([label, items]) =>
        [label, items.sort((a, b) => direction * (timeOf(a) - timeOf(b)))] as [string, VisitorLog[]],
    );

    // What already happened comes first (newest first); visits still to come follow, labelled as such.
    const future = (items: VisitorLog[]) => timeOf(items[0]) > loadedAt;
    entries.sort(([, a], [, b]) => {
      if (sort === "recent" && future(a) !== future(b)) return future(a) ? 1 : -1;
      return direction * (timeOf(a[0]) - timeOf(b[0]));
    });
    return entries.map(
      ([label, items]) =>
        [sort === "recent" && future(items) ? `${label} · upcoming` : label, items] as [string, VisitorLog[]],
    );
  }, [logs, sort, loadedAt]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Visitor Control</p>
          <h1>Visitor Logs</h1>
          <p className={styles.lede}>
            Search, filter, and review gate activity across the community.
          </p>
        </div>
      </header>

      <div className={styles.controls}>
        <label className={styles.search}>
          <IconSearch size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guests or unit…"
            aria-label="Search guests or unit"
          />
        </label>
      </div>

      <div role="tablist" aria-label="Filter by status" style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", margin: "0.9rem 0 0.4rem" }}>
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === chip.value}
            onClick={() => setStatusFilter(chip.value)}
            style={{
              minHeight: 38,
              padding: "0 0.9rem",
              borderRadius: 999,
              border: "1px solid var(--line)",
              fontSize: "0.82rem",
              fontWeight: 650,
              background: statusFilter === chip.value ? "var(--navy-800)" : "var(--surface-raised)",
              color: statusFilter === chip.value ? "#fff" : "var(--navy-800)",
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <ListControls
        sort={{ value: sort, options: SORTS, onChange: (v) => setSort(v as VisitorLogSort) }}
        onReset={() => {
          setSort("recent");
          setStatusFilter("All");
          setQuery("");
        }}
      />

      <div className={styles.tableWrap}>
        <div className={styles.tableHead} aria-hidden>
          <span>Visitor</span>
          <span>Location</span>
          <span>Time</span>
          <span>Status</span>
        </div>

        {loading ? (
          <p className={styles.empty} role="status">
            Loading visitor logs…
          </p>
        ) : error ? (
          <p className={styles.empty} role="status">
            {error}
          </p>
        ) : groups.length === 0 ? (
          <p className={styles.empty} role="status">
            No visitor logs match this search or filter.
          </p>
        ) : (
          groups.map(([label, items]) => (
            <section key={label} className={styles.group}>
              <h2>{label}</h2>
              <ul className={styles.list}>
                {items.map((log) => {
                  const status = toUiStatus(log.status);
                  return (
                    <li
                      key={log.id}
                      className={`${styles.card} ${status === "denied" ? styles.denied : ""}`}
                    >
                      <div className={styles.person}>
                        <div
                          className={`${styles.avatar} ${
                            status === "denied" ? styles.avatarDenied : ""
                          }`}
                        >
                          {status === "denied" ? (
                            <IconUserSlash size={18} />
                          ) : (
                            initialsFor(log.visitor_name)
                          )}
                        </div>
                        <div>
                          <strong>
                            <button
                              type="button"
                              className={styles.nameButton}
                              aria-label={`View details for ${log.visitor_name}`}
                              onClick={() => openDetail(log)}
                            >
                              {log.visitor_name}
                            </button>
                          </strong>
                          {log.companions && log.companions.length > 0 ? (
                            <p className={styles.party}>
                              +{log.companions.length} guest{log.companions.length === 1 ? "" : "s"}:{" "}
                              {log.companions.join(", ")}
                            </p>
                          ) : null}
                          <p className={styles.mobileMeta}>{log.unit_destination}</p>
                          <p className={styles.mobileMeta}>{log.timestamp}</p>
                        </div>
                      </div>
                      <span className={styles.colUnit}>{log.unit_destination}</span>
                      <span className={styles.colTime}>{log.timestamp}</span>
                      <span
                        className={`${styles.badge} ${
                          status === "checked-in"
                            ? styles.badgeIn
                            : status === "departed"
                              ? styles.badgeOut
                              : status === "denied"
                                ? styles.badgeDenied
                                : status === "upcoming"
                                  ? styles.badgeIn
                                  : styles.badgePending
                        }`}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        <div className={styles.end}>
          <IconClipboardCheck size={22} />
          <p>End of recent logs</p>
        </div>
      </div>

      {detailFor ? (
        <StatDetailModal
          title={detailFor.visitor_name}
          subtitle="Visitor log details"
          rows={detailRows}
          loading={detailLoading}
          error={detailError}
          onRetry={() => openDetail(detailFor)}
          onClose={() => setDetailFor(null)}
        />
      ) : null}
    </div>
  );
}
