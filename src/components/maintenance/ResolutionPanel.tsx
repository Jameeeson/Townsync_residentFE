"use client";

import { useState } from "react";
import { CheckCircle2, Hourglass, RotateCcw } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { confirmMaintenanceResolution } from "@/lib/api/resident";
import { parseServerDate } from "@/lib/datetime";
import styles from "./resolutionPanel.module.css";

type Props = {
  ticketId: number;
  autoCloseAt?: string | null;
  /** The resident already said it is not fixed; management decides what happens next. */
  reported?: boolean;
  /** Called after the server accepted the confirmation: the ticket is Closed. */
  onClosed: () => void;
  /** "No, it is not fixed": the page opens the report form. */
  onReportNotFixed: () => void;
};

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : fallback;
}

/** Shown while the technician's work is Resolved and waiting for the resident: confirm it, or say it is not fixed. */
export default function ResolutionPanel({ ticketId, autoCloseAt, reported = false, onClosed, onReportNotFixed }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const closeDate = parseServerDate(autoCloseAt)?.toLocaleDateString(undefined, { month: "long", day: "numeric" });

  async function confirmFixed() {
    setBusy(true);
    setError("");
    try {
      await confirmMaintenanceResolution(ticketId, true);
      onClosed();
    } catch (err) {
      setError(errorText(err, "Could not record your confirmation."));
      setBusy(false);
    }
  }

  if (reported) {
    return (
      <section className={styles.panel} aria-labelledby="resolution-title">
        <div className={styles.head}>
          <span className={styles.icon}><Hourglass size={18} aria-hidden="true" /></span>
          <div>
            <h2 id="resolution-title">Your report was sent</h2>
            <p>
              Management has your message and photos. You will see their answer on this page and in your notifications.
              This request will not close in the meantime.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="resolution-title">
      <div className={styles.head}>
        <span className={styles.icon}><Hourglass size={18} aria-hidden="true" /></span>
        <div>
          <h2 id="resolution-title">Is the problem fixed?</h2>
          <p>
            The technician reported the work as done. Please check, then tell us.
            {closeDate ? ` If we do not hear from you, this request closes on ${closeDate}.` : ""}
          </p>
        </div>
      </div>

      {!confirming ? (
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => setConfirming(true)}>
            <CheckCircle2 size={16} aria-hidden="true" /> Yes, it is fixed
          </button>
          <button type="button" className={styles.secondary} onClick={onReportNotFixed}>
            <RotateCcw size={16} aria-hidden="true" /> No, it is not fixed
          </button>
        </div>
      ) : (
        <div className={styles.confirm}>
          <p>Close this request? You can still message management if something comes up.</p>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => void confirmFixed()} disabled={busy}>
              {busy ? "Saving…" : "Yes, close it"}
            </button>
            <button type="button" className={styles.secondary} onClick={() => { setConfirming(false); setError(""); }} disabled={busy}>
              Back
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
