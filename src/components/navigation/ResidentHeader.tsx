"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, Megaphone, X } from "lucide-react";
import styles from "@/styles/dashboard.module.css";
import { fetchMe } from "@/lib/api/auth";
import { hasSession } from "@/lib/apiClient";
import { listAnnouncements, type Announcement } from "@/lib/api/resident";
import { parseServerDate } from "@/lib/datetime";
import { NotificationBell } from "@/components/navigation/NotificationBell";

function relativeMeta(iso: string, category: string): string {
  const then = parseServerDate(iso)?.getTime() ?? NaN;
  if (Number.isNaN(then)) return category;
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return `Just now • ${category}`;
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago • ${category}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago • ${category}`;
  return `${parseServerDate(iso)?.toLocaleDateString([], { month: "short", day: "numeric" }) ?? ""} • ${category}`;
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

  // Hover only means "peek" for a real mouse. Touch screens fire emulated mouse events on tap,
  // which would open the panel when the profile (or anything nearby) is tapped.
  const reveal = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") setOpen(true);
  };

  const hide = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && !pinned) {
      setOpen(false);
    }
  };

  const close = () => {
    setPinned(false);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest("[data-announcements]")) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
      <div className={styles.topBarActions}>
        <NotificationBell />
        <div className={styles.announcementArea} data-announcements onPointerEnter={reveal} onPointerLeave={hide}>
        <button
          type="button"
          className={styles.announcementButton}
          onClick={togglePinned}
          aria-label={open ? "Close announcements" : "Open announcements"}
          aria-expanded={open}
        >
          <Megaphone size={18} aria-hidden="true" />
          <span>Announcements</span>
          <ChevronDown size={14} className={open ? styles.chevronOpen : styles.chevron} aria-hidden="true" />
        </button>


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

        <Link
          href="/resident/settings"
          className={styles.profileButton}
          aria-label="Open account settings"
        >
          <span className={styles.profileAvatar}>{initials}</span>
        </Link>
      </div>
    </header>
  );
}

export default ResidentHeader;