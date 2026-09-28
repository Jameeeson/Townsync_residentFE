"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { apiGet } from "../../lib/api";
import styles from "./top-nav-bar.module.css";

type TopNavBarProps = {
  onMenuOpen?: () => void;
  onCreateAlert?: () => void;
  userName?: string | null;
};

type NotificationItem = {
  type: string;
  title: string;
  detail: string | null;
  created_at: string | null;
  href: string;
};

type NotificationsResponse = {
  total: number;
  counts: Record<string, number>;
  items: NotificationItem[];
};

type SearchResult = {
  type: string;
  id: number;
  title: string;
  subtitle: string | null;
  href: string;
};

const NOTIFICATION_POLL_MS = 60_000;

function initialsFor(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function TopNavBar({ onMenuOpen, onCreateAlert, userName }: TopNavBarProps) {
  const [notifications, setNotifications] = useState<NotificationsResponse | null>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(() => {
    apiGet<NotificationsResponse>("/api/v1/admin/operations/notifications")
      .then(setNotifications)
      .catch(() => setNotifications(null));
  }, []);

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, NOTIFICATION_POLL_MS);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  // Debounced global search.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      apiGet<{ results: SearchResult[] }>(
        `/api/v1/admin/operations/search?q=${encodeURIComponent(term)}`,
      )
        .then((data) => {
          if (!cancelled) setResults(data.results);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Close popovers on outside click.
  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (bellRef.current && !bellRef.current.contains(target)) setBellOpen(false);
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const total = notifications?.total ?? 0;
  const showResults = searchOpen && query.trim().length >= 2 && results !== null;

  return (
    <header className={styles.topNav}>
      <div className={styles.leftSection}>
        {onMenuOpen ? (
          <button
            type="button"
            className={styles.menuButton}
            onClick={onMenuOpen}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
        ) : null}
        <span className={styles.logo}>TownSync</span>
      </div>

      <div className={styles.searchWrap} ref={searchRef}>
        <Search size={18} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search residents, tickets, visitors..."
          aria-label="Global search"
          maxLength={60}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
        />
        {showResults ? (
          <div className={styles.popover} role="listbox" aria-label="Search results">
            {results.length === 0 ? (
              <p className={styles.popoverEmpty}>No matches found.</p>
            ) : (
              results.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={r.href}
                  className={styles.popoverItem}
                  onClick={() => setSearchOpen(false)}
                >
                  <span className={styles.popoverTag}>{r.type}</span>
                  <span className={styles.popoverTitle}>{r.title}</span>
                  {r.subtitle ? <span className={styles.popoverDetail}>{r.subtitle}</span> : null}
                </Link>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.createAlertButton} onClick={onCreateAlert}>
          Create Alert
        </button>
        <span className={styles.divider} aria-hidden="true" />
        <div className={styles.bellWrap} ref={bellRef}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={total > 0 ? `Notifications (${total} pending)` : "Notifications"}
            aria-expanded={bellOpen}
            onClick={() => {
              if (!bellOpen) loadNotifications();
              setBellOpen((open) => !open);
            }}
          >
            <Bell size={20} />
            {total > 0 ? <span className={styles.badge}>{total > 99 ? "99+" : total}</span> : null}
          </button>
          {bellOpen ? (
            <div className={`${styles.popover} ${styles.popoverRight}`} role="menu">
              {!notifications || notifications.items.length === 0 ? (
                <p className={styles.popoverEmpty}>You are all caught up.</p>
              ) : (
                notifications.items.map((n, i) => (
                  <Link
                    key={`${n.type}-${i}`}
                    href={n.href}
                    className={styles.popoverItem}
                    onClick={() => setBellOpen(false)}
                  >
                    <span className={styles.popoverTitle}>{n.title}</span>
                    {n.detail ? <span className={styles.popoverDetail}>{n.detail}</span> : null}
                    {n.created_at ? <span className={styles.popoverDetail}>{n.created_at}</span> : null}
                  </Link>
                ))
              )}
            </div>
          ) : null}
        </div>
        <div className={styles.avatar} aria-label="User profile" title={userName ?? undefined}>
          {initialsFor(userName)}
        </div>
      </div>
    </header>
  );
}
