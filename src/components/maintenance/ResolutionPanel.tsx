"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Hourglass, RotateCcw } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { confirmMaintenanceResolution, reportNotFixed } from "@/lib/api/resident";
import { parseServerDate } from "@/lib/datetime";
import PhotoPicker from "./PhotoPicker";
import styles from "./resolutionPanel.module.css";

const MIN_CHARS = 10;

type Props = {
  ticketId: number;
  autoCloseAt?: string | null;
  /** Called after the server accepted the answer; the argument is the ticket's new stage. */
  onAnswered: (stage: "Closed" | "Reopened") => void;
};

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : fallback;
}

/** Shown while the technician's work is Resolved and waiting for the resident: confirm it, or say it is not fixed. */
export default function ResolutionPanel({ ticketId, autoCloseAt, onAnswered }: Props) {
  const [mode, setMode] = useState<"ask" | "confirm" | "notFixed">("ask");
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const closeDate = parseServerDate(autoCloseAt)?.toLocaleDateString(undefined, { month: "long", day: "numeric" });

  async function confirmFixed() {
    setBusy(true);
    setError("");
    try {
      await confirmMaintenanceResolution(ticketId, true);
      onAnswered("Closed");
    } catch (err) {
      setError(errorText(err, "Could not record your confirmation."));
      setBusy(false);
    }
  }

  async function submitNotFixed(e: FormEvent) {
    e.preventDefault();
    if (message.trim().length < MIN_CHARS) {
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
      onAnswered("Reopened");
    } catch (err) {
      setError(errorText(err, "Could not send your report."));
      setBusy(false);
    }
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

      {mode === "ask" ? (
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => setMode("confirm")}>
            <CheckCircle2 size={16} aria-hidden="true" /> Yes, it is fixed
          </button>
          <button type="button" className={styles.secondary} onClick={() => setMode("notFixed")}>
            <RotateCcw size={16} aria-hidden="true" /> No, it is not fixed
          </button>
        </div>
      ) : null}

      {mode === "confirm" ? (
        <div className={styles.confirm}>
          <p>Close this request? You can still message management if something comes up.</p>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => void confirmFixed()} disabled={busy}>
              {busy ? "Saving…" : "Yes, close it"}
            </button>
            <button type="button" className={styles.secondary} onClick={() => { setMode("ask"); setError(""); }} disabled={busy}>
              Back
            </button>
          </div>
        </div>
      ) : null}

      {mode === "notFixed" ? (
        <form className={styles.form} onSubmit={submitNotFixed} noValidate>
          <label htmlFor="not-fixed-message">What is still wrong?</label>
          <textarea
            id="not-fixed-message"
            rows={4}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. The sink under the faucet is still dripping after you ran the water."
            required
          />
          <span className={styles.label}>Photos of the problem (required)</span>
          <PhotoPicker files={photos} onChange={setPhotos} onReject={setError} inputId="not-fixed-photos" />
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={busy}>
              {busy ? "Sending…" : "Send to management"}
            </button>
            <button type="button" className={styles.secondary} onClick={() => { setMode("ask"); setError(""); }} disabled={busy}>
              Back
            </button>
          </div>
          <p className={styles.note}>Management will be alerted and will send a technician back.</p>
        </form>
      ) : null}
    </section>
  );
}
