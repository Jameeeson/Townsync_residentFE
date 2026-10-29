"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ShieldBan, Star, Undo2 } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { formatServerDateTime } from "@/lib/datetime";
import { useToast } from "@/components/ui/toast";
import base from "./conduct-reports-view.module.css";
import styles from "./quality-view.module.css";

type Rating = {
  id: number;
  ticket_id: number;
  staff_id: number | null;
  rating: number;
  comment: string | null;
  tags: string[];
  counted: boolean;
  admin_note: string | null;
  management_reply: string | null;
  reviewed_at: string | null;
  created_at: string;
  technician: string | null;
  resident: string | null;
  unit: string | null;
  ticket_subject: string | null;
  category: string | null;
  is_low: boolean;
};

type RatingsResponse = {
  items: Rating[];
  summary: { count: number; average: number | null; distribution: Record<string, number> };
  low_waiting: number;
  min_ratings_for_average: number;
};

type Evidence = { report_id: number; ticket_id: number; category: string; details: string; admin_note: string | null; reviewed_at: string | null };

type Suspension = {
  id: number;
  staff_id: number;
  status: "Recommended" | "Active" | "Ended" | "Lifted" | "Dismissed";
  source: string;
  reason: string | null;
  suggested_days: number | null;
  escalate: boolean;
  evidence: Evidence[];
  starts_at: string | null;
  ends_at: string | null;
  decision_note: string | null;
  lifted_reason: string | null;
  created_at: string;
  technician: string | null;
  days_left: number;
  is_active: boolean;
};

type SuspensionsResponse = {
  recommended: Suspension[];
  active: Suspension[];
  history: Suspension[];
  rule: { upheld_reports: number; different_residents: number; window_days: number; days_by_step: number[]; max_days: number };
};

type Technician = { id: number; name: string; suspended_until?: string | null };

export type QualityTab = "ratings" | "suspensions";
type Show = "all" | "unreviewed" | "low" | "left_out";

function Stars({ value }: { value: number }) {
  return (
    <span className={styles.stars} role="img" aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={15} aria-hidden="true" className={n <= value ? styles.on : styles.off} />
      ))}
    </span>
  );
}

/**
 * Ratings residents gave to finished tickets, and technician suspensions. A suspension is only ever applied by an
 * administrator: the system recommends one when enough reports about a technician were upheld.
 */
export default function QualityView({
  initialTab = "ratings",
  onOpenTicket,
  onChanged,
}: {
  initialTab?: QualityTab;
  onOpenTicket?: (ticketId: number) => void;
  /** Called after something changed that the rest of the page shows (a suspension on the dispatch board). */
  onChanged?: () => void;
}) {
  const [tab, setTab] = useState<QualityTab>(initialTab);
  return (
    <section className={base.wrap} aria-labelledby="quality-title">
      <div className={base.head}>
        <div>
          <h2 id="quality-title"><Star size={18} aria-hidden="true" /> Ratings and suspensions</h2>
          <p>
            What residents think of finished jobs, and technicians kept from new assignments. The system only recommends a
            suspension; you decide.
          </p>
        </div>
        <div className={base.segment} role="group" aria-label="Section">
          {(["ratings", "suspensions"] as const).map((key) => (
            <button key={key} type="button" aria-pressed={tab === key} className={tab === key ? base.on : undefined} onClick={() => setTab(key)}>
              {key === "ratings" ? "Ratings" : "Suspensions"}
            </button>
          ))}
        </div>
      </div>
      {tab === "ratings" ? <RatingsPanel onOpenTicket={onOpenTicket} /> : <SuspensionsPanel onOpenTicket={onOpenTicket} onChanged={onChanged} />}
    </section>
  );
}

// ---- ratings --------------------------------------------------------------------------------------------------------

function RatingsPanel({ onOpenTicket }: { onOpenTicket?: (ticketId: number) => void }) {
  const { toast, toastError } = useToast();
  const [show, setShow] = useState<Show>("all");
  const [data, setData] = useState<{ show: Show; res: RatingsResponse } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async (s: Show) => {
    try {
      setData({ show: s, res: await apiGet<RatingsResponse>(`/api/v1/admin/maintenance/feedback?show=${s}`) });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the ratings.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiGet<RatingsResponse>(`/api/v1/admin/maintenance/feedback?show=${show}`)
      .then((res) => {
        if (cancelled) return;
        setData({ show, res });
        setError(null);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Could not load the ratings."));
    return () => {
      cancelled = true;
    };
  }, [show]);

  async function save(item: Rating, counted?: boolean) {
    const note = (notes[item.id] ?? "").trim();
    const reply = (replies[item.id] ?? "").trim();
    if (counted === false && note.length < 5) {
      toast("Say why this rating is left out of the averages.", "warning");
      return;
    }
    if (counted === undefined && !note && !reply) {
      toast("Add a note or a reply first.", "warning");
      return;
    }
    setBusy(item.id);
    try {
      await apiPatch(`/api/v1/admin/maintenance/feedback/${item.id}`, {
        counted,
        admin_note: note || undefined,
        resident_message: reply || undefined,
      });
      toast("Saved.", "success");
      setNotes((n) => ({ ...n, [item.id]: "" }));
      setReplies((n) => ({ ...n, [item.id]: "" }));
      await load(show);
    } catch (err) {
      toastError(err, "Could not save.");
    } finally {
      setBusy(null);
    }
  }

  const res = data && data.show === show ? data.res : null;
  const peak = Math.max(...Object.values(res?.summary.distribution ?? { 1: 1 }), 1);
  const filters: [Show, string][] = [
    ["all", "All"],
    ["unreviewed", `Low, not reviewed${data ? ` (${data.res.low_waiting})` : ""}`],
    ["low", "All low (1-2)"],
    ["left_out", "Left out"],
  ];

  return (
    <>
      <div className={styles.toolbar}>
        <div className={base.segment} role="group" aria-label="Filter ratings">
          {filters.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={show === key} className={show === key ? base.on : undefined} onClick={() => setShow(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {res ? (
        <div className={styles.summary}>
          <div className={styles.score}>
            <strong>{res.summary.average !== null ? res.summary.average.toFixed(1) : "—"}</strong>
            <span>
              {res.summary.count} rating{res.summary.count === 1 ? "" : "s"}
              {res.summary.average === null && res.summary.count > 0 ? `, average shows after ${res.min_ratings_for_average}` : ""}
            </span>
          </div>
          <ul className={styles.bars} aria-label="Ratings by number of stars">
            {[5, 4, 3, 2, 1].map((n) => (
              <li key={n}>
                <span>{n}</span>
                <span className={styles.track}><span style={{ width: `${((res.summary.distribution[n] ?? 0) / peak) * 100}%` }} /></span>
                <span className={styles.count}>{res.summary.distribution[n] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className={base.error} role="alert">{error}</p> : null}
      {!res && !error ? <div className={base.skeleton} aria-busy="true" aria-label="Loading ratings" /> : null}
      {res && res.items.length === 0 ? <p className={base.empty}>No ratings here yet.</p> : null}

      <ul className={base.list}>
        {(res?.items ?? []).map((r) => (
          <li key={r.id} className={base.card}>
            <div className={base.top}>
              <div>
                <strong className={base.tech}>{r.technician ?? "Unknown technician"}</strong>
                <span className={base.cat}><Stars value={r.rating} /> {r.category ?? ""}</span>
              </div>
              {!r.counted ? <span className={base.pillMuted}>Left out of averages</span> : r.is_low && !r.reviewed_at ? <span className={base.pillOpen}>Needs a look</span> : r.reviewed_at ? <span className={base.pillDone}><CheckCircle2 size={12} aria-hidden="true" /> Reviewed</span> : null}
            </div>
            <p className={base.meta}>
              Rated by {r.resident ?? "a resident"}{r.unit ? ` · ${r.unit}` : ""} · {formatServerDateTime(r.created_at)}
              {" · "}
              {onOpenTicket ? (
                <button type="button" className={base.link} onClick={() => onOpenTicket(r.ticket_id)}>
                  Ticket #{r.ticket_id}{r.ticket_subject ? `: ${r.ticket_subject}` : ""}
                </button>
              ) : <>Ticket #{r.ticket_id}</>}
            </p>
            {r.tags.length ? <ul className={styles.tags}>{r.tags.map((t) => <li key={t}>{t}</li>)}</ul> : null}
            {r.comment ? <blockquote className={base.details}>{r.comment}</blockquote> : <p className={base.when}>No comment.</p>}

            {r.admin_note || r.management_reply ? (
              <div className={base.decided}>
                {r.admin_note ? <p><strong>Your private note:</strong> {r.admin_note}</p> : null}
                {r.management_reply ? <p><strong>Your reply to the resident:</strong> {r.management_reply}</p> : null}
              </div>
            ) : null}

            <div className={base.review}>
              <label htmlFor={`rn-${r.id}`}>Private note (only admins see this)</label>
              <textarea id={`rn-${r.id}`} rows={2} maxLength={1000} value={notes[r.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} />
              <label htmlFor={`rr-${r.id}`}>Reply to the resident (optional)</label>
              <textarea id={`rr-${r.id}`} rows={2} maxLength={1000} value={replies[r.id] ?? ""} onChange={(e) => setReplies((n) => ({ ...n, [r.id]: e.target.value }))} placeholder="e.g. Sorry about that. We are following it up." />
              <p className={base.when}>The resident reads a reply on their ticket. They cannot answer it.</p>
              <div className={base.actions}>
                <button type="button" className={base.primary} disabled={busy === r.id} onClick={() => void save(r)}>
                  {r.reviewed_at ? "Save note or reply" : "Mark reviewed"}
                </button>
                {r.counted ? (
                  <button type="button" className={base.secondary} disabled={busy === r.id} onClick={() => void save(r, false)}>
                    Leave out of averages
                  </button>
                ) : (
                  <button type="button" className={base.secondary} disabled={busy === r.id} onClick={() => void save(r, true)}>
                    <Undo2 size={14} aria-hidden="true" /> Count it again
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

// ---- suspensions ----------------------------------------------------------------------------------------------------

function SuspensionsPanel({ onOpenTicket, onChanged }: { onOpenTicket?: (ticketId: number) => void; onChanged?: () => void }) {
  const { toast, toastError } = useToast();
  const [data, setData] = useState<SuspensionsResponse | null>(null);
  const [techs, setTechs] = useState<Technician[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | "manual" | null>(null);
  const [days, setDays] = useState<Record<number, number>>({});
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [manual, setManual] = useState({ staff: "", days: 7, reason: "" });

  const load = useCallback(async () => {
    try {
      const [res, board] = await Promise.all([
        apiGet<SuspensionsResponse>("/api/v1/admin/maintenance/suspensions"),
        apiGet<Technician[]>("/api/v1/admin/maintenance/dispatch-board"),
      ]);
      setData(res);
      setTechs(board);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the suspensions.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void load();
  }, [load]);

  async function apply(s: Suspension) {
    const length = days[s.id] ?? s.suggested_days ?? 7;
    const reason = (reasons[s.id] ?? s.reason ?? "").trim();
    if (reason.length < 10) {
      toast("Write the reason the technician will read (at least a sentence).", "warning");
      return;
    }
    setBusy(s.id);
    try {
      await apiPost("/api/v1/admin/maintenance/suspensions", { staff_id: s.staff_id, days: length, reason, recommendation_id: s.id });
      toast(`${s.technician ?? "The technician"} is suspended from new assignments for ${length} day(s).`, "success");
      await load();
      onChanged?.();
    } catch (err) {
      toastError(err, "Could not apply the suspension.");
    } finally {
      setBusy(null);
    }
  }

  async function decide(s: Suspension, action: "dismiss" | "lift") {
    const note = (notes[s.id] ?? "").trim();
    if (note.length < 5) {
      toast(action === "dismiss" ? "Say why you are not suspending." : "Say why you are lifting it early.", "warning");
      return;
    }
    setBusy(s.id);
    try {
      await apiPost(`/api/v1/admin/maintenance/suspensions/${s.id}/${action}`, { note });
      toast(action === "dismiss" ? "Recommendation dismissed." : "Suspension lifted.", "success");
      setNotes((n) => ({ ...n, [s.id]: "" }));
      await load();
      onChanged?.();
    } catch (err) {
      toastError(err, "Could not save.");
    } finally {
      setBusy(null);
    }
  }

  async function startManual() {
    if (!manual.staff) {
      toast("Choose a technician.", "warning");
      return;
    }
    if (manual.reason.trim().length < 10) {
      toast("Write the reason the technician will read (at least a sentence).", "warning");
      return;
    }
    setBusy("manual");
    try {
      await apiPost("/api/v1/admin/maintenance/suspensions", { staff_id: Number(manual.staff), days: manual.days, reason: manual.reason.trim() });
      toast("Technician suspended from new assignments.", "success");
      setManual({ staff: "", days: 7, reason: "" });
      await load();
      onChanged?.();
    } catch (err) {
      toastError(err, "Could not apply the suspension.");
    } finally {
      setBusy(null);
    }
  }

  const free = useMemo(() => techs.filter((t) => !t.suspended_until), [techs]);
  if (error) return <p className={base.error} role="alert">{error}</p>;
  if (!data) return <div className={base.skeleton} aria-busy="true" aria-label="Loading suspensions" />;
  const rule = data.rule;

  return (
    <>
      <p className={styles.rule}>
        Rule: when <strong>{rule.upheld_reports}</strong> reports about a technician are upheld, from at least{" "}
        <strong>{rule.different_residents}</strong> different residents within {rule.window_days} days, a suspension is recommended
        ({rule.days_by_step.join(" then ")} days; after that, a review for removal). It starts only when you apply it, and the
        technician keeps the jobs they already have.
      </p>

      <h3 className={styles.sectionTitle}>Waiting for your decision ({data.recommended.length})</h3>
      {data.recommended.length === 0 ? <p className={base.empty}>No recommendations right now.</p> : null}
      <ul className={base.list}>
        {data.recommended.map((s) => (
          <li key={s.id} className={base.card}>
            <div className={base.top}>
              <div>
                <strong className={base.tech}>{s.technician ?? "Unknown technician"}</strong>
                <span className={base.cat}>Recommended {formatServerDateTime(s.created_at)}</span>
              </div>
              <span className={base.pillOpen}>Your decision</span>
            </div>
            <p className={base.meta}>{s.reason}</p>
            {s.escalate ? <p className={styles.escalate}>This technician was suspended before. Consider a review for removal instead.</p> : null}
            <ul className={styles.evidence} aria-label="Reports behind this recommendation">
              {s.evidence.map((e) => (
                <li key={e.report_id}>
                  <strong>{e.category}</strong>
                  {" · "}
                  {onOpenTicket ? (
                    <button type="button" className={base.link} onClick={() => onOpenTicket(e.ticket_id)}>Ticket #{e.ticket_id}</button>
                  ) : <>Ticket #{e.ticket_id}</>}
                  <p>{e.details}</p>
                  {e.admin_note ? <small>Your note: {e.admin_note}</small> : null}
                </li>
              ))}
            </ul>
            <div className={base.review}>
              <label htmlFor={`days-${s.id}`}>Suspend from new assignments for (days)</label>
              <input
                id={`days-${s.id}`}
                type="number"
                min={1}
                max={rule.max_days}
                className={styles.number}
                value={days[s.id] ?? s.suggested_days ?? 7}
                onChange={(e) => setDays((d) => ({ ...d, [s.id]: Math.min(Math.max(Number(e.target.value) || 1, 1), rule.max_days) }))}
              />
              <label htmlFor={`why-${s.id}`}>Reason the technician will read (do not name the residents)</label>
              <textarea id={`why-${s.id}`} rows={2} maxLength={500} value={reasons[s.id] ?? s.reason ?? ""} onChange={(e) => setReasons((r) => ({ ...r, [s.id]: e.target.value }))} />
              <div className={base.actions}>
                <button type="button" className={base.danger} disabled={busy === s.id} onClick={() => void apply(s)}>
                  <ShieldBan size={14} aria-hidden="true" /> Suspend for {days[s.id] ?? s.suggested_days ?? 7} days
                </button>
              </div>
              <label htmlFor={`no-${s.id}`}>Or decide not to (your reason is kept)</label>
              <textarea id={`no-${s.id}`} rows={2} maxLength={500} value={notes[s.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))} placeholder="e.g. A warning was enough; the reports were about the same visit." />
              <div className={base.actions}>
                <button type="button" className={base.secondary} disabled={busy === s.id} onClick={() => void decide(s, "dismiss")}>
                  Do not suspend
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <h3 className={styles.sectionTitle}>Active ({data.active.length})</h3>
      {data.active.length === 0 ? <p className={base.empty}>No technician is suspended.</p> : null}
      <ul className={base.list}>
        {data.active.map((s) => (
          <li key={s.id} className={base.card}>
            <div className={base.top}>
              <div>
                <strong className={base.tech}>{s.technician ?? "Unknown technician"}</strong>
                <span className={base.cat}>Until {formatServerDateTime(s.ends_at)} · {s.days_left} day{s.days_left === 1 ? "" : "s"} left</span>
              </div>
              <span className={base.pillOpen}>Suspended</span>
            </div>
            <p className={base.meta}>{s.reason}</p>
            <div className={base.review}>
              <label htmlFor={`lift-${s.id}`}>Lift it early? Say why</label>
              <textarea id={`lift-${s.id}`} rows={2} maxLength={500} value={notes[s.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))} />
              <div className={base.actions}>
                <button type="button" className={base.secondary} disabled={busy === s.id} onClick={() => void decide(s, "lift")}>
                  Lift suspension
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <h3 className={styles.sectionTitle}>Suspend a technician yourself</h3>
      <div className={`${base.card} ${base.review}`}>
        <label htmlFor="manual-tech">Technician</label>
        <select id="manual-tech" className={styles.select} value={manual.staff} onChange={(e) => setManual((m) => ({ ...m, staff: e.target.value }))}>
          <option value="">Choose…</option>
          {free.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <label htmlFor="manual-days">Days</label>
        <input id="manual-days" type="number" min={1} max={rule.max_days} className={styles.number} value={manual.days}
          onChange={(e) => setManual((m) => ({ ...m, days: Math.min(Math.max(Number(e.target.value) || 1, 1), rule.max_days) }))} />
        <label htmlFor="manual-reason">Reason the technician will read</label>
        <textarea id="manual-reason" rows={2} maxLength={500} value={manual.reason} onChange={(e) => setManual((m) => ({ ...m, reason: e.target.value }))} />
        <div className={base.actions}>
          <button type="button" className={base.danger} disabled={busy === "manual"} onClick={() => void startManual()}>
            <ShieldBan size={14} aria-hidden="true" /> Suspend
          </button>
        </div>
      </div>

      {data.history.length ? (
        <>
          <h3 className={styles.sectionTitle}>History</h3>
          <ul className={styles.history}>
            {data.history.map((s) => (
              <li key={s.id}>
                <strong>{s.technician ?? "Unknown technician"}</strong>
                <span className={base.pillMuted}>{s.status}</span>
                <small>
                  {s.status === "Dismissed"
                    ? `Not suspended. ${s.decision_note ?? ""}`
                    : `${formatServerDateTime(s.starts_at)} to ${formatServerDateTime(s.ends_at)}${s.lifted_reason ? `. Lifted early: ${s.lifted_reason}` : ""}`}
                </small>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
