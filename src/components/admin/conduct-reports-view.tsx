"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { formatServerDateTime } from "@/lib/datetime";
import { useToast } from "@/components/ui/toast";
import styles from "./conduct-reports-view.module.css";

type Report = {
  id: number;
  ticket_id: number;
  staff_id: number;
  category: string;
  details: string;
  status: "Open" | "Reviewed" | "Dismissed";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  technician: string | null;
  technician_deleted: boolean;
  resident: string | null;
  unit: string | null;
  ticket_subject: string | null;
  other_reports: number;
  /** Where the ticket stands now (Assigned, Ongoing, Resolved, Closed, Reopened, ...). */
  ticket_stage: string;
  /** Assigned, ongoing, resolved or closed tickets can go back to the dispatch queue. */
  can_send_back: boolean;
};

type Response = { items: Report[]; counts: { open: number; reviewed: number; dismissed: number } };
type Filter = "Open" | "Reviewed" | "Dismissed" | "All";

/** Residents' reports about the technician who handled their ticket, with a recorded decision for each. */
export default function ConductReportsView({
  onOpenTicket,
  onSentBack,
}: {
  onOpenTicket?: (ticketId: number) => void;
  /** Called after a ticket went back to the dispatch queue, so the page can refresh and show it. */
  onSentBack?: (ticketId: number) => void;
}) {
  const { toast, toastError } = useToast();
  const [filter, setFilter] = useState<Filter>("Open");
  const [data, setData] = useState<{ filter: Filter; res: Response } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmSendBackId, setConfirmSendBackId] = useState<number | null>(null);

  const load = useCallback(async (f: Filter) => {
    try {
      const res = await apiGet<Response>(`/api/v1/admin/maintenance/conduct-reports?status=${f}`);
      setData({ filter: f, res });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the reports.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiGet<Response>(`/api/v1/admin/maintenance/conduct-reports?status=${filter}`)
      .then((res) => !cancelled && (setData({ filter, res }), setError(null)))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Could not load the reports."));
    return () => {
      cancelled = true;
    };
  }, [filter]);

  async function decide(report: Report, status: "Reviewed" | "Dismissed" | "Open") {
    const note = (notes[report.id] ?? "").trim();
    if (status !== "Open" && note.length < 5) {
      toast("Add a short note about what you found or did.", "warning");
      return;
    }
    setBusyId(report.id);
    try {
      await apiPatch(`/api/v1/admin/maintenance/conduct-reports/${report.id}`, { status, admin_note: note || undefined });
      toast(status === "Open" ? "Report reopened." : `Report marked ${status.toLowerCase()}.`, "success");
      setNotes((n) => ({ ...n, [report.id]: "" }));
      await load(filter);
    } catch (err) {
      toastError(err, "Could not save your decision.");
    } finally {
      setBusyId(null);
    }
  }

  async function sendBack(report: Report) {
    const note = (notes[report.id] ?? "").trim();
    if (report.status === "Open" && note.length < 5) {
      toast("Add a short note about what you found or did.", "warning");
      return;
    }
    setBusyId(report.id);
    try {
      const res = await apiPost<{ message: string; ticket_id: number }>(
        `/api/v1/admin/maintenance/conduct-reports/${report.id}/send-back`,
        { note: note || undefined },
      );
      toast(res.message, "success");
      setConfirmSendBackId(null);
      setNotes((n) => ({ ...n, [report.id]: "" }));
      await load(filter);
      onSentBack?.(res.ticket_id);
    } catch (err) {
      toastError(err, "Could not send the ticket back.");
    } finally {
      setBusyId(null);
    }
  }

  const counts = data?.res.counts ?? { open: 0, reviewed: 0, dismissed: 0 };
  const items = data && data.filter === filter ? data.res.items : null;
  const tabs: [Filter, string][] = [
    ["Open", `Open (${counts.open})`],
    ["Reviewed", `Reviewed (${counts.reviewed})`],
    ["Dismissed", `Dismissed (${counts.dismissed})`],
    ["All", "All"],
  ];

  return (
    <section className={styles.wrap} aria-labelledby="conduct-title">
      <div className={styles.head}>
        <div>
          <h2 id="conduct-title"><ShieldAlert size={18} aria-hidden="true" /> Conduct Reports</h2>
          <p>Reports from residents about the technician who handled their request. The technician is not told.</p>
        </div>
        <div className={styles.segment} role="group" aria-label="Report status">
          {tabs.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={filter === key} className={filter === key ? styles.on : undefined} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {!items && !error ? <div className={styles.skeleton} aria-busy="true" aria-label="Loading reports" /> : null}
      {items && items.length === 0 ? <p className={styles.empty}>{filter === "Open" ? "No open reports. Nothing needs your attention." : "No reports here."}</p> : null}

      <ul className={styles.list}>
        {(items ?? []).map((r) => (
          <li key={r.id} className={styles.card}>
            <div className={styles.top}>
              <div>
                <strong className={styles.tech}>{r.technician ?? "Unknown technician"}{r.technician_deleted ? " (account deleted)" : ""}</strong>
                <span className={styles.cat}>{r.category}</span>
                {r.other_reports > 0 ? (
                  <span className={styles.repeat}>{r.other_reports} other report{r.other_reports === 1 ? "" : "s"} on file</span>
                ) : null}
              </div>
              <span className={r.status === "Open" ? styles.pillOpen : r.status === "Reviewed" ? styles.pillDone : styles.pillMuted}>
                {r.status === "Reviewed" ? <CheckCircle2 size={12} aria-hidden="true" /> : r.status === "Dismissed" ? <XCircle size={12} aria-hidden="true" /> : null}
                {r.status}
              </span>
            </div>
            <p className={styles.meta}>
              Reported by {r.resident ?? "a resident"}{r.unit ? ` · ${r.unit}` : ""} · {formatServerDateTime(r.created_at)}
              {" · "}
              {onOpenTicket ? (
                <button type="button" className={styles.link} onClick={() => onOpenTicket(r.ticket_id)}>
                  Ticket #{r.ticket_id}{r.ticket_subject ? `: ${r.ticket_subject}` : ""}
                </button>
              ) : (
                <>Ticket #{r.ticket_id}</>
              )}
            </p>
            <blockquote className={styles.details}>{r.details}</blockquote>
            <p className={styles.stage}>Ticket status now: <strong>{r.ticket_stage}</strong></p>

            {r.status === "Open" ? (
              <div className={styles.review}>
                <label htmlFor={`note-${r.id}`}>What did you find or do?</label>
                <textarea
                  id={`note-${r.id}`}
                  rows={2}
                  maxLength={1000}
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  placeholder="e.g. Spoke with the technician and gave a written warning."
                />
                <div className={styles.actions}>
                  <button type="button" className={styles.primary} disabled={busyId === r.id} onClick={() => void decide(r, "Reviewed")}>
                    Mark reviewed
                  </button>
                  <button type="button" className={styles.secondary} disabled={busyId === r.id} onClick={() => void decide(r, "Dismissed")}>
                    Dismiss
                  </button>
                  {r.can_send_back ? (
                    <button type="button" className={styles.danger} disabled={busyId === r.id} onClick={() => setConfirmSendBackId(r.id)}>
                      Send ticket back to dispatch
                    </button>
                  ) : null}
                </div>
                {confirmSendBackId === r.id ? <SendBackConfirm busy={busyId === r.id} onConfirm={() => void sendBack(r)} onCancel={() => setConfirmSendBackId(null)} /> : null}
              </div>
            ) : (
              <div className={styles.decided}>
                <p><strong>Your note:</strong> {r.admin_note}</p>
                <p className={styles.when}>{r.status} {formatServerDateTime(r.reviewed_at)}</p>
                <div className={styles.actions}>
                  <button type="button" className={styles.secondary} disabled={busyId === r.id} onClick={() => void decide(r, "Open")}>
                    Reopen this report
                  </button>
                  {r.can_send_back ? (
                    <button type="button" className={styles.danger} disabled={busyId === r.id} onClick={() => setConfirmSendBackId(r.id)}>
                      Send ticket back to dispatch
                    </button>
                  ) : null}
                </div>
                {confirmSendBackId === r.id ? <SendBackConfirm busy={busyId === r.id} onConfirm={() => void sendBack(r)} onCancel={() => setConfirmSendBackId(null)} /> : null}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SendBackConfirm({ busy, onConfirm, onCancel }: { busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className={styles.confirm} role="alertdialog" aria-label="Confirm sending the ticket back">
      <p>
        This takes the ticket off its technician and puts it back in the dispatch queue as Reopened. The resident is told
        a technician will come back. You then assign the same technician or another one from Pending Requests.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.danger} disabled={busy} onClick={onConfirm}>
          {busy ? "Sending…" : "Yes, send it back"}
        </button>
        <button type="button" className={styles.secondary} disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
