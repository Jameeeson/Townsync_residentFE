"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconBell } from "@/components/icons";
import { parseServerDate } from "@/lib/datetime";
import {
  getStaffNotifications,
  markStaffNotificationsRead,
  type StaffNotificationItem,
  type StaffNotifications,
} from "@/lib/services/staff";
import styles from "./NotificationBell.module.css";

type View = "all" | "unread" | "read";

const POLL_MS = 60_000;
const TYPE_LABEL: Record<string, string> = { task: "Task", visitor: "Visitor", overdue: "Overdue", alert: "Alert" };

function ago(value: string | null): string {
  const d = parseServerDate(value);
  if (!d) return "";
  const minutes = Math.round((Date.now() - d.getTime()) / 60000);
  if (minutes < -60 * 24) return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The staff header bell: All / Unread / Read, click an item to open and mark it read, or mark everything read. */
export function NotificationBell({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const panelId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("all");
  const [data, setData] = useState<StaffNotifications | null>(null);

  const load = useCallback(() => {
    if (!enabled) return;
    getStaffNotifications()
      .then(setData)
      .catch(() => setData(null));
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [enabled, load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markLocally = (keys: string[] | "all") =>
    setData((current) => {
      if (!current) return current;
      const items = current.items.map((i) => (keys === "all" || keys.includes(i.key) ? { ...i, read: true } : i));
      const unread = items.filter((i) => !i.read).length;
      return { ...current, items, total: unread, read_count: items.length - unread };
    });

  const openItem = (item: StaffNotificationItem) => {
    setOpen(false);
    if (!item.read) {
      markLocally([item.key]);
      markStaffNotificationsRead({ keys: [item.key] }).catch(load);
    }
    router.push(item.href);
  };

  const markAll = () => {
    markLocally("all");
    markStaffNotificationsRead({ all: true }).catch(load);
  };

  const items = data?.items ?? [];
  const unread = data?.total ?? 0;
  const shown = view === "all" ? items : items.filter((i) => (view === "unread" ? !i.read : i.read));

  return (
    <div className={styles.wrap} ref={wrap}>
      <button
        type="button"
        className={styles.bell}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (!open) load();
          setOpen((v) => !v);
        }}
      >
        <IconBell size={20} />
        {unread > 0 ? <span className={styles.badge}>{unread > 99 ? "99+" : unread}</span> : null}
      </button>

      {open ? (
        <section id={panelId} className={styles.panel} aria-label="Notifications">
          <header className={styles.head}>
            <div>
              <h2>Notifications</h2>
              <p>{unread > 0 ? `${unread} unread` : "You're all caught up"}</p>
            </div>
            <button type="button" className={styles.markAll} onClick={markAll} disabled={unread === 0}>
              Mark all as read
            </button>
          </header>

          <div className={styles.tabs} role="tablist" aria-label="Filter notifications">
            {(
              [
                ["all", "All", items.length],
                ["unread", "Unread", unread],
                ["read", "Read", data?.read_count ?? 0],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                className={`${styles.tab} ${view === id ? styles.tabActive : ""}`}
                onClick={() => setView(id)}
              >
                {label} <span className={styles.count}>{count}</span>
              </button>
            ))}
          </div>

          <div className={styles.list}>
            {shown.length === 0 ? (
              <div className={styles.empty}>
                <strong>{view === "unread" ? "Nothing unread" : view === "read" ? "Nothing read yet" : "No notifications"}</strong>
                <span>
                  {view === "read"
                    ? "Items you open or mark as read stay here while they still need attention."
                    : "New tasks and updates will appear here."}
                </span>
              </div>
            ) : (
              shown.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`${styles.item} ${item.read ? "" : styles.itemUnread}`}
                  onClick={() => openItem(item)}
                >
                  <span className={styles.body}>
                    <span className={styles.titleRow}>
                      <span className={styles.title}>{item.title}</span>
                      <span className={styles.time}>{ago(item.created_at)}</span>
                    </span>
                    {item.detail ? <span className={styles.detail}>{item.detail}</span> : null}
                    <span className={styles.tag}>{TYPE_LABEL[item.type] ?? "Update"}</span>
                  </span>
                  {!item.read ? <span className={styles.dot} aria-label="Unread" /> : null}
                </button>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
