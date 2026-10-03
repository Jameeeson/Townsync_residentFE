"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  MaintenanceModal,
  type MaintenancePayload,
} from "@/components/MaintenanceModal";
import { StatDetailModal, type StatDetailRow } from "@/components/StatDetailModal";
import { SuccessModal } from "@/components/SuccessModal";
import { TaskDetailsModal, type TaskDetails } from "@/components/TaskDetailsModal";
import { CompleteTaskModal, type CompletionAssessment } from "@/components/CompleteTaskModal";
import { useToast } from "@/components/Toast";
import {
  IconArrowRight,
  IconClipboard,
  IconClock,
  IconDoc,
  IconMapPin,
  IconScan,
  IconShield,
  IconShieldCheck,
  IconSnowflake,
  IconUsers,
  IconWrench,
} from "@/components/icons";
import { ApiError } from "@/lib/api-client";
import {
  createOnsiteLog,
  getActiveTaskBreakdown,
  getDashboardSummary,
  getExpectedVisitorBreakdown,
  listTasks,
  updateTaskProgress,
  type ActiveTaskItem,
  type ExpectedVisitorItem,
  type MaintenanceTask,
  type StaffDashboard,
} from "@/lib/services/staff";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import styles from "./dashboard.module.css";
import { parseServerDate } from "@/lib/datetime";

type Filter = "all" | "pending" | "progress" | "done";
type TaskStatus = "pending" | "progress" | "done";
type StatView = "tasks" | "visitors" | "assigned" | null;

type Task = {
  id: number;
  title: string;
  priority: "high" | "medium" | "low";
  location: string;
  meta: string;
  icon: "wrench" | "snow" | "shield";
  status: TaskStatus;
  description?: string;
  imageUrls?: string[];
};

function toUiStatus(status: MaintenanceTask["status"]): TaskStatus {
  if (status === "Completed") return "done";
  if (status === "Ongoing") return "progress";
  return "pending";
}

function toUiPriority(priority: MaintenanceTask["priority_level"]): Task["priority"] {
  if (priority === "High" || priority === "Emergency") return "high";
  if (priority === "Medium") return "medium";
  return "low";
}

function iconForCategory(category: string): Task["icon"] {
  const c = category.toLowerCase();
  if (c.includes("hvac") || c.includes("snow") || c.includes("cool")) return "snow";
  if (c.includes("security") || c.includes("gate") || c.includes("camera")) return "shield";
  return "wrench";
}

/** Backend timestamps are SQLite "YYYY-MM-DD HH:MM:SS" strings, not ISO. */
function formatWhen(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = parseServerDate(value);
  if (!parsed) return value;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = parseServerDate(value);
  if (!parsed) return value;
  return parsed.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function priorityTone(priority: string | null): StatDetailRow["badgeTone"] {
  if (priority === "Emergency" || priority === "High") return "danger";
  if (priority === "Medium") return "warning";
  return "info";
}

function toUiTask(t: MaintenanceTask): Task {
  return {
    id: t.request_id,
    title: t.category,
    priority: toUiPriority(t.priority_level),
    location: t.unit_number ?? "Common Area",
    meta: t.resident_name ? `Resident: ${t.resident_name}` : t.description,
    icon: iconForCategory(t.category),
    status: toUiStatus(t.status),
    description: t.description,
    imageUrls: t.image_urls ?? (t.initial_image_url ? [t.initial_image_url] : []),
  };
}

type PanelTab = { id: string; label: string; count?: number };

/** One card: title, filter tabs (with counts) in its header, then its content. */
function Panel({
  title,
  tabs,
  active,
  onChange,
  ariaLabel,
  action,
  children,
}: {
  title: string;
  tabs: PanelTab[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.panel} aria-label={title}>
      <header className={styles.panelHead}>
        <div className={styles.panelTitle}>
          <h2>{title}</h2>
          {action}
        </div>
        <div className={styles.tabs} role="tablist" aria-label={ariaLabel}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active === tab.id}
              className={`${styles.tab} ${active === tab.id ? styles.tabActive : ""}`}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
              {typeof tab.count === "number" ? <span className={styles.tabCount}>{tab.count}</span> : null}
            </button>
          ))}
        </div>
      </header>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

function StatTile({
  icon,
  label,
  value,
  onClick,
  hint = "View breakdown",
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  onClick: () => void;
  hint?: string;
  tone?: "green";
}) {
  return (
    <button type="button" className={`${styles.stat} ${tone === "green" ? styles.statGreen : ""}`} onClick={onClick}>
      <span className={styles.statIcon}>{icon}</span>
      <span className={styles.statText}>
        <span className={styles.statLabel}>{label}</span>
        <strong>{value}</strong>
      </span>
      <small className={styles.statHint}>
        {hint} <IconArrowRight size={12} />
      </small>
    </button>
  );
}

function isToday(value: string): boolean {
  const d = parseServerDate(value);
  return Boolean(d && d.toDateString() === new Date().toDateString());
}

export default function StaffDashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { session, canUseScanner, canUseLogs, isMaintenance } = useStaffSession();
  // Security (Staff) accounts have no maintenance tasks; their dashboard is the
  // gate and visitor view only. canUseScanner is true once the role is known
  // to be non-Maintenance, so nothing flashes in while the session loads.
  const isSecurity = canUseScanner;
  const [filter, setFilter] = useState<Filter>("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<StaffDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [maintOpen, setMaintOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [submittedUnit, setSubmittedUnit] = useState("");
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  // Task waiting for the technician's "how urgent was it really?" answer before completing.
  const [completingId, setCompletingId] = useState<number | null>(null);

  const [statView, setStatView] = useState<StatView>(null);
  const [statLoading, setStatLoading] = useState(false);
  const [statError, setStatError] = useState<string | null>(null);
  const [activeTaskRows, setActiveTaskRows] = useState<ActiveTaskItem[]>([]);
  const [visitorRows, setVisitorRows] = useState<ExpectedVisitorItem[]>([]);

  const [reloadTick, setReloadTick] = useState(0);
  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  // Both tiles fetch the rows the backend counted, so the list can never
  // disagree with the number the staff member just clicked.
  const openStat = useCallback(async (view: Exclude<StatView, null>) => {
    setStatView(view);
    if (view === "assigned") return; // already in memory from listTasks()
    setStatLoading(true);
    setStatError(null);
    try {
      if (view === "tasks") setActiveTaskRows(await getActiveTaskBreakdown());
      else setVisitorRows(await getExpectedVisitorBreakdown());
    } catch (e) {
      setStatError(
        e instanceof ApiError ? e.message : "Could not load the details for this tile.",
      );
    } finally {
      setStatLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getDashboardSummary();
        if (!cancelled) setSummary(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Could not load the dashboard.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (!isMaintenance) {
        if (!cancelled) setTasks([]);
        return;
      }
      try {
        const rawTasks = await listTasks();
        if (!cancelled) {
          setTasks(rawTasks.map(toUiTask));
          setTasksError(null);
        }
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 403) {
            setTasksError("Task management is available to Maintenance Staff accounts.");
          } else {
            setTasksError(e instanceof ApiError ? e.message : "Could not load tasks.");
          }
          setTasks([]);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadTick, isMaintenance]);

  const pendingCount = summary?.pending_tasks_count ?? tasks.filter((t) => t.status !== "done").length;
  const visitorCount = summary?.expected_visitors_count ?? 0;

  const counts = {
    pending: tasks.filter((t) => t.status === "pending").length,
    progress: tasks.filter((t) => t.status === "progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };
  const events = summary?.recent_events ?? [];
  const eventCount = (type: string) => events.filter((e) => e.event_type === type).length;
  const visibleEvents = activityFilter === "all" ? events : events.filter((e) => e.event_type === activityFilter);
  const arrivalsToday = events.filter((e) => e.event_type === "gate_in" && isToday(e.timestamp)).length;
  const departuresToday = events.filter((e) => e.event_type === "gate_out" && isToday(e.timestamp)).length;
  // Accounts without a saved name greet with the email's local part, not the whole address.
  const greetingName = session ? session.firstName.split("@")[0] : "";
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const filtered = tasks.filter((t) => {
    if (filter === "all") return t.status !== "done";
    if (filter === "pending") return t.status === "pending";
    if (filter === "progress") return t.status === "progress";
    return t.status === "done";
  });

  const completing = tasks.find((t) => t.id === completingId) ?? null;
  const selected: TaskDetails | null =
    tasks.find((t) => t.id === selectedId) ?? null;

  const statRows: StatDetailRow[] =
    statView === "tasks"
      ? activeTaskRows.map((t) => ({
          id: t.request_id,
          title: t.category,
          lead: `#${t.request_id}`,
          lines: [
            `${t.unit_number ?? "Common Area"}${t.resident_name ? ` · ${t.resident_name}` : ""}`,
            t.description,
            t.deadline ? `Due ${formatWhen(t.deadline)}` : "No deadline set",
          ],
          badge: t.priority_level ? `${t.status} · ${t.priority_level}` : t.status,
          badgeTone: priorityTone(t.priority_level),
        }))
      : statView === "visitors"
        ? visitorRows.map((v) => ({
            id: v.request_id,
            title: v.visitor_name,
            lead: formatTime(v.scheduled_at) ?? undefined,
            lines: [
              `Visiting ${v.unit_number ?? "an unknown unit"}${v.resident_name ? ` · ${v.resident_name}` : ""}`,
              v.purpose,
              v.party_size > 1 ? `Party of ${v.party_size}: ${v.companions.join(", ")}` : null,
              v.vehicle_plate ? `Vehicle ${v.vehicle_plate}` : null,
            ],
            badge: v.checked_in ? "Checked in" : "Expected",
            badgeTone: v.checked_in ? "success" : "info",
          }))
        : statView === "assigned"
          ? tasks.map((t) => ({
              id: t.id,
              title: t.title,
              lead: `#${t.id}`,
              lines: [t.location, t.meta],
              badge:
                t.status === "done"
                  ? "Completed"
                  : t.status === "progress"
                    ? "In Progress"
                    : "Pending",
              badgeTone:
                t.status === "done"
                  ? "success"
                  : t.status === "progress"
                    ? "warning"
                    : "neutral",
            }))
          : [];

  const statCopy = {
    tasks: {
      title: "Active Tasks",
      subtitle: `${pendingCount} task${pendingCount === 1 ? "" : "s"} still open for you`,
      empty: "You have no open tasks right now.",
    },
    visitors: {
      title: "Expected Visitors",
      subtitle: `${visitorCount} approved visit${visitorCount === 1 ? "" : "s"} scheduled for today`,
      empty: "No approved visits are scheduled for today.",
    },
    assigned: {
      title: "Assigned Tasks",
      subtitle: `Everything currently on your roster (${tasks.length})`,
      empty: "Nothing is assigned to you yet.",
    },
  } as const;

  function completeTask(id: number) {
    setSelectedId(null);
    setCompletingId(id);
  }

  async function finishTask(id: number, assessment: CompletionAssessment) {
    setBusyTaskId(id);
    try {
      await updateTaskProgress(id, "Completed", "Work completed on-site.", assessment);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "done", meta: "Completed just now" } : t)),
      );
      setCompletingId(null);
      toast("Task marked complete.", "success");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not update the task.", "danger");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function startTask(id: number) {
    setBusyTaskId(id);
    try {
      await updateTaskProgress(id, "Ongoing", "Started on-site inspection.");
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id && t.status === "pending"
            ? { ...t, status: "progress", meta: "Started: just now" }
            : t,
        ),
      );
      setSelectedId(null);
      toast("Task moved to In Progress.", "info");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not update the task.", "danger");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function submitMaintenanceLog(payload: MaintenancePayload) {
    try {
      await createOnsiteLog({
        category: payload.category,
        description: `Location: ${payload.unit}\n${payload.description}`,
        priority: (payload.priority.charAt(0).toUpperCase() + payload.priority.slice(1)) as
          | "Low"
          | "Medium"
          | "High",
      });
      setSubmittedUnit(payload.unit);
      setMaintOpen(false);
      setSuccessOpen(true);
      reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not submit the log.", "danger");
    }
  }

  return (
    <>
      <div className={styles.page}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>
              {isMaintenance ? "Maintenance" : isSecurity ? "Security Desk" : "Staff"} · {todayLabel}
            </p>
            <h1>Welcome back{greetingName ? `, ${greetingName}` : ""}</h1>
            <p className={styles.lede}>
              {error ? (
                <>
                  We couldn&apos;t reach the dashboard service.{" "}
                  <button type="button" className={styles.retryLink} onClick={reload}>
                    Retry
                  </button>
                </>
              ) : isMaintenance ? (
                "Here are the jobs assigned to you and what changed recently."
              ) : (
                "Today's visitors and gate activity at a glance."
              )}
            </p>
          </div>
          <div className={styles.heroActions}>
            {canUseScanner ? (
              <Link href="/staff/scanner" className={styles.heroPrimary}>
                <IconScan size={18} /> Open Gate Scanner
              </Link>
            ) : null}
            {isMaintenance ? (
              <button type="button" className={styles.heroPrimary} onClick={() => setMaintOpen(true)}>
                <IconDoc size={18} /> New Maintenance Log
              </button>
            ) : null}
          </div>
        </section>

        <section className={styles.stats} aria-label="Summary">
          {isMaintenance ? (
            <>
              <StatTile
                icon={<IconClipboard size={18} />}
                label="Open tasks"
                value={loading ? "…" : pendingCount}
                onClick={() => openStat("tasks")}
              />
              <StatTile
                icon={<IconWrench size={18} />}
                label="In progress"
                value={counts.progress}
                onClick={() => setFilter("progress")}
                hint="Show in list"
              />
              <StatTile
                icon={<IconShieldCheck size={18} />}
                label="Completed"
                value={counts.done}
                tone="green"
                onClick={() => setFilter("done")}
                hint="Show in list"
              />
            </>
          ) : (
            <>
              <StatTile
                icon={<IconUsers size={18} />}
                label="Visitors expected today"
                value={loading ? "…" : visitorCount}
                tone="green"
                onClick={() => openStat("visitors")}
              />
              <StatTile
                icon={<IconShield size={18} />}
                label="Arrivals today"
                value={loading ? "…" : arrivalsToday}
                onClick={() => setActivityFilter("gate_in")}
                hint="Show in activity"
              />
              <StatTile
                icon={<IconShieldCheck size={18} />}
                label="Departures today"
                value={loading ? "…" : departuresToday}
                onClick={() => setActivityFilter("gate_out")}
                hint="Show in activity"
              />
            </>
          )}
        </section>

        <div className={isMaintenance ? styles.board : styles.boardSingle}>
          {isMaintenance ? (
            <Panel
              title="My Tasks"
              tabs={[
                { id: "all", label: "Active", count: counts.pending + counts.progress },
                { id: "pending", label: "Pending", count: counts.pending },
                { id: "progress", label: "In Progress", count: counts.progress },
                { id: "done", label: "Done", count: counts.done },
              ]}
              active={filter}
              onChange={(id) => setFilter(id as Filter)}
              ariaLabel="Task filters"
            >
              {tasksError ? (
                <p className={styles.empty} role="status">
                  {tasksError}
                </p>
              ) : loading && tasks.length === 0 ? (
                <p className={styles.empty} role="status">
                  Loading tasks…
                </p>
              ) : filtered.length === 0 ? (
                <div className={styles.emptyState} role="status">
                  <IconClipboard size={22} />
                  <p>
                    {filter === "done"
                      ? "No completed tasks yet."
                      : filter === "progress"
                        ? "Nothing in progress. Start a pending task when you're on site."
                        : "You're all caught up. New assignments will appear here."}
                  </p>
                </div>
              ) : (
                <ul className={styles.taskList}>
                  {filtered.map((task) => (
                    <li key={task.id} className={styles.taskRow}>
                      <span
                        className={`${styles.taskIcon} ${
                          task.priority === "high"
                            ? styles.toneHigh
                            : task.priority === "medium"
                              ? styles.toneMed
                              : styles.toneLow
                        }`}
                        aria-hidden="true"
                      >
                        {task.icon === "snow" ? (
                          <IconSnowflake size={18} />
                        ) : task.icon === "shield" ? (
                          <IconShield size={18} />
                        ) : (
                          <IconWrench size={18} />
                        )}
                      </span>
                      <div className={styles.taskBody}>
                        <div className={styles.taskTitleRow}>
                          <h3>
                            {task.title} <span className={styles.taskId}>#{task.id}</span>
                          </h3>
                          <span
                            className={`${styles.priority} ${
                              task.priority === "high"
                                ? styles.priorityHigh
                                : task.priority === "medium"
                                  ? styles.priorityMed
                                  : styles.priorityLow
                            }`}
                          >
                            {task.priority === "high" ? "High" : task.priority === "medium" ? "Medium" : "Low"}
                          </span>
                          <span className={`${styles.statusPill} ${styles[`status_${task.status}`]}`}>
                            {task.status === "done" ? "Done" : task.status === "progress" ? "In progress" : "Pending"}
                          </span>
                        </div>
                        {task.description ? <p className={styles.taskDesc}>{task.description}</p> : null}
                        <div className={styles.taskMeta}>
                          <span>
                            <IconMapPin size={14} /> {task.location}
                          </span>
                          <span>
                            <IconClock size={14} /> {task.meta}
                          </span>
                        </div>
                      </div>
                      <div className={styles.taskActions}>
                        <button type="button" className={styles.btnGhost} onClick={() => setSelectedId(task.id)}>
                          Details
                        </button>
                        {task.status === "done" ? null : (
                          <button
                            type="button"
                            className={styles.btnPrimary}
                            disabled={busyTaskId === task.id}
                            onClick={() => (task.status === "pending" ? startTask(task.id) : completeTask(task.id))}
                          >
                            {busyTaskId === task.id ? "Saving…" : task.status === "pending" ? "Start" : "Complete"}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}

          <Panel
            title={isMaintenance ? "Recent Activity" : "Gate Activity"}
            tabs={
              isMaintenance
                ? [
                    { id: "all", label: "All", count: events.length },
                    { id: "task_assigned", label: "Assigned", count: eventCount("task_assigned") },
                    { id: "task_completed", label: "Completed", count: eventCount("task_completed") },
                  ]
                : [
                    { id: "all", label: "All", count: events.length },
                    { id: "gate_in", label: "Arrivals", count: eventCount("gate_in") },
                    { id: "gate_out", label: "Departures", count: eventCount("gate_out") },
                  ]
            }
            active={activityFilter}
            onChange={setActivityFilter}
            ariaLabel="Activity filters"
            action={
              canUseLogs ? (
                <Link href="/staff/logs" className={styles.panelLink}>
                  View all logs <IconArrowRight size={14} />
                </Link>
              ) : null
            }
          >
            {loading && !summary ? (
              <p className={styles.empty} role="status">
                Loading activity…
              </p>
            ) : visibleEvents.length === 0 ? (
              <div className={styles.emptyState} role="status">
                <IconClock size={22} />
                <p>{events.length === 0 ? "No recent activity yet." : "Nothing matches this filter."}</p>
              </div>
            ) : (
              <ul className={styles.activityList}>
                {visibleEvents.map((item, idx) => (
                  <li key={`${item.event_type}-${item.timestamp}-${idx}`}>
                    <span className={`${styles.activityIcon} ${styles[`event_${item.event_type}`] ?? ""}`} aria-hidden="true">
                      {item.event_type === "gate_in" ? (
                        <IconShield size={16} />
                      ) : item.event_type === "gate_out" ? (
                        <IconArrowRight size={16} />
                      ) : item.event_type === "task_completed" ? (
                        <IconShieldCheck size={16} />
                      ) : (
                        <IconWrench size={16} />
                      )}
                    </span>
                    <div className={styles.activityText}>
                      <p>{item.description}</p>
                      <time>{formatWhen(item.timestamp) ?? item.timestamp}</time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {selected ? (
        <TaskDetailsModal
          task={selected}
          onClose={() => setSelectedId(null)}
          onPrimaryAction={(id) => {
            const task = tasks.find((t) => t.id === id);
            if (!task || task.status === "done") return;
            if (task.status === "pending") startTask(id);
            else completeTask(id);
          }}
        />
      ) : null}
      {completing ? (
        <CompleteTaskModal
          taskTitle={completing.title}
          filedPriority={`${completing.priority[0].toUpperCase()}${completing.priority.slice(1)}`}
          busy={busyTaskId === completing.id}
          onClose={() => setCompletingId(null)}
          onConfirm={(assessment) => finishTask(completing.id, assessment)}
        />
      ) : null}
      {maintOpen ? (
        <MaintenanceModal
          onClose={() => setMaintOpen(false)}
          onDraftSaved={() => toast("Draft saved on this device.", "success")}
          onSubmit={submitMaintenanceLog}
        />
      ) : null}
      {successOpen ? (
        <SuccessModal
          unit={submittedUnit}
          onClose={() => setSuccessOpen(false)}
        />
      ) : null}
      {statView ? (
        <StatDetailModal
          title={statCopy[statView].title}
          subtitle={statCopy[statView].subtitle}
          rows={statRows}
          loading={statLoading}
          error={statError}
          emptyMessage={statCopy[statView].empty}
          rowActionLabel={statView === "visitors" ? "View log" : "Open task"}
          onRowSelect={(row) => {
            if (statView === "visitors") {
              // No per-visit page yet; the visitor register is the full view.
              router.push("/staff/logs");
              return;
            }
            // Tasks open their existing details modal on this page.
            setStatView(null);
            setSelectedId(Number(row.id));
          }}
          onRetry={() => openStat(statView)}
          onClose={() => {
            setStatView(null);
            setStatError(null);
          }}
        />
      ) : null}
    </>
  );
}
