"use client";

import React, { useMemo, useState } from "react";
import {
  Wrench,
  Clock,
  Users,
  UserCheck,
  Bot,
  Filter,
  MoreHorizontal,
  Send,
  Paperclip,
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  MapPin,
  Droplets,
  Snowflake,
  Refrigerator,
  Home,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Ban,
  BadgeCheck,
} from "lucide-react";
import styles from "@/components/styles/Maintenance.module.css";
import AdminShell from "@/components/admin/admin-shell";

/* ─── Shared domain data (one source of truth) ─── */

type Priority = "high" | "medium" | "low";
type StaffStatus = "available" | "on-job" | "on-site" | "break";
type DetailView = "pending" | "ongoing" | "staff" | "available";
type ModalMode = "dispatch" | "decline" | "success" | null;

type PendingRequest = {
  id: string;
  title: string;
  resident: string;
  unit: string;
  building: string;
  category: "Plumbing" | "HVAC" | "Appliance";
  aiLabel: string;
  priority: Priority;
  reportedAgo: string;
  reportedAt: string;
  description: string;
  preferredDay: string;
  phone: string;
};

type OngoingJob = {
  id: string;
  title: string;
  details: string;
  location: string;
  tech: string;
  techInitials: string;
  critical?: boolean;
  status:
    | { kind: "progress"; label: string; percent: number; eta: string }
    | { kind: "parts"; label: string; eta: string }
    | { kind: "onsite"; label: string; note: string };
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
  title?: string;
  district?: string;
  since?: string;
  tasksCompleted?: number;
  avgResolution?: string;
};

const PENDING_REQUESTS: PendingRequest[] = [
  {
    id: "REQ-2023-084",
    title: "Water leak in Unit 4B",
    resident: "Sarah Jenkins",
    unit: "Unit 4B",
    building: "Bldg C",
    category: "Plumbing",
    aiLabel: "Water Leak",
    priority: "high",
    reportedAgo: "10 mins ago",
    reportedAt: "Today, 10:14 AM",
    description:
      "There is water dripping steadily from the kitchen ceiling near the light fixture. Started about 20 minutes ago. Potential for ceiling damage. Resident reports rapid dripping near the HVAC unit.",
    preferredDay: "September 20, 2026 around morning",
    phone: "(555) 019-2834",
  },
  {
    id: "REQ-2023-085",
    title: "HVAC making grinding noise",
    resident: "Marcus Thorne",
    unit: "Unit 12A",
    building: "Bldg A",
    category: "HVAC",
    aiLabel: "No Heat",
    priority: "medium",
    reportedAgo: "45 mins ago",
    reportedAt: "Today, 09:39 AM",
    description: "HVAC unit making grinding noise; no heat in living room.",
    preferredDay: "ASAP — any weekday morning",
    phone: "(555) 014-8821",
  },
  {
    id: "REQ-2023-086",
    title: "Dishwasher not draining",
    resident: "Elena Rodriguez",
    unit: "Unit 2C",
    building: "Bldg B",
    category: "Appliance",
    aiLabel: "Dishwasher",
    priority: "low",
    reportedAgo: "2 hrs ago",
    reportedAt: "Today, 08:15 AM",
    description: "Dishwasher cycle completes but water remains at the bottom.",
    preferredDay: "Weekend afternoon preferred",
    phone: "(555) 011-4402",
  },
  {
    id: "REQ-2023-087",
    title: "Bathroom sink clog",
    resident: "James Park",
    unit: "Unit 8D",
    building: "Bldg B",
    category: "Plumbing",
    aiLabel: "Slow Drain",
    priority: "medium",
    reportedAgo: "3 hrs ago",
    reportedAt: "Today, 07:20 AM",
    description: "Master bathroom sink drains very slowly after use.",
    preferredDay: "Weekday after 2 PM",
    phone: "(555) 018-9910",
  },
  {
    id: "REQ-2023-088",
    title: "Thermostat error code",
    resident: "Aisha Khan",
    unit: "Unit 5A",
    building: "Bldg B",
    category: "HVAC",
    aiLabel: "Thermostat",
    priority: "high",
    reportedAgo: "4 hrs ago",
    reportedAt: "Today, 06:10 AM",
    description: "Thermostat shows E42; AC will not start. Building B HVAC cluster.",
    preferredDay: "Today if possible",
    phone: "(555) 012-3344",
  },
];

const ONGOING_JOBS: OngoingJob[] = [
  {
    id: "TC-8942",
    title: "HVAC Unit Replacement",
    details: "Compressor failure, replacing entire condenser unit",
    location: "Unit 402B",
    tech: "Marcus T.",
    techInitials: "MT",
    status: { kind: "progress", label: "In Progress (45%)", percent: 45, eta: "Est. 4h" },
  },
  {
    id: "TC-8938",
    title: "Leaking Dishwasher",
    details: "Identified broken seal, waiting on OEM replacement",
    location: "Unit 115A",
    tech: "Sarah J.",
    techInitials: "SJ",
    status: { kind: "parts", label: "Parts Ordered", eta: "ETA: Tomorrow, 2 PM" },
  },
  {
    id: "TC-8945",
    title: "Water Heater Malfunction",
    details: "No hot water reported, immediate dispatch.",
    location: "Unit 301C",
    tech: "David L.",
    techInitials: "DL",
    critical: true,
    status: { kind: "onsite", label: "On Site", note: "(Arrived 10m ago) · Assessing situation" },
  },
];

const STAFF: StaffMember[] = [
  {
    id: "tech-mj",
    name: "Marcus Johnson",
    initials: "MJ",
    specialty: "Plumbing",
    skills: ["Plumbing", "General"],
    status: "available",
    shift: "08:00 - 16:00",
    location: "North District Primary",
    isTech: true,
    load: "Low",
    title: "Senior Technician · Master Plumber",
    district: "North District Primary",
    since: "June 2018",
    tasksCompleted: 1482,
    avgResolution: "1h 22m",
  },
  {
    id: "tech-jr",
    name: "Javier Reyes",
    initials: "JR",
    specialty: "Plumbing",
    skills: ["Plumbing"],
    status: "available",
    shift: "07:00 - 15:00",
    location: "Staging Bay A",
    isTech: true,
    load: "Medium",
    title: "Plumbing Specialist",
  },
  {
    id: "tech-er",
    name: "Elena Rodriguez",
    initials: "ER",
    specialty: "General",
    skills: ["General", "Landscaping"],
    status: "available",
    shift: "09:00 - 17:00",
    location: "Tool Shed",
    isTech: true,
    load: "Low",
    title: "General Maintenance",
  },
  {
    id: "tech-sc",
    name: "Sarah Chen",
    initials: "SC",
    specialty: "HVAC",
    skills: ["Electrical", "HVAC"],
    status: "on-site",
    shift: "08:00 - 16:00",
    location: "Unit 12A (AC Repair)",
    isTech: true,
    activeTask: "Unit 12A (AC Repair)",
    title: "HVAC Specialist",
  },
  {
    id: "tech-dl",
    name: "David Lee",
    initials: "DL",
    specialty: "Plumbing",
    skills: ["Plumbing", "Water Systems"],
    status: "on-job",
    shift: "08:00 - 16:00",
    location: "Unit 301C (Water Heater)",
    isTech: true,
    activeTask: "TC-8945 Water Heater",
  },
  {
    id: "tech-al",
    name: "Amanda Lee",
    initials: "AL",
    specialty: "Plumbing",
    skills: ["Plumbing"],
    status: "on-job",
    shift: "10:00 - 18:00",
    location: "Unit 2C",
    isTech: true,
    load: "Busy · Est. Free 45m",
    activeTask: "Unit 2C",
  },
  {
    id: "tech-mt",
    name: "Marcus Torres",
    initials: "MT",
    specialty: "HVAC",
    skills: ["HVAC"],
    status: "on-job",
    shift: "08:00 - 16:00",
    location: "Unit 402B (HVAC Replace)",
    isTech: true,
    activeTask: "TC-8942 HVAC Replacement",
  },
  {
    id: "staff-rj",
    name: "Robert Jones",
    initials: "RJ",
    specialty: "Janitorial",
    skills: ["Janitorial"],
    status: "break",
    shift: "09:00 - 17:00",
    location: "Break Room",
    isTech: false,
  },
];

const TOTAL_STAFF = 10;
const PENDING_TOTAL = 24;
const ONGOING_TOTAL = 12;

const STATS = {
  pending: PENDING_TOTAL,
  ongoing: ONGOING_TOTAL,
  staffOnDuty: STAFF.length,
  staffTotal: TOTAL_STAFF,
  availableTechs: STAFF.filter((s) => s.isTech && s.status === "available").length,
};

function categoryIcon(category: PendingRequest["category"]) {
  if (category === "Plumbing") return <Droplets size={16} />;
  if (category === "HVAC") return <Snowflake size={16} />;
  return <Refrigerator size={16} />;
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
  return "Break";
}

function statusDotClass(status: StaffStatus) {
  if (status === "available") return styles.dotGreen;
  if (status === "on-site") return styles.dotBlue;
  if (status === "break") return styles.dotBlue;
  return styles.dotRed;
}

/* ─── Page ─── */

export default function MaintenanceCommand() {
  const [detailView, setDetailView] = useState<DetailView>("pending");
  const [selectedPendingId, setSelectedPendingId] = useState(PENDING_REQUESTS[0].id);
  const [ticketChatId, setTicketChatId] = useState<string | null>(null);
  const [techProfileId, setTechProfileId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [dispatchTicketId, setDispatchTicketId] = useState(PENDING_REQUESTS[0].id);
  const [selectedTechId, setSelectedTechId] = useState("tech-mj");
  const [jobTab, setJobTab] = useState<"all" | "critical" | "overdue">("all");
  const [rosterFilter, setRosterFilter] = useState<"all" | "available">("all");

  const selectedPending = useMemo(
    () => PENDING_REQUESTS.find((r) => r.id === selectedPendingId) ?? PENDING_REQUESTS[0],
    [selectedPendingId],
  );

  const dispatchTicket = useMemo(
    () => PENDING_REQUESTS.find((r) => r.id === dispatchTicketId) ?? PENDING_REQUESTS[0],
    [dispatchTicketId],
  );

  const ticketForChat = useMemo(
    () => PENDING_REQUESTS.find((r) => r.id === ticketChatId) ?? null,
    [ticketChatId],
  );

  const techProfile = useMemo(
    () => STAFF.find((s) => s.id === techProfileId) ?? null,
    [techProfileId],
  );

  const openDispatch = (ticketId: string) => {
    setDispatchTicketId(ticketId);
    setSelectedTechId("tech-mj");
    setModalMode("dispatch");
  };

  const selectStat = (view: DetailView) => {
    setDetailView(view);
    setTicketChatId(null);
    setTechProfileId(null);
    if (view === "available") setRosterFilter("available");
    if (view === "staff") setRosterFilter("all");
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
          </div>
        </header>

        <section className={styles.statsGrid}>
          <StatCard
            label="PENDING REQUESTS"
            value={String(STATS.pending)}
            icon={<Clock size={20} />}
            color="navy"
            active={detailView === "pending"}
            onClick={() => selectStat("pending")}
          />
          <StatCard
            label="ONGOING REPAIRS"
            value={String(STATS.ongoing)}
            icon={<Wrench size={20} />}
            color="blue"
            active={detailView === "ongoing"}
            onClick={() => selectStat("ongoing")}
          />
          <StatCard
            label="STAFF ON-DUTY"
            value={String(STATS.staffOnDuty)}
            subValue={`/ ${STATS.staffTotal} Total`}
            icon={<Users size={20} />}
            color="slate"
            active={detailView === "staff"}
            onClick={() => selectStat("staff")}
          />
          <StatCard
            label="AVAILABLE TECHS"
            value={String(STATS.availableTechs)}
            icon={<UserCheck size={20} />}
            color="green"
            isHighlight
            active={detailView === "available"}
            onClick={() => selectStat("available")}
          />
        </section>

        <main className={styles.mainContent}>
          {techProfile ? (
            <TechProfileView tech={techProfile} onBack={() => setTechProfileId(null)} />
          ) : ticketForChat ? (
            <TicketDetailView ticket={ticketForChat} onBack={() => setTicketChatId(null)} />
          ) : detailView === "pending" ? (
            <PendingRequestsView
              selectedId={selectedPendingId}
              selected={selectedPending}
              onSelect={setSelectedPendingId}
              onOpenTicket={(id) => setTicketChatId(id)}
              onDispatch={openDispatch}
            />
          ) : detailView === "ongoing" ? (
            <OngoingRepairsView
              jobTab={jobTab}
              onJobTab={setJobTab}
              onOpenTicket={() => setTicketChatId(PENDING_REQUESTS[0].id)}
            />
          ) : (
            <StaffRosterView
              filter={detailView === "available" ? "available" : rosterFilter}
              onFilterChange={(f) => {
                setRosterFilter(f);
                setDetailView(f === "available" ? "available" : "staff");
              }}
              onOpenTech={(id) => setTechProfileId(id)}
              onAssign={(id) => {
                setSelectedTechId(id);
                openDispatch(selectedPendingId);
              }}
            />
          )}
        </main>

        {modalMode && (
          <DispatchFlowModal
            mode={modalMode}
            ticket={dispatchTicket}
            selectedTechId={selectedTechId}
            onSelectTech={setSelectedTechId}
            onClose={() => setModalMode(null)}
            onDecline={() => setModalMode("decline")}
            onConfirm={() => setModalMode("success")}
            onBackToDispatch={() => setModalMode("dispatch")}
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

/* ─── Pending Requests (mockup 2) ─── */

function PendingRequestsView({
  selectedId,
  selected,
  onSelect,
  onOpenTicket,
  onDispatch,
}: {
  selectedId: string;
  selected: PendingRequest;
  onSelect: (id: string) => void;
  onOpenTicket: (id: string) => void;
  onDispatch: (id: string) => void;
}) {
  const highCount = PENDING_REQUESTS.filter((r) => r.priority === "high").length;
  const plumbingCount = PENDING_REQUESTS.filter((r) => r.category === "Plumbing").length;
  const shortDesc =
    selected.description.length > 140
      ? `${selected.description.slice(0, 140).trim()}…`
      : selected.description;

  return (
    <div className={styles.pendingLayout}>
      <aside className={styles.pendingAside}>
        <section className={`${styles.card} ${styles.compactCard}`}>
          <div className={styles.aiLabel}>
            <Bot size={16} /> AI Triage Summary
          </div>
          <div className={styles.aiStats}>
            <div className={styles.aiStatRow}>
              <span>Critical/High Priority</span>
              <span className={styles.badgeRed}>{highCount} Tickets</span>
            </div>
            <div className={styles.aiStatRow}>
              <span>Plumbing Issues</span>
              <strong>{plumbingCount} Tickets</strong>
            </div>
            <div className={styles.aiStatRow}>
              <span>Avg Response Time</span>
              <span className={styles.badgeGreen}>1.2 Hrs</span>
            </div>
          </div>
          <p className={styles.aiInsight}>
            Cluster of HVAC requests in Building B detected. Recommend bulk dispatch.
          </p>
        </section>

        <section className={`${styles.card} ${styles.compactCard} ${styles.detailCard}`}>
          <div className={styles.detailCardHead}>
            <h3>Request Detail</h3>
            <span className={styles.ticketId}>{selected.id}</span>
          </div>
          <h4 className={styles.detailTitle}>{selected.title}</h4>
          <p className={styles.detailMeta}>
            {selected.resident} · {selected.unit} · {selected.building}
          </p>
          <blockquote className={styles.residentQuote}>
            &ldquo;{shortDesc}&rdquo;
          </blockquote>
          <div className={styles.aiInsightBar}>
            <Bot size={14} /> AI Insight · {selected.aiLabel}
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
            Showing {PENDING_REQUESTS.length} of {PENDING_TOTAL}
          </span>
        </div>
        <div className={styles.tableWrapper}>
          <table className={`${styles.table} ${styles.queueTable}`}>
            <thead>
              <tr>
                <th>ID / Time</th>
                <th>Resident &amp; Unit</th>
                <th>Category</th>
                <th>Status / AI</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {PENDING_REQUESTS.map((req) => (
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
                    <div className={styles.cellSub}>
                      {req.unit} — {req.building}
                    </div>
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
                    <div className={styles.aiTag}>AI: {req.aiLabel}</div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.dispatchPill}
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

/* ─── Ongoing Repairs (mockup 3) ─── */

function OngoingRepairsView({
  jobTab,
  onJobTab,
  onOpenTicket,
}: {
  jobTab: "all" | "critical" | "overdue";
  onJobTab: (t: "all" | "critical" | "overdue") => void;
  onOpenTicket: () => void;
}) {
  const criticalCount = ONGOING_JOBS.filter((j) => j.critical).length;
  const filtered =
    jobTab === "critical"
      ? ONGOING_JOBS.filter((j) => j.critical)
      : jobTab === "overdue"
        ? []
        : ONGOING_JOBS;

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.jobTabs}>
          <button
            type="button"
            className={jobTab === "all" ? styles.jobTabActive : undefined}
            onClick={() => onJobTab("all")}
          >
            All Active ({ONGOING_TOTAL})
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
            Overdue (0)
          </button>
        </div>
        <label className={styles.sortSelect}>
          Sort by:
          <select defaultValue="priority">
            <option value="priority">Priority (High to Low)</option>
            <option value="eta">ETA</option>
            <option value="location">Location</option>
          </select>
        </label>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Job Details</th>
              <th>Location</th>
              <th>Technician</th>
              <th>Timeline &amp; Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyCell}>
                  No overdue jobs right now.
                </td>
              </tr>
            ) : (
              filtered.map((job) => (
                <tr key={job.id}>
                  <td>
                    <strong className={styles.linkId}>#{job.id}</strong>
                  </td>
                  <td>
                    <strong className={job.critical ? styles.criticalTitle : undefined}>
                      {job.critical && <AlertTriangle size={14} />} {job.title}
                    </strong>
                    <div className={styles.cellSub}>{job.details}</div>
                  </td>
                  <td>
                    <span className={styles.categoryCell}>
                      <Home size={14} /> {job.location}
                    </span>
                  </td>
                  <td>
                    <div className={styles.techCell}>
                      <div className={styles.avatar}>{job.techInitials}</div>
                      <strong>{job.tech}</strong>
                    </div>
                  </td>
                  <td>
                    {job.status.kind === "progress" && (
                      <div className={styles.jobStatus}>
                        <span className={styles.cellSub}>{job.status.eta}</span>
                        <strong className={styles.progressLabel}>{job.status.label}</strong>
                        <div className={styles.progressTrack}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${job.status.percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {job.status.kind === "parts" && (
                      <div className={styles.jobStatus}>
                        <span className={styles.dotGray}>{job.status.label}</span>
                        <span className={styles.cellSub}>{job.status.eta}</span>
                      </div>
                    )}
                    {job.status.kind === "onsite" && (
                      <div className={styles.jobStatus}>
                        <span className={styles.dotBlue}>{job.status.label}</span>
                        <span className={styles.cellSub}>{job.status.note}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <button type="button" className={styles.iconBtn} aria-label="More" onClick={onOpenTicket}>
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
          Showing 1–{filtered.length || 0} of {jobTab === "all" ? ONGOING_TOTAL : filtered.length}{" "}
          active jobs
        </span>
        <div className={styles.pager}>
          <button type="button" className={styles.iconBtn} aria-label="Previous page">
            <ChevronLeft size={16} />
          </button>
          <span>Page 1 of {jobTab === "all" ? 4 : 1}</span>
          <button type="button" className={styles.iconBtn} aria-label="Next page">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─── Staff / Available Techs (mockup 4) ─── */

function StaffRosterView({
  filter,
  onFilterChange,
  onOpenTech,
  onAssign,
}: {
  filter: "all" | "available";
  onFilterChange: (f: "all" | "available") => void;
  onOpenTech: (id: string) => void;
  onAssign: (id: string) => void;
}) {
  const onDuty = STAFF.length;
  const available = STAFF.filter((s) => s.status === "available").length;
  const onJob = STAFF.filter((s) => s.status === "on-job" || s.status === "on-site").length;
  const rows =
    filter === "available"
      ? STAFF.filter((s) => s.isTech && s.status === "available")
      : STAFF;

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
          <button type="button" className={styles.iconBtn} aria-label="Filter">
            <Filter size={16} />
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Specialty</th>
                <th>Status</th>
                <th>Shift</th>
                <th>Location</th>
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
                  <td>{person.specialty}</td>
                  <td>
                    <span className={statusDotClass(person.status)}>
                      {statusLabel(person.status)}
                    </span>
                  </td>
                  <td>{person.shift}</td>
                  <td>{person.location}</td>
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
                      <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label="More"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.tableFooter}>
          <span>
            Showing {rows.length} of {filter === "available" ? STATS.availableTechs : onDuty}{" "}
            {filter === "available" ? "available techs" : "active staff"}
          </span>
          <div className={styles.pager}>
            <button type="button" className={styles.iconBtn} aria-label="Previous">
              <ChevronLeft size={16} />
            </button>
            <button type="button" className={styles.iconBtn} aria-label="Next">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Ticket chat (mockup 6) ─── */

function TicketDetailView({
  ticket,
  onBack,
}: {
  ticket: PendingRequest;
  onBack: () => void;
}) {
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
            <button type="button" aria-label="Call">
              <Phone size={18} />
            </button>
            <button type="button" aria-label="More options">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
        <div className={styles.chatBody}>
          <div className={styles.timeMarker}>Today, 09:15 AM</div>
          <div className={styles.messageGroup}>
            <div className={styles.msgResident}>
              Hi Marcus, the leak under the kitchen sink seems to be getting worse. There&apos;s a
              small pool of water forming now.
            </div>
            <div className={styles.msgImage}>Image attachment</div>
            <div className={styles.msgStaff}>
              Thanks for the update, Sarah and for the picture. I&apos;m finishing up a job in
              Building 2 right now. I should be over to {ticket.unit} in about 15–20 minutes. Please
              keep a towel under there for now.
            </div>
            <div className={styles.msgResident}>Will do, see you soon.</div>
          </div>
        </div>
        <div className={styles.chatInput}>
          <button type="button" aria-label="Attach file">
            <Paperclip size={20} />
          </button>
          <input type="text" placeholder="Type a message..." />
          <button type="button" className={styles.sendBtn} aria-label="Send">
            <Send size={18} />
          </button>
        </div>
      </div>
      <aside className={styles.ticketSidebar}>
        <div className={styles.sideCard}>
          <div className={styles.sideHeader}>
            <h3>Ticket Details</h3>
            <span className={styles.ticketId}>{ticket.id}</span>
          </div>
          <div className={styles.statusPill}>In Progress</div>
          <div className={styles.sideGroup}>
            <label>Issue Category</label>
            <p>
              <Wrench size={14} /> {ticket.category} / {ticket.aiLabel}
            </p>
          </div>
          <div className={styles.sideGroup}>
            <label>Location</label>
            <p>
              {ticket.unit} — Kitchen
            </p>
          </div>
          <div className={styles.sideGroup}>
            <label>Reported</label>
            <p>{ticket.reportedAt}</p>
          </div>
        </div>
        <div className={`${styles.sideCard} ${styles.assignedCard}`}>
          <label className={styles.sectionLabel}>Assigned Personnel</label>
          <div className={styles.assignedTech}>
            <div className={styles.avatar}>MJ</div>
            <div>
              <strong>Marcus Johnson</strong>
              <p>Senior Technician</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ─── Dispatch / Decline / Success (mockups 5, 7, 8) ─── */

function DispatchFlowModal({
  mode,
  ticket,
  selectedTechId,
  onSelectTech,
  onClose,
  onDecline,
  onConfirm,
  onBackToDispatch,
}: {
  mode: Exclude<ModalMode, null>;
  ticket: PendingRequest;
  selectedTechId: string;
  onSelectTech: (id: string) => void;
  onClose: () => void;
  onDecline: () => void;
  onConfirm: () => void;
  onBackToDispatch: () => void;
}) {
  const skillMatch =
    ticket.category === "Appliance" ? ["General", "Plumbing"] : [ticket.category];
  const providers = STAFF.filter(
    (s) => s.isTech && skillMatch.some((skill) => s.skills.includes(skill) || s.specialty === skill),
  );
  const list = (providers.length ? providers : STAFF.filter((s) => s.isTech)).slice(0, 3);
  const selected = STAFF.find((s) => s.id === selectedTechId);

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
              <select id="decline-reason" className={styles.selectField} defaultValue="">
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
              <label htmlFor="decline-msg">Message to Resident</label>
              <textarea
                id="decline-msg"
                className={styles.textareaField}
                rows={4}
                placeholder="Briefly explain the decision to the resident..."
              />
              <p className={styles.helpText}>
                This message will be sent directly to the resident&apos;s portal.
              </p>
            </div>
            <label className={styles.checkboxRow}>
              <input type="checkbox" /> Mark as duplicate of another ticket
            </label>
          </div>
          <footer className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onBackToDispatch}>
              Go Back
            </button>
            <button type="button" className={styles.confirmDeclineBtn} onClick={onClose}>
              Confirm Decline
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
              The request for <strong>{ticket.unit}</strong> has been successfully dispatched. A
              notification has been sent to both the technician (
              <strong>{selected?.name ?? "Marcus Johnson"}</strong>) and the resident (
              <strong>{ticket.resident}</strong>).
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
                  <label>Scheduled Date</label>
                  <strong>Oct 24, 2023</strong>
                </div>
                <div>
                  <label>Preferred Time</label>
                  <strong>10:30 AM</strong>
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
                <p>
                  {ticket.building}, {ticket.unit}
                </p>
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
                <p>At Home</p>
              </div>
              <div className={styles.metaFull}>
                <label>Preferred day</label>
                <p>{ticket.preferredDay}</p>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Ticket Title</label>
              <input type="text" className={styles.textField} defaultValue={ticket.title} />
            </div>
            <div className={styles.inputGroup} style={{ marginTop: "1rem" }}>
              <label>Description</label>
              <textarea
                className={styles.textareaField}
                rows={3}
                defaultValue={ticket.description}
              />
            </div>
            <div className={styles.inputGroup} style={{ marginTop: "1rem" }}>
              <label>Severity</label>
              <div className={styles.severityToggle}>
                <button type="button" className={ticket.priority === "low" ? styles.sevLow : undefined}>
                  Low Priority
                </button>
                <button
                  type="button"
                  className={ticket.priority === "medium" ? styles.sevMed : undefined}
                >
                  Medium Priority
                </button>
                <button
                  type="button"
                  className={ticket.priority === "high" ? styles.sevHigh : undefined}
                >
                  High Priority
                </button>
              </div>
            </div>

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
              <button type="button" className={styles.iconBtn} aria-label="Call resident">
                <Phone size={16} />
              </button>
            </div>

            <div className={styles.attachments}>
              <span>Attachments (1)</span>
              <div className={styles.attachThumb}>IMG</div>
            </div>
          </div>

          <div className={styles.dispatchRight}>
            <h4>Select Schedule</h4>
            <div className={styles.fieldGrid}>
              <div className={styles.inputGroup}>
                <label>Dispatch Date</label>
                <div className={styles.iconInput}>
                  <Calendar size={16} />
                  <input type="text" defaultValue="10/24/2023" />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>Preferred Time</label>
                <div className={styles.iconInput}>
                  <Clock size={16} />
                  <input type="text" defaultValue="10:30 AM" />
                </div>
              </div>
            </div>
            <div className={styles.techSearch}>
              <Search size={16} />
              <input type="text" placeholder="Search by name or skill..." />
            </div>
            <div className={styles.techOptions}>
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
                          ? `Available Now · ${tech.title ?? tech.specialty}`
                          : `In Progress (${tech.location}) · ${tech.specialty}`}
                      </p>
                    </div>
                  </div>
                  <span className={styles.loadLabel}>
                    {tech.status === "available"
                      ? `Load: ${tech.load ?? "Low"}`
                      : tech.load ?? "Busy"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <footer className={styles.modalFooter}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>
            Cancel
          </button>
          <button type="button" className={styles.declineBtn} onClick={onDecline}>
            <Ban size={18} /> Decline Request
          </button>
          <button type="button" className={styles.confirmBtn} onClick={onConfirm}>
            <Send size={18} /> Confirm Dispatch
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ─── Tech profile (mockup 9) ─── */

function TechProfileView({ tech, onBack }: { tech: StaffMember; onBack: () => void }) {
  const isAvailable = tech.status === "available";

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
              {tech.title ?? tech.specialty}
              {tech.since ? ` · Since ${tech.since}` : ""}
            </p>
            <p className={styles.location}>
              <MapPin size={14} /> {tech.district ?? tech.location}
            </p>
          </div>
          <button type="button" className={styles.contactTech}>
            <Mail size={16} /> Contact
          </button>
        </div>
      </header>

      <div className={styles.techStats}>
        <div className={styles.card}>
          <label>Total Tasks Completed</label>
          <div className={styles.statValLarge}>
            {(tech.tasksCompleted ?? 420).toLocaleString()}{" "}
            <span className={styles.trendGreen}>+12%</span>
          </div>
        </div>
        <div className={styles.card}>
          <label>Avg. Resolution Time</label>
          <div className={styles.statValLarge}>
            {tech.avgResolution ?? "1h 45m"} <span className={styles.trendGreen}>-14m</span>
          </div>
        </div>
      </div>

      <div className={styles.scheduleSection}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Weekly Availability &amp; Schedule</h3>
            <div className={styles.scheduleLegend}>
              <span className={styles.legendScheduled}>Scheduled</span>
              <span className={styles.legendAvailable}>Available</span>
              <span className={styles.legendOff}>Off-duty</span>
            </div>
          </div>
          <div className={styles.calendarGrid}>
            {["Mon 24", "Tue 25", "Wed 26", "Thu 27", "Fri 28"].map((day, i) => (
              <div key={day} className={styles.calDay}>
                <span className={styles.calDayLabel}>{day}</span>
                <div
                  className={`${styles.calBlock} ${
                    i === 4
                      ? styles.calOff
                      : i % 2 === 0
                        ? styles.calScheduled
                        : styles.calAvailable
                  }`}
                >
                  {i === 4 ? "Off" : i === 0 ? "Unit 402-B" : i % 2 === 0 ? "Hall Insp." : "Open"}
                </div>
              </div>
            ))}
          </div>
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
                <span>Location</span>
                <p>{tech.location}</p>
              </div>
              <div>
                <span>Status</span>
                <p>{statusLabel(tech.status)}</p>
              </div>
            </div>
            <button type="button" className={styles.primaryBtn}>
              {tech.activeTask ? "View Live Ticket" : "Assign New Task"}
            </button>
          </div>
          <button type="button" className={styles.historyBtn}>
            VIEW HISTORY
          </button>
        </div>
      </div>
    </div>
  );
}
