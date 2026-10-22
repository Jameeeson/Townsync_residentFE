"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw, ShieldAlert, XCircle } from "lucide-react";
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
  /** What the resident was told. One-way: they read it and cannot answer. */
  resident_message?: string | null;
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

type NotFixed = {
  ticket_id: number;
  subject: string | null;
  reported_at: string;
  resident: string | null;
  unit: string | null;
  message: string | null;
  technician: string | null;
  photos: number;
};

type Response = { items: Report[]; counts: { open: number; reviewed: number; dismissed: number } };
type Filter = "Open" | "Reviewed" | "Dismissed" | "All";

const REPLY_HINT = "The resident reads this. They cannot reply to it.";

/**
 * Everything residents report that needs a decision: "the problem is not fixed" on a Resolved ticket, and reports about
 * the technician who handled their ticket. Each decision can carry one reply for the resident; there is no thread.
 */
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
  const [notFixed, setNotFixed] = useState<NotFixed[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [nfReplies, setNfReplies] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [busyTicket, setBusyTicket] = useState<number | null>(null);
  const [confirmSendBackId, setConfirmSendBackId] = useState<number | null>(null);

  const load = useCallback(async (f: Filter) => {
    try {
      const [res, nf] = await Promise.all([
        apiGet<Response>(`/api/v1/admin/maintenance/conduct-reports?status=${f}`),
        apiGet<{ items: NotFixed[] }>("/api/v1/admin/maintenance/not-fixed-reports"),
      ]);
      setData({ filter: f, res });
      setNotFixed(nf.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the reports.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<Response>(`/api/v1/admin/maintenance/conduct-reports?status=${filter}`),
      apiGet<{ items: NotFixed[] }>("/api/v1/admin/maintenance/not-fixed-reports"),
    ])
      .then(([res, nf]) => {
        if (cancelled) return;
        setData({ filter, res });
        setNotFixed(nf.items);
        setError(null);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Could not load the reports."));
    return () => {
      cancelled = true;
    };
  }, [filter]);

  async function decide(report: Report, status: "Reviewed" | "Dismissed" | "Open") {
    const note = (notes[report.id] ?? "").trim();
    const reply = (replies[report.id] ?? "").trim();
    if (status !== "Open" && note.length < 5) {
      toast("Add a short private note about what you found or did.", "warning");
      return;
    }
    if (status === "Dismissed" && reply.length < 5) {
      toast("Tell the resident why no action is being taken.", "warning");
      return;
    }
    setBusyId(report.id);
    try {
      await apiPatch(`/api/v1/admin/maintenance/conduct-reports/${report.id}`, {
        status,
        admin_note: note || undefined,
        resident_message: reply || undefined,
      });
      toast(status === "Open" ? "Report reopened." : `Report marked ${status.toLowerCase()}.`, "success");
      setNotes((n) => ({ ...n, [report.id]: "" }));
      setReplies((n) => ({ ...n, [report.id]: "" }));
      await load(filter);
    } catch (err) {
      toastError(err, "Could not save your decision.");
    } finally {
      setBusyId(null);
    }
  }

  async function sendBack(report: Report) {
    const note = (notes[report.id] ?? "").trim();
    const reply = (replies[report.id] ?? "").trim();
    if (report.status === "Open" && note.length < 5) {
      toast("Add a short private note about what you found or did.", "warning");
      return;
    }
    setBusyId(report.id);
    try {
      const res = await apiPost<{ message: string; ticket_id: number }>(
        `/api/v1/admin/maintenance/conduct-reports/${report.id}/send-back`,
        { note: note || undefined, resident_message: reply || undefined },
      );
      toast(res.message, "success");
      setConfirmSendBackId(null);
      setNotes((n) => ({ ...n, [report.id]: "" }));
      setReplies((n) => ({ ...n, [report.id]: "" }));
      await load(filter);
      onSentBack?.(res.ticket_id);
    } catch (err) {
      toastError(err, "Could not send the ticket back.");
    } finally {
      setBusyId(null);
    }
  }

  async function answerNotFixed(item: NotFixed, action: "reopen" | "decline") {
    const reply = (nfReplies[item.ticket_id] ?? "").trim();
    if (action === "decline" && reply.length < 5) {
      toast("Tell the resident why the ticket stays as it is.", "warning");
      return;
    }
    setBusyTicket(item.ticket_id);
    try {
      const path = action === "reopen" ? "reopen" : "decline-not-fixed";
      const res = await apiPost<{ message: string }>(`/api/v1/admin/maintenance/tickets/${item.ticket_id}/${path}`, {
        note: reply || undefined,
      });
      toast(res.message, "success");
      setNfReplies((n) => ({ ...n, [item.ticket_id]: "" }));
      await load(filter);
      if (action === "reopen") onSentBack?.(item.ticket_id);
    } catch (err) {
      toastError(err, action === "reopen" ? "Could not reopen the ticket." : "Could not save your answer.");
    } finally {
      setBusyTicket(null);
    }
  }

  const counts = data?.res.counts ?? { open: 0, reviewed: 0, dismissed: 0 };
  const items = data && data.filter === filter ? data.res.items : null;
  const waiting = notFixed ?? [];
  const showNotFixed = filter === "Open" || filter === "All";
  const tabs: [Filter, string][] = [
    ["Open", `Open (${counts.open + waiting.length})`],
    ["Reviewed", `Reviewed (${counts.reviewed})`],
    ["Dismissed", `Dismissed (${counts.dismissed})`],
    ["All", "All"],
  ];
  const nothingOpen = filter === "Open" && items?.length === 0 && waiting.length === 0;

  return (
    <section className={styles.wrap} aria-labelledby="conduct-title">
      <div className={styles.head}>
        <div>
          <h2 id="conduct-title"><ShieldAlert size={18} aria-hidden="true" /> Reports</h2>
          <p>
            Residents telling you a fix did not work, or reporting their technician. You can send each resident one reply;
            they cannot answer it. The technician is never told about a conduct report.
          </p>
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
      {nothingOpen ? <p className={styles.empty}>No open reports. Nothing needs your attention.</p> : null}
      {items && items.length === 0 && filter !== "Open" && !(showNotFixed && waiting.length > 0) ? <p className={styles.empty}>No reports here.</p> : null}

      <ul className={styles.list}>
        {showNotFixed
          ? waiting.map((n) => (
              <li key={`nf-${n.ticket_id}`} className={styles.card}>
                <div className={styles.top}>
                  <div>
                    <strong className={styles.tech}>Ticket #{n.ticket_id}{n.subject ? `: ${n.subject}` : ""}</strong>
                    <span className={styles.cat}>Resident says it is not fixed</span>
                  </div>
                  <span className={styles.pillOpen}><AlertTriangle size={12} aria-hidden="true" /> Needs a decision</span>
                </div>
                <p className={styles.meta}>
                  Reported by {n.resident ?? "a resident"}{n.unit ? ` · ${n.unit}` : ""} · {formatServerDateTime(n.reported_at)}
                  {n.technician ? ` · Last handled by ${n.technician}` : ""}
                  {" · "}
                  {onOpenTicket ? (
                    <button type="button" className={styles.link} onClick={() => onOpenTicket(n.ticket_id)}>
                      Open the ticket{n.photos > 0 ? ` and ${n.photos} photo${n.photos === 1 ? "" : "s"}` : ""}
                    </button>
                  ) : null}
                </p>
                {n.message ? <blockquote className={styles.details}>{n.message}</blockquote> : null}
                <p className={styles.stage}>The ticket stays <strong>Resolved</strong> until you decide.</p>
                <div className={styles.review}>
                  <label htmlFor={`nf-reply-${n.ticket_id}`}>Reply to the resident</label>
                  <textarea
                    id={`nf-reply-${n.ticket_id}`}
                    rows={2}
                    maxLength={1000}
                    value={nfReplies[n.ticket_id] ?? ""}
                    onChange={(e) => setNfReplies((r) => ({ ...r, [n.ticket_id]: e.target.value }))}
                    placeholder="e.g. We will send a technician tomorrow morning. (Required if you decline.)"
                  />
                  <p className={styles.when}>{REPLY_HINT}</p>
                  <div className={styles.actions}>
                    <button type="button" className={styles.primary} disabled={busyTicket === n.ticket_id} onClick={() => void answerNotFixed(n, "reopen")}>
                      <RotateCcw size={14} aria-hidden="true" /> Reopen and send to dispatch
                    </button>
                    <button type="button" className={styles.secondary} disabled={busyTicket === n.ticket_id} onClick={() => void answerNotFixed(n, "decline")}>
                      Decline the report
                    </button>
                  </div>
                </div>
              </li>
            ))
          : null}

        {(items ?? []).map((r) => (
          <li key={r.id} className={styles.card}>
            <div className={styles.top}>
              <div>
                <strong className={styles.tech}>{r.technician ?? "Unknown technician"}{r.technician_deleted ? " (account deleted)" : ""}</strong>
                <span className={styles.cat}>Technician report · {r.category}</span>
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
                <label htmlFor={`note-${r.id}`}>Private note: what did you find or do? (only admins see this)</label>
                <textarea
                  id={`note-${r.id}`}
                  rows={2}
                  maxLength={1000}
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  placeholder="e.g. Spoke with the technician and gave a written warning."
                />
                <label htmlFor={`reply-${r.id}`}>Reply to the resident (required if you dismiss)</label>
                <textarea
                  id={`reply-${r.id}`}
                  rows={2}
                  maxLength={1000}
                  value={replies[r.id] ?? ""}
                  onChange={(e) => setReplies((n) => ({ ...n, [r.id]: e.target.value }))}
                  placeholder="e.g. Thank you for telling us. We have taken this up with the technician."
                />
                <p className={styles.when}>{REPLY_HINT} Do not name the technician or what action was taken.</p>
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
                <p><strong>Your private note:</strong> {r.admin_note}</p>
                {r.resident_message ? <p><strong>Your reply to the resident:</strong> {r.resident_message}</p> : <p className={styles.when}>No reply was sent to the resident.</p>}
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
        a technician will come back (or reads your reply, if you wrote one). You then assign the same technician or another
        one from Pending Requests.
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
