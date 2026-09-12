"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Megaphone } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { Announcement, listAnnouncements } from "@/lib/api/resident";
import styles from "@/styles/dashboard.module.css";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listAnnouncements();
        if (!cancelled) setAnnouncements(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to load announcements."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <section className={`${styles.welcomeCard} ts-fade-in-up`}>
        <div>
          <h1 className={styles.welcomeTitle}>Announcements</h1>
          <p className={styles.welcomeUnit}>Community updates from property management</p>
        </div>
        <div className={styles.welcomeActions}>
          <Link className={styles.btnOutline} href="/resident">
            Back to Dashboard
          </Link>
        </div>
      </section>

      <section className={`${styles.card} ts-fade-in-up`}>
        {loading ? (
          <div className={`${styles.announcementGrid} ts-stagger`} aria-busy="true" aria-label="Loading announcements">
            {[0, 1].map((i) => (
              <div key={i} className={styles.announcementCard} style={{ "--ts-stagger-i": i } as CSSProperties}>
                <div className="ts-skeleton" style={{ width: "70%", height: 16, marginBottom: 10 }}>Loading</div>
                <div className="ts-skeleton" style={{ width: "100%", height: 40, marginBottom: 10 }}>Loading</div>
                <div className="ts-skeleton" style={{ width: "40%", height: 12 }}>Loading</div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="ts-badge ts-badge-danger" role="alert">{error}</p>
        ) : announcements.length === 0 ? (
          <div className={`${styles.placeholder} ts-fade-in`}>
            <Megaphone size={24} className={styles.placeholderIcon} aria-hidden="true" />
            <p>No announcements yet. Check back soon for community updates.</p>
          </div>
        ) : (
          <div className={`${styles.announcementGrid} ts-stagger`}>
            {announcements.map((item, i) => (
              <article
                key={item.id}
                className={styles.announcementCard}
                style={{ "--ts-stagger-i": i } as CSSProperties}
              >
                <h3>{item.title}</h3>
                <p>{item.content}</p>
                <span className={styles.announcementDate}>
                  {item.created_at}
                  {item.category ? ` • ${item.category}` : ""}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
