"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { getMyStanding, type MyStanding } from "@/lib/services/staff";
import { parseServerDate } from "@/lib/datetime";
import styles from "./StandingPanel.module.css";

function whenShort(value: string | null): string {
  const d = parseServerDate(value);
  return d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
}

function Stars({ value }: { value: number }) {
  return (
    <span className={styles.stars} role="img" aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" className={n <= Math.round(value) ? styles.on : styles.off}>
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

/** The technician's own standing: a suspension from new work (if any) and the ratings residents gave them. */
export function StandingPanel({ onSuspended }: { onSuspended?: (suspended: boolean) => void } = {}) {
  const [data, setData] = useState<MyStanding | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyStanding()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        onSuspended?.(Boolean(result.suspension));
      })
      .catch((e) => {
        if (!cancelled) setFailed(!(e instanceof ApiError && e.status === 403));
      });
    return () => {
      cancelled = true;
    };
    // onSuspended is read once with the result; it is not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed || !data) return null;
  const { suspension, rating, recent } = data;
  const peak = Math.max(...Object.values(rating.distribution), 1);

  return (
    <>
      {suspension ? (
        <section className={styles.suspended} role="status" aria-labelledby="suspended-title">
          <h2 id="suspended-title">You are suspended from new assignments</h2>
          <p>
            Until {whenShort(suspension.ends_at)} ({suspension.days_left} day{suspension.days_left === 1 ? "" : "s"} left).
            You can still finish the tasks you already have and message management.
          </p>
          {suspension.reason ? <p className={styles.reason}>{suspension.reason}</p> : null}
        </section>
      ) : null}

      <section className={styles.panel} aria-labelledby="ratings-title">
        <h2 id="ratings-title">My ratings</h2>
        {rating.count === 0 ? (
          <p className={styles.empty}>No ratings yet. Residents can rate a job after it is done.</p>
        ) : (
          <div className={styles.layout}>
            <div className={styles.score}>
              <strong>{rating.average !== null ? rating.average.toFixed(1) : "—"}</strong>
              {rating.average !== null ? <Stars value={rating.average} /> : null}
              <span>
                {rating.average === null
                  ? `${rating.count} rating${rating.count === 1 ? "" : "s"} so far. The average shows after ${data.min_ratings_for_average}.`
                  : `${rating.count} rating${rating.count === 1 ? "" : "s"}`}
              </span>
            </div>
            <ul className={styles.bars} aria-label="Ratings by number of stars">
              {[5, 4, 3, 2, 1].map((n) => (
                <li key={n}>
                  <span>{n} star{n === 1 ? "" : "s"}</span>
                  <span className={styles.track}><span style={{ width: `${(rating.distribution[n] / peak) * 100}%` }} /></span>
                  <span className={styles.count}>{rating.distribution[n]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recent.some((r) => r.comment) ? (
          <div className={styles.comments}>
            <h3>Recent comments</h3>
            <ul>
              {recent.filter((r) => r.comment).slice(0, 4).map((r) => (
                <li key={r.id}>
                  <div><Stars value={r.rating} /><small>#{r.ticket_id}{r.category ? ` · ${r.category}` : ""} · {whenShort(r.created_at)}</small></div>
                  <p>{r.comment}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </>
  );
}
