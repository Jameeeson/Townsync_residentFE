"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import styles from "@/styles/ticketdetail.module.css";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import {
  MaintenanceTicket,
  cancelMaintenanceTicket,
  getMaintenanceTicket,
} from "@/lib/api/resident";
import { badgeClassName, priorityTone, statusTone } from "@/lib/maintenanceStatus";

function TicketDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const ticketId = idParam ? Number(idParam) : NaN;

  const [ticket, setTicket] = useState<MaintenanceTicket | null>(null);
  const [fetchError, setError] = useState("");
  const [fetching, setLoading] = useState(true);
  const invalidId = !Number.isFinite(ticketId);
  const error = invalidId ? "Missing ticket id. Open a ticket from the maintenance page." : fetchError;
  const loading = invalidId ? false : fetching;
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (invalidId) return;

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
  }, [ticketId, invalidId]);

  async function handleCancel() {
    if (!ticket) return;
    const confirmed = window.confirm(
      "Cancel this maintenance request? Management will be notified."
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      await cancelMaintenanceTicket(ticket.id);
      router.push("/resident/maintenance");
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
    return (
      <div className={styles.container} aria-busy="true" aria-label="Loading ticket">
        <div className="ts-skeleton" style={{ width: 240, height: 28, marginBottom: 16 }}>Loading</div>
        <div className="ts-skeleton" style={{ width: "100%", maxWidth: 640, height: 200 }}>Loading</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className={styles.container}>
        <p className={styles.errorBanner} role="alert">{error || "Ticket not found"}</p>
        <Link href="/resident/maintenance" className={styles.backBtn}>
          <ArrowLeft size={16} /> Back to maintenance
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
        <Link href="/resident/maintenance" className={styles.backBtn}>
          <ArrowLeft size={16} /> Return to Maintenance
        </Link>
      </div>

      <div className={styles.titleRow}>
        <div className={styles.titleMain}>
          <h1>{ticket.subject}</h1>
          <div className={styles.badgeGroup}>
            <span className={badgeClassName(statusTone(ticket.status))}>{ticket.status}</span>
            <span className={badgeClassName(priorityTone(ticket.priority_level))}>
              {ticket.priority_level}
            </span>
          </div>
        </div>
        <div className={styles.actionGroup}>
          <Link
            href={`/resident/maintenance/chat?id=${ticket.id}`}
            className={styles.btnPrimary}
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
                <label>Ticket ID</label>
                <span>#{ticket.id}</span>
              </div>
              <div className={styles.metaItem}>
                <label>Submitted</label>
                <span>{ticket.created_at}</span>
              </div>
              <div className={styles.metaItem}>
                <label>Category</label>
                <span>{ticket.category}</span>
              </div>
              {ticket.preferred_date ? (
                <div className={styles.metaItem}>
                  <label>Preferred visit date</label>
                  <span>{ticket.preferred_date}</span>
                </div>
              ) : null}
            </div>

            <div className={styles.contentBody}>
              <h3>Description</h3>
              <p className={styles.description}>{ticket.detailed_description}</p>
            </div>
          </div>
        </div>

        <aside>
          <div className={styles.timelineCard}>
            <h3 className={styles.timelineTitle}>Activity Timeline</h3>
            {(ticket.activity_timeline ?? []).length === 0 ? (
              <p className={styles.timelineEmpty}>No activity events yet.</p>
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
    <Suspense fallback={<div className={styles.container} aria-busy="true" />}>
      <TicketDetail />
    </Suspense>
  );
}
