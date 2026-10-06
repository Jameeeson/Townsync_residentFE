"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Megaphone, Menu, Search, X } from "lucide-react";
import { apiGet } from "../../lib/api";
import NotificationBell from "./notification-bell";
import styles from "./top-nav-bar.module.css";

type TopNavBarProps = {
  onMenuOpen?: () => void;
  onCreateAlert?: () => void;
  userName?: string | null;
};

type SearchResult = {
  type: string;
  id: number;
  title: string;
  subtitle: string | null;
  href: string;
};

function initialsFor(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function TopNavBar({ onMenuOpen, onCreateAlert, userName }: TopNavBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // Phones show search behind an icon so the header stays one row.
  const [mobileSearch, setMobileSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced global search.
  useEffect(() => {
    const term = query.trim();
    // A ticket number can be one digit ("7", "#7", "TC-7"); everything else needs two characters.
    if (term.length < 2 && !/^\d$/.test(term)) return;
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
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const searchable = query.trim().length >= 2 || /^\d$/.test(query.trim());
  const showResults = searchOpen && searchable && results !== null;

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

      <div className={`${styles.searchWrap} ${mobileSearch ? styles.searchWrapOpen : ""}`} ref={searchRef}>
        <Search size={18} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search residents, tickets (name or #ID), visitors..."
          aria-label="Global search"
          maxLength={60}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          autoFocus={mobileSearch}
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
        <button
          type="button"
          className={`${styles.iconButton} ${styles.searchToggle}`}
          aria-label={mobileSearch ? "Close search" : "Search"}
          aria-expanded={mobileSearch}
          onClick={() => setMobileSearch((open) => !open)}
        >
          {mobileSearch ? <X size={20} /> : <Search size={20} />}
        </button>
        <button
          type="button"
          className={styles.createAlertButton}
          onClick={onCreateAlert}
          aria-label="Create Alert"
        >
          <Megaphone size={18} aria-hidden="true" className={styles.createAlertIcon} />
          <span className={styles.createAlertLabel}>Create Alert</span>
        </button>
        <span className={styles.divider} aria-hidden="true" />
        <NotificationBell />
        <div className={styles.avatar} aria-label="User profile" title={userName ?? undefined}>
          {initialsFor(userName)}
        </div>
      </div>
    </header>
  );
}
