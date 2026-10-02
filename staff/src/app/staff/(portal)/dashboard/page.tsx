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
  };
}

export default function StaffDashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { session, canUseScanner, isMaintenance } = useStaffSession();
  const [filter, setFilter] = useState<Filter>("all");
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
  }, [reloadTick]);

  const pendingCount = summary?.pending_tasks_count ?? tasks.filter((t) => t.status !== "done").length;
  const visitorCount = summary?.expected_visitors_count ?? 0;

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
              Staff Tasks {session ? `· ${session.profile.staff_type}` : ""}
            </p>
            <h1>Welcome back{session ? `, ${session.firstName}` : ""}</h1>
            <p className={styles.lede}>
              {error ? (
                <>
                  We couldn&apos;t reach the dashboard service.{" "}
                  <button type="button" className={styles.retryLink} onClick={reload}>
                    Retry
                  </button>
                </>
              ) : (
                "Your townhouse community is secure and active today."
              )}
            </p>
          </div>
          <div className={`${styles.stats} ${isMaintenance ? styles.statsTwo : ""}`}>
            <button
              type="button"
              className={styles.stat}
              onClick={() => openStat("tasks")}
              aria-haspopup="dialog"
            >
              <IconClipboard size={20} className={styles.statIcon} />
              <span>Active Tasks</span>
              <strong>{loading ? "…" : `${pendingCount} open`}</strong>
              <small className={styles.statHint}>
                View breakdown <IconArrowRight size={12} />
              </small>
            </button>
            {/* Visitor traffic is a security-desk concern; Maintenance techs
                have no gate duties, so the tile is noise for them. */}
            {isMaintenance ? null : (
              <button
                type="button"
                className={`${styles.stat} ${styles.statGreen}`}
                onClick={() => openStat("visitors")}
                aria-haspopup="dialog"
              >
                <IconUsers size={20} className={styles.statIcon} />
                <span>Visitors</span>
                <strong>{loading ? "…" : `${visitorCount} expected`}</strong>
                <small className={styles.statHint}>
                  View breakdown <IconArrowRight size={12} />
                </small>
              </button>
            )}
            <button
              type="button"
              className={styles.statWide}
              onClick={() => openStat("assigned")}
              aria-haspopup="dialog"
            >
              <div>
                <span>Shift Overview</span>
                <strong>Assigned Tasks</strong>
                <small className={styles.statHint}>
                View breakdown <IconArrowRight size={12} />
              </small>
              </div>
              <em>{tasks.length}</em>
            </button>
          </div>
        </section>

        <div className={styles.grid}>
          <section className={styles.mainCol}>
            <div className={styles.toolbar}>
              <div className={styles.filters} role="group" aria-label="Task filters">
                {(
                  [
                    ["all", "All"],
                    ["pending", "Pending"],
                    ["progress", "In Progress"],
                    ["done", "Done"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={filter === id}
                    className={`${styles.filter} ${filter === id ? styles.filterActive : ""}`}
                    onClick={() => setFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className={styles.manageHint}>Manage your operational duties for today.</p>
            </div>

            {tasksError ? (
              <p className={styles.empty} role="status">
                {tasksError}
              </p>
            ) : filtered.length === 0 ? (
              <p className={styles.empty} role="status">
                No tasks in this view.
              </p>
            ) : (
              <div className={styles.taskGrid}>
                {filtered.map((task) => (
                  <article key={task.id} className={styles.taskCard}>
                    <div className={styles.taskTop}>
                      <span
                        className={`${styles.priority} ${
                          task.priority === "high"
                            ? styles.priorityHigh
                            : task.priority === "medium"
                              ? styles.priorityMed
                              : styles.priorityLow
                        }`}
                      >
                        {task.priority === "high"
                          ? "High Priority"
                          : task.priority === "medium"
                            ? "Medium Priority"
                            : "Low Priority"}
                      </span>
                      <span className={styles.taskGlyph}>
                        {task.icon === "wrench" ? (
                          <IconWrench size={18} />
                        ) : task.icon === "snow" ? (
                          <IconSnowflake size={18} />
                        ) : (
                          <IconShield size={18} />
                        )}
                      </span>
                    </div>
                    <h3>{task.title}</h3>
                    <div className={styles.taskMeta}>
                      <span>
                        <IconMapPin size={14} /> {task.location}
                      </span>
                      <span>
                        <IconClock size={14} /> {task.meta}
                      </span>
                    </div>
                    <div className={styles.taskActions}>
                      {task.status === "done" ? (
                        <button type="button" className={styles.btnPrimary} disabled>
                          Completed
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          disabled={busyTaskId === task.id}
                          onClick={() =>
                            task.status === "pending"
                              ? startTask(task.id)
                              : completeTask(task.id)
                          }
                        >
                          {busyTaskId === task.id
                            ? "Saving…"
                            : task.status === "pending"
                              ? "Start"
                              : "Complete"}
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={() => setSelectedId(task.id)}
                      >
                        Details
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <aside className={styles.sideCol}>
            <div className={styles.actions}>
              {canUseScanner ? (
                <Link href="/staff/scanner" className={styles.actionPrimary}>
                  <IconScan size={20} /> Gate Scanner
                </Link>
              ) : null}
              <button
                type="button"
                className={styles.actionSecondary}
                onClick={() => setMaintOpen(true)}
              >
                <IconDoc size={20} /> New Maintenance Log
              </button>
            </div>

            <section className={styles.activity}>
              <div className={styles.activityHead}>
                <h2>Recent Activity</h2>
                <Link href="/staff/logs">View All</Link>
              </div>
              {loading ? (
                <p className={styles.empty} role="status">
                  Loading activity…
                </p>
              ) : !summary || summary.recent_events.length === 0 ? (
                <p className={styles.empty} role="status">
                  No recent activity.
                </p>
              ) : (
                <ul className={styles.activityList}>
                  {summary.recent_events.map((item, idx) => (
                    <li key={`${item.timestamp}-${idx}`}>
                      <span
                        className={`${styles.activityIcon} ${
                          item.event_type === "Gate Entry" ? styles.iconBlue : styles.iconGreen
                        }`}
                      >
                        {item.event_type === "Gate Entry" ? (
                          <IconShield size={16} />
                        ) : item.event_type === "Unit Task" ? (
                          <IconWrench size={16} />
                        ) : (
                          <IconShieldCheck size={16} />
                        )}
                      </span>
                      <div>
                        <p>{item.description}</p>
                        <span>{item.timestamp}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
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
