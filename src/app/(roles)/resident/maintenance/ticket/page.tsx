"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import styles from "@/styles/ticketdetail.module.css";
import {
  ArrowLeft,
  MessageSquare,
  AlertCircle,
  RefreshCcw,
  Bot,
} from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import {
  MaintenanceTicket,
  cancelMaintenanceTicket,
  getMaintenanceTicket,
} from "@/lib/api/resident";

function TicketDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const ticketId = idParam ? Number(idParam) : NaN;

  const [ticket, setTicket] = useState<MaintenanceTicket | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(ticketId)) {
      setError("Missing ticket id. Open a ticket from history.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await getMaintenanceTicket(ticketId);
        if (!cancelled) setTicket(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to load ticket."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  async function handleCancel() {
    if (!ticket) return;
    const confirmed = window.confirm(
      "Cancel this maintenance request? Management will be notified."
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      await cancelMaintenanceTicket(ticket.id);
      router.push("/resident/maintenance/history");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not cancel ticket."
      );
      setCancelling(false);
    }
  }

  if (loading) {
    return <p style={{ padding: 24 }}>Loading ticket…</p>;
  }

  if (error || !ticket) {
    return (
      <div className={styles.container}>
        <p style={{ color: "#b91c1c" }}>{error || "Ticket not found"}</p>
        <Link href="/resident/maintenance/history" className={styles.backBtn}>
          <ArrowLeft size={16} /> Back to history
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.navRow}>
        <div className={styles.breadcrumb}>
          Maintenance &gt; <strong>Ticket #{ticket.id}</strong>
        </div>
        <Link href="/resident/maintenance/history" className={styles.backBtn}>
          <ArrowLeft size={16} /> Return to Maintenance Center
        </Link>
      </div>

      <div className={styles.titleRow}>
        <div className={styles.titleMain}>
          <h1>{ticket.subject}</h1>
          <div className={styles.badgeGroup}>
            <span className={`${styles.badge} ${styles.inProgress}`}>
              <RefreshCcw size={12} /> {ticket.status}
            </span>
            <span className={`${styles.badge} ${styles.urgent}`}>
              <AlertCircle size={12} /> {ticket.priority_level}
            </span>
          </div>
        </div>
        <div className={styles.actionGroup}>
          <Link
            href={`/resident/maintenance/chat?id=${ticket.id}`}
            className={styles.btnPrimary}
            style={{ textDecoration: "none" }}
          >
            <MessageSquare size={18} /> Message Management
          </Link>
          {ticket.status !== "Cancelled" && ticket.status !== "Completed" ? (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => void handleCancel()}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling…" : "Cancel Request"}
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.contentColumn}>
          <div className={styles.mainCard}>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <label>Submitted</label>
                <span>{ticket.created_at}</span>
              </div>
              <div className={styles.metaItem}>
                <label>Category</label>
                <span>{ticket.category}</span>
              </div>
              <div className={styles.metaItem}>
                <label>Priority</label>
                <span>{ticket.priority_level}</span>
              </div>
            </div>

            <div className={styles.contentBody}>
              <h3>Description</h3>
              <p className={styles.description}>{ticket.detailed_description}</p>
            </div>
          </div>

          <div className={styles.aiInsightBox}>
            <div className={styles.aiHeader}>
              <Bot size={20} /> Ticket details
            </div>
            <div className={styles.aiGrid}>
              <div className={styles.aiStatItem}>
                <div className={styles.aiStatLabel}>Status</div>
                <div className={styles.aiStatValue}>{ticket.status}</div>
              </div>
              <div className={styles.aiStatItem}>
                <div className={styles.aiStatLabel}>Category</div>
                <div className={styles.aiStatValue}>{ticket.category}</div>
              </div>
              <div className={styles.aiStatItem}>
                <div className={styles.aiStatLabel}>Priority</div>
                <div className={styles.aiStatValue}>{ticket.priority_level}</div>
              </div>
              <div className={styles.aiStatItem}>
                <div className={styles.aiStatLabel}>Ticket ID</div>
                <div className={styles.aiStatValue}>#{ticket.id}</div>
              </div>
            </div>
          </div>
        </div>

        <aside>
          <div className={styles.timelineCard}>
            <h3 className={styles.timelineTitle}>Activity Timeline</h3>
            {(ticket.activity_timeline ?? []).length === 0 ? (
              <p className={styles.timelineText}>No activity events yet.</p>
            ) : (
              (ticket.activity_timeline as Array<Record<string, unknown>>).map((event, index) => (
                <div key={index} className={styles.timelineItem}>
                  <div className={styles.timelineDot}></div>
                  <div className={styles.timelineDate}>
                    {String(event.date ?? event.at ?? "")}
                  </div>
                  <div className={styles.timelineHeading}>
                    {String(event.title ?? event.heading ?? "Update")}
                  </div>
                  <p className={styles.timelineText}>
                    {String(event.description ?? event.text ?? "")}
                  </p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function TicketDetailPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Loading…</p>}>
      <TicketDetail />
    </Suspense>
  );
}
