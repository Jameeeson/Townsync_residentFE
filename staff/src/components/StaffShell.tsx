"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconCalendar,
  IconChatBubble,
  IconClipboard,
  IconGrid,
  IconScan,
  IconSettings,
} from "@/components/icons";
import { isOnShift, shiftLabel } from "@/lib/shift";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import { getAdminUnreadCount } from "@/lib/services/staff";
import { NotificationBell } from "@/components/NotificationBell";
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
  { href: "/staff/messages", label: "Messages", icon: IconChatBubble },
  { href: "/staff/settings", label: "Settings", icon: IconSettings },
] as const;

const MESSAGE_POLL_MS = 30_000;

export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, loading, error, canUseScanner, canUseCalendar, canUseLogs } =
    useStaffSession();
  const [messageUnread, setMessageUnread] = useState(0);

  // Unread replies from the admin team, shown on the Messages nav item.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const load = () =>
      getAdminUnreadCount()
        .then((r) => {
          if (!cancelled) setMessageUnread(r.unread);
        })
        .catch(() => undefined);
    void load();
    const timer = setInterval(load, MESSAGE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [session, pathname]);

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
  // Re-checked every minute so the badge flips at shift change without a reload.
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((n) => n + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const shiftText = session ? shiftLabel(session.profile.shift) : null;
  const onShift = session ? isOnShift(session.profile.shift) : null;
  void clockTick;

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
                {href === "/staff/messages" && messageUnread > 0 && !active ? (
                  <span className={styles.navBadge} aria-label={`${messageUnread} unread`}>
                    {messageUnread > 99 ? "99+" : messageUnread}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFoot}>
          <div className={styles.shiftBadge}>
            <span className={onShift === false ? styles.offDot : styles.onlineDot} />
            {error
              ? "Connection issue"
              : shiftText
              ? `${onShift ? "On shift" : "Off shift"} · ${shiftText}`
              : roleLabel || "No shift set"}
          </div>
          <p className={styles.version}>v1.0.0-beta · Beta</p>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <Link href="/staff/dashboard" className={styles.topBrand}>
            TownSync
          </Link>
          <div className={styles.topActions}>
            <NotificationBell enabled={Boolean(session)} />
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

        <nav
          className={styles.bottomNav}
          aria-label="Mobile"
          style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}
        >
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.bottomItem} ${active ? styles.bottomItemActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.bottomIcon}>
                  <Icon size={22} />
                  {href === "/staff/messages" && messageUnread > 0 && !active ? (
                    <span className={styles.bottomBadge} aria-label={`${messageUnread} unread`} />
                  ) : null}
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
