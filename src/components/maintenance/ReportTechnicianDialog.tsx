"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { reportTechnician, TECHNICIAN_REPORT_CATEGORIES } from "@/lib/api/resident";
import styles from "./reportTechnicianDialog.module.css";

type Props = {
  ticketId: number;
  onClose: () => void;
  /** Called once the administrator has the report. */
  onSent: () => void;
};

/** Lets a resident tell management about the technician's conduct on their request (rude, no-show, poor work, safety). */
export default function ReportTechnicianDialog({ ticketId, onClose, onSent }: Props) {
  const [category, setCategory] = useState<string>("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("button, textarea")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [busy, onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!category) {
      setError("Choose what the report is about.");
      return;
    }
    if (details.trim().length < 10) {
      setError("Tell us what happened, in at least a sentence.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await reportTechnician(ticketId, category, details.trim());
      onSent();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : "Could not send your report.");
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={() => !busy && onClose()}>
      <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="report-tech-title" onClick={(e) => e.stopPropagation()}>
        <header className={styles.head}>
          <span className={styles.icon}><ShieldAlert size={18} aria-hidden="true" /></span>
          <div>
            <h2 id="report-tech-title">Report the technician</h2>
            <p>Only the administrator sees this. The technician is not told who reported.</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} disabled={busy} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <form className={styles.form} onSubmit={submit} noValidate>
          <fieldset className={styles.reasons}>
            <legend>What is this about?</legend>
            {TECHNICIAN_REPORT_CATEGORIES.map((c) => (
              <label key={c} className={category === c ? styles.reasonOn : styles.reason}>
                <input type="radio" name="reason" value={c} checked={category === c} onChange={() => setCategory(c)} />
                {c}
              </label>
            ))}
          </fieldset>

          <label className={styles.label} htmlFor="report-tech-details">What happened?</label>
          <textarea
            id="report-tech-details"
            rows={5}
            maxLength={1000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Describe what the technician said or did, and when."
          />
          <p className={styles.count}>{details.length} / 1000</p>

          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={busy}>
              {busy ? "Sending…" : "Send report"}
            </button>
            <button type="button" className={styles.secondary} onClick={onClose} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
