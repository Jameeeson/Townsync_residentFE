"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
      <section className={styles.welcomeCard}>
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

      <section className={styles.card}>
        {loading ? <p>Loading…</p> : null}
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        {!loading && !error && announcements.length === 0 ? (
          <p>No announcements yet.</p>
        ) : null}
        <div className={styles.announcementGrid}>
          {announcements.map((item) => (
            <article key={item.id} className={styles.announcementCard}>
              <h3>{item.title}</h3>
              <p>{item.content}</p>
              <span className={styles.announcementDate}>
                {item.created_at}
                {item.category ? ` • ${item.category}` : ""}
              </span>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
