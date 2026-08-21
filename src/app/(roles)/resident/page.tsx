"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiClientError } from "@/lib/apiClient";
import { DashboardSummary, getDashboardSummary } from "@/lib/api/resident";
import styles from "@/styles/dashboard.module.css";

function formatMoney(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function ResidentDashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const summary = await getDashboardSummary();
        if (!cancelled) setData(summary);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to load dashboard."
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

  if (loading) {
    return <p className={styles.welcomeUnit}>Loading dashboard…</p>;
  }

  if (error || !data) {
    return (
      <section className={styles.welcomeCard}>
        <div>
          <h1 className={styles.welcomeTitle}>Dashboard</h1>
          <p style={{ color: "#b91c1c" }}>{error || "No data"}</p>
          <Link className={styles.btnOutline} href="/login" style={{ marginTop: 12, display: "inline-flex" }}>
            Back to Login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={styles.welcomeCard}>
        <div>
          <h1 className={styles.welcomeTitle}>{data.welcome_message || "Welcome back!"}</h1>
          <p className={styles.welcomeUnit}>Unit: {data.unit_number || "—"}</p>
        </div>
        <div className={styles.welcomeActions}>
          <Link className={styles.btnPrimary} href="/resident/maintenance">
            Report Issue
          </Link>
          <Link className={styles.btnOutline} href="/resident/visitors">
            Generate Visitor Pass
          </Link>
        </div>
      </section>

      <div className={styles.grid2}>
        <Link href="/resident/billing" className={styles.card} style={{ textDecoration: "none", color: "inherit" }}>
          <h2 className={styles.cardTitle}>Outstanding Dues</h2>
          <p className={styles.duesAmount}>{formatMoney(data.outstanding_balance ?? 0)}</p>
          <p className={styles.duesStatus}>Payment due this week</p>
          <div className={styles.duesNote}>View billing & payment history →</div>
        </Link>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Active Tickets</h2>
          <div className={styles.ticketList}>
            {(data.recent_tickets ?? []).length === 0 ? (
              <p className={styles.ticketDate}>No recent tickets</p>
            ) : (
              (data.recent_tickets ?? []).slice(0, 3).map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/resident/maintenance/ticket?id=${ticket.id}`}
                  className={styles.ticketRow}
                  style={{ textDecoration: "none", color: "inherit", display: "flex" }}
                >
                  <div>
                    <p className={styles.ticketTitle}>{ticket.subject}</p>
                    <p className={styles.ticketDate}>
                      Status: {ticket.status}
                    </p>
                  </div>
                  <span
                    className={`${styles.badge} ${
                      ticket.status === "Completed" ? styles.badgeResolved : styles.badgePending
                    }`}
                  >
                    {ticket.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <section className={styles.card}>
        <div className={styles.announcementsHeader}>
          <h2>Recent Announcements</h2>
          <Link className={styles.viewAll} href="/resident/announcements">
            View All
          </Link>
        </div>
        <div className={styles.announcementGrid}>
          {(data.latest_announcements ?? []).length === 0 ? (
            <p className={styles.announcementDate}>No announcements yet</p>
          ) : (
            (data.latest_announcements ?? []).slice(0, 2).map((item) => (
              <div key={item.id} className={styles.announcementCard}>
                <h3>{item.title}</h3>
                <p>{item.content}</p>
                <span className={styles.announcementDate}>
                  {item.created_at}
                  {item.category ? ` • ${item.category}` : ""}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
