"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Circle, Loader2, Phone } from "lucide-react";
import styles from "@/styles/maintenance.module.css";
import type { MaintenanceTicket } from "@/lib/api/resident";
import { priorityTone } from "@/lib/maintenanceStatus";

type MilestoneState = "done" | "active" | "pending";

interface Milestone {
  label: string;
  body: string;
  state: MilestoneState;
}

const ACTIVE_OR_LATER = new Set(["Assigned", "Ongoing", "Completed"]);
const DISPATCH_CONFIRMED = new Set(["Ongoing", "Completed"]);

function buildMilestones(status: string): Milestone[] {
  const reviewDone = ACTIVE_OR_LATER.has(status);
  const dispatchDone = DISPATCH_CONFIRMED.has(status);

  return [
    {
      label: "AI Triaged & Logged",
      body: "Automated triage verified the category and routed your request to building management.",
      state: "done",
    },
    {
      label: "Admin & Tech Review",
      body: reviewDone
        ? "Facilities management has reviewed the request and assigned it for dispatch."
        : "Facilities manager is validating parts inventory and crew availability.",
      state: reviewDone ? "done" : "active",
    },
    {
      label: "Dispatch & Visit Window Confirmation",
      body: dispatchDone
        ? "A technician has been dispatched to your unit for this request."
        : "Your technician arrival window will be sent via SMS and portal notification.",
      state: dispatchDone ? "done" : reviewDone ? "active" : "pending",
    },
  ];
}

function priorityDot(priority: string): string {
  const tone = priorityTone(priority);
  switch (tone) {
    case "danger":
      return "var(--color-danger-600)";
    case "warning":
      return "var(--color-warning-600)";
    case "info":
      return "var(--color-primary-600)";
    default:
      return "var(--color-text-tertiary)";
  }
}

export function SuccessPanel({ ticket }: { ticket: MaintenanceTicket }) {
  const router = useRouter();
  const milestones = buildMilestones(ticket.status);
  const submitted = new Date(ticket.created_at);

  return (
    <div className={`${styles.confirmPanel} ts-fade-in-up`} role="status">
      <div className={styles.confirmHeader}>
        <div>
          <h2 className={styles.confirmTitle}>Maintenance Request Confirmation</h2>
          <p className={styles.confirmSubtitle}>
            Your service request has been successfully registered and queued for dispatch.
          </p>
        </div>
        <span className={styles.ticketDraftPill}>Ticket #TC-{ticket.id}</span>
      </div>

      <div className={styles.confirmBody}>
        <span className={`${styles.confirmStatusPill}`}>Request Received &amp; Dispatched</span>
        <h3 className={styles.successTicketId}>Ticket #TC-{ticket.id}</h3>
        <p className={styles.successBody}>
          A certified TownSync technician is assigned to review your issue. You can follow live
          milestones and real-time updates below.
        </p>

        <div className={styles.confirmInfoGrid}>
          <div className={styles.confirmInfoItem}>
            <span className={styles.successMetaLabel}>Category &amp; Issue</span>
            <span className={styles.successMetaValue}>
              {ticket.category} · {ticket.subject}
            </span>
          </div>
          <div className={styles.confirmInfoItem}>
            <span className={styles.successMetaLabel}>Priority Level</span>
            <span className={styles.successMetaValue}>
              <span
                className={styles.gatheredChipDot}
                style={{ background: priorityDot(ticket.priority_level), display: "inline-block", marginRight: 6 }}
                aria-hidden="true"
              />
              {ticket.priority_level} Urgency
            </span>
          </div>
          <div className={styles.confirmInfoItem}>
            <span className={styles.successMetaLabel}>Submitted Timestamp</span>
            <span className={styles.successMetaValue}>
              {submitted.toLocaleDateString([], { month: "short", day: "numeric" })} at{" "}
              {submitted.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
          {ticket.preferred_date ? (
            <div className={styles.confirmInfoItem}>
              <span className={styles.successMetaLabel}>Preferred Visit Date</span>
              <span className={styles.successMetaValue}>
                {new Date(ticket.preferred_date).toLocaleDateString([], { month: "short", day: "numeric" })}
              </span>
            </div>
          ) : null}
        </div>

        <div className={styles.milestoneTracker}>
          <div className={styles.caseFileEyebrow}>Next Milestones Tracker</div>
          <div className={styles.milestoneList}>
            {milestones.map((m) => (
              <div key={m.label} className={styles.milestoneItem}>
                <span
                  className={`${styles.milestoneMark} ${
                    m.state === "done" ? styles.milestoneMarkDone : m.state === "active" ? styles.milestoneMarkActive : ""
                  }`}
                >
                  {m.state === "done" ? (
                    <Check size={12} strokeWidth={3} />
                  ) : m.state === "active" ? (
                    <Loader2 size={12} className={styles.milestoneSpin} />
                  ) : (
                    <Circle size={8} fill="currentColor" />
                  )}
                </span>
                <div className={styles.milestoneBody}>
                  <div className={styles.milestoneTop}>
                    <span className={styles.milestoneLabel}>{m.label}</span>
                    <span
                      className={badgeToneClass(m.state)}
                    >
                      {m.state === "done" ? "Completed" : m.state === "active" ? "In Progress" : "Pending"}
                    </span>
                  </div>
                  <p className={styles.milestoneText}>{m.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.confirmActions}>
          <Link href={`/resident/maintenance/ticket?id=${ticket.id}`} className={styles.submitBtn}>
            View Live Ticket Status →
          </Link>
          <button type="button" className={styles.reviewBtnSecondary} onClick={() => router.push("/resident")}>
            Return to Dashboard
          </button>
        </div>

        <p className={styles.confirmFooterNote}>
          Immediate hazard or water leak?{" "}
          <a href="tel:+15550123456" className={styles.hotlineLink}>
            <Phone size={12} /> Call 24/7 Dispatch Hotline
          </a>
        </p>
      </div>
    </div>
  );
}

function badgeToneClass(state: MilestoneState): string {
  if (state === "done") return "ts-badge ts-badge-success";
  if (state === "active") return "ts-badge ts-badge-info";
  return "ts-badge ts-badge-neutral";
}

export default SuccessPanel;
