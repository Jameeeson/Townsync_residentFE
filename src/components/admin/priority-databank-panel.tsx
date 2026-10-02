"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { SOURCE_LABEL } from "@/components/admin/priority-votes-panel";
import styles from "@/components/styles/PriorityDatabank.module.css";

const REFRESH_MS = 15000;
const PRIORITIES = ["Low", "Medium", "High", "Emergency"] as const;
const SOURCE_ORDER = ["maintenance", "admin", "engine", "ai"] as const;

type DatabankStats = {
  total: number;
  active: number;
  excluded: number;
  manual: number;
  from_tickets: number;
  avg_agreement: number | null;
  by_priority: Record<string, number>;
  source_agreement: { source: string; votes: number; matched: number; rate: number | null }[];
  engine_vs_final: { matched: number; raised: number; lowered: number };
  learning_applied: number;
  top_categories: { category: string; count: number }[];
  timeline: { date: string; count: number }[];
  recent: {
    request_id: number;
    final_priority: string;
    agreement: number;
    triage_text: string;
    category: string | null;
    active: boolean;
    origin: "ticket" | "manual";
    created_at: string | null;
    votes: { source: string; priority: string }[];
  }[];
  engine: {
    version: number;
    precedents_loaded: number;
    min_count: number;
    min_agreement: number;
    min_similarity: number;
    weights: Record<string, number>;
  };
};

function pct(value: number | null | undefined) {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

function shortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Live view of the priority-learning databank: what the engine, AI, admin and maintenance
 * voted, which verdicts won, and how often the engine has used what it learned. */
export function PriorityDatabankPanel({ className }: { className?: string }) {
  const [stats, setStats] = useState<DatabankStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      apiGet<DatabankStats>("/api/v1/admin/maintenance/verdicts/stats")
        .then((data) => {
          if (cancelled) return;
          setStats(data);
          setError(null);
          setUpdatedAt(new Date());
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "Databank statistics could not be loaded.");
        });
    load();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    const tick = setInterval(() => setNow(Date.now()), 5000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  const secondsAgo = updatedAt ? Math.max(0, Math.round((now - updatedAt.getTime()) / 1000)) : null;
  const stale = secondsAgo == null || secondsAgo > (REFRESH_MS / 1000) * 3;

  return (
    <section className={className} aria-labelledby="databank-title">
      <div className={styles.header}>
        <div>
          <h2 id="databank-title">Priority Learning Databank</h2>
          <span className={styles.live} aria-live="polite">
            <span className={`${styles.liveDot} ${stale ? styles.liveDotStale : ""}`} aria-hidden="true" />
            {error
              ? error
              : secondsAgo == null
                ? "Connecting…"
                : `Live · updated ${secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`}`}
          </span>
        </div>
        <Link href="/admin/maintenance/learning" className={styles.manage}>
          Review &amp; exclude verdicts →
        </Link>
      </div>

      {!stats ? (
        error ? null : <p className={styles.tileSub}>Loading…</p>
      ) : (
        <DatabankBody stats={stats} />
      )}
    </section>
  );
}

function DatabankBody({ stats }: { stats: DatabankStats }) {
  const priorityMax = Math.max(1, ...PRIORITIES.map((p) => stats.by_priority[p] ?? 0));
  const dayMax = Math.max(1, ...stats.timeline.map((d) => d.count));
  const weekTotal = stats.timeline.reduce((a, d) => a + d.count, 0);
  const sources = SOURCE_ORDER.map(
    (s) => stats.source_agreement.find((x) => x.source === s) ?? { source: s, votes: 0, matched: 0, rate: null },
  );
  const corrections = stats.engine_vs_final;
  const scored = corrections.matched + corrections.raised + corrections.lowered;

  return (
    <>
      <div className={styles.tiles}>
        <div className={styles.tile}>
          <p className={styles.tileLabel}>Verdicts</p>
          <p className={styles.tileValue}>{stats.total}</p>
          <p className={styles.tileSub}>
            {stats.active} learning · {stats.excluded} excluded
          </p>
        </div>
        <div className={styles.tile}>
          <p className={styles.tileLabel}>Avg. agreement</p>
          <p className={styles.tileValue}>{pct(stats.avg_agreement)}</p>
          <p className={styles.tileSub}>of vote weight behind the winner</p>
        </div>
        <div className={styles.tile}>
          <p className={styles.tileLabel}>Learning applied</p>
          <p className={styles.tileValue}>{stats.learning_applied}</p>
          <p className={styles.tileSub}>tickets prioritised from past verdicts</p>
        </div>
        <div className={styles.tile}>
          <p className={styles.tileLabel}>Engine corrected</p>
          <p className={styles.tileValue}>{corrections.raised + corrections.lowered}</p>
          <p className={styles.tileSub}>{scored ? `of ${scored} resolved tickets` : "no resolved tickets yet"}</p>
        </div>
      </div>

      {stats.total === 0 ? (
        <p className={styles.empty}>
          No verdicts yet. One is added each time maintenance completes a job and rates how urgent it really was.
        </p>
      ) : (
        <>
          <div className={styles.sections}>
            <div className={styles.section}>
              <h3>Who called it right</h3>
              <p className={styles.sectionHint}>Share of each voter&apos;s votes that matched the final verdict</p>
              <ul className={styles.hbars}>
                {sources.map((s) => (
                  <li
                    key={s.source}
                    className={styles.hbar}
                    title={
                      s.votes
                        ? `${SOURCE_LABEL[s.source]}: ${s.matched} of ${s.votes} votes matched the verdict (weight ${stats.engine.weights[s.source] ?? 0})`
                        : `${SOURCE_LABEL[s.source]}: no votes on resolved tickets yet`
                    }
                  >
                    <span className={styles.hbarLabel}>{SOURCE_LABEL[s.source] ?? s.source}</span>
                    <span className={styles.hbarTrack}>
                      {s.rate != null ? (
                        <span className={styles.hbarFill} style={{ width: `${s.rate * 100}%`, display: "block" }} />
                      ) : null}
                    </span>
                    <span className={s.rate != null ? styles.hbarValue : `${styles.hbarValue} ${styles.hbarEmpty}`}>
                      {pct(s.rate)}
                    </span>
                  </li>
                ))}
              </ul>
              {scored ? (
                <p className={styles.correction}>
                  Risk engine vs final verdict: matched <strong>{corrections.matched}</strong>, people raised it{" "}
                  <strong>{corrections.raised}</strong>, lowered it <strong>{corrections.lowered}</strong>.
                </p>
              ) : (
                <p className={styles.correction}>
                  Accuracy appears once maintenance resolves tickets; manual examples aren&apos;t scored.
                </p>
              )}
            </div>

            <div className={styles.section}>
              <h3>Final verdicts by priority</h3>
              <p className={styles.sectionHint}>What the databank teaches the engine</p>
              <ul className={styles.hbars}>
                {PRIORITIES.map((p) => {
                  const n = stats.by_priority[p] ?? 0;
                  return (
                    <li key={p} className={styles.hbar} title={`${p}: ${n} verdict${n === 1 ? "" : "s"}`}>
                      <span className={styles.hbarLabel}>{p}</span>
                      <span className={styles.hbarTrack}>
                        {n ? (
                          <span className={styles.hbarFill} style={{ width: `${(n / priorityMax) * 100}%`, display: "block" }} />
                        ) : null}
                      </span>
                      <span className={n ? styles.hbarValue : `${styles.hbarValue} ${styles.hbarEmpty}`}>{n}</span>
                    </li>
                  );
                })}
              </ul>

              <h3 style={{ marginTop: "1.25rem" }}>New verdicts per day</h3>
              <div className={styles.columns} role="img" aria-label={`${weekTotal} new verdicts in the last ${stats.timeline.length} days`}>
                {stats.timeline.map((d) => (
                  <div key={d.date} className={styles.column} title={`${shortDate(d.date)}: ${d.count} verdict${d.count === 1 ? "" : "s"}`}>
                    {d.count ? (
                      <div className={styles.columnFill} style={{ height: `${(d.count / dayMax) * 100}%` }} />
                    ) : (
                      <div className={`${styles.columnFill} ${styles.columnZero}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className={styles.columnLabels}>
                <span>{stats.timeline.length ? shortDate(stats.timeline[0].date) : ""}</span>
                <span>{weekTotal} in {stats.timeline.length} days</span>
                <span>Today</span>
              </div>
            </div>
          </div>

          <div className={styles.recent}>
            <h3>Latest verdicts</h3>
            <ul className={styles.recentList}>
              {stats.recent.map((v) => (
                <li key={v.request_id} className={styles.recentItem}>
                  <p className={`${styles.recentText} ${v.active ? "" : styles.excluded}`} title={v.triage_text}>
                    “{v.triage_text}”
                  </p>
                  <span className={styles.final} title={`${pct(v.agreement)} of the vote weight`}>
                    {v.final_priority}
                  </span>
                  <div className={styles.recentMeta}>
                    <span>{v.origin === "manual" ? "Manual example" : `Ticket #${v.request_id}`}</span>
                    {v.category ? <span>· {v.category}</span> : null}
                    {!v.active ? <span>· excluded</span> : null}
                    {v.votes.map((vote) => (
                      <span
                        key={vote.source}
                        className={`${styles.vote} ${vote.priority === v.final_priority ? styles.voteMatch : ""}`}
                      >
                        {SOURCE_LABEL[vote.source] ?? vote.source}: {vote.priority}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <p className={styles.footer}>
        The engine is learning from {stats.engine.precedents_loaded} verdict
        {stats.engine.precedents_loaded === 1 ? "" : "s"} (config v{stats.engine.version}). A new report follows past
        verdicts once {stats.engine.min_count}+ similar ones agree on at least {pct(stats.engine.min_agreement)} of
        the vote. Vote weights: maintenance {stats.engine.weights.maintenance}, admin {stats.engine.weights.admin},
        engine {stats.engine.weights.engine}, AI {stats.engine.weights.ai}.
      </p>
    </>
  );
}
