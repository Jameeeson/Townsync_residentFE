"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconClipboardCheck,
  IconSearch,
  IconUserSlash,
} from "@/components/icons";
import { ApiError } from "@/lib/api-client";
import { getVisitorLogs, type VisitorLog } from "@/lib/services/staff";
import styles from "./logs.module.css";

type UiStatus = "checked-in" | "departed" | "denied" | "pending";

const STATUS_LABEL: Record<UiStatus, string> = {
  "checked-in": "Checked In",
  departed: "Departed",
  denied: "Denied",
  pending: "Pending",
};

function toUiStatus(status: string): UiStatus {
  if (status === "Checked In") return "checked-in";
  if (status === "Departed") return "departed";
  if (status === "Rejected") return "denied";
  return "pending";
}

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
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "Recent";
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
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getVisitorLogs(query.trim() || undefined);
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
  }, [query]);

  const groups = useMemo(() => {
    const timeOf = (log: VisitorLog) => {
      const t = new Date(log.timestamp).getTime();
      return Number.isNaN(t) ? -Infinity : t;
    };

    const byDay = new Map<string, VisitorLog[]>();
    for (const log of logs) {
      const key = dayGroupFor(log.timestamp);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(log);
    }

    const entries = Array.from(byDay.entries()).map(
      ([label, items]) =>
        [label, items.sort((a, b) => timeOf(b) - timeOf(a))] as [string, VisitorLog[]],
    );

    // Sort groups by their most recent entry, newest first, regardless of API row order.
    entries.sort(([, a], [, b]) => timeOf(b[0]) - timeOf(a[0]));
    return entries;
  }, [logs]);

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
            placeholder="Search guests…"
            aria-label="Search guests"
          />
        </label>
      </div>

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
            No visitor logs match this search.
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
                          <strong>{log.visitor_name}</strong>
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
    </div>
  );
}
