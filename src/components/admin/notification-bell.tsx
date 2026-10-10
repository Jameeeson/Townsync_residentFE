"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlarmClock,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  Hourglass,
  Inbox,
  LifeBuoy,
  MessageSquare,
  Receipt,
  UserCheck,
  UserX,
  Users,
  Wrench,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { apiGet, apiPost } from "../../lib/api";
import { parseServerDate } from "../../lib/datetime";
import styles from "./notification-bell.module.css";

type Item = {
  key: string;
  read: boolean;
  type: string;
  title: string;
  detail: string | null;
  created_at: string | null;
  href: string;
};

type Response = {
  total: number;
  read_count: number;
  counts: Record<string, number>;
  items: Item[];
};

type View = "all" | "unread" | "read";

const POLL_MS = 60_000;

const TYPE_STYLE: Record<string, { icon: typeof Bell; label: string; tone: string }> = {
  approval: { icon: UserCheck, label: "Approval", tone: styles.toneBlue },
  maintenance: { icon: Wrench, label: "Ticket", tone: styles.toneAmber },
  visitor: { icon: Users, label: "Visitor", tone: styles.toneGreen },
  support: { icon: LifeBuoy, label: "Support", tone: styles.tonePurple },
  deactivation: { icon: UserX, label: "Account", tone: styles.toneRed },
  receipt: { icon: Receipt, label: "Payment", tone: styles.toneTeal },
  alert: { icon: MessageSquare, label: "Alert", tone: styles.toneRed },
  overdue: { icon: AlarmClock, label: "Overdue", tone: styles.toneRed },
  stale: { icon: Hourglass, label: "Waiting", tone: styles.toneAmber },
  reassign: { icon: AlertTriangle, label: "Reassign", tone: styles.toneRed },
  reopened: { icon: RotateCcw, label: "Not fixed", tone: styles.toneRed },
  conduct: { icon: ShieldAlert, label: "Conduct", tone: styles.toneRed },
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

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("all");
  const [all, setAll] = useState<Response | null>(null);
  const [failed, setFailed] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // One fetch holds everything; the tabs filter it in the browser so switching is instant.
  const load = useCallback(() => {
    apiGet<Response>("/api/v1/admin/operations/notifications?view=all")
      .then((data) => {
        setAll(data);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
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

  const markLocally = (keys: string[] | "all") => {
    setAll((current) => {
      if (!current) return current;
      const items = current.items.map((i) => (keys === "all" || keys.includes(i.key) ? { ...i, read: true } : i));
      const unread = items.filter((i) => !i.read);
      const counts: Record<string, number> = {};
      unread.forEach((i) => {
        counts[i.type] = (counts[i.type] ?? 0) + 1;
      });
      return { ...current, items, total: unread.length, read_count: items.length - unread.length, counts };
    });
  };

  const openItem = (item: Item) => {
    setOpen(false);
    if (!item.read) {
      markLocally([item.key]);
      apiPost("/api/v1/admin/operations/notifications/read", { keys: [item.key] }).catch(load);
    }
    router.push(item.href);
  };

  const markAll = () => {
    markLocally("all");
    apiPost("/api/v1/admin/operations/notifications/read", { all: true }).catch(load);
  };

  const items = all?.items ?? [];
  const unreadCount = all?.total ?? 0;
  const shown = view === "all" ? items : items.filter((i) => (view === "unread" ? !i.read : i.read));

  return (
    <div className={styles.wrap} ref={wrap}>
      <button
        type="button"
        className={styles.bell}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => {
          if (!open) load();
          setOpen((v) => !v);
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 ? <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
      </button>

      {open ? (
        <section className={styles.panel} aria-label="Notifications">
          <header className={styles.head}>
            <div>
              <h2>Notifications</h2>
              <p>{unreadCount > 0 ? `${unreadCount} unread` : "You are all caught up"}</p>
            </div>
            <button type="button" className={styles.markAll} onClick={markAll} disabled={unreadCount === 0}>
              <CheckCheck size={15} /> Mark all as read
            </button>
          </header>

          <div className={styles.tabs} role="tablist" aria-label="Filter notifications">
            {(
              [
                ["all", "All", items.length],
                ["unread", "Unread", unreadCount],
                ["read", "Read", all?.read_count ?? 0],
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
            {failed && !all ? (
              <p className={styles.empty}>Could not load notifications.</p>
            ) : shown.length === 0 ? (
              <div className={styles.empty}>
                {view === "read" ? <Inbox size={26} /> : <BellOff size={26} />}
                <strong>{view === "unread" ? "Nothing unread" : view === "read" ? "Nothing read yet" : "No notifications"}</strong>
                <span>
                  {view === "unread"
                    ? "New requests and updates will show up here."
                    : view === "read"
                      ? "Items you open or mark as read appear here while they still need attention."
                      : "Pending approvals, tickets, visitors and payments appear here."}
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
