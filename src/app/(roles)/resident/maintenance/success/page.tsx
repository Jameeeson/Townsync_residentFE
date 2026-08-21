"use client";

import styles from "@/styles/success.module.css";
import { Check, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

type SuccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function SuccessModal({ isOpen, onClose }: SuccessModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.iconWrapper}>
          <Check size={32} strokeWidth={3} />
        </div>

        <h2 className={styles.title}>Maintenance Request Submitted</h2>
        <p className={styles.description}>
          Our team has been notified. You can track the progress of this ticket directly from your
          dashboard.
        </p>

        <div className={styles.summaryBox}>
          <div className={styles.summaryRow}>
            <span className={styles.label}>Ticket ID</span>
            <span className={styles.ticketId}>#REQ-2023-092</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.label}>Category</span>
            <span className={styles.value}>Plumbing</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.label}>Estimated Response</span>
            <span className={styles.estimatedTime}>
              <Clock size={14} /> Within 4 hours
            </span>
          </div>
        </div>

        <div className={styles.buttonStack}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              onClose();
              router.push("/resident");
            }}
          >
            Return to Dashboard
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => router.push("/resident/maintenance/ticket")}
          >
            View Ticket Details
          </button>
        </div>
      </div>
    </div>
  );
}
