"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  IconBell,
  IconClipboard,
  IconGrid,
  IconScan,
  IconSettings,
} from "@/components/icons";
import { useToast } from "@/components/Toast";
import { STAFF_PROFILE } from "@/lib/staff-profile";
import styles from "./StaffShell.module.css";

const NAV = [
  { href: "/staff/dashboard", label: "Tasks", icon: IconGrid },
  { href: "/staff/scanner", label: "Scanner", icon: IconScan },
  { href: "/staff/logs", label: "Logs", icon: IconClipboard },
  { href: "/staff/settings", label: "Settings", icon: IconSettings },
] as const;

const NOTIFICATIONS = [
  {
    id: "1",
    title: "High priority: Burst Pipe Repair",
    meta: "Block A, Unit 402 · 12m ago",
  },
  {
    id: "2",
    title: "Visitor pass pending at Gate A",
    meta: "Marcus Lee · 28m ago",
  },
  {
    id: "3",
    title: "Shift reminder: perimeter check",
    meta: "Due by 2:00 PM",
  },
];

export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(true);
  const panelId = useId();
  const notifRef = useRef<HTMLDivElement>(null);

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
          {NAV.map(({ href, label, icon: Icon }) => {
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
            Shift active · {STAFF_PROFILE.block}
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
                    <button
                      type="button"
                      className={styles.notifClear}
                      onClick={() => {
                        setNotifOpen(false);
                        toast("Caught up — no new alerts.", "success");
                      }}
                    >
                      Mark all read
                    </button>
                  </div>
                  <ul className={styles.notifList}>
                    {NOTIFICATIONS.map((n) => (
                      <li key={n.id}>
                        <p>{n.title}</p>
                        <span>{n.meta}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <Link
              href="/staff/settings"
              className={styles.avatar}
              title={STAFF_PROFILE.displayName}
              aria-label={`Open settings for ${STAFF_PROFILE.displayName}`}
            >
              {STAFF_PROFILE.initials}
            </Link>
          </div>
        </header>

        <div className={styles.content}>{children}</div>

        <nav className={styles.bottomNav} aria-label="Mobile">
          {NAV.map(({ href, label, icon: Icon }) => {
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
