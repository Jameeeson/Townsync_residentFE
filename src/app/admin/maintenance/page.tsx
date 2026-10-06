"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet, apiPost, apiPatch, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { getTicketChat, sendTicketChatMessage, type TicketChatThread } from "@/lib/chat";
import {
  Wrench,
  Clock,
  Users,
  UserCheck,
  ClipboardList,
  ShieldAlert,
  Filter,
  MoreHorizontal,
  Send,
  ArrowLeft,
  Calendar,
  Phone,
  CheckCircle2,
  X,
  Droplets,
  Snowflake,
  Refrigerator,
  Zap,
  Hammer,
  Home,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Ban,
  BadgeCheck,
  MessageSquare,
  UserRound,
  Scale,
  History,
} from "lucide-react";

import styles from "@/components/styles/Maintenance.module.css";
import AdminShell from "@/components/admin/admin-shell";
import { parseServerDate } from "@/lib/datetime";
import AuthImageGallery from "@/components/ui/auth-image-gallery";
import MaintenanceHistoryView from "@/components/admin/maintenance-history-view";
import { StaffChatModal } from "@/components/admin/staff-chat";
import { specialtyFit } from "@/lib/specialty";
import ListControls from "@/components/ui/list-controls";

/* ─── Shared domain data (one source of truth) ─── */

type Priority = "high" | "medium" | "low";
type StaffStatus = "available" | "on-job" | "on-site" | "break" | "off-shift";
type DetailView = "pending" | "ongoing" | "staff" | "available" | "calendar" | "history";
type ModalMode = "dispatch" | "decline" | "success" | "decline-success" | null;

type PendingRequest = {
  id: string;
  title: string;
  resident: string;
  unit: string;
  category: string;
  /** The resident's own words, unchanged (the description is the AI's English rewrite). */
  residentReport: string | null;
  /** The resident's account was deleted; the ticket and its history are kept. */
  residentDeleted?: boolean;
  /** Set when the ticket came back to the queue because its technician's account was deleted. */
  returnedNote?: string | null;
  aiLabel: string;
  /** Risk Triage Engine score (0-10ish) and the reasons behind it; absent for tickets it never scored. */
  riskScore: number | null;
  riskReasons: string[];
  createdAt: string | null;
  priority: Priority;
  reportedAgo: string;
  reportedAt: string;
  description: string;
  preferredDay: string;
  phone: string;
  imageUrls: string[];
  subject: string | null;
  priorityLevel: string;
  adminNotes: string | null;
  updatedAt: string | null;
  residentStatus: string;
  // Unset for a genuinely pending/undispatched ticket (still correctly "Open"
  // and unassigned). Populated only when this shape is adapted from an
  // OngoingJob, so the chat sidebar tells the truth in both cases instead of
  // always showing the pending-ticket defaults.
  status?: string;
  assignedTech?: { name: string; email: string | null } | null;
  // True when the resident used "Talk to a person" from the AI chat instead
  // of (or in addition to) letting it finish triage. A marker only - never
  // changes queue order on its own, see the ORDER BY in the backend.
  humanRequested?: boolean;
};

type OngoingJob = {
  id: string;
  title: string;
  subject: string | null;
  priorityLevel: string;
  adminNotes: string | null;
  reportedAt: string | null;
  updatedAt: string | null;
  resident: string;
  residentPhone: string | null;
  imageUrls: string[];
  residentStatus: string | null;
  techEmail: string | null;
  details: string;
  residentReport: string | null;
  residentDeleted?: boolean;
  techDeleted?: boolean;
  category: string;
  priority: Priority;
  location: string;
  tech: string;
  techInitials: string;
  status: string;
  assignedAt: string;
  deadline: string | null;
  isOverdue: boolean;
};

type StaffMember = {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  skills: string[];
  status: StaffStatus;
  shift: string;
  location: string;
  isTech: boolean;
  load?: string;
  activeTask?: string;
  activeTaskCount: number;
  title?: string;
  district?: string;
  since?: string;
  tasksCompleted?: number;
  avgResolution?: string;
  email?: string | null;
  /** USER id, used for the staff chat. */
  userId?: number | null;
};

// --- Backend adapter types/helpers ---
// Fields the backend cannot supply for a given row (null) fall back to "Not available from backend"
// instead of fake values.
type TriageQueueItem = {
  id: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  ai_priority?: string;
  ai_confidence?: number;
  resident_name?: string | null;
  unit_number?: string | null;
  resident_phone?: string | null;
  created_at?: string | null;
  preferred_date?: string | null;
  initial_image_url?: string | null;
  image_urls?: string[];
  subject?: string | null;
  updated_at?: string | null;
  admin_notes?: string | null;
  resident_status?: string | null;
  human_requested?: boolean;
  risk_score?: number | null;
  risk_explanation?: { reasons?: string[]; sources?: string[] } | null;
  /** The engine's reasons in general terms, without source citations. */
  risk_summary?: string[];
  resident_report?: string | null;
  resident_deleted?: boolean;
  returned_note?: string | null;
};

type DispatchBoardItem = {
  id: string;
  name: string;
  specialty: string;
  status: string;
  current_task_id: string | null;
  active_task_count?: number | null;
  shift?: string | null;
  shift_label?: string | null;
  on_shift?: boolean | null;
  location?: string | null;
  tasks_completed?: number | null;
  avg_resolution_minutes?: number | null;
  email?: string | null;
  user_id?: number | null;
};

type StaffHistoryItem = {
  request_id: number;
  title: string | null;
  category: string | null;
  status: string;
  assigned_at: string | null;
  deadline: string | null;
  completed_at: string | null;
};

type CommandSummary = {
  pending_requests: number;
  ongoing_repairs: number;
  staff_on_duty: number;
  available_techs: number;
};

type OngoingJobItem = {
  id: string;
  subject: string | null;
  description: string;
  category: string;
  priority: string;
  status: string;
  resident_name: string | null;
  unit_number: string | null;
  tech_name: string | null;
  staff_id: string | null;
  assigned_at: string | null;
  deadline: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  admin_notes?: string | null;
  resident_phone?: string | null;
  resident_status?: string | null;
  tech_email?: string | null;
  initial_image_url?: string | null;
  image_urls?: string[];
  resident_report?: string | null;
  resident_deleted?: boolean;
  tech_deleted?: boolean;
};

const NOT_AVAILABLE = "Not available from backend";

function toPriority(value: string): Priority {
  const v = value.toLowerCase();
  if (v.includes("high") || v.includes("emergency")) return "high";
  if (v.includes("medium")) return "medium";
  return "low";
}

function toStaffStatus(value: string): StaffStatus {
  // Backend (dispatch-board) returns "On-Duty", "Busy" or "Off-Shift".
  const v = value.toLowerCase();
  if (v.includes("off")) return "off-shift";
  if (v.includes("on-duty") || v.includes("available")) return "available";
  if (v.includes("site")) return "on-site";
  if (v.includes("break")) return "break";
  return "on-job";
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function truncate(text: string): string {
  return text.length > 60 ? `${text.slice(0, 60).trim()}…` : text;
}

function relativeTime(value: string | null | undefined): string {
  const d = parseServerDate(value);
  if (!d) return NOT_AVAILABLE;
  const minutes = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatWhen(value: string | null | undefined): string {
  const d = parseServerDate(value);
  return d ? d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : NOT_AVAILABLE;
}

function adaptTriageItem(item: TriageQueueItem): PendingRequest {
  const category = item.category || "Other";
  return {
    id: item.id,
    title: item.subject ?? truncate(item.description),
    subject: item.subject ?? null,
    priorityLevel: item.priority,
    adminNotes: item.admin_notes ?? null,
    updatedAt: item.updated_at ?? null,
    residentStatus: item.resident_status ?? NOT_AVAILABLE,
    resident: item.resident_name ?? NOT_AVAILABLE,
    unit: item.unit_number ?? NOT_AVAILABLE,
    category,
    residentReport: item.resident_report ?? null,
    residentDeleted: Boolean(item.resident_deleted),
    returnedNote: item.returned_note ?? null,
    aiLabel: item.ai_priority ?? item.status,
    riskScore: typeof item.risk_score === "number" ? item.risk_score : null,
    riskReasons: item.risk_summary ?? [],
    createdAt: item.created_at ?? null,
    priority: toPriority(item.priority),
    reportedAgo: relativeTime(item.created_at),
    reportedAt: item.created_at ?? NOT_AVAILABLE,
    description: item.description,
    preferredDay: item.preferred_date ?? "No preference given",
    phone: item.resident_phone ?? NOT_AVAILABLE,
    imageUrls: item.image_urls ?? (item.initial_image_url ? [item.initial_image_url] : []),
    humanRequested: Boolean(item.human_requested),
  };
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function adaptStaffItem(item: DispatchBoardItem): StaffMember {
  const status = toStaffStatus(item.status);
  return {
    id: item.id,
    name: item.name,
    initials: initialsFor(item.name),
    specialty: item.specialty,
    skills: [item.specialty],
    status,
    shift: item.shift_label ?? NOT_AVAILABLE,
    location: item.location ?? NOT_AVAILABLE,
    isTech: true,
    activeTask: item.current_task_id ?? undefined,
    activeTaskCount: item.active_task_count ?? 0,
    tasksCompleted: item.tasks_completed ?? undefined,
    avgResolution: item.avg_resolution_minutes != null ? formatMinutes(item.avg_resolution_minutes) : undefined,
    email: item.email ?? null,
    userId: item.user_id ?? null,
  };
}

function adaptOngoingJob(item: OngoingJobItem): OngoingJob {
  const deadlineAt = parseServerDate(item.deadline);
  const isOverdue = Boolean(deadlineAt && deadlineAt.getTime() < Date.now());
  return {
    id: item.id,
    title: item.subject ?? truncate(item.description),
    subject: item.subject ?? null,
    priorityLevel: item.priority,
    adminNotes: item.admin_notes ?? null,
    reportedAt: item.created_at ?? null,
    updatedAt: item.updated_at ?? null,
    resident: item.resident_name ?? NOT_AVAILABLE,
    residentPhone: item.resident_phone ?? null,
    residentStatus: item.resident_status ?? null,
    techEmail: item.tech_email ?? null,
    imageUrls: item.image_urls ?? (item.initial_image_url ? [item.initial_image_url] : []),
    details: item.description,
    residentReport: item.resident_report ?? null,
    residentDeleted: Boolean(item.resident_deleted),
    techDeleted: Boolean(item.tech_deleted),
    category: item.category,
    priority: toPriority(item.priority),
    location: item.unit_number ?? NOT_AVAILABLE,
    tech: item.tech_name ?? "Unassigned",
    techInitials: item.tech_name ? initialsFor(item.tech_name) : "—",
    status: item.status,
    assignedAt: item.assigned_at ?? NOT_AVAILABLE,
    deadline: item.deadline,
    isOverdue,
  };
}

/** TicketDetailView (the chat panel) only ever knew about PendingRequest — it
 * was wired to open from the triage queue, before an assigned/ongoing ticket
 * could open it at all. Reshapes an OngoingJob into the same shape so the one
 * chat view works from either list rather than forking it in two. */
function toChatTicket(job: OngoingJob): PendingRequest {
  const category = job.category || "Other";
  return {
    id: job.id,
    title: job.title,
    resident: job.resident,
    unit: job.location,
    category,
    residentReport: job.residentReport,
    residentDeleted: job.residentDeleted,
    aiLabel: job.status,
    riskScore: null,
    riskReasons: [],
    createdAt: job.reportedAt ?? null,
    priority: job.priority,
    reportedAgo: relativeTime(job.reportedAt),
    reportedAt: job.reportedAt ?? NOT_AVAILABLE,
    description: job.details,
    preferredDay: "No preference given",
    phone: job.residentPhone ?? NOT_AVAILABLE,
    imageUrls: job.imageUrls,
    subject: job.subject,
    priorityLevel: job.priorityLevel,
    adminNotes: job.adminNotes,
    updatedAt: job.updatedAt,
    residentStatus: job.residentStatus ?? NOT_AVAILABLE,
    status: job.status,
    assignedTech: job.tech && job.tech !== "Unassigned" ? { name: job.tech, email: job.techEmail } : null,
  };
}

const PRIORITY_RANK: Record<string, number> = { Emergency: 0, High: 1, Medium: 2, Low: 3 };

const PRIORITY_FILTER = [
  { value: "all", label: "All priorities" },
  { value: "Emergency", label: "Emergency" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

function categoryOptions(values: string[]) {
  return [
    { value: "all", label: "All categories" },
    ...Array.from(new Set(values.filter(Boolean)))
      .sort()
      .map((value) => ({ value, label: value })),
  ];
}

/** Ticket numbers only ever grow, so they are the filing order: the default view is always newest first. */
function byNewest<T extends { id: string }>(a: T, b: T): number {
  return Number(b.id) - Number(a.id);
}

function categoryIcon(category: string) {
  if (category === "Plumbing") return <Droplets size={16} />;
  if (category === "HVAC") return <Snowflake size={16} />;
  if (category === "Electrical") return <Zap size={16} />;
  if (category === "Structural") return <Hammer size={16} />;
  if (category === "Appliance") return <Refrigerator size={16} />;
  return <Wrench size={16} />;
}

/** What the resident actually typed, shown beside the AI's rewrite so nothing is lost in translation. */
function ResidentWords({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <div className={styles.sideGroup}>
      <label>Resident&apos;s own words</label>
      <p style={{ whiteSpace: "pre-wrap", fontStyle: "italic" }}>&ldquo;{text}&rdquo;</p>
    </div>
  );
}

function priorityClass(priority: Priority) {
  if (priority === "high") return styles.badgeHigh;
  if (priority === "medium") return styles.badgeMedium;
  return styles.badgeLow;
}

function priorityLabel(priority: Priority) {
  if (priority === "high") return "High Priority";
  if (priority === "medium") return "Medium Priority";
  return "Low Priority";
}

function statusLabel(status: StaffStatus) {
  if (status === "available") return "Available";
  if (status === "on-job") return "On Job";
  if (status === "on-site") return "On-Site";
  if (status === "off-shift") return "Off Shift";
  return "Break";
}

function statusDotClass(status: StaffStatus) {
  if (status === "available") return styles.dotGreen;
  if (status === "on-site") return styles.dotBlue;
  if (status === "break") return styles.dotBlue;
  if (status === "off-shift") return styles.dotGray;
  return styles.dotRed;
}

/* ─── Page ─── */

function MaintenanceCommand() {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [summary, setSummary] = useState<CommandSummary | null>(null);
  const [ongoingJobs, setOngoingJobs] = useState<OngoingJob[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAll = () => {
    setLoadError(null);
    apiGet<TriageQueueItem[]>("/api/v1/admin/maintenance/triage-queue")
      .then((data) => setPendingRequests(data.map(adaptTriageItem)))
      .catch(() => {
        setPendingRequests([]);
        setLoadError("Some maintenance data couldn't be loaded. Try refreshing the page.");
      });
    apiGet<DispatchBoardItem[]>("/api/v1/admin/maintenance/dispatch-board")
      .then((data) => setStaff(data.map(adaptStaffItem)))
      .catch(() => {
        setStaff([]);
        setLoadError("Some maintenance data couldn't be loaded. Try refreshing the page.");
      });
    apiGet<CommandSummary>("/api/v1/admin/maintenance/command-summary")
      .then(setSummary)
      .catch(() => {
        setSummary(null);
        setLoadError("Some maintenance data couldn't be loaded. Try refreshing the page.");
      });
    apiGet<OngoingJobItem[]>("/api/v1/admin/maintenance/ongoing-jobs")
      .then((data) => setOngoingJobs(data.map(adaptOngoingJob)))
      .catch(() => {
        setOngoingJobs([]);
        setLoadError("Some maintenance data couldn't be loaded. Try refreshing the page.");
      });
  };

  useEffect(() => {
    queueMicrotask(loadAll);
  }, []);

  const [detailView, setDetailView] = useState<DetailView>("pending");
  const [selectedPendingId, setSelectedPendingId] = useState<string | null>(null);
  const [ticketChatId, setTicketChatId] = useState<string | null>(null);
  const [techProfileId, setTechProfileId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [dispatchTicketId, setDispatchTicketId] = useState<string | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [dispatchDeadlineDate, setDispatchDeadlineDate] = useState("");
  const [dispatchDeadlineTime, setDispatchDeadlineTime] = useState("12:00");
  const [dispatchDeadlineError, setDispatchDeadlineError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineMessage, setDeclineMessage] = useState("");
  const [declineSubmitting, setDeclineSubmitting] = useState(false);
  const [jobTab, setJobTab] = useState<"all" | "critical" | "overdue">("all");
  const [rosterFilter, setRosterFilter] = useState<"all" | "available">("all");
  const [viewingJobId, setViewingJobId] = useState<string | null>(null);
  const { toast, toastError } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkTicket = searchParams.get("ticket");
  // A finished (completed or cancelled) ticket found by search opens in the history, filtered to that ticket.
  const historyTicket = searchParams.get("history");
  const [historySearch, setHistorySearch] = useState("");

  const viewingJob = useMemo(
    () => ongoingJobs.find((j) => j.id === viewingJobId) ?? null,
    [viewingJobId, ongoingJobs],
  );

  const selectedPending = useMemo(
    () => pendingRequests.find((r) => r.id === selectedPendingId) ?? pendingRequests[0],
    [selectedPendingId, pendingRequests],
  );

  const dispatchTicket = useMemo(
    () => pendingRequests.find((r) => r.id === dispatchTicketId) ?? pendingRequests[0],
    [dispatchTicketId, pendingRequests],
  );

  const ticketForChat = useMemo(() => {
    const pending = pendingRequests.find((r) => r.id === ticketChatId);
    if (pending) return pending;
    const ongoing = ongoingJobs.find((j) => j.id === ticketChatId);
    return ongoing ? toChatTicket(ongoing) : null;
  }, [ticketChatId, pendingRequests, ongoingJobs]);

  const techProfile = useMemo(
    () => staff.find((s) => s.id === techProfileId) ?? null,
    [techProfileId, staff],
  );

  const openDispatch = (ticketId: string, preferredTechId?: string) => {
    setDispatchTicketId(ticketId);
    setSelectedTechId(preferredTechId ?? staff.find((s) => s.isTech)?.id ?? null);
    setDispatchDeadlineDate("");
    setDispatchDeadlineTime("12:00"); // noon by default; the admin can still change it
    setDispatchDeadlineError(null);
    setDeclineReason("");
    setDeclineMessage("");
    setModalMode("dispatch");
  };

  const selectStat = (view: DetailView) => {
    setDetailView(view);
    setTicketChatId(null);
    setTechProfileId(null);
    setViewingJobId(null);
    if (view === "available") setRosterFilter("available");
    if (view === "staff") setRosterFilter("all");
  };

  const handleAssign = async () => {
    if (!dispatchTicket) return;
    if (!selectedTechId) {
      toast("Pick a technician before dispatching.", "warning");
      return;
    }
    // A job with no deadline can't be scheduled, chased, or reported on — every
    // downstream view ends up showing a blank where the due date should be.
    if (!dispatchDeadlineDate || !dispatchDeadlineTime) {
      setDispatchDeadlineError("Set both a deadline date and time before dispatching.");
      toast("A dispatch deadline date and time are required.", "warning");
      return;
    }
    setDispatchDeadlineError(null);
    setAssigning(true);
    try {
      const params = new URLSearchParams({
        staff_id: selectedTechId,
        deadline: `${dispatchDeadlineDate} ${dispatchDeadlineTime}`,
      });
      // The dispatch dialog warns about an off-shift technician; pressing confirm is the OK.
      if (staff.find((t) => t.id === selectedTechId)?.status === "off-shift") {
        params.set("allow_off_shift", "true");
      }
      await apiPost(
        `/api/v1/admin/maintenance/tickets/${dispatchTicket.id}/assign?${params.toString()}`,
      );
      const techName = staff.find((t) => t.id === selectedTechId)?.name;
      toast(
        techName
          ? `Ticket #${dispatchTicket.id} dispatched to ${techName}.`
          : `Ticket #${dispatchTicket.id} dispatched.`,
        "success",
      );
      setModalMode("success");
      loadAll();
    } catch (e) {
      toastError(e, "Could not dispatch this ticket. Please try again.");
      setModalMode(null);
    } finally {
      setAssigning(false);
    }
  };

  const handleDecline = async () => {
    if (!dispatchTicket) return;
    setDeclineSubmitting(true);
    try {
      await apiPost(`/api/v1/admin/maintenance/tickets/${dispatchTicket.id}/decline`, {
        reason: declineReason || null,
        message: declineMessage || null,
      });
      toast(`Ticket #${dispatchTicket.id} declined.`, "success");
      setModalMode("decline-success");
      setDeclineReason("");
      setDeclineMessage("");
      loadAll();
    } catch (e) {
      toastError(e, "Couldn't decline the request. Please try again.");
      setLoadError("Couldn't decline the request. Please try again.");
    } finally {
      setDeclineSubmitting(false);
    }
  };

  // Arriving from a dashboard drill-down: open that ticket once its list has
  // loaded, then strip the query param. Consuming it matters — without that the
  // effect would re-fire on every loadAll() and yank the admin back to this
  // ticket after they had navigated somewhere else.
  useEffect(() => {
    if (!deepLinkTicket) return;
    const isOngoing = ongoingJobs.some((j) => j.id === deepLinkTicket);
    const isPending = pendingRequests.some((r) => r.id === deepLinkTicket);
    if (!isOngoing && !isPending) return; // lists still loading
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot sync from the
       URL, cleared immediately below so it cannot cascade or re-apply. */
    if (isOngoing) {
      setViewingJobId(deepLinkTicket);
      setDetailView("ongoing");
    } else {
      setSelectedPendingId(deepLinkTicket);
      setDetailView("pending");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    router.replace("/admin/maintenance", { scroll: false });
  }, [deepLinkTicket, ongoingJobs, pendingRequests, router]);

  useEffect(() => {
    if (!historyTicket) return;
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot sync from the URL, cleared right below. */
    setHistorySearch(`#${historyTicket}`);
    setDetailView("history");
    /* eslint-enable react-hooks/set-state-in-effect */
    router.replace("/admin/maintenance", { scroll: false });
  }, [historyTicket, router]);

  const availableTechs = staff.filter((s) => s.isTech && s.status === "available").length;

  const assignToTech = (techId: string) => {
    const ticketId = selectedPendingId ?? pendingRequests[0]?.id;
    if (ticketId) openDispatch(ticketId, techId);
    else toast("There are no pending requests to assign right now.", "info");
  };

  const openJobFromStaff = (jobId: string) => {
    if (!ongoingJobs.some((j) => j.id === jobId)) {
      toast(`Job #${jobId} is not in the ongoing list anymore.`, "info");
      return false;
    }
    setTechProfileId(null);
    setTicketChatId(null);
    setDetailView("ongoing");
    setViewingJobId(jobId);
    return true;
  };

  return (
    <AdminShell>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.titleRow}>
              <h1>Maintenance Command</h1>
              <span className={styles.liveIndicator}>
                <span className={styles.pulseDot} /> Live Updates Active
              </span>
            </div>
            <p>Live dispatch and triage overview.</p>
            {loadError ? <p className={styles.errorText}>{loadError}</p> : null}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link href="/admin/maintenance/learning" className={styles.calendarToggle}>
            <Scale size={15} /> Priority Learning
          </Link>
          <button
            type="button"
            className={`${styles.calendarToggle} ${detailView === "history" ? styles.calendarToggleActive : ""}`}
            aria-pressed={detailView === "history"}
            onClick={() => {
              setTicketChatId(null);
              setTechProfileId(null);
              setViewingJobId(null);
              setDetailView((v) => (v === "history" ? "pending" : "history"));
            }}
          >
            <History size={15} /> Ticket History
          </button>
          <button
            type="button"
            className={`${styles.calendarToggle} ${detailView === "calendar" ? styles.calendarToggleActive : ""}`}
            onClick={() => {
              setTicketChatId(null);
              setTechProfileId(null);
              setViewingJobId(null);
              setDetailView((v) => (v === "calendar" ? "ongoing" : "calendar"));
            }}
          >
            <Calendar size={15} />
            {detailView === "calendar" ? "List View" : "Calendar View"}
          </button>
          </div>
        </header>

        <section className={styles.statsGrid}>
          <StatCard
            label="PENDING REQUESTS"
            value={summary ? String(summary.pending_requests) : "—"}
            icon={<Clock size={20} />}
            color="navy"
            active={detailView === "pending"}
            onClick={() => selectStat("pending")}
          />
          <StatCard
            label="ONGOING REPAIRS"
            value={summary ? String(summary.ongoing_repairs) : "—"}
            icon={<Wrench size={20} />}
            color="blue"
            active={detailView === "ongoing"}
            onClick={() => selectStat("ongoing")}
          />
          <StatCard
            label="STAFF ON-DUTY"
            value={summary ? String(summary.staff_on_duty) : "—"}
            icon={<Users size={20} />}
            color="slate"
            active={detailView === "staff"}
            onClick={() => selectStat("staff")}
          />
          <StatCard
            label="AVAILABLE TECHS"
            value={summary ? String(summary.available_techs) : String(availableTechs)}
            icon={<UserCheck size={20} />}
            color="green"
            isHighlight
            active={detailView === "available"}
            onClick={() => selectStat("available")}
          />
        </section>

        <main className={styles.mainContent}>
          {techProfile ? (
            <TechProfileView
              tech={techProfile}
              onBack={() => setTechProfileId(null)}
              onOpenJob={openJobFromStaff}
              onAssign={assignToTech}
              canAssign={pendingRequests.length > 0}
            />
          ) : ticketForChat ? (
            <TicketDetailView ticket={ticketForChat} onBack={() => setTicketChatId(null)} />
          ) : viewingJob ? (
            <OngoingJobDetailView
              job={viewingJob}
              onBack={() => setViewingJobId(null)}
              onSaved={loadAll}
              onOpenChat={(id) => setTicketChatId(id)}
            />
          ) : detailView === "pending" ? (
            selectedPending ? (
              <PendingRequestsView
                requests={pendingRequests}
                selectedId={selectedPending.id}
                selected={selectedPending}
                onSelect={setSelectedPendingId}
                onOpenTicket={(id) => setTicketChatId(id)}
                onDispatch={openDispatch}
              />
            ) : (
              <p className={styles.mutedMeta}>No pending maintenance requests.</p>
            )
          ) : detailView === "ongoing" ? (
            <OngoingRepairsView
              jobs={ongoingJobs}
              jobTab={jobTab}
              onJobTab={setJobTab}
              onOpenJob={(id) => setViewingJobId(id)}
            />
          ) : detailView === "history" ? (
            <MaintenanceHistoryView key={historySearch} initialSearch={historySearch} />
          ) : detailView === "calendar" ? (
            <MaintenanceCalendarView jobs={ongoingJobs} onOpenJob={(id) => setViewingJobId(id)} />
          ) : (
            <StaffRosterView
              staff={staff}
              filter={detailView === "available" ? "available" : rosterFilter}
              onFilterChange={(f) => {
                setRosterFilter(f);
                setDetailView(f === "available" ? "available" : "staff");
              }}
              onOpenTech={(id) => setTechProfileId(id)}
              canAssign={pendingRequests.length > 0}
              onAssign={assignToTech}
              onOpenJob={openJobFromStaff}
            />
          )}
        </main>

        {modalMode && dispatchTicket && (
          <DispatchFlowModal
            mode={modalMode}
            ticket={dispatchTicket}
            staff={staff}
            selectedTechId={selectedTechId}
            onSelectTech={setSelectedTechId}
            onClose={() => setModalMode(null)}
            onDecline={() => setModalMode("decline")}
            onConfirm={handleAssign}
            onBackToDispatch={() => setModalMode("dispatch")}
            deadlineError={dispatchDeadlineError}
            assigning={assigning}
            deadlineDate={dispatchDeadlineDate}
            onDeadlineDateChange={setDispatchDeadlineDate}
            deadlineTime={dispatchDeadlineTime}
            onDeadlineTimeChange={setDispatchDeadlineTime}
            declineReason={declineReason}
            onDeclineReasonChange={setDeclineReason}
            declineMessage={declineMessage}
            onDeclineMessageChange={setDeclineMessage}
            declineSubmitting={declineSubmitting}
            onConfirmDecline={handleDecline}
            onTicketSaved={loadAll}
          />
        )}
      </div>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  subValue,
  icon,
  color,
  isHighlight,
  active,
  onClick,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color: "navy" | "blue" | "slate" | "green";
  isHighlight?: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.statCard} ${isHighlight ? styles.highlightCard : ""} ${
        active ? styles.statCardActive : ""
      }`}
      onClick={onClick}
    >
      <div className={styles.statHeader}>
        <span>{label}</span>
        <span className={styles.statIcon}>{icon}</span>
      </div>
      <div className={styles.statBody}>
        <h2 className={styles[color]}>{value}</h2>
        {subValue && <span className={styles.subValue}>{subValue}</span>}
      </div>
    </button>
  );
}

/** Same tiers the Risk Triage Engine uses: <1.5 Low, <4 Medium, <7 High, otherwise Emergency. */
function riskTier(score: number): { label: string; tone: string } {
  if (score >= 7) return { label: "Emergency", tone: styles.riskEmergency };
  if (score >= 4) return { label: "High", tone: styles.riskHigh };
  if (score >= 1.5) return { label: "Medium", tone: styles.riskMedium };
  return { label: "Low", tone: styles.riskLow };
}

function waitingFor(createdAt: string | null): string {
  const d = parseServerDate(createdAt);
  if (!d) return NOT_AVAILABLE;
  const minutes = Math.max(0, (Date.now() - d.getTime()) / 60000);
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 60 * 48) return `${Math.round(minutes / 60)} h`;
  return `${Math.round(minutes / 1440)} days`;
}

/* ─── Pending Requests (mockup 2) ─── */

function PendingRequestsView({
  requests,
  selectedId,
  selected,
  onSelect,
  onOpenTicket,
  onDispatch,
}: {
  requests: PendingRequest[];
  selectedId: string;
  selected: PendingRequest;
  onSelect: (id: string) => void;
  onOpenTicket: (id: string) => void;
  onDispatch: (id: string) => void;
}) {
  const urgentCount = requests.filter((r) => r.priorityLevel === "Emergency" || r.priorityLevel === "High").length;
  const humanCount = requests.filter((r) => r.humanRequested).length;
  const oldest = requests.reduce<PendingRequest | null>((acc, r) => {
    const t = parseServerDate(r.createdAt)?.getTime();
    const a = parseServerDate(acc?.createdAt)?.getTime();
    return t !== undefined && (a === undefined || t < a) ? r : acc;
  }, null);
  const [order, setOrder] = useState("newest");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [personFilter, setPersonFilter] = useState("all");
  const [search, setSearch] = useState("");
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase().replace(/^#/, "");
    const rows = requests.filter(
      (r) =>
        (priorityFilter === "all" || r.priorityLevel === priorityFilter) &&
        (categoryFilter === "all" || r.category === categoryFilter) &&
        (personFilter === "all" || Boolean(r.humanRequested)) &&
        (!term ||
          r.id === term ||
          r.title.toLowerCase().includes(term) ||
          r.resident.toLowerCase().includes(term) ||
          r.unit.toLowerCase().includes(term)),
    );
    const sorted = [...rows].sort(byNewest);
    if (order === "oldest") sorted.reverse();
    if (order === "priority")
      sorted.sort((a, b) => (PRIORITY_RANK[a.priorityLevel] ?? 9) - (PRIORITY_RANK[b.priorityLevel] ?? 9) || byNewest(a, b));
    if (order === "category") sorted.sort((a, b) => a.category.localeCompare(b.category) || byNewest(a, b));
    if (order === "resident") sorted.sort((a, b) => a.resident.localeCompare(b.resident) || byNewest(a, b));
    return sorted;
  }, [requests, order, priorityFilter, categoryFilter, personFilter, search]);
  const selectedRisk = selected.riskScore !== null ? riskTier(selected.riskScore) : null;
  const shortDesc =
    selected.description.length > 140
      ? `${selected.description.slice(0, 140).trim()}…`
      : selected.description;

  return (
    <div className={styles.pendingLayout}>
      <aside className={styles.pendingAside}>
        <section className={`${styles.card} ${styles.compactCard}`}>
          <div className={styles.aiLabel}>
            <ClipboardList size={16} /> Queue Summary
          </div>
          <div className={styles.aiStats}>
            <div className={styles.aiStatRow}>
              <span>Emergency / High priority</span>
              <span className={urgentCount ? styles.badgeRed : styles.badgeGreen}>
                {urgentCount} {urgentCount === 1 ? "ticket" : "tickets"}
              </span>
            </div>
            <div className={styles.aiStatRow}>
              <span>Asked for a person</span>
              <strong>{humanCount}</strong>
            </div>
            <div className={styles.aiStatRow}>
              <span>Longest waiting</span>
              <strong title={oldest ? `Ticket ${oldest.id}` : undefined}>
                {oldest ? `${waitingFor(oldest.createdAt)} (#${oldest.id})` : "—"}
              </strong>
            </div>
          </div>
        </section>

        <section className={`${styles.card} ${styles.compactCard} ${styles.detailCard}`}>
          <div className={styles.detailCardHead}>
            <h3>Request Detail</h3>
            <span className={styles.ticketId}>{selected.id}</span>
          </div>
          <h4 className={styles.detailTitle}>{selected.title}</h4>
          <p className={styles.detailMeta}>
            {selected.resident}
            {selected.residentDeleted ? " (account deleted)" : ""} · {selected.unit}
          </p>
          {selected.returnedNote ? (
            <p className={styles.returnedNote}>
              <strong>Needs a new technician.</strong> {selected.returnedNote}
            </p>
          ) : null}
          <blockquote className={styles.residentQuote}>
            &ldquo;{shortDesc}&rdquo;
          </blockquote>
          <div className={styles.riskInsight}>
            <div className={styles.riskInsightHead}>
              <span>
                <ShieldAlert size={14} aria-hidden="true" /> Risk Insight
              </span>
              {selectedRisk && selected.riskScore !== null ? (
                <span className={`${styles.riskChip} ${selectedRisk.tone}`}>
                  {selectedRisk.label} · {selected.riskScore.toFixed(1)}
                </span>
              ) : (
                <span className={`${styles.riskChip} ${styles.riskLow}`}>Not scored</span>
              )}
            </div>
            {selected.riskReasons.length ? (
              <ul className={styles.riskReasons}>
                {selected.riskReasons.slice(0, 4).map((reason) => (
                  <li key={reason}>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.riskEmpty}>
                {selected.riskScore === null
                  ? "This ticket was filed without the risk check, so judge urgency from the description."
                  : "No specific hazards were flagged."}
              </p>
            )}
          </div>
          <div className={styles.detailActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => onOpenTicket(selected.id)}
            >
              Open Thread
            </button>
            <button
              type="button"
              className={styles.primaryBtnInline}
              onClick={() => onDispatch(selected.id)}
            >
              Dispatch
            </button>
          </div>
        </section>
      </aside>

      <section className={`${styles.card} ${styles.queueCard}`}>
        <div className={styles.cardHeader}>
          <h3>Action Queue</h3>
          <span className={styles.mutedMeta}>
            Showing {visible.length} of {requests.length} request{requests.length === 1 ? "" : "s"}
          </span>
        </div>
        <div style={{ padding: "0 0.75rem 0.75rem" }}>
          <ListControls
            search={{ value: search, onChange: setSearch, placeholder: "Search resident, unit, title or ticket number" }}
            sort={{
              value: order,
              onChange: setOrder,
              options: [
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first (waiting longest)" },
                { value: "priority", label: "Priority (highest first)" },
                { value: "category", label: "Category (A-Z)" },
                { value: "resident", label: "Resident (A-Z)" },
              ],
            }}
            filters={[
              { id: "priority", label: "Priority", value: priorityFilter, options: PRIORITY_FILTER, onChange: setPriorityFilter },
              {
                id: "category",
                label: "Category",
                value: categoryFilter,
                options: categoryOptions(requests.map((r) => r.category)),
                onChange: setCategoryFilter,
              },
              {
                id: "person",
                label: "Asked for a person",
                value: personFilter,
                options: [
                  { value: "all", label: "Any" },
                  { value: "yes", label: "Only those who asked" },
                ],
                onChange: setPersonFilter,
              },
            ]}
            onReset={() => {
              setOrder("newest");
              setPriorityFilter("all");
              setCategoryFilter("all");
              setPersonFilter("all");
              setSearch("");
            }}
          />
        </div>
        <div className={styles.tableWrapper}>
          <table className={`${styles.table} ${styles.queueTable}`}>
            <thead>
              <tr>
                <th>ID / Time</th>
                <th>Resident &amp; Unit</th>
                <th>Category</th>
                <th>Priority / Risk</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>
                    {requests.length === 0 ? "No open requests." : "No requests match your search or filters."}
                  </td>
                </tr>
              ) : null}
              {visible.map((req) => (
                <tr
                  key={req.id}
                  className={req.id === selectedId ? styles.rowSelected : undefined}
                  onClick={() => onSelect(req.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onSelect(req.id);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <td>
                    <strong className={styles.linkId}>{req.id}</strong>
                    <div className={styles.cellSub}>{req.reportedAgo}</div>
                  </td>
                  <td>
                    <strong>{req.resident}</strong>
                    {req.residentDeleted ? <span className={styles.deletedTag}>Account deleted</span> : null}
                    <div className={styles.cellSub}>{req.unit}</div>
                    {req.returnedNote ? (
                      <div className={styles.returnedTag} title={req.returnedNote}>
                        Returned to queue
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span className={styles.categoryCell}>
                      {categoryIcon(req.category)} {req.category}
                    </span>
                  </td>
                  <td>
                    <span className={priorityClass(req.priority)}>
                      {priorityLabel(req.priority)}
                    </span>
                    <div className={styles.aiTag}>
                      {req.riskScore !== null ? `Risk ${req.riskScore.toFixed(1)} · ${riskTier(req.riskScore).label}` : "Risk not scored"}
                    </div>
                    {req.humanRequested ? (
                      <span className={styles.humanRequestedTag}>
                        <UserRound size={11} aria-hidden="true" /> Requested a person
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.dispatchPill}
                      aria-label={`Dispatch ticket ${req.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDispatch(req.id);
                      }}
                    >
                      Dispatch
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ─── Ongoing Repairs — real data from GET /api/v1/admin/maintenance/ongoing-jobs ─── */

function MaintenanceCalendarView({
  jobs,
  onOpenJob,
}: {
  jobs: OngoingJob[];
  onOpenJob: (id: string) => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const jobsByDay = useMemo(() => {
    const map = new Map<string, OngoingJob[]>();
    for (const job of jobs) {
      if (!job.deadline) continue;
      const d = parseServerDate(job.deadline);
      if (!d) continue;
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(job);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));
    }
    return map;
  }, [jobs]);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const startOffset = new Date(year, month, 1).getDay();
    const gridStart = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      return { date, inMonth: date.getMonth() === month };
    });
  }, [cursor]);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const unscheduledCount = jobs.filter((j) => !j.deadline).length;

  return (
    <section className={styles.card}>
      <div className={styles.monthNav}>
        <button
          type="button"
          className={styles.monthNavBtn}
          aria-label="Previous month"
          onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
        >
          <ChevronLeft size={16} />
        </button>
        <h3>{monthLabel}</h3>
        <button
          type="button"
          className={styles.monthNavBtn}
          aria-label="Next month"
          onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          className={styles.monthTodayBtn}
          onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
        >
          Today
        </button>
      </div>

      <div className={styles.monthGrid}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className={styles.monthWeekday}>
            {d}
          </div>
        ))}
        {cells.map(({ date, inMonth }) => {
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          const dayJobs = jobsByDay.get(key) ?? [];
          const visible = dayJobs.slice(0, 3);
          const overflow = dayJobs.length - visible.length;
          return (
            <div
              key={key}
              className={`${styles.monthCell} ${inMonth ? "" : styles.monthCellOutside} ${
                isSameDay(date, today) ? styles.monthCellToday : ""
              }`}
            >
              <span className={styles.monthDayNum}>{date.getDate()}</span>
              {visible.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  className={`${styles.monthChip} ${
                    job.isOverdue
                      ? styles.monthChipOverdue
                      : job.priority === "high"
                        ? styles.monthChipHigh
                        : job.priority === "medium"
                          ? styles.monthChipMedium
                          : styles.monthChipLow
                  }`}
                  title={`${job.title} — ${job.tech}`}
                  onClick={() => onOpenJob(job.id)}
                >
                  <span className={styles.monthChipDot} />
                  {job.title}
                </button>
              ))}
              {overflow > 0 ? <span className={styles.monthChipMore}>+{overflow} more</span> : null}
            </div>
          );
        })}
      </div>

      <div className={styles.monthLegend}>
        <span className={styles.monthLegendHigh}>High priority</span>
        <span className={styles.monthLegendMedium}>Medium priority</span>
        <span className={styles.monthLegendLow}>Low priority</span>
        <span className={styles.monthLegendOverdue}>Overdue</span>
        {unscheduledCount > 0 ? <span>{unscheduledCount} job(s) with no deadline set</span> : null}
      </div>
    </section>
  );
}

function OngoingRepairsView({
  jobs,
  jobTab,
  onJobTab,
  onOpenJob,
}: {
  jobs: OngoingJob[];
  jobTab: "all" | "critical" | "overdue";
  onJobTab: (t: "all" | "critical" | "overdue") => void;
  onOpenJob: (id: string) => void;
}) {
  const criticalCount = jobs.filter((j) => j.priority === "high").length;
  const overdueCount = jobs.filter((j) => j.isOverdue).length;
  const [order, setOrder] = useState("newest");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [techFilter, setTechFilter] = useState("all");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase().replace(/^#/, "");
    const tabbed =
      jobTab === "critical"
        ? jobs.filter((j) => j.priority === "high")
        : jobTab === "overdue"
          ? jobs.filter((j) => j.isOverdue)
          : jobs;
    const rows = tabbed.filter(
      (j) =>
        (priorityFilter === "all" || j.priorityLevel === priorityFilter) &&
        (categoryFilter === "all" || j.category === categoryFilter) &&
        (techFilter === "all" || j.tech === techFilter) &&
        (!term ||
          j.id === term ||
          j.title.toLowerCase().includes(term) ||
          j.location.toLowerCase().includes(term) ||
          j.tech.toLowerCase().includes(term)),
    );
    const sorted = [...rows].sort(byNewest);
    if (order === "oldest") sorted.reverse();
    if (order === "deadline")
      sorted.sort((a, b) => {
        const da = parseServerDate(a.deadline)?.getTime() ?? Number.POSITIVE_INFINITY;
        const db = parseServerDate(b.deadline)?.getTime() ?? Number.POSITIVE_INFINITY;
        return da - db || byNewest(a, b);
      });
    if (order === "priority")
      sorted.sort((a, b) => (PRIORITY_RANK[a.priorityLevel] ?? 9) - (PRIORITY_RANK[b.priorityLevel] ?? 9) || byNewest(a, b));
    if (order === "tech") sorted.sort((a, b) => a.tech.localeCompare(b.tech) || byNewest(a, b));
    return sorted;
  }, [jobs, jobTab, order, priorityFilter, categoryFilter, techFilter, search]);

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.jobTabs}>
          <button
            type="button"
            className={jobTab === "all" ? styles.jobTabActive : undefined}
            onClick={() => onJobTab("all")}
          >
            All Active ({jobs.length})
          </button>
          <button
            type="button"
            className={jobTab === "critical" ? styles.jobTabActive : undefined}
            onClick={() => onJobTab("critical")}
          >
            Critical ({criticalCount})
          </button>
          <button
            type="button"
            className={jobTab === "overdue" ? styles.jobTabActive : undefined}
            onClick={() => onJobTab("overdue")}
          >
            Overdue ({overdueCount})
          </button>
        </div>
      </div>

      <div style={{ padding: "0 0.75rem 0.75rem" }}>
        <ListControls
          search={{ value: search, onChange: setSearch, placeholder: "Search ticket, location or technician" }}
          sort={{
            value: order,
            onChange: setOrder,
            options: [
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "deadline", label: "Deadline (soonest first)" },
              { value: "priority", label: "Priority (highest first)" },
              { value: "tech", label: "Technician (A-Z)" },
            ],
          }}
          filters={[
            { id: "priority", label: "Priority", value: priorityFilter, options: PRIORITY_FILTER, onChange: setPriorityFilter },
            {
              id: "category",
              label: "Category",
              value: categoryFilter,
              options: categoryOptions(jobs.map((j) => j.category)),
              onChange: setCategoryFilter,
            },
            {
              id: "tech",
              label: "Technician",
              value: techFilter,
              options: [
                { value: "all", label: "All technicians" },
                ...Array.from(new Set(jobs.map((j) => j.tech)))
                  .sort()
                  .map((value) => ({ value, label: value })),
              ],
              onChange: setTechFilter,
            },
          ]}
          onReset={() => {
            setOrder("newest");
            setPriorityFilter("all");
            setCategoryFilter("all");
            setTechFilter("all");
            setSearch("");
          }}
        />
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Job Details</th>
              <th>Location</th>
              <th>Technician</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyCell}>
                  No {jobTab === "all" ? "active" : jobTab} jobs right now.
                </td>
              </tr>
            ) : (
              filtered.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => onOpenJob(job.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onOpenJob(job.id);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <td>
                    <strong className={styles.linkId}>#{job.id}</strong>
                  </td>
                  <td>
                    <strong className={job.priority === "high" ? styles.criticalTitle : undefined}>
                      {job.priority === "high" && <AlertTriangle size={14} />} {job.title}
                    </strong>
                    <div className={styles.cellSub}>{job.details}</div>
                  </td>
                  <td>
                    <span className={styles.categoryCell}>
                      <Home size={14} /> {job.location}
                    </span>
                    {job.residentDeleted ? <span className={styles.deletedTag}>Resident account deleted</span> : null}
                  </td>
                  <td>
                    <div className={styles.techCell}>
                      <div className={styles.avatar}>{job.techInitials}</div>
                      <strong>{job.tech}</strong>
                      {job.techDeleted ? <span className={styles.deletedTag}>Account deleted</span> : null}
                    </div>
                  </td>
                  <td>
                    <div className={styles.jobStatus}>
                      <span className={job.isOverdue ? styles.dotRed : styles.dotBlue}>{job.status}</span>
                      {job.deadline ? (
                        <span className={styles.cellSub}>{job.isOverdue ? "Overdue since " : "Due "}{job.deadline}</span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label="View"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenJob(job.id);
                      }}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.tableFooter}>
        <span>
          Showing {filtered.length} of {jobs.length} active jobs
        </span>
      </div>
    </section>
  );
}

/* ─── Ongoing job detail — real data, no fake progress/parts/notes since the backend
   doesn't track that level of detail yet ─── */

function OngoingJobDetailView({
  job,
  onBack,
  onSaved,
  onOpenChat,
}: {
  job: OngoingJob;
  onBack: () => void;
  onSaved: () => void;
  onOpenChat: (id: string) => void;
}) {
  const { toast, toastError } = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const submitCancel = async () => {
    if (!cancelReason.trim()) {
      toast("A reason is required to cancel a job already in progress.", "warning");
      return;
    }
    setCancelSubmitting(true);
    try {
      await apiPost(`/api/v1/admin/maintenance/tickets/${job.id}/decline`, {
        reason: cancelReason.trim(),
      });
      toast(`Ticket #${job.id} cancelled.`, "success");
      onSaved();
      onBack();
    } catch (e) {
      toastError(e, "Couldn't cancel this job. Please try again.");
    } finally {
      setCancelSubmitting(false);
    }
  };

  return (
    <div className={styles.ticketDetailLayout}>
      <aside className={styles.ticketSidebar} style={{ maxWidth: "100%" }}>
        <div className={styles.detailTopRow}>
          <button type="button" className={styles.backBtn} onClick={onBack}>
            <ArrowLeft size={18} /> Back
          </button>
          <button type="button" className={styles.messageBtn} onClick={() => onOpenChat(job.id)}>
            <MessageSquare size={16} /> Message
          </button>
        </div>
        <div className={styles.sideCard}>
          <div className={styles.sideHeader}>
            <h3>{job.title}</h3>
            <span className={styles.ticketId}>#{job.id}</span>
          </div>
          <div className={styles.statusPill}>{job.status}</div>
          <div className={styles.sideGroup}>
            <label>Category / Priority</label>
            <p>
              <Wrench size={14} /> {job.category} / {priorityLabel(job.priority)}
            </p>
          </div>
          <div className={styles.sideGroup}>
            <label>Location</label>
            <p>{job.location}</p>
          </div>
          <ResidentWords text={job.residentReport} />
          <div className={styles.sideGroup}>
            <label>Resident</label>
            <p>
              {job.residentPhone ? <a href={`tel:${job.residentPhone}`}>{job.residentPhone}</a> : "No phone on file"}
              {job.residentStatus ? ` · ${job.residentStatus}` : ""}
            </p>
          </div>
          <div className={styles.sideGroup}>
            <label>Reported</label>
            <p>{formatWhen(job.reportedAt)}</p>
          </div>
          <div className={styles.sideGroup}>
            <label>Last Edited</label>
            <p>{job.updatedAt ? formatWhen(job.updatedAt) : "Not edited since creation"}</p>
          </div>
        </div>
        <div className={styles.sideCard}>
          <TicketEditor
            key={`${job.id}-${job.updatedAt ?? ""}-${job.deadline ?? ""}`}
            requestId={job.id}
            subject={job.subject ?? job.title}
            description={job.details}
            priorityLevel={job.priorityLevel}
            adminNotes={job.adminNotes}
            deadline={job.deadline}
            showDeadline
            onSaved={onSaved}
          />
        </div>
        <div className={`${styles.sideCard} ${styles.assignedCard}`}>
          <label className={styles.sectionLabel}>Assigned Technician</label>
          <div className={styles.assignedTech}>
            <div className={styles.avatar}>{job.techInitials}</div>
            <div>
              <strong>{job.tech}</strong>
              {job.techEmail ? (
                <p>
                  <a href={`mailto:${job.techEmail}`}>{job.techEmail}</a>
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className={styles.sideCard}>
          <div className={styles.sideGroup}>
            <label>Assigned At</label>
            <p>{job.assignedAt}</p>
          </div>
          <div className={styles.sideGroup}>
            <label>Deadline</label>
            <p style={job.isOverdue ? { color: "#dc2626" } : undefined}>
              {job.deadline ?? NOT_AVAILABLE}
              {job.isOverdue ? " (Overdue)" : ""}
            </p>
          </div>
        </div>
        <div className={styles.sideCard}>
          {!cancelling ? (
            <button
              type="button"
              className={styles.declineBtn}
              onClick={() => setCancelling(true)}
            >
              <Ban size={16} /> Cancel Job
            </button>
          ) : (
            <div className={styles.cancelJobForm}>
              <label htmlFor="cancel-job-reason" className={styles.sectionLabel}>
                Reason for Cancelling
              </label>
              <textarea
                id="cancel-job-reason"
                className={styles.textareaField}
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Resident moved out, duplicate ticket, false alarm..."
              />
              <p className={styles.helpText}>
                Required — the technician is already dispatched to this job.
              </p>
              <div className={styles.cancelJobActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => {
                    setCancelling(false);
                    setCancelReason("");
                  }}
                  disabled={cancelSubmitting}
                >
                  Back
                </button>
                <button
                  type="button"
                  className={styles.declineBtn}
                  onClick={submitCancel}
                  disabled={cancelSubmitting}
                >
                  {cancelSubmitting ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ─── Staff / Available Techs (mockup 4) ─── */

function StaffRosterView({
  staff,
  filter,
  onFilterChange,
  onOpenTech,
  onAssign,
  onOpenJob,
  canAssign,
}: {
  staff: StaffMember[];
  filter: "all" | "available";
  onFilterChange: (f: "all" | "available") => void;
  onOpenTech: (id: string) => void;
  onAssign: (id: string) => void;
  /** Opens a job in the Ongoing Repairs detail; false if the job isn't in the loaded list. */
  onOpenJob: (jobId: string) => boolean;
  /** Whether there is a pending request to dispatch. */
  canAssign: boolean;
}) {
  // The menu is positioned against the viewport: the table wrapper scrolls,
  // so an absolutely positioned menu would be clipped on the last rows.
  const [menu, setMenu] = useState<{ id: string; top: number; right: number } | null>(null);
  const menuFor = menu?.id ?? null;
  const setMenuFor = (id: string | null) => {
    if (id === null) setMenu(null);
  };

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  const onDuty = staff.filter((s) => s.status !== "off-shift").length;
  const available = staff.filter((s) => s.status === "available").length;
  const onJob = staff.filter((s) => s.status === "on-job" || s.status === "on-site").length;
  const rows =
    filter === "available"
      ? staff.filter((s) => s.isTech && s.status === "available")
      : staff;

  return (
    <div className={styles.rosterLayout}>
      <section className={styles.miniStats}>
        <div className={styles.miniStat}>
          <span>Total on Duty</span>
          <strong>{onDuty}</strong>
          <Users size={18} className={styles.miniIcon} />
        </div>
        <div className={styles.miniStat}>
          <span>Available</span>
          <strong className={styles.green}>{available}</strong>
          <CheckCircle2 size={18} className={styles.miniIconGreen} />
        </div>
        <div className={styles.miniStat}>
          <span>On Job</span>
          <strong className={styles.dangerText}>{onJob}</strong>
          <Wrench size={18} className={styles.miniIconRed} />
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>{filter === "available" ? "Available Technicians" : "Active Roster"}</h3>
          <div className={styles.tabToggle}>
            <button
              type="button"
              className={filter === "all" ? styles.activeToggle : undefined}
              onClick={() => onFilterChange("all")}
            >
              On-Duty
            </button>
            <button
              type="button"
              className={filter === "available" ? styles.activeToggle : undefined}
              onClick={() => onFilterChange("available")}
            >
              Available Techs
            </button>
          </div>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Filter"
            disabled
            title="Additional roster filters are not available yet."
          >
            <Filter size={16} />
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Shift</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((person) => (
                <tr
                  key={person.id}
                  onClick={() => onOpenTech(person.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onOpenTech(person.id);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <td>
                    <div className={styles.techCell}>
                      <div className={styles.avatar}>{person.initials}</div>
                      <strong>{person.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span className={statusDotClass(person.status)}>
                      {statusLabel(person.status)}
                    </span>
                    {person.isTech && person.activeTaskCount > 0 ? (
                      <div className={styles.cellSub}>
                        {person.activeTaskCount} active {person.activeTaskCount === 1 ? "job" : "jobs"}
                      </div>
                    ) : null}
                  </td>
                  <td>{person.shift}</td>
                  <td>
                    {person.status === "available" && person.isTech ? (
                      <button
                        type="button"
                        className={styles.actionCell}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssign(person.id);
                        }}
                      >
                        Assign
                      </button>
                    ) : (
                      <div className={styles.rowMenuWrap} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          aria-label={`More actions for ${person.name}`}
                          aria-haspopup="menu"
                          aria-expanded={menuFor === person.id}
                          onClick={(e) => {
                            if (menuFor === person.id) {
                              setMenu(null);
                              return;
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            const menuHeight = 190;
                            const below = rect.bottom + 6;
                            setMenu({
                              id: person.id,
                              top: below + menuHeight > window.innerHeight ? Math.max(8, rect.top - menuHeight - 6) : below,
                              right: window.innerWidth - rect.right,
                            });
                          }}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {menuFor === person.id ? (
                          <div className={styles.rowMenu} role="menu" style={{ top: menu?.top, right: menu?.right }}>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setMenuFor(null);
                                onOpenTech(person.id);
                              }}
                            >
                              View profile &amp; job history
                            </button>
                            {person.activeTask ? (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setMenuFor(null);
                                  onOpenJob(String(person.activeTask));
                                }}
                              >
                                Open current job (#{person.activeTask})
                              </button>
                            ) : null}
                            {person.isTech ? (
                              <button
                                type="button"
                                role="menuitem"
                                disabled={!canAssign}
                                title={canAssign ? undefined : "There are no pending requests to assign."}
                                onClick={() => {
                                  setMenuFor(null);
                                  onAssign(person.id);
                                }}
                              >
                                Assign another job
                                {person.activeTaskCount > 0 ? ` (has ${person.activeTaskCount})` : ""}
                              </button>
                            ) : null}
                            {person.email ? (
                              <a role="menuitem" href={`mailto:${person.email}`} onClick={() => setMenuFor(null)}>
                                Email {person.email}
                              </a>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.tableFooter}>
          <span>
            Showing {rows.length} of {filter === "available" ? available : onDuty}{" "}
            {filter === "available" ? "available techs" : "active staff"}
          </span>
          <div className={styles.pager}>
            <button type="button" className={styles.iconBtn} aria-label="Previous" disabled title="All staff are shown on one page.">
              <ChevronLeft size={16} />
            </button>
            <button type="button" className={styles.iconBtn} aria-label="Next" disabled title="All staff are shown on one page.">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Ticket chat (mockup 6) ─── */

const CHAT_POLL_INTERVAL_MS = 4000;

function formatMessageTime(iso: string): string {
  try {
    return parseServerDate(iso)?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) ?? "";
  } catch {
    return "";
  }
}

function TicketDetailView({
  ticket,
  onBack,
}: {
  ticket: PendingRequest;
  onBack: () => void;
}) {
  const [thread, setThread] = useState<TicketChatThread | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getTicketChat(ticket.id);
        if (!cancelled) {
          setThread(data);
          setChatError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setChatError(e instanceof ApiError ? e.message : "Could not load conversation.");
        }
      }
    }

    load();
    const timer = setInterval(load, CHAT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ticket.id]);

  useEffect(() => {
    chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight });
  }, [thread?.messages.length]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setInput("");
    try {
      const data = await sendTicketChatMessage(ticket.id, trimmed);
      setThread(data);
      setChatError(null);
    } catch (e) {
      setChatError(e instanceof ApiError ? e.message : "Could not send message.");
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.ticketDetailLayout}>
      <div className={styles.chatColumn}>
        <div className={styles.chatHeader}>
          <button type="button" className={styles.backBtn} onClick={onBack}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className={styles.chatUser}>
            <div className={styles.hostAvatar}>
              {ticket.resident
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <strong>{ticket.resident}</strong>
              <p>
                Resident — {ticket.unit}
              </p>
            </div>
          </div>
          <div className={styles.headerIcons}>
            {ticket.phone && ticket.phone !== NOT_AVAILABLE ? (
              <a href={`tel:${ticket.phone}`} aria-label="Call">
                <Phone size={18} />
              </a>
            ) : (
              <button type="button" aria-label="Call" disabled title="No phone number on file for this resident.">
                <Phone size={18} />
              </button>
            )}
            <button type="button" aria-label="More options" disabled title="No additional actions available yet.">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
        <div className={styles.chatBody} ref={chatBodyRef}>
          <div className={styles.timeMarker}>{ticket.reportedAt}</div>
          <div className={styles.messageGroup}>
            <div className={styles.msgResident}>{ticket.description}</div>
            {thread?.messages.map((message, i) => {
              const fromResident = message.sender_role === "Resident";
              return (
                <div
                  key={`${message.timestamp}-${i}`}
                  className={fromResident ? styles.msgResident : styles.msgStaff}
                >
                  <div style={{ fontSize: "0.72rem", fontWeight: 600, opacity: 0.75, marginBottom: "0.2rem" }}>
                    {message.sender_name} · {formatMessageTime(message.timestamp)}
                  </div>
                  {message.content}
                </div>
              );
            })}
          </div>
          {chatError ? (
            <p style={{ padding: "0 1rem", color: "#c0392b", fontSize: "0.8rem" }}>{chatError}</p>
          ) : null}
        </div>
        <form className={styles.chatInput} onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!thread || sending}
            aria-label="Message"
          />
          <button
            type="submit"
            className={styles.sendBtn}
            aria-label="Send"
            disabled={!thread || sending || !input.trim()}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
      <aside className={styles.ticketSidebar}>
        <div className={styles.sideCard}>
          <div className={styles.sideHeader}>
            <h3>Ticket Details</h3>
            <span className={styles.ticketId}>{ticket.id}</span>
          </div>
          <div className={styles.statusPill}>{ticket.status ?? "Open"}</div>
          <div className={styles.sideGroup}>
            <label>Issue Category</label>
            <p>
              <Wrench size={14} /> {ticket.category} / {ticket.aiLabel}
            </p>
          </div>
          <div className={styles.sideGroup}>
            <label>Location</label>
            <p>
              {ticket.unit}
            </p>
          </div>
          <ResidentWords text={ticket.residentReport} />
          <div className={styles.sideGroup}>
            <label>Reported</label>
            <p>{ticket.reportedAt}</p>
          </div>
        </div>
        <div className={`${styles.sideCard} ${styles.assignedCard}`}>
          <label className={styles.sectionLabel}>Assigned Personnel</label>
          {ticket.assignedTech ? (
            <div className={styles.assignedTech}>
              <div className={styles.avatar}>{initialsFor(ticket.assignedTech.name)}</div>
              <div>
                <strong>{ticket.assignedTech.name}</strong>
                {ticket.assignedTech.email ? (
                  <p>
                    <a href={`mailto:${ticket.assignedTech.email}`}>{ticket.assignedTech.email}</a>
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p style={{ color: "#5b6b82", fontSize: "0.85rem" }}>
              Not yet assigned — use Dispatch to assign a technician.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ─── Ticket editor — PATCH /api/v1/admin/maintenance/tickets/{id} ─── */

const PRIORITY_OPTIONS: { value: string; label: string; cls: string }[] = [
  { value: "Low", label: "Low Priority", cls: styles.sevLow },
  { value: "Medium", label: "Medium Priority", cls: styles.sevMed },
  { value: "High", label: "High Priority", cls: styles.sevHigh },
  { value: "Emergency", label: "Emergency", cls: styles.sevHigh },
];

const MIN_PRIORITY_REASON = 10;

/** A stored deadline is UTC; the editor shows it, and takes new ones, as the admin's local time. */
function toLocalInput(value: string | null | undefined): string {
  const d = parseServerDate(value);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TicketEditor({
  requestId,
  subject,
  description,
  priorityLevel,
  adminNotes,
  deadline,
  showDeadline,
  onSaved,
}: {
  requestId: string;
  subject: string;
  description: string;
  priorityLevel: string;
  adminNotes: string | null;
  deadline?: string | null;
  showDeadline?: boolean;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(subject);
  const [desc, setDesc] = useState(description);
  const [priority, setPriority] = useState(priorityLevel);
  const [priorityReason, setPriorityReason] = useState("");
  const [notes, setNotes] = useState(adminNotes ?? "");
  const [due, setDue] = useState(toLocalInput(deadline));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const { toast, toastError } = useToast();

  const dirty =
    title !== subject ||
    desc !== description ||
    priority !== priorityLevel ||
    notes !== (adminNotes ?? "") ||
    (showDeadline === true && due !== toLocalInput(deadline));

  const save = async () => {
    if (!title.trim() || !desc.trim()) {
      setMessage({ ok: false, text: "Title and description cannot be empty." });
      return;
    }
    // A dispatched job must keep a deadline — clearing it here would undo the
    // requirement enforced at dispatch and blank the date out downstream.
    if (showDeadline && !due) {
      setMessage({ ok: false, text: "A completion deadline is required." });
      toast("A completion deadline is required.", "warning");
      return;
    }
    // Changing the priority is a vote in the ticket's priority verdict, so it needs a reason.
    if (priority !== priorityLevel && priorityReason.trim().length < MIN_PRIORITY_REASON) {
      setMessage({
        ok: false,
        text: `Explain why this ticket is ${priority} priority (at least ${MIN_PRIORITY_REASON} characters).`,
      });
      return;
    }
    const body: Record<string, string> = {};
    if (title !== subject) body.subject = title.trim();
    if (desc !== description) body.description = desc.trim();
    if (priority !== priorityLevel) {
      body.priority_level = priority;
      body.priority_reason = priorityReason.trim();
    }
    if (notes !== (adminNotes ?? "")) body.admin_notes = notes;
    if (showDeadline && due !== toLocalInput(deadline)) body.deadline = due.replace("T", " ");
    setSaving(true);
    setMessage(null);
    try {
      await apiPatch(`/api/v1/admin/maintenance/tickets/${requestId}`, body);
      setMessage({ ok: true, text: "Ticket updated." });
      toast(`Ticket #${requestId} updated.`, "success");
      setPriorityReason("");
      onSaved();
    } catch (e) {
      const text = e instanceof ApiError ? e.message : "Could not update the ticket.";
      setMessage({ ok: false, text });
      toastError(e, "Could not update the ticket.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={styles.inputGroup}>
        <label>Ticket Title</label>
        <input
          type="text"
          className={styles.textField}
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className={styles.inputGroup} style={{ marginTop: "1rem" }}>
        <label>Description</label>
        <textarea
          className={styles.textareaField}
          rows={3}
          value={desc}
          maxLength={5000}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>
      <div className={styles.inputGroup} style={{ marginTop: "1rem" }}>
        <label>Severity</label>
        <div className={styles.severityToggle}>
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={priority === opt.value ? opt.cls : undefined}
              onClick={() => setPriority(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {priority !== priorityLevel ? (
        <div className={styles.inputGroup} style={{ marginTop: "1rem" }}>
          <label htmlFor={`priority-reason-${requestId}`}>
            Why is this {priority} priority? <span className={styles.requiredMark}>*</span>
          </label>
          <textarea
            id={`priority-reason-${requestId}`}
            className={styles.textareaField}
            rows={2}
            required
            aria-required="true"
            maxLength={1000}
            value={priorityReason}
            placeholder={`Changing from ${priorityLevel}. e.g. Door cannot be locked, the unit is unsecured`}
            onChange={(e) => setPriorityReason(e.target.value)}
          />
          <span className={styles.helpText}>Saved as your vote; the system learns from it for similar tickets.</span>
        </div>
      ) : null}
      {showDeadline ? (
        <div className={styles.inputGroup} style={{ marginTop: "1rem" }}>
          <label htmlFor={`ticket-deadline-${requestId}`}>
            Estimated Completion <span className={styles.requiredMark}>*</span>
          </label>
          <input
            id={`ticket-deadline-${requestId}`}
            type="datetime-local"
            required
            aria-required="true"
            className={styles.textField}
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </div>
      ) : null}
      <div className={styles.inputGroup} style={{ marginTop: "1rem" }}>
        <label>Internal Notes</label>
        <textarea
          className={styles.textareaField}
          rows={2}
          value={notes}
          maxLength={5000}
          placeholder="Visible to admins only"
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button type="button" className={styles.secondaryBtn} disabled={!dirty || saving} onClick={save}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {message ? (
          <span className={message.ok ? styles.helpText : styles.errorText}>{message.text}</span>
        ) : null}
      </div>
    </>
  );
}

/* ─── Dispatch / Decline / Success (mockups 5, 7, 8) ─── */

function DispatchFlowModal({
  mode,
  ticket,
  staff,
  selectedTechId,
  onSelectTech,
  onClose,
  onDecline,
  onConfirm,
  onBackToDispatch,
  deadlineDate,
  onDeadlineDateChange,
  deadlineTime,
  onDeadlineTimeChange,
  deadlineError,
  assigning,
  declineReason,
  onDeclineReasonChange,
  declineMessage,
  onDeclineMessageChange,
  declineSubmitting,
  onConfirmDecline,
  onTicketSaved,
}: {
  mode: Exclude<ModalMode, null>;
  ticket: PendingRequest;
  staff: StaffMember[];
  selectedTechId: string | null;
  onSelectTech: (id: string) => void;
  onClose: () => void;
  onDecline: () => void;
  onConfirm: () => void;
  onBackToDispatch: () => void;
  deadlineDate: string;
  onDeadlineDateChange: (value: string) => void;
  deadlineTime: string;
  onDeadlineTimeChange: (value: string) => void;
  deadlineError: string | null;
  assigning: boolean;
  declineReason: string;
  onDeclineReasonChange: (value: string) => void;
  declineMessage: string;
  onDeclineMessageChange: (value: string) => void;
  declineSubmitting: boolean;
  onConfirmDecline: () => void;
  onTicketSaved: () => void;
}) {
  const [techOrder, setTechOrder] = useState("match");
  const [techAvail, setTechAvail] = useState("all");
  const [techSpecialty, setTechSpecialty] = useState("all");
  const [techSearch, setTechSearch] = useState("");
  const allTechs = staff.filter((s) => s.isTech);
  const byWorkload = (a: StaffMember, b: StaffMember) => a.activeTaskCount - b.activeTaskCount;
  const offShiftLast = (a: StaffMember, b: StaffMember) =>
    Number(a.status === "off-shift") - Number(b.status === "off-shift");
  // Every maintenance tech stays listed. By default the ones whose specialization fits this ticket's category come
  // first (a Structural ticket lists the structural technicians on top), then generalists, and within each group the
  // least-loaded and on-shift ones. The controls below re-sort or narrow the list.
  const term = techSearch.trim().toLowerCase();
  const list = allTechs
    .filter(
      (t) =>
        (techAvail === "all" || (techAvail === "available" ? t.status === "available" : t.status !== "off-shift")) &&
        (techSpecialty === "all" || t.specialty === techSpecialty) &&
        (!term || t.name.toLowerCase().includes(term) || t.specialty.toLowerCase().includes(term)),
    )
    .sort((a, b) => {
      if (techOrder === "workload") return byWorkload(a, b) || a.name.localeCompare(b.name);
      if (techOrder === "name") return a.name.localeCompare(b.name);
      if (techOrder === "specialty") return a.specialty.localeCompare(b.specialty) || byWorkload(a, b);
      return (
        specialtyFit(b.specialty, ticket.category) - specialtyFit(a.specialty, ticket.category) ||
        offShiftLast(a, b) ||
        byWorkload(a, b) ||
        a.name.localeCompare(b.name)
      );
    });
  const specialtyOptions = [
    { value: "all", label: "All specializations" },
    ...Array.from(new Set(allTechs.map((t) => t.specialty).filter(Boolean)))
      .sort()
      .map((value) => ({ value, label: value })),
  ];
  const selected = staff.find((s) => s.id === selectedTechId);
  // Not a hard limit — an emergency may genuinely need the busiest tech. This
  // only drives a confirmation warning so the dispatcher sees the risk.
  const OVERLOAD_THRESHOLD = 3;
  const selectedIsOverloaded = Boolean(selected && selected.activeTaskCount >= OVERLOAD_THRESHOLD);
  const selectedIsOffShift = selected?.status === "off-shift";
  const loadLabel = (count: number) => {
    if (count <= 0) return "Free";
    if (count < OVERLOAD_THRESHOLD) return `Load: ${count} active`;
    return `Load: ${count} active (heavy)`;
  };

  if (mode === "decline") {
    return (
      <div className={styles.modalOverlay} onClick={onClose} role="presentation">
        <div
          className={styles.modalNarrow}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="decline-title"
        >
          <header className={styles.modalHeader}>
            <div>
              <h3 id="decline-title">
                Decline Request: <span className={styles.linkId}>{ticket.id}</span>
              </h3>
              <p>Maintenance Department</p>
            </div>
            <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </header>
          <div className={styles.modalBody}>
            <div className={styles.inputGroup}>
              <label htmlFor="decline-reason">Reason for Declining</label>
              <select
                id="decline-reason"
                className={styles.selectField}
                value={declineReason}
                onChange={(e) => onDeclineReasonChange(e.target.value)}
              >
                <option value="" disabled>
                  Select a reason...
                </option>
                <option>Duplicate ticket</option>
                <option>Out of scope</option>
                <option>Resident cancelled</option>
                <option>Insufficient information</option>
              </select>
            </div>
            <div className={styles.inputGroup} style={{ marginTop: "1.25rem" }}>
              <label htmlFor="decline-msg">Message to Resident (optional)</label>
              <textarea
                id="decline-msg"
                className={styles.textareaField}
                rows={4}
                placeholder="Briefly explain the decision to the resident..."
                value={declineMessage}
                onChange={(e) => onDeclineMessageChange(e.target.value)}
              />
              <p className={styles.helpText}>
                If provided, this message is posted to the resident&apos;s ticket chat thread.
              </p>
            </div>
          </div>
          <footer className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onBackToDispatch}>
              Go Back
            </button>
            <button
              type="button"
              className={styles.confirmDeclineBtn}
              disabled={declineSubmitting}
              onClick={onConfirmDecline}
            >
              {declineSubmitting ? "Declining..." : "Confirm Decline"}
            </button>
          </footer>
        </div>
      </div>
    );
  }

  if (mode === "success") {
    return (
      <div className={styles.modalOverlay} onClick={onClose} role="presentation">
        <div
          className={styles.modalNarrow}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-title"
        >
          <header className={styles.modalHeader}>
            <div>
              <h3 id="success-title">Maintenance Ticket &amp; Dispatch</h3>
              <p>
                {ticket.id} · {priorityLabel(ticket.priority)}
              </p>
            </div>
            <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </header>
          <div className={styles.successBody}>
            <div className={styles.successIcon}>
              <CheckCircle2 size={28} />
            </div>
            <h2>Maintenance Request Approved</h2>
            <p>
              The request for <strong>{ticket.unit}</strong> has been successfully dispatched
              {selected ? (
                <>
                  {" "}
                  to <strong>{selected.name}</strong>
                </>
              ) : null}
              .
            </p>
            <div className={styles.successDetails}>
              <div className={styles.successDetailsHead}>
                <span>Maintenance Details</span>
                <span className={priorityClass(ticket.priority)}>
                  {priorityLabel(ticket.priority)}
                </span>
              </div>
              <div className={styles.successGrid}>
                <div>
                  <label>Ticket ID</label>
                  <strong>#{ticket.id}</strong>
                </div>
                <div>
                  <label>Category</label>
                  <strong>{ticket.category}</strong>
                </div>
                <div>
                  <label>Deadline Date</label>
                  <strong>{deadlineDate || "Not set"}</strong>
                </div>
                <div>
                  <label>Deadline Time</label>
                  <strong>{deadlineTime || "Not set"}</strong>
                </div>
              </div>
            </div>
            <button type="button" className={styles.confirmBtn} onClick={onClose}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "decline-success") {
    return (
      <div className={styles.modalOverlay} onClick={onClose} role="presentation">
        <div
          className={styles.modalNarrow}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="decline-success-title"
        >
          <header className={styles.modalHeader}>
            <div>
              <h3 id="decline-success-title">Maintenance Ticket &amp; Dispatch</h3>
              <p>{ticket.id}</p>
            </div>
            <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </header>
          <div className={styles.successBody}>
            <div className={styles.successIcon}>
              <Ban size={28} />
            </div>
            <h2>Request Declined</h2>
            <p>
              The request for <strong>{ticket.unit}</strong> has been declined and closed out.
              {declineMessage ? " The resident has been notified in the ticket chat." : ""}
            </p>
            <button type="button" className={styles.confirmBtn} onClick={onClose}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.modalWide}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispatch-title"
      >
        <header className={styles.modalHeader}>
          <div>
            <h3 id="dispatch-title">Maintenance Ticket &amp; Dispatch</h3>
            <p>
              {ticket.id} · {priorityLabel(ticket.priority)}
            </p>
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className={styles.dispatchGrid}>
          <div className={styles.dispatchLeft}>
            <h4>{ticket.title}</h4>
            <div className={styles.metaGrid}>
              <div>
                <label>Location</label>
                <p>{ticket.unit}</p>
              </div>
              <div>
                <label>Reported</label>
                <p>{ticket.reportedAt}</p>
              </div>
              <div>
                <label>Category</label>
                <p>{ticket.category}</p>
              </div>
              <div>
                <label>Resident Status</label>
                <p>{ticket.residentStatus}</p>
              </div>
              <div className={styles.metaFull}>
                <label>Preferred day</label>
                <p>{ticket.preferredDay}</p>
              </div>
              {ticket.residentReport ? (
                <div className={styles.metaFull}>
                  <label>Resident&apos;s own words</label>
                  <p style={{ whiteSpace: "pre-wrap", fontStyle: "italic" }}>&ldquo;{ticket.residentReport}&rdquo;</p>
                </div>
              ) : null}
            </div>

            <TicketEditor
              key={`${ticket.id}-${ticket.updatedAt ?? ""}`}
              requestId={ticket.id}
              subject={ticket.subject ?? ticket.title}
              description={ticket.description}
              priorityLevel={ticket.priorityLevel}
              adminNotes={ticket.adminNotes}
              onSaved={onTicketSaved}
            />

            <div className={styles.residentContact}>
              <div className={styles.techCell}>
                <div className={styles.hostAvatar}>
                  {ticket.resident
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <strong>{ticket.resident}</strong>
                  <p>{ticket.phone}</p>
                </div>
              </div>
              {ticket.phone && ticket.phone !== NOT_AVAILABLE ? (
                <a href={`tel:${ticket.phone}`} className={styles.iconBtn} aria-label="Call resident">
                  <Phone size={16} />
                </a>
              ) : (
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label="Call resident"
                  disabled
                  title="No phone number on file for this resident."
                >
                  <Phone size={16} />
                </button>
              )}
            </div>

            <AuthImageGallery paths={ticket.imageUrls} />
          </div>

          <div className={styles.dispatchRight}>
            <h4>Select Schedule</h4>
            <div className={styles.fieldGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="dispatch-deadline-date">
                  Dispatch Deadline Date <span className={styles.requiredMark}>*</span>
                </label>
                <div
                  className={`${styles.iconInput} ${
                    deadlineError && !deadlineDate ? styles.iconInputInvalid : ""
                  }`}
                >
                  <Calendar size={16} />
                  <input
                    id="dispatch-deadline-date"
                    type="date"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(deadlineError && !deadlineDate)}
                    value={deadlineDate}
                    onChange={(e) => onDeadlineDateChange(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="dispatch-deadline-time">
                  Deadline Time <span className={styles.requiredMark}>*</span>
                </label>
                <div
                  className={`${styles.iconInput} ${
                    deadlineError && !deadlineTime ? styles.iconInputInvalid : ""
                  }`}
                >
                  <Clock size={16} />
                  <input
                    id="dispatch-deadline-time"
                    type="time"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(deadlineError && !deadlineTime)}
                    value={deadlineTime}
                    onChange={(e) => onDeadlineTimeChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
            {deadlineError ? (
              <p className={styles.fieldError} role="alert">
                {deadlineError}
              </p>
            ) : null}
            <ListControls
              search={{ value: techSearch, onChange: setTechSearch, placeholder: "Search technician or specialization" }}
              sort={{
                value: techOrder,
                onChange: setTechOrder,
                options: [
                  { value: "match", label: `Best match for ${ticket.category}` },
                  { value: "workload", label: "Lightest workload" },
                  { value: "specialty", label: "Specialization (A-Z)" },
                  { value: "name", label: "Name (A-Z)" },
                ],
              }}
              filters={[
                {
                  id: "avail",
                  label: "Availability",
                  value: techAvail,
                  onChange: setTechAvail,
                  options: [
                    { value: "all", label: "Everyone" },
                    { value: "onshift", label: "On shift only" },
                    { value: "available", label: "Free right now" },
                  ],
                },
                { id: "specialty", label: "Specialization", value: techSpecialty, onChange: setTechSpecialty, options: specialtyOptions },
              ]}
              summary={`Showing ${list.length} of ${allTechs.length} technicians`}
              onReset={() => {
                setTechOrder("match");
                setTechAvail("all");
                setTechSpecialty("all");
                setTechSearch("");
              }}
            />
            <div className={styles.techOptions}>
              {list.length === 0 ? <p className={styles.helpText}>No technician matches these filters.</p> : null}
              {list.map((tech) => (
                <button
                  key={tech.id}
                  type="button"
                  className={`${styles.techCard} ${
                    selectedTechId === tech.id ? styles.techCardSelected : ""
                  }`}
                  onClick={() => onSelectTech(tech.id)}
                >
                  <div className={styles.techInfo}>
                    <div className={styles.avatarWrap}>
                      <div className={styles.avatar}>{tech.initials}</div>
                      <span
                        className={
                          tech.status === "available" ? styles.onlineDot : styles.busyDot
                        }
                      />
                    </div>
                    <div>
                      <strong>
                        {tech.name}{" "}
                        {tech.status === "available" && <BadgeCheck size={14} />}
                      </strong>
                      <p>
                        {tech.status === "available"
                          ? "Available Now"
                          : tech.status === "off-shift"
                          ? `Off shift${tech.shift !== NOT_AVAILABLE ? ` · ${tech.shift}` : ""}`
                          : "In Progress"}
                      </p>
                      <p>
                        <span className={styles.specTag}>{tech.specialty || "No specialization"}</span>
                        {specialtyFit(tech.specialty, ticket.category) === 2 ? (
                          <span className={styles.matchTag}>Best match</span>
                        ) : specialtyFit(tech.specialty, ticket.category) === 1 ? (
                          <span className={styles.generalTag}>General</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <span className={styles.loadLabel}>
                    {loadLabel(tech.activeTaskCount)}
                  </span>
                </button>
              ))}
            </div>
            {selectedIsOffShift ? (
              <p className={styles.fieldError} role="alert">
                {selected?.name} is off shift right now ({selected?.shift}). Dispatch only if this can&apos;t
                wait for someone on shift.
              </p>
            ) : null}
            {selectedIsOverloaded ? (
              <p className={styles.fieldError} role="alert">
                {selected?.name} already has {selected?.activeTaskCount} active jobs. Confirm only
                if this is urgent enough to add another.
              </p>
            ) : null}
          </div>
        </div>

        <footer className={styles.modalFooter}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>
            Cancel
          </button>
          <button type="button" className={styles.declineBtn} onClick={onDecline}>
            <Ban size={18} /> Decline Request
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={onConfirm}
            disabled={assigning || !deadlineDate || !deadlineTime || !selectedTechId}
            title={
              !deadlineDate || !deadlineTime
                ? "Set a deadline date and time first"
                : undefined
            }
          >
            <Send size={18} />{" "}
            {assigning ? "Dispatching…" : selectedIsOffShift ? "Dispatch Anyway" : "Confirm Dispatch"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ─── Tech profile (mockup 9) ─── */

function TechProfileView({
  tech,
  onBack,
  onOpenJob,
  onAssign,
  canAssign,
}: {
  tech: StaffMember;
  onBack: () => void;
  onOpenJob: (jobId: string) => boolean;
  onAssign: (techId: string) => void;
  canAssign: boolean;
}) {
  const isAvailable = tech.status === "available";
  const [history, setHistory] = useState<StaffHistoryItem[] | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet<StaffHistoryItem[]>(`/api/v1/admin/maintenance/staff/${tech.id}/history?page_size=20`)
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tech.id]);

  return (
    <div className={styles.techProfile}>
      <header className={styles.techHero}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className={styles.heroContent}>
          <div className={styles.heroAvatar}>{tech.initials}</div>
          <div className={styles.heroText}>
            <div className={styles.heroName}>
              <h2>{tech.name}</h2>
              <span className={isAvailable ? styles.availableBadge : styles.busyBadge}>
                {statusLabel(tech.status)}
              </span>
            </div>
            <p>
              Maintenance technician
              {tech.since ? ` · Since ${tech.since}` : ""}
            </p>
          </div>
          <div className={styles.contactGroup}>
            <button
              type="button"
              className={styles.contactTech}
              disabled={!tech.userId}
              title={tech.userId ? `Chat with ${tech.name}` : "This account can't receive messages."}
              onClick={() => setChatOpen(true)}
            >
              <MessageSquare size={16} /> Message
            </button>
          </div>
        </div>
      </header>

      <div className={styles.techStats}>
        <div className={styles.card}>
          <label>Total Tasks Completed</label>
          <div className={styles.statValLarge}>
            {tech.tasksCompleted != null ? tech.tasksCompleted.toLocaleString() : NOT_AVAILABLE}
          </div>
        </div>
        <div className={styles.card}>
          <label>Avg. Resolution Time</label>
          {/* The backend can only average over filed completion reports, so a
              technician with nothing completed has no figure yet — that is an
              empty state, not a missing endpoint. */}
          <div
            className={tech.avgResolution ? styles.statValLarge : styles.statValEmpty}
          >
            {tech.avgResolution ?? "No completed tasks yet"}
          </div>
        </div>
      </div>

      <div className={styles.scheduleSection}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Task History</h3>
          </div>
          {history === null ? (
            <p style={{ color: "#5b6b82", fontSize: "0.85rem" }}>Loading...</p>
          ) : history.length === 0 ? (
            <p style={{ color: "#5b6b82", fontSize: "0.85rem" }}>No tasks assigned to this technician yet.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Status</th>
                    <th>Assigned</th>
                    <th>Due</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={`${h.request_id}-${h.assigned_at ?? ""}`}>
                      <td>
                        <strong className={styles.linkId}>#{h.request_id}</strong>
                        <div className={styles.cellSub}>{h.title ? truncate(h.title) : ""}</div>
                      </td>
                      <td>{h.status}</td>
                      <td>{formatWhen(h.assigned_at)}</td>
                      <td>{h.deadline ? formatWhen(h.deadline) : "—"}</td>
                      <td>{h.completed_at ? formatWhen(h.completed_at) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className={styles.activeTaskCard}>
          <div className={styles.card}>
            <label>
              Active Task{" "}
              {tech.activeTask ? (
                <span className={styles.pulseDot} />
              ) : null}
            </label>
            <h4>{tech.activeTask ?? "No active task"}</h4>
            <div className={styles.taskMeta}>
              <div>
                <span>Status</span>
                <p>{statusLabel(tech.status)}</p>
              </div>
            </div>
            {tech.activeTask ? (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => onOpenJob(String(tech.activeTask))}
              >
                View Live Ticket
              </button>
            ) : null}
            <button
              type="button"
              className={tech.activeTask ? styles.secondaryBtn : styles.primaryBtn}
              style={tech.activeTask ? { marginTop: "0.5rem", width: "100%" } : undefined}
              disabled={!canAssign}
              title={canAssign ? undefined : "There are no pending requests to assign."}
              onClick={() => onAssign(tech.id)}
            >
              {tech.activeTask ? "Assign Another Task" : "Assign New Task"}
            </button>
          </div>
        </div>
      </div>
      {chatOpen && tech.userId ? (
        <StaffChatModal
          staffUserId={tech.userId}
          staffName={tech.name}
          subtitle="Maintenance technician · replies arrive in Staff Messages"
          onClose={() => setChatOpen(false)}
        />
      ) : null}
    </div>
  );
}


// useSearchParams needs a Suspense boundary for this route to prerender.
export default function MaintenancePage() {
  return (
    <Suspense fallback={null}>
      <MaintenanceCommand />
    </Suspense>
  );
}
