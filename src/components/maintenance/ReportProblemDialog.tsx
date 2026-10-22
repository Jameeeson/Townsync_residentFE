"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageSquareWarning, RotateCcw, ShieldAlert, X } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { reportNotFixed, reportTechnician, TECHNICIAN_REPORT_CATEGORIES } from "@/lib/api/resident";
import PhotoPicker from "./PhotoPicker";
import styles from "./reportTechnicianDialog.module.css";

type Kind = "notFixed" | "technician";

type Props = {
  ticketId: number;
  /** The ticket is Resolved and the resident has not reported it yet. */
  canReportNotFixed: boolean;
  /** A technician handled the request and has not been reported yet. */
  canReportTechnician: boolean;
  /** Skip the question and open one form straight away (the "No, it is not fixed" button does this). */
  startWith?: Kind;
  onClose: () => void;
  /** Called once management has the report. */
  onSent: (kind: Kind) => void;
};

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : fallback;
}

/** The one place a resident says something went wrong: the problem is still there, or the technician behaved badly. */
export default function ReportProblemDialog({ ticketId, canReportNotFixed, canReportTechnician, startWith, onClose, onSent }: Props) {
  const only: Kind | null = canReportNotFixed && !canReportTechnician ? "notFixed" : canReportTechnician && !canReportNotFixed ? "technician" : null;
  const [kind, setKind] = useState<Kind | null>(startWith ?? only);
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
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

  async function submitNotFixed(e: FormEvent) {
    e.preventDefault();
    if (message.trim().length < 10) {
      setError("Tell us what is still wrong, in at least a sentence.");
      return;
    }
    if (photos.length === 0) {
      setError("Add at least one photo so we can see the problem.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await reportNotFixed(ticketId, message.trim(), photos);
      onSent("notFixed");
    } catch (err) {
      setError(errorText(err, "Could not send your report."));
      setBusy(false);
    }
  }

  async function submitTechnician(e: FormEvent) {
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
      onSent("technician");
    } catch (err) {
      setError(errorText(err, "Could not send your report."));
      setBusy(false);
    }
  }

  const title = kind === "notFixed" ? "It is not fixed" : kind === "technician" ? "Report the technician" : "Something went wrong";
  const intro =
    kind === "notFixed"
      ? "Management gets your message and photos and decides whether to send a technician back."
      : kind === "technician"
        ? "Only management sees this. The technician is not told who reported."
        : "What happened? Management reads every report and sends one reply.";

  return (
    <div className={styles.overlay} role="presentation" onClick={() => !busy && onClose()}>
      <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="report-problem-title" onClick={(e) => e.stopPropagation()}>
        <header className={styles.head}>
          <span className={styles.icon}>
            {kind === "notFixed" ? <RotateCcw size={18} aria-hidden="true" /> : kind === "technician" ? <ShieldAlert size={18} aria-hidden="true" /> : <MessageSquareWarning size={18} aria-hidden="true" />}
          </span>
          <div>
            <h2 id="report-problem-title">{title}</h2>
            <p>{intro}</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} disabled={busy} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        {kind === null ? (
          <div className={styles.form}>
            <div className={styles.choices}>
              {canReportNotFixed ? (
                <button type="button" className={styles.choice} onClick={() => setKind("notFixed")}>
                  <RotateCcw size={18} aria-hidden="true" />
                  <span>
                    <strong>The problem is still there</strong>
                    <small>Send a message and photos. Management decides on another visit.</small>
                  </span>
                </button>
              ) : null}
              {canReportTechnician ? (
                <button type="button" className={styles.choice} onClick={() => setKind("technician")}>
                  <ShieldAlert size={18} aria-hidden="true" />
                  <span>
                    <strong>About the technician</strong>
                    <small>Rude, late, poor work, or a safety concern.</small>
                  </span>
                </button>
              ) : null}
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.secondary} onClick={onClose}>Cancel</button>
            </div>
          </div>
        ) : null}

        {kind === "notFixed" ? (
          <form className={styles.form} onSubmit={submitNotFixed} noValidate>
            <label className={styles.label} htmlFor="not-fixed-message">What is still wrong?</label>
            <textarea
              id="not-fixed-message"
              rows={4}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. The sink under the faucet is still dripping after you ran the water."
            />
            <p className={styles.count}>{message.length} / 1000</p>
            <span className={styles.label}>Photos of the problem (required)</span>
            <PhotoPicker files={photos} onChange={setPhotos} onReject={setError} inputId="not-fixed-photos" />
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            <div className={styles.actions}>
              <button type="submit" className={styles.primary} disabled={busy}>{busy ? "Sending…" : "Send to management"}</button>
              <button type="button" className={styles.secondary} onClick={only || startWith ? onClose : () => { setKind(null); setError(""); }} disabled={busy}>
                {only || startWith ? "Cancel" : "Back"}
              </button>
            </div>
          </form>
        ) : null}

        {kind === "technician" ? (
          <form className={styles.form} onSubmit={submitTechnician} noValidate>
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
              <button type="submit" className={styles.primary} disabled={busy}>{busy ? "Sending…" : "Send report"}</button>
              <button type="button" className={styles.secondary} onClick={only || startWith ? onClose : () => { setKind(null); setError(""); }} disabled={busy}>
                {only || startWith ? "Cancel" : "Back"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
