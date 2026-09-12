"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import styles from "@/styles/maintenance.module.css";
import type { MaintenanceTicket } from "@/lib/api/resident";

export function SuccessPanel({ ticket }: { ticket: MaintenanceTicket }) {
  const router = useRouter();

  return (
    <div className={`${styles.successPanel} ts-fade-in-up`} role="status">
      <div className={styles.successMark}>
        <Check size={26} strokeWidth={3} />
      </div>
      <p className={styles.successEyebrow}>Request received</p>
      <h2 className={styles.successTicketId}>#{ticket.id}</h2>
      <p className={styles.successBody}>
        A maintenance representative will review your request. You can track its progress from
        your requests list at any time.
      </p>

      <div className={styles.successMeta}>
        <div className={styles.successMetaItem}>
          <span className={styles.successMetaLabel}>Category</span>
          <span className={styles.successMetaValue}>{ticket.category}</span>
        </div>
        <div className={styles.successMetaItem}>
          <span className={styles.successMetaLabel}>Status</span>
          <span className={styles.successMetaValue}>{ticket.status}</span>
        </div>
      </div>

      <div className={styles.successActions}>
        <button type="button" className={styles.submitBtn} onClick={() => router.push("/resident")}>
          Return to dashboard
        </button>
        <Link
          href={`/resident/maintenance/ticket?id=${ticket.id}`}
          className={styles.reviewBack}
        >
          View ticket details →
        </Link>
      </div>
    </div>
  );
}

export default SuccessPanel;
