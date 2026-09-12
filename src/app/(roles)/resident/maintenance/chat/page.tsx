"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "@/styles/chat.module.css";
import { ArrowLeft, MessagesSquare, Phone } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { MaintenanceTicket, getMaintenanceTicket } from "@/lib/api/resident";

function MessagesUnavailable() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const ticketId = idParam ? Number(idParam) : NaN;
  const hasTicket = Number.isFinite(ticketId);

  const [ticket, setTicket] = useState<MaintenanceTicket | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasTicket) return;
    let cancelled = false;
    getMaintenanceTicket(ticketId)
      .then((data) => {
        if (!cancelled) setTicket(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to load ticket."
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hasTicket, ticketId]);

  const backHref = hasTicket
    ? `/resident/maintenance/ticket?id=${ticketId}`
    : "/resident/maintenance";

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Link href={backHref} aria-label="Back to ticket" className={styles.backLink}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className={styles.titleMain}>
              {ticket ? ticket.subject : "Messages"}
            </div>
            <div className={styles.titleSub}>
              {hasTicket ? `Ticket #${ticketId}` : "Maintenance"}
            </div>
          </div>
        </div>
      </header>

      {error ? (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.comingSoon}>
        <div className={styles.comingSoonIcon} aria-hidden="true">
          <MessagesSquare size={24} />
        </div>
        <h1 className={styles.comingSoonTitle}>Direct messaging isn&apos;t available yet</h1>
        <p className={styles.comingSoonBody}>
          You can&apos;t message the property team from a ticket just yet. In the meantime, track
          this request&apos;s status from your requests list, or call the resident hotline
          for anything urgent.
        </p>
        <div className={styles.comingSoonActions}>
          <Link href={backHref} className="ts-btn ts-btn-secondary">
            <ArrowLeft size={16} /> Back to ticket
          </Link>
          <a href="tel:+15550123456" className="ts-btn ts-btn-primary">
            <Phone size={16} /> Call resident hotline
          </a>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className={styles.container} aria-busy="true" />}>
      <MessagesUnavailable />
    </Suspense>
  );
}
