"use client";

import { useMemo, useState } from "react";
import {
  IconCalendar,
  IconClipboardCheck,
  IconSearch,
  IconUserSlash,
} from "@/components/icons";
import styles from "./logs.module.css";

type Status = "checked-in" | "departed" | "denied";

type Log = {
  id: string;
  name: string;
  unit: string;
  time: string;
  status: Status;
  day: "today" | "yesterday";
  reason?: string;
  initials: string;
};

const LOGS: Log[] = [
  {
    id: "1",
    name: "Marcus Lee",
    unit: "Unit 402B · East Wing",
    time: "Checked in 10:45 AM",
    status: "checked-in",
    day: "today",
    initials: "ML",
  },
  {
    id: "2",
    name: "Aisha Rahman",
    unit: "Unit 118 · West Court",
    time: "Exited 9:20 AM",
    status: "departed",
    day: "today",
    initials: "AR",
  },
  {
    id: "3",
    name: "Unknown Visitor",
    unit: "Gate A · Main Entrance",
    time: "Denied 8:05 AM",
    status: "denied",
    day: "today",
    reason: "Unauthorized ID",
    initials: "?",
  },
  {
    id: "4",
    name: "Daniel Park",
    unit: "Unit 305 · Tower 2",
    time: "Checked in 6:40 PM",
    status: "checked-in",
    day: "yesterday",
    initials: "DP",
  },
  {
    id: "5",
    name: "Sofia Mendes",
    unit: "Clubhouse · Pool Deck",
    time: "Exited 4:12 PM",
    status: "departed",
    day: "yesterday",
    initials: "SM",
  },
];

const STATUS_LABEL: Record<Status, string> = {
  "checked-in": "Checked In",
  departed: "Departed",
  denied: "Denied",
};

const RANGES = [
  { id: "2d", label: "Oct 23–24", days: ["today", "yesterday"] as const },
  { id: "today", label: "Today only", days: ["today"] as const },
  { id: "yesterday", label: "Yesterday only", days: ["yesterday"] as const },
] as const;

export default function StaffLogsPage() {
  const [query, setQuery] = useState("");
  const [rangeIdx, setRangeIdx] = useState(0);
  const range = RANGES[rangeIdx];

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const allowed = new Set<string>(range.days);
    const filtered = LOGS.filter(
      (l) =>
        allowed.has(l.day) &&
        (!q ||
          l.name.toLowerCase().includes(q) ||
          l.unit.toLowerCase().includes(q)),
    );

    return [
      {
        key: "today",
        label: "Today, Oct 24",
        items: filtered.filter((l) => l.day === "today"),
      },
      {
        key: "yesterday",
        label: "Yesterday, Oct 23",
        items: filtered.filter((l) => l.day === "yesterday"),
      },
    ].filter((g) => g.items.length > 0);
  }, [query, range]);

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
            placeholder="Search guests or units…"
            aria-label="Search guests or units"
          />
        </label>
        <button
          type="button"
          className={styles.dateBtn}
          aria-label={`Date range: ${range.label}. Click to cycle.`}
          onClick={() => setRangeIdx((i) => (i + 1) % RANGES.length)}
        >
          <IconCalendar size={18} />
          <span>{range.label}</span>
        </button>
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableHead} aria-hidden>
          <span>Visitor</span>
          <span>Location</span>
          <span>Time</span>
          <span>Status</span>
        </div>

        {groups.length === 0 ? (
          <p className={styles.empty} role="status">
            No visitor logs match this search or date range.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.key} className={styles.group}>
              <h2>{group.label}</h2>
              <ul className={styles.list}>
                {group.items.map((log) => (
                  <li
                    key={log.id}
                    className={`${styles.card} ${
                      log.status === "denied" ? styles.denied : ""
                    }`}
                  >
                    <div className={styles.person}>
                      <div
                        className={`${styles.avatar} ${
                          log.status === "denied" ? styles.avatarDenied : ""
                        }`}
                      >
                        {log.status === "denied" ? (
                          <IconUserSlash size={18} />
                        ) : (
                          log.initials
                        )}
                      </div>
                      <div>
                        <strong>{log.name}</strong>
                        {log.reason ? (
                          <em className={styles.reason}>{log.reason}</em>
                        ) : null}
                        <p className={styles.mobileMeta}>{log.unit}</p>
                        <p className={styles.mobileMeta}>{log.time}</p>
                      </div>
                    </div>
                    <span className={styles.colUnit}>{log.unit}</span>
                    <span className={styles.colTime}>{log.time}</span>
                    <span
                      className={`${styles.badge} ${
                        log.status === "checked-in"
                          ? styles.badgeIn
                          : log.status === "departed"
                            ? styles.badgeOut
                            : styles.badgeDenied
                      }`}
                    >
                      {STATUS_LABEL[log.status]}
                    </span>
                  </li>
                ))}
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
