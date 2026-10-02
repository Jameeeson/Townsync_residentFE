"use client";

import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { apiGet } from "@/lib/api";
import styles from "@/components/styles/Maintenance.module.css";

export type PriorityVote = {
  source: "engine" | "ai" | "admin" | "maintenance";
  priority: string;
  reason: string | null;
  created_at: string | null;
};

export type VerdictBreakdown = {
  final_priority: string;
  agreement: number;
  tally: Record<string, number>;
  votes: { source: string; priority: string; weight: number; reason: string | null }[];
};

export type PriorityVerdict = {
  request_id: number;
  final_priority: string;
  agreement: number;
  breakdown: VerdictBreakdown | null;
  triage_text: string;
  category: string | null;
  active: boolean;
  excluded_reason: string | null;
  created_at: string | null;
  /** "manual" = ingested by an admin as a labelled example (no ticket behind it). */
  origin: "ticket" | "manual";
};

type VotesResponse = {
  votes: PriorityVote[];
  current_consensus: VerdictBreakdown | null;
  verdict: PriorityVerdict | null;
  weights: Record<string, number>;
};

export const SOURCE_LABEL: Record<string, string> = {
  engine: "Risk engine",
  ai: "AI assistant",
  admin: "Admin",
  maintenance: "Maintenance",
};

export function priorityBadgeClass(priority: string) {
  if (priority === "High" || priority === "Emergency") return styles.badgeHigh;
  if (priority === "Medium") return styles.badgeMedium;
  return styles.badgeLow;
}

/** Every priority opinion on a ticket and where the weighted vote stands. */
export function PriorityVotesPanel({ requestId, refreshKey }: { requestId: string; refreshKey?: number }) {
  const [data, setData] = useState<VotesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<VotesResponse>(`/api/v1/admin/maintenance/tickets/${requestId}/priority-votes`)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load priority votes.");
      });
    return () => {
      cancelled = true;
    };
  }, [requestId, refreshKey]);

  if (error) return <p className={styles.errorText}>{error}</p>;
  if (!data) return null;

  // Show only the vote that counts for each source (the latest one).
  const latest = new Map<string, PriorityVote>();
  for (const v of data.votes) latest.set(v.source, v);
  const outcome = data.verdict?.breakdown ?? data.current_consensus;

  return (
    <div className={styles.inputGroup} style={{ marginTop: "1rem" }}>
      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <Scale size={14} /> Priority votes
      </label>
      {latest.size === 0 ? (
        <p className={styles.helpText}>No votes yet.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.45rem" }}>
          {[...latest.values()].map((v) => (
            <li key={v.source} style={{ display: "grid", gap: "0.15rem" }}>
              <span style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <strong style={{ fontSize: "0.85rem" }}>{SOURCE_LABEL[v.source] ?? v.source}</strong>
                <span className={priorityBadgeClass(v.priority)}>{v.priority}</span>
                <span className={styles.helpText}>weight {data.weights[v.source] ?? 0}</span>
              </span>
              {v.reason ? <span className={styles.helpText}>{v.reason}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {outcome ? (
        <p className={styles.helpText} style={{ marginTop: "0.5rem" }}>
          {data.verdict ? "Final verdict" : "Leading so far"}: <strong>{outcome.final_priority}</strong> (
          {Math.round(outcome.agreement * 100)}% of the vote weight)
          {data.verdict && !data.verdict.active ? " · excluded from learning" : ""}
        </p>
      ) : null}
    </div>
  );
}
