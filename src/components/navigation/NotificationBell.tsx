"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, CheckCheck, CreditCard, Inbox, Megaphone, Ticket, Wrench } from "lucide-react";
import styles from "@/styles/notifications.module.css";
import { apiClient, hasSession } from "@/lib/apiClient";
import { parseServerDate } from "@/lib/datetime";

type Item = {
  key: string;
  read: boolean;
  type: string;
  title: string;
  detail: string | null;
  created_at: string | null;
  href: string;
};

type Response = { total: number; read_count: number; counts: Record<string, number>; items: Item[] };
type View = "all" | "unread" | "read";

const POLL_MS = 60_000;
const BASE = "/api/v1/resident/notifications";

const TYPE_STYLE: Record<string, { icon: typeof Bell; label: string; tone: string }> = {
  maintenance: { icon: Wrench, label: "Request", tone: styles.toneAmber },
  visitor: { icon: Ticket, label: "Visitor pass", tone: styles.toneGreen },
  billing: { icon: CreditCard, label: "Billing", tone: styles.toneBlue },
  announcement: { icon: Megaphone, label: "Announcement", tone: styles.tonePurple },
};

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

/** The resident bell: updates on requests, visitor passes and bills. All / Unread / Read, mark all as read. */
export function NotificationBell() {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("all");
  const [data, setData] = useState<Response | null>(null);

  const load = useCallback(() => {
    if (!hasSession()) return;
    apiClient
      .get<Response>(`${BASE}?view=all`)
      .then(setData)
      .catch(() => setData(null));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
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

  const openItem = (item: Item) => {
    setOpen(false);
    if (!item.read) {
      markLocally([item.key]);
      apiClient.post(`${BASE}/read`, { keys: [item.key] }).catch(load);
    }
    router.push(item.href);
  };

  const markAll = () => {
    markLocally("all");
    apiClient.post(`${BASE}/read`, { all: true }).catch(load);
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
        onClick={() => {
          if (!open) load();
          setOpen((v) => !v);
        }}
      >
        <Bell size={18} aria-hidden="true" />
        {unread > 0 ? <span className={styles.badge}>{unread > 99 ? "99+" : unread}</span> : null}
      </button>

      {open ? (
        <section className={styles.panel} aria-label="Notifications">
          <header className={styles.head}>
            <div>
              <h2>Notifications</h2>
              <p>{unread > 0 ? `${unread} unread` : "You are all caught up"}</p>
            </div>
            <button type="button" className={styles.markAll} onClick={markAll} disabled={unread === 0}>
              <CheckCheck size={15} /> Mark all as read
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
                {label}
                <span className={styles.tabCount}>{count}</span>
              </button>
            ))}
          </div>

          <div className={styles.list}>
            {shown.length === 0 ? (
              <div className={styles.empty}>
                {view === "read" ? <Inbox size={26} /> : <BellOff size={26} />}
                <strong>{view === "unread" ? "Nothing unread" : view === "read" ? "Nothing read yet" : "No notifications"}</strong>
                <span>
                  {view === "read"
                    ? "Updates you open or mark as read stay here."
                    : "Updates on your requests, visitor passes and bills appear here."}
                </span>
              </div>
            ) : (
              shown.map((item) => {
                const style = TYPE_STYLE[item.type] ?? { icon: Bell, label: "Update", tone: styles.toneBlue };
                const Icon = style.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`${styles.item} ${item.read ? "" : styles.itemUnread}`}
                    onClick={() => openItem(item)}
                  >
                    <span className={`${styles.icon} ${style.tone}`}>
                      <Icon size={16} />
                    </span>
                    <span className={styles.body}>
                      <span className={styles.titleRow}>
                        <span className={styles.title}>{item.title}</span>
                        <span className={styles.time}>{ago(item.created_at)}</span>
                      </span>
                      {item.detail ? <span className={styles.detail}>{item.detail}</span> : null}
                      <span className={styles.tag}>{style.label}</span>
                    </span>
                    {!item.read ? <span className={styles.dot} aria-label="Unread" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
