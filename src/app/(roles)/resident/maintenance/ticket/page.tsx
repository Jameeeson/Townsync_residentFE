"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import styles from "@/styles/ticketdetail.module.css";
import {
  ArrowLeft,
  BadgeCheck,
  CircleHelp,
  ClipboardCheck,
  FilePlus2,
  HardHat,
  Hourglass,
  MessageSquare,
  RotateCcw,
  Shuffle,
  ShieldAlert,
  TimerOff,
  UserCheck,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import {
  MaintenanceTicket,
  cancelMaintenanceTicket,
  getMaintenanceTicket,
} from "@/lib/api/resident";
import AuthPhotos from "@/components/maintenance/AuthPhotos";
import ResolutionPanel from "@/components/maintenance/ResolutionPanel";
import ReportTechnicianDialog from "@/components/maintenance/ReportTechnicianDialog";
import TicketChatDialog from "@/components/maintenance/TicketChatDialog";
import { parseServerDate } from "@/lib/datetime";

/** The journey a request takes, in order. The sequence carries meaning, so it is shown as a track. */
const STEPS = ["Filed", "Assigned", "In progress", "Resolved", "Closed"] as const;

type Tone = "info" | "progress" | "attention" | "done" | "alert" | "muted";

type StageView = {
  step: number; // index into STEPS; -1 when the request left the journey (cancelled)
  tone: Tone;
  icon: LucideIcon;
  headline: string;
  detail: string;
  /** What the resident can expect next, shown beside the actions. */
  next: string;
};

function stageView(stage: string): StageView {
  switch (stage) {
    case "Assigned":
      return { step: 1, tone: "info", icon: UserCheck, headline: "A technician is assigned", detail: "They will take it from here. You can message management at any time.", next: "The technician visits and starts the repair. When they finish they send a work report with photos, and you will be asked to confirm it." };
    case "Ongoing":
    case "In Progress":
      return { step: 2, tone: "progress", icon: Wrench, headline: "Work is under way", detail: "Your technician is on it. You will see their report here when they finish.", next: "When the work is done the technician sends a report with photos. You then confirm the fix, or tell us it is not fixed." };
    case "Resolved":
      return {
        step: 3,
        tone: "attention",
        icon: Hourglass,
        headline: "Waiting for your answer",
        detail: "The technician says the work is done. Your answer closes this request or sends it back.",
        next: "Confirm the fix to close this request. If the problem is still there, say so with a photo and management sends a technician back.",
      };
    case "Closed":
      return { step: 4, tone: "done", icon: BadgeCheck, headline: "All done", detail: "This request is closed. If the problem comes back, file a new request.", next: "Nothing more is needed. If the same problem returns, start a new request and mention this ticket number." };
    case "Reopened":
      return { step: 0, tone: "alert", icon: RotateCcw, headline: "Back with management", detail: "You told us it is not fixed. They will send a technician back and update this page.", next: "Management picks a technician to send back, the same one or another. You will see it here as soon as they do." };
    case "Cancelled":
      return { step: -1, tone: "muted", icon: XCircle, headline: "Request cancelled", detail: "Nothing more will happen on this request.", next: "If you still need the repair, file a new request from the maintenance page." };
    default:
      return { step: 0, tone: "info", icon: FilePlus2, headline: "We have your request", detail: "Management is reviewing it and will assign a technician.", next: "Management reviews it, then assigns a technician. You will be notified here and in the bell when that happens." };
  }
}

const KIND_ICONS: Record<string, LucideIcon> = {
  filed: FilePlus2,
  assigned: UserCheck,
  work_report: ClipboardCheck,
  reopened: RotateCcw,
  reassigned: Shuffle,
  closed: BadgeCheck,
  closed_auto: TimerOff,
  cancelled: XCircle,
};

function whenLong(value: string | null | undefined): string {
  const parsed = parseServerDate(value);
  return parsed
    ? parsed.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : value ?? "—";
}

function whenShort(value: string | null | undefined): string {
  const parsed = parseServerDate(value);
  return parsed
    ? parsed.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : value ?? "";
}

function TicketDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const ticketId = idParam ? Number(idParam) : NaN;

  const [ticket, setTicket] = useState<MaintenanceTicket | null>(null);
  const [fetchError, setError] = useState("");
  const [fetching, setLoading] = useState(true);
  const invalidId = !Number.isFinite(ticketId);
  const error = invalidId ? "Missing ticket id. Open a ticket from the maintenance page." : fetchError;
  const loading = invalidId ? false : fetching;
  const [cancelling, setCancelling] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // Messages open as a pop-up over the ticket; old /chat links arrive here with ?chat=1.
  const [chatOpen, setChatOpen] = useState(searchParams.get("chat") === "1");
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => {
    if (invalidId) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await getMaintenanceTicket(ticketId);
        if (!cancelled) setTicket(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to load ticket."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ticketId, invalidId]);

  async function handleCancel() {
    if (!ticket) return;
    const confirmed = window.confirm(
      "Cancel this maintenance request? Management will be notified."
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      await cancelMaintenanceTicket(ticket.id);
      router.push("/resident/maintenance");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not cancel ticket."
      );
      setCancelling(false);
    }
  }

  /** The resident answered a Resolved ticket: show the new stage, then reload so the history includes the answer. */
  async function handleAnswered(stage: "Closed" | "Reopened") {
    if (!ticket) return;
    setTicket({
      ...ticket,
      stage,
      awaiting_confirmation: false,
      status: stage === "Closed" ? "Completed" : "Open",
      resolution_confirmed_at: stage === "Closed" ? new Date().toISOString() : null,
    });
    try {
      setTicket(await getMaintenanceTicket(ticket.id));
    } catch {
      // the optimistic state above is already correct
    }
  }

  if (loading) {
    return (
      <div className={styles.page} aria-busy="true" aria-label="Loading ticket">
        <div className="ts-skeleton" style={{ width: 120, height: 20, marginBottom: 20 }}>Loading</div>
        <div className="ts-skeleton" style={{ width: "min(100%, 520px)", height: 40, marginBottom: 20 }}>Loading</div>
        <div className="ts-skeleton" style={{ width: "100%", height: 220 }}>Loading</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className={styles.page}>
        <p className={styles.errorBanner} role="alert">{error || "Ticket not found"}</p>
        <Link href="/resident/maintenance" className={styles.backBtn}>
          <ArrowLeft size={18} aria-hidden="true" /> Back to maintenance
        </Link>
      </div>
    );
  }

  const stage =
    ticket.stage ??
    (ticket.status === "Completed" ? (ticket.resolution_confirmed_at ? "Closed" : "Resolved") : ticket.status);
  const awaitingConfirmation = ticket.awaiting_confirmation ?? stage === "Resolved";
  const view = stageView(stage);
  const StageIcon = view.icon;
  const cancellable = !awaitingConfirmation && !["Cancelled", "Closed", "Resolved"].includes(stage);
  const timeline = ticket.activity_timeline ?? [];

  return (
    <div className={styles.page}>
      <nav className={styles.topbar} aria-label="Ticket navigation">
        <Link href="/resident/maintenance" className={styles.backBtn}>
          <ArrowLeft size={18} aria-hidden="true" /> Back to maintenance
        </Link>
        <span className={styles.ticketNo}>Ticket #{ticket.id}</span>
      </nav>

      <header className={styles.heading}>
        <h1>{ticket.subject}</h1>
        <p className={styles.sub}>
          <span>{ticket.category}</span>
          <span className={`${styles.priority} ${styles[`priority_${ticket.priority_level.toLowerCase()}`] ?? ""}`}>
            {ticket.priority_level} priority
          </span>
          <span>Filed {whenLong(ticket.created_at)}</span>
        </p>
      </header>

      {/* The one thing the resident came here to learn: where is my request, and is it on me? */}
      <section className={`${styles.status} ${styles[`tone_${view.tone}`]}`} aria-labelledby="status-headline">
        <div className={styles.statusMain}>
          <span className={styles.statusIcon}><StageIcon size={22} aria-hidden="true" /></span>
          <div>
            <h2 id="status-headline">{view.headline}</h2>
            <p>{view.detail}</p>
          </div>
        </div>

        {view.step >= 0 ? (
          <ol className={styles.track} aria-label={`Progress: ${STEPS[view.step]} (step ${view.step + 1} of ${STEPS.length})`} style={{ ["--step" as string]: view.step }}>
            {STEPS.map((label, i) => (
              <li
                key={label}
                className={i < view.step ? styles.stepDone : i === view.step ? styles.stepNow : styles.stepNext}
                aria-current={i === view.step ? "step" : undefined}
              >
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.stepLabel}>{label}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      {chatOpen ? <TicketChatDialog ticketId={ticket.id} onClose={() => setChatOpen(false)} /> : null}
      {reportOpen ? (
        <ReportTechnicianDialog
          ticketId={ticket.id}
          onClose={() => setReportOpen(false)}
          onSent={() => {
            setReportOpen(false);
            setReportSent(true);
          }}
        />
      ) : null}

      {awaitingConfirmation ? (
        <ResolutionPanel ticketId={ticket.id} autoCloseAt={ticket.auto_close_at} onAnswered={(next) => void handleAnswered(next)} />
      ) : null}

      <div className={styles.columns}>
        <div className={styles.main}>
          <section className={styles.card} aria-labelledby="reported-title">
            <h2 id="reported-title">What you reported</h2>
            <p className={styles.description}>{ticket.detailed_description}</p>
            <dl className={styles.facts}>
              <div>
                <dt>Category</dt>
                <dd>{ticket.category}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>{ticket.priority_level}</dd>
              </div>
              <div>
                <dt>Filed</dt>
                <dd>{whenLong(ticket.created_at)}</dd>
              </div>
              {ticket.preferred_date ? (
                <div>
                  <dt>Preferred visit</dt>
                  <dd>{whenLong(ticket.preferred_date)}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className={`${styles.card} ${styles.help}`} aria-labelledby="help-title">
            <h2 id="help-title">What happens next</h2>
            <p className={styles.next}>{view.next}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={() => setChatOpen(true)}>
                <MessageSquare size={17} aria-hidden="true" /> Message management
              </button>
              {ticket.can_report_technician ? (
                ticket.technician_reported || reportSent ? (
                  <span className={styles.reported}>
                    <BadgeCheck size={17} aria-hidden="true" /> You reported this technician
                  </span>
                ) : (
                  <button type="button" className={styles.secondary} onClick={() => setReportOpen(true)}>
                    <ShieldAlert size={17} aria-hidden="true" /> Report technician
                  </button>
                )
              ) : null}
              {cancellable ? (
                <button type="button" className={styles.cancel} onClick={() => void handleCancel()} disabled={cancelling}>
                  {cancelling ? "Cancelling…" : "Cancel request"}
                </button>
              ) : null}
            </div>
            <p className={styles.helper}>
              <CircleHelp size={14} aria-hidden="true" />
              {ticket.can_report_technician
                ? ticket.technician_reported || reportSent
                  ? "Management is reviewing your report. You will get a notification when it is done."
                  : "Reporting a technician is private. Only the administrator sees it."
                : "Messages go to management, who can reach your technician."}
            </p>
          </section>
        </div>

        <aside className={styles.history} aria-labelledby="history-title">
          <h2 id="history-title">History</h2>
          {timeline.length === 0 ? (
            <p className={styles.empty}>Nothing has happened yet.</p>
          ) : (
            <ol className={styles.events}>
              {timeline.map((event, index) => {
                const Icon = KIND_ICONS[event.kind ?? ""] ?? HardHat;
                const alert = event.kind === "reopened";
                return (
                  <li key={event.id} className={`${styles.event} ${alert ? styles.eventAlert : ""} ${index === 0 ? styles.eventLatest : ""}`}>
                    <span className={styles.eventDot}><Icon size={14} aria-hidden="true" /></span>
                    <div className={styles.eventBody}>
                      <div className={styles.eventHead}>
                        <strong>{event.title}</strong>
                        <time dateTime={event.timestamp}>{whenShort(event.timestamp)}</time>
                      </div>
                      {event.description ? <p>{event.description}</p> : null}
                      {event.attachments && event.attachments.length > 0 ? (
                        <AuthPhotos
                          paths={event.attachments.map((a) => a.url)}
                          label={event.kind === "reopened" ? "Your photo" : "Work photo"}
                        />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function TicketDetailPage() {
  return (
    <Suspense fallback={<div className={styles.page} aria-busy="true" />}>
      <TicketDetail />
    </Suspense>
  );
}
