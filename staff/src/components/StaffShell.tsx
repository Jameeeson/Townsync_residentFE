"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  IconBell,
  IconCalendar,
  IconClipboard,
  IconGrid,
  IconScan,
  IconSettings,
} from "@/components/icons";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import styles from "./StaffShell.module.css";

const NAV = [
  { href: "/staff/dashboard", label: "Tasks", icon: IconGrid },
  { href: "/staff/calendar", label: "Calendar", icon: IconCalendar },
  // The gate scanner API is Security-only; Maintenance accounts get a 403 from
  // every endpoint behind it, so the entry is filtered out for them below.
  { href: "/staff/scanner", label: "Scanner", icon: IconScan, scannerOnly: true },
  { href: "/staff/logs", label: "Logs", icon: IconClipboard },
  { href: "/staff/settings", label: "Settings", icon: IconSettings },
] as const;

// Live notifications aren't wired to the backend yet — the panel opens to an
// honest empty state rather than fabricated activity.
const NOTIFICATIONS: { id: string; title: string; meta: string }[] = [];

export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, loading, error, canUseScanner } = useStaffSession();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const panelId = useId();
  const notifRef = useRef<HTMLDivElement>(null);

  const nav = NAV.filter((item) => !("scannerOnly" in item) || canUseScanner);

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
                  unread ? "Notifications, unread items" : "Notifications"
                }
                aria-expanded={notifOpen}
                aria-controls={panelId}
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setUnread(false);
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
                  {NOTIFICATIONS.length === 0 ? (
                    <p className={styles.notifEmpty}>
                      Live notifications aren&apos;t available yet.
                    </p>
                  ) : (
                    <ul className={styles.notifList}>
                      {NOTIFICATIONS.map((n) => (
                        <li key={n.id}>
                          <p>{n.title}</p>
                          <span>{n.meta}</span>
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
