"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import AdminShell from "@/components/admin/admin-shell";
import {
  SOURCE_LABEL,
  priorityBadgeClass,
  type PriorityVerdict,
} from "@/components/admin/priority-votes-panel";
import styles from "@/components/styles/Maintenance.module.css";

const PAGE_SIZE = 25;

function verdictName(v: PriorityVerdict) {
  return v.origin === "manual" ? "Manual example" : `Ticket #${v.request_id}`;
}
const MIN_REASON = 10;

type Filter = "all" | "active" | "excluded";

type VerdictPage = { items: PriorityVerdict[]; total: number; limit: number; offset: number };

/** The databank the Risk Triage Engine learns from: one verdict per resolved ticket. */
export default function PriorityLearningPage() {
  const { toast, toastError } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<VerdictPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [excluding, setExcluding] = useState<PriorityVerdict | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (filter !== "all") params.set("active", String(filter === "active"));
    apiGet<VerdictPage>(`/api/v1/admin/maintenance/verdicts?${params.toString()}`)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the verdicts."));
  }, [filter, offset]);

  useEffect(() => {
    load();
  }, [load]);

  const setActive = async (verdict: PriorityVerdict, active: boolean, why?: string) => {
    setBusy(true);
    try {
      await apiPatch(`/api/v1/admin/maintenance/verdicts/${verdict.request_id}`, {
        active,
        reason: why ?? null,
      });
      toast(
        active ? `${verdictName(verdict)} is learned from again.` : `${verdictName(verdict)} excluded from learning.`,
        "success",
      );
      setExcluding(null);
      setReason("");
      load();
    } catch (e) {
      toastError(e, "Could not update the verdict.");
    } finally {
      setBusy(false);
    }
  };

  const total = data?.total ?? 0;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);

  return (
    <AdminShell>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.titleRow}>
              <h1>Priority Learning</h1>
            </div>
            <p>
              Each resolved ticket&apos;s final priority, decided by a weighted vote of the risk engine, the AI, the admin
              and the maintenance technician. New reports that resemble these are prioritised the same way.
            </p>
            {error ? <p className={styles.errorText}>{error}</p> : null}
          </div>
          <Link href="/admin/maintenance" className={styles.calendarToggle}>
            <ArrowLeft size={15} /> Maintenance Command
          </Link>
        </header>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.jobTabs}>
              {(["all", "active", "excluded"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={filter === f ? styles.jobTabActive : undefined}
                  onClick={() => {
                    setFilter(f);
                    setOffset(0);
                  }}
                >
                  {f === "all" ? "All" : f === "active" ? "Learned from" : "Excluded"}
                </button>
              ))}
            </div>
            <span className={styles.mutedMeta}>
              {total ? `${offset + 1}–${pageEnd} of ${total}` : "No verdicts yet"}
            </span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>What the resident reported</th>
                  <th>Votes</th>
                  <th>Verdict</th>
                  <th>Learning</th>
                </tr>
              </thead>
              <tbody>
                {data && data.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyCell}>
                      Verdicts appear here once maintenance completes a job and rates its priority.
                    </td>
                  </tr>
                ) : null}
                {data?.items.map((v) => (
                  <tr key={v.request_id}>
                    <td>
                      <strong className={styles.linkId}>
                        {v.origin === "manual" ? "Manual example" : `#${v.request_id}`}
                      </strong>
                      <div className={styles.cellSub}>{v.category ?? "—"}</div>
                    </td>
                    <td style={{ maxWidth: 360 }}>{v.triage_text}</td>
                    <td>
                      {v.breakdown?.votes.map((vote) => (
                        <div key={vote.source} className={styles.cellSub} title={vote.reason ?? undefined}>
                          {SOURCE_LABEL[vote.source] ?? vote.source}: {vote.priority}
                        </div>
                      ))}
                    </td>
                    <td>
                      <span className={priorityBadgeClass(v.final_priority)}>{v.final_priority}</span>
                      <div className={styles.cellSub}>{Math.round(v.agreement * 100)}% agreement</div>
                    </td>
                    <td>
                      {v.active ? (
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => {
                            setExcluding(v);
                            setReason("");
                          }}
                        >
                          Exclude
                        </button>
                      ) : (
                        <>
                          <div className={styles.cellSub} title={v.excluded_reason ?? undefined}>
                            Excluded: {v.excluded_reason}
                          </div>
                          <button
                            type="button"
                            className={styles.linkBtn}
                            disabled={busy}
                            onClick={() => setActive(v, true)}
                          >
                            Restore
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.tableFooter}>
            <span className={styles.mutedMeta}>
              Excluded verdicts stop influencing new tickets right away.
            </span>
            <div className={styles.pager}>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Previous page"
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Next page"
                disabled={pageEnd >= total}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {excluding ? (
        <div className={styles.modalOverlay} onClick={() => setExcluding(null)} role="presentation">
          <div
            className={styles.modalNarrow}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="exclude-title"
          >
            <header className={styles.modalHeader}>
              <div>
                <h3 id="exclude-title">
                  Exclude verdict: <span className={styles.linkId}>{verdictName(excluding)}</span>
                </h3>
                <p>New tickets will no longer follow this verdict.</p>
              </div>
              <button type="button" className={styles.iconBtn} onClick={() => setExcluding(null)} aria-label="Close">
                <X size={20} />
              </button>
            </header>
            <div className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label htmlFor="exclude-reason">
                  Why should the system not learn from it? <span className={styles.requiredMark}>*</span>
                </label>
                <textarea
                  id="exclude-reason"
                  className={styles.textareaField}
                  rows={3}
                  maxLength={1000}
                  value={reason}
                  placeholder="e.g. Technician rated it before finding the real cause"
                  onChange={(e) => setReason(e.target.value)}
                />
                {reason.trim() && reason.trim().length < MIN_REASON ? (
                  <p className={styles.fieldError}>At least {MIN_REASON} characters.</p>
                ) : null}
              </div>
            </div>
            <footer className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setExcluding(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmDeclineBtn}
                disabled={busy || reason.trim().length < MIN_REASON}
                onClick={() => setActive(excluding, false, reason.trim())}
              >
                {busy ? "Saving..." : "Exclude from learning"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
