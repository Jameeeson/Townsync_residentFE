"use client";

import { useState } from "react";
import { MessageSquareText, Star } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { giveMaintenanceFeedback, FEEDBACK_TAGS, type TicketFeedback } from "@/lib/api/resident";
import styles from "./feedbackPanel.module.css";

type Props = {
  ticketId: number;
  /** The rating given so far, if any. */
  feedback?: TicketFeedback | null;
  /** The resident may give or change a rating right now. */
  canGive: boolean;
  /** Called with the saved rating so the page can show it without reloading. */
  onSaved: (feedback: TicketFeedback) => void;
};

const LABELS = ["Very poor", "Poor", "Okay", "Good", "Excellent"];
const LOW_STARS = 2;
const MIN_COMMENT = 10;

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : fallback;
}

/** Rate the finished job: stars, a few quick tags and an optional comment. Never blocks confirming the fix. */
export default function FeedbackPanel({ ticketId, feedback, canGive, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [stars, setStars] = useState(feedback?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>(feedback?.tags ?? []);
  const [comment, setComment] = useState(feedback?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const showForm = canGive && (!feedback || editing);
  const low = stars > 0 && stars <= LOW_STARS;
  const shown = hover || stars;

  async function submit() {
    if (stars < 1) {
      setError("Choose a number of stars first.");
      return;
    }
    if (low && comment.trim().length < MIN_COMMENT) {
      setError("Please tell us what went wrong, in at least a sentence, so we can follow up.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await giveMaintenanceFeedback(ticketId, { rating: stars, comment: comment.trim() || undefined, tags });
      onSaved({
        rating: stars,
        comment: comment.trim() || null,
        tags,
        created_at: feedback?.created_at ?? new Date().toISOString(),
        can_edit: true,
        management_reply: feedback?.management_reply ?? null,
      });
      setEditing(false);
    } catch (err) {
      setError(errorText(err, "Could not save your rating."));
    } finally {
      setBusy(false);
    }
  }

  if (!showForm && !feedback) return null;

  if (!showForm && feedback) {
    return (
      <section className={styles.panel} aria-labelledby="feedback-title">
        <div className={styles.head}>
          <span className={styles.icon}><Star size={18} aria-hidden="true" /></span>
          <div>
            <h2 id="feedback-title">Your rating</h2>
            <p className={styles.stars} aria-label={`${feedback.rating} of 5 stars`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={18} aria-hidden="true" className={n <= feedback.rating ? styles.on : styles.off} />
              ))}
              <span>{LABELS[feedback.rating - 1]}</span>
            </p>
          </div>
        </div>
        {feedback.tags.length ? (
          <ul className={styles.tagList}>{feedback.tags.map((t) => <li key={t}>{t}</li>)}</ul>
        ) : null}
        {feedback.comment ? <p className={styles.comment}>{feedback.comment}</p> : null}
        {feedback.management_reply ? (
          <div className={styles.reply}>
            <h3><MessageSquareText size={15} aria-hidden="true" /> Management replied</h3>
            <p>{feedback.management_reply}</p>
            <small>This is management&apos;s answer; it cannot be replied to here.</small>
          </div>
        ) : null}
        {canGive ? (
          <button type="button" className={styles.link} onClick={() => setEditing(true)}>Change my rating</button>
        ) : null}
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="feedback-title">
      <div className={styles.head}>
        <span className={styles.icon}><Star size={18} aria-hidden="true" /></span>
        <div>
          <h2 id="feedback-title">How was the repair?</h2>
          <p>Your rating helps management look after the quality of the work. It takes a few seconds.</p>
        </div>
      </div>

      <div role="radiogroup" aria-label="Rating, 1 to 5 stars" className={styles.picker} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}, ${LABELS[n - 1]}`}
            className={styles.starBtn}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => { setStars(n); setError(""); }}
          >
            <Star size={32} aria-hidden="true" className={n <= shown ? styles.on : styles.off} />
          </button>
        ))}
        <span className={styles.word} aria-live="polite">{shown ? LABELS[shown - 1] : "Tap a star"}</span>
      </div>

      <fieldset className={styles.tags}>
        <legend>What stood out? (optional)</legend>
        <div className={styles.tagRow}>
          {FEEDBACK_TAGS.map((tag) => {
            const on = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                className={`${styles.tag} ${on ? styles.tagOn : ""}`}
                onClick={() => setTags((current) => (on ? current.filter((t) => t !== tag) : current.length < 5 ? [...current, tag] : current))}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className={styles.field}>
        <label htmlFor="feedback-comment">
          {low ? "What went wrong?" : "Comment (optional)"}
        </label>
        <textarea
          id="feedback-comment"
          value={comment}
          maxLength={1000}
          rows={3}
          placeholder={low ? "Tell us what happened so management can follow up." : "Anything you would like management to know."}
          onChange={(e) => setComment(e.target.value)}
          aria-required={low}
        />
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => void submit()} disabled={busy}>
          {busy ? "Saving…" : feedback ? "Save changes" : "Send rating"}
        </button>
        {feedback ? (
          <button type="button" className={styles.secondary} onClick={() => { setEditing(false); setError(""); }} disabled={busy}>
            Cancel
          </button>
        ) : null}
      </div>
      <p className={styles.note}>You can change your rating for 24 hours. The technician never sees your name.</p>
    </section>
  );
}
