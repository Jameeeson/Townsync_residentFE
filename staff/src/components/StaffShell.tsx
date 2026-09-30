"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  IconBell,
  IconCalendar,
  IconClipboard,
  IconGrid,
  IconScan,
  IconSettings,
} from "@/components/icons";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import { getStaffNotifications, type StaffNotificationItem } from "@/lib/services/staff";
import styles from "./StaffShell.module.css";

const NAV = [
  { href: "/staff/dashboard", label: "Tasks", icon: IconGrid },
  // Calendar backs maintenance-tech availability; Staff (Security) accounts don't get it.
  { href: "/staff/calendar", label: "Calendar", icon: IconCalendar, calendarOnly: true },
  // The gate scanner API is Security-only; Maintenance accounts get a 403 from
  // every endpoint behind it, so the entry is filtered out for them below.
  { href: "/staff/scanner", label: "Scanner", icon: IconScan, scannerOnly: true },
  // Logs are a Security/Staff feature; Maintenance accounts don't get it.
  { href: "/staff/logs", label: "Logs", icon: IconClipboard, logsOnly: true },
  { href: "/staff/settings", label: "Settings", icon: IconSettings },
] as const;

const NOTIFICATION_POLL_MS = 60_000;

export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, loading, error, canUseScanner, canUseCalendar, canUseLogs } =
    useStaffSession();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<StaffNotificationItem[]>([]);
  const [notifTotal, setNotifTotal] = useState(0);
  const [seenCount, setSeenCount] = useState(0);
  const panelId = useId();
  const notifRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(() => {
    if (!session) return;
    getStaffNotifications()
      .then((data) => {
        setNotifications(data.items);
        setNotifTotal(data.total);
      })
      .catch(() => {
        setNotifications([]);
        setNotifTotal(0);
      });
  }, [session]);

  useEffect(() => {
    if (!session) return;
    loadNotifications();
    const timer = setInterval(loadNotifications, NOTIFICATION_POLL_MS);
    return () => clearInterval(timer);
  }, [session, loadNotifications]);

  const unread = notifTotal > seenCount;

  const nav = NAV.filter((item) => {
    if ("scannerOnly" in item && !canUseScanner) return false;
    if ("calendarOnly" in item && !canUseCalendar) return false;
    if ("logsOnly" in item && !canUseLogs) return false;
    return true;
  });

  const displayName = session?.displayName ?? (loading ? "Loading…" : "Staff");
  const initials = session?.initials ?? "ST";
  const roleLabel = session
    ? `${session.profile.staff_type} · ${session.profile.employee_id}`
    : "";

  useEffect(() => {
    if (!notifOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (!notifRef.current?.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setNotifOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [notifOpen]);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>TS</span>
          <div>
            <p className={styles.brandName}>TownSync</p>
            <p className={styles.brandSub}>Staff Operations</p>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Primary">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFoot}>
          <div className={styles.shiftBadge}>
            <span className={styles.onlineDot} />
            {error ? "Connection issue" : roleLabel || "Shift active"}
          </div>
          <p className={styles.version}>v2.4.1 · SG-PROD-01</p>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <Link href="/staff/dashboard" className={styles.topBrand}>
            TownSync
          </Link>
          <div className={styles.topActions}>
            <div className={styles.notifWrap} ref={notifRef}>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={
                  notifTotal > 0 ? `Notifications, ${notifTotal} pending` : "Notifications"
                }
                aria-expanded={notifOpen}
                aria-controls={panelId}
                onClick={() => {
                  if (!notifOpen) loadNotifications();
                  setNotifOpen((v) => !v);
                  setSeenCount(notifTotal);
                }}
              >
                <IconBell size={20} />
                {unread ? <span className={styles.notifDot} /> : null}
              </button>
              {notifOpen ? (
                <div
                  id={panelId}
                  className={styles.notifPanel}
                  role="region"
                  aria-label="Notifications"
                >
                  <div className={styles.notifHead}>
                    <strong>Notifications</strong>
                  </div>
                  {notifications.length === 0 ? (
                    <p className={styles.notifEmpty}>You&apos;re all caught up.</p>
                  ) : (
                    <ul className={styles.notifList}>
                      {notifications.map((n, i) => (
                        <li key={`${n.type}-${i}`}>
                          <p>{n.title}</p>
                          <span>{n.detail ?? n.created_at ?? ""}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
            <Link
              href="/staff/settings"
              className={styles.avatar}
              title={displayName}
              aria-label={`Open settings for ${displayName}`}
            >
              {initials}
            </Link>
          </div>
        </header>

        <div className={styles.content}>{children}</div>

        <nav className={styles.bottomNav} aria-label="Mobile">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.bottomItem} ${active ? styles.bottomItemActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={22} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
