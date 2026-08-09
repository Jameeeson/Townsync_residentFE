"use client";

import Link from "next/link";
import { useCallback, useRef } from "react";
import { IconCheck } from "@/components/icons";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import styles from "./SuccessModal.module.css";

type Props = {
  unit: string;
  onClose: () => void;
};

/** Mount only while open. */
export function SuccessModal({ unit, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => onClose(), [onClose]);
  useDialogA11y(true, handleClose, modalRef);

  return (
    <div className={styles.overlay} role="presentation" onClick={handleClose}>
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.icon}>
          <IconCheck size={28} />
        </div>
        <h2 id="success-title">Maintenance Report Submitted</h2>
        <p>
          Your report for <strong>Unit {unit}</strong> has been successfully
          logged. It is now awaiting administrator triage and assignment.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={handleClose}>
            Back to Dashboard
          </button>
          <Link
            href="/staff/logs"
            className={styles.secondary}
            onClick={handleClose}
          >
            View Log Details
          </Link>
        </div>
      </div>
    </div>
  );
}
