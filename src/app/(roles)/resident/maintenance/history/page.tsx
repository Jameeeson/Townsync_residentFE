"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "@/styles/history.module.css";
import { Calendar, Wrench, ArrowLeft } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { MaintenanceTicket, listMaintenanceTickets } from "@/lib/api/resident";

export default function HistoryPage() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [filter, setFilter] = useState<"all" | "completed">("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listMaintenanceTickets();
        if (!cancelled) setTickets(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to load tickets."
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

  const filtered =
    filter === "completed"
      ? tickets.filter((t) => t.status === "Completed")
      : tickets;

  const activeTicket =
    selectedTicket && filtered.some((t) => t.id === selectedTicket.id)
      ? selectedTicket
      : filtered[0] ?? null;

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h1 className={styles.pageTitle}>Maintenance Center</h1>
        <p className={styles.pageDesc}>Track and manage your service requests.</p>
      </div>

      <nav className={styles.tabs}>
        <Link className={styles.tab} href="/resident/maintenance">
          Current Support
        </Link>
        <div className={`${styles.tab} ${styles.activeTab}`}>Maintenance History</div>
      </nav>

      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      {loading ? <p>Loading tickets…</p> : null}

      <div className={styles.mainLayout}>
        <aside className={`${styles.sidebar} ${selectedTicket ? styles.sidebarHidden : ""}`}>
          <div className={styles.filters}>
            <button
              type="button"
              className={`${styles.filterBtn} ${filter === "all" ? styles.filterBtnActive : ""}`}
              onClick={() => {
                setFilter("all");
                setSelectedTicket(null);
              }}
            >
              All
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${
                filter === "completed" ? styles.filterBtnActive : ""
              }`}
              onClick={() => {
                setFilter("completed");
                setSelectedTicket(null);
              }}
            >
              Completed
            </button>
          </div>

          <div className={styles.requestList}>
            {filtered.map((ticket) => (
              <div
                key={ticket.id}
                className={`${styles.requestCard} ${
                  activeTicket?.id === ticket.id ? styles.requestCardActive : ""
                }`}
                onClick={() => setSelectedTicket(ticket)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedTicket(ticket);
                }}
                role="button"
                tabIndex={0}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.requestId}>#{ticket.id}</span>
                  <span
                    className={`${styles.badge} ${
                      ticket.status === "In Progress"
                        ? styles.inProgress
                        : ticket.status === "Completed"
                          ? styles.inProgress
                          : styles.pending
                    }`}
                  >
                    • {ticket.status}
                  </span>
                </div>
                <div className={styles.cardTitle}>{ticket.subject}</div>
                <div className={styles.cardMeta}>
                  <span>
                    <Calendar size={12} /> {ticket.created_at}
                  </span>
                  <span>
                    <Wrench size={12} /> {ticket.category}
                  </span>
                </div>
              </div>
            ))}
            {!loading && filtered.length === 0 ? (
              <p style={{ padding: 16, color: "#64748b", fontSize: 14 }}>
                No tickets yet.
              </p>
            ) : null}
          </div>
        </aside>

        {activeTicket ? (
          <main
            className={`${styles.detailView} ${selectedTicket ? styles.detailViewOpen : ""}`}
          >
            <button
              type="button"
              className={styles.mobileBackButton}
              onClick={() => setSelectedTicket(null)}
            >
              <ArrowLeft size={18} /> Back to Requests
            </button>

            <div className={styles.detailHeader}>
              <h2 style={{ fontSize: "24px", fontWeight: 800 }}>{activeTicket.subject}</h2>
              <span
                className={`${styles.badge} ${styles.inProgress}`}
                style={{ padding: "6px 12px" }}
              >
                • {activeTicket.status}
              </span>
            </div>
            <div className={styles.detailTicket}>Ticket #{activeTicket.id}</div>

            <div className={styles.infoGrid}>
              <div>
                <div className={styles.infoLabel}>Submitted</div>
                <div className={styles.infoValue}>{activeTicket.created_at}</div>
              </div>
              <div>
                <div className={styles.infoLabel}>Category</div>
                <div className={styles.infoValue}>{activeTicket.category}</div>
              </div>
              <div>
                <div className={styles.infoLabel}>Priority</div>
                <div className={styles.infoValue} style={{ color: "#9a3412" }}>
                  {activeTicket.priority_level}
                </div>
              </div>
              <div>
                <div className={styles.infoLabel}>Status</div>
                <div className={styles.infoValue}>{activeTicket.status}</div>
              </div>
            </div>

            <div className={styles.descriptionSection}>
              <h4>Description</h4>
              <p className={styles.descriptionText}>{activeTicket.detailed_description}</p>
            </div>

            <div style={{ marginTop: 24 }}>
              <Link
                href={`/resident/maintenance/ticket?id=${activeTicket.id}`}
                style={{ color: "#1e3a8a", fontWeight: 600, fontSize: 14 }}
              >
                Open full ticket details →
              </Link>
            </div>
          </main>
        ) : null}
      </div>
    </div>
  );
}
