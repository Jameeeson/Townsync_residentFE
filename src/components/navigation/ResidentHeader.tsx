"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, ChevronDown, X } from "lucide-react";
import styles from "@/styles/dashboard.module.css";
import { fetchMe } from "@/lib/api/auth";
import { hasSession } from "@/lib/apiClient";
import { listAnnouncements, type Announcement } from "@/lib/api/resident";

function relativeMeta(iso: string, category: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return category;
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return `Just now • ${category}`;
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago • ${category}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago • ${category}`;
  return `${new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" })} • ${category}`;
}

export function ResidentHeader() {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [initials, setInitials] = useState("R");
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [announcementsError, setAnnouncementsError] = useState(false);

  useEffect(() => {
    if (!hasSession()) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        const name = me.full_name || me.email || "";
        const letters = name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join("");
        if (letters) setInitials(letters);
      } catch {
        // keep default initials when unauthenticated / API down
      }
    })();
    listAnnouncements()
      .then((data) => {
        if (!cancelled) setAnnouncements(Array.isArray(data) ? data.slice(0, 5) : []);
      })
      .catch(() => {
        if (!cancelled) setAnnouncementsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reveal = () => setOpen(true);

  const hide = () => {
    if (!pinned) {
      setOpen(false);
    }
  };

  const togglePinned = () => {
    setPinned((current) => {
      const next = !current;
      setOpen(next);
      return next;
    });
  };

  return (
    <header className={styles.topBar}>
      <div>
      </div>
      <div className={styles.topBarActions} onMouseEnter={reveal} onMouseLeave={hide}>
        <button
          type="button"
          className={styles.announcementButton}
          onClick={togglePinned}
          onFocus={reveal}
          aria-label={open ? "Close announcements" : "Open announcements"}
          aria-expanded={open}
        >
          <Bell size={18} aria-hidden="true" />
          <span>Announcements</span>
          <ChevronDown size={14} className={open ? styles.chevronOpen : styles.chevron} aria-hidden="true" />
        </button>

        <Link
          href="/resident/settings"
          className={styles.profileButton}
          aria-label="Open account settings"
        >
          <span className={styles.profileAvatar}>{initials}</span>
        </Link>

        <aside className={`${styles.announcementPanel} ${open ? styles.announcementPanelOpen : ""}`} aria-live="polite">
          <div className={styles.announcementPanelHeader}>
            <div>
              <p className={styles.announcementPanelLabel}>Community updates</p>
              <h2 className={styles.announcementPanelTitle}>Latest announcements</h2>
            </div>
            <button
              type="button"
              className={styles.panelCloseButton}
              onClick={() => {
                setPinned(false);
                setOpen(false);
              }}
              aria-label="Close announcements panel"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className={styles.announcementPanelBody}>
            {announcementsError ? (
              <p className={styles.announcementPanelMeta}>Couldn&apos;t load announcements.</p>
            ) : announcements === null ? (
              <p className={styles.announcementPanelMeta}>Loading…</p>
            ) : announcements.length === 0 ? (
              <p className={styles.announcementPanelMeta}>No announcements yet.</p>
            ) : (
              announcements.map((announcement) => (
                <article key={announcement.id} className={styles.announcementPanelCard}>
                  <div className={styles.announcementPanelMeta}>
                    {relativeMeta(announcement.created_at, announcement.category)}
                  </div>
                  <h3>{announcement.title}</h3>
                  <p>{announcement.content}</p>
                </article>
              ))
            )}
          </div>
        </aside>
      </div>
    </header>
  );
}

export default ResidentHeader;