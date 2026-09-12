"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, ChevronDown, X } from "lucide-react";
import styles from "@/styles/dashboard.module.css";
import { fetchMe } from "@/lib/api/auth";
import { getAccessToken } from "@/lib/apiClient";

const announcements = [
  {
    title: "Scheduled water interruption",
    summary: "Block B water supply will be off tomorrow from 10:00 AM to 12:00 PM.",
    meta: "Today • Facilities",
  },
  {
    title: "Lobby light repair completed",
    summary: "The lobby lighting issue has been resolved and reopened for normal use.",
    meta: "1 hour ago • Maintenance",
  },
  {
    title: "Visitor reminder",
    summary: "Please register visitors before 8:00 PM to keep approvals moving quickly.",
    meta: "Today • Security",
  },
];

export function ResidentHeader() {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [initials, setInitials] = useState("R");

  useEffect(() => {
    if (!getAccessToken()) return;
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
            {announcements.map((announcement) => (
              <article key={announcement.title} className={styles.announcementPanelCard}>
                <div className={styles.announcementPanelMeta}>{announcement.meta}</div>
                <h3>{announcement.title}</h3>
                <p>{announcement.summary}</p>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </header>
  );
}

export default ResidentHeader;