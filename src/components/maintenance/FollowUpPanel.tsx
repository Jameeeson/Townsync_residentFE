"use client";

import { FormEvent, useState } from "react";
import { BellRing, Clock3 } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { followUpOnTicket } from "@/lib/api/resident";
import { parseServerDate } from "@/lib/datetime";
import styles from "./followUpPanel.module.css";

type Props = {
  ticketId: number;
  expectedBy: string | null | undefined;
  /** The next time a follow-up may be sent; empty when one can be sent now. */
  availableAt: string | null | undefined;
  count: number;
  onSent: () => void;
};

function when(value: string | null | undefined): string {
  const parsed = parseServerDate(value);
  return parsed
    ? parsed.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "";
}

/** Shown on a late request: tells the resident it is late and lets them ask management for an update (once a day). */
export default function FollowUpPanel({ ticketId, expectedBy, availableAt, count, onSent }: Props) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await followUpOnTicket(ticketId, note.trim());
      setNote("");
      onSent();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : "Could not send your follow-up.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="follow-up-title">
      <div className={styles.head}>
        <span className={styles.icon}>
          <Clock3 size={20} aria-hidden="true" />
        </span>
        <div>
          <h2 id="follow-up-title">This is taking longer than expected</h2>
          <p>
            {expectedBy ? `It was expected by ${when(expectedBy)}. ` : ""}
            We are sorry for the wait.
          </p>
        </div>
      </div>

      {availableAt ? (
        <p className={styles.sent} role="status">
          <BellRing size={16} aria-hidden="true" />
          {count > 1 ? `You asked ${count} times. ` : ""}Management knows you are waiting. You can ask again after {when(availableAt)}.
        </p>
      ) : (
        <form className={styles.form} onSubmit={submit}>
          <label htmlFor="follow-up-note">Add a message (optional)</label>
          <textarea
            id="follow-up-note"
            rows={2}
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="For example: I am home all day tomorrow."
          />
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className={styles.button} disabled={busy}>
            <BellRing size={17} aria-hidden="true" /> {busy ? "Sending…" : "Ask for an update"}
          </button>
        </form>
      )}
    </section>
  );
}
