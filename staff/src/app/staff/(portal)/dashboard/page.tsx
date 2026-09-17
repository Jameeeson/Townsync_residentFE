"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  MaintenanceModal,
  type MaintenancePayload,
} from "@/components/MaintenanceModal";
import { SuccessModal } from "@/components/SuccessModal";
import { TaskDetailsModal, type TaskDetails } from "@/components/TaskDetailsModal";
import { useToast } from "@/components/Toast";
import {
  IconClipboard,
  IconClock,
  IconDoc,
  IconMapPin,
  IconPlus,
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
  getDashboardSummary,
  listTasks,
  updateTaskProgress,
  type MaintenanceTask,
  type StaffDashboard,
} from "@/lib/services/staff";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import styles from "./dashboard.module.css";

type Filter = "all" | "pending" | "progress" | "done";
type TaskStatus = "pending" | "progress" | "done";

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
  const { session } = useStaffSession();
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

  const [reloadTick, setReloadTick] = useState(0);
  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

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

  const selected: TaskDetails | null =
    tasks.find((t) => t.id === selectedId) ?? null;

  async function completeTask(id: number) {
    setBusyTaskId(id);
    try {
      await updateTaskProgress(id, "Completed", "Work completed on-site.");
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "done", meta: "Completed just now" } : t)),
      );
      setSelectedId(null);
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
              {error
                ? "We couldn't reach the dashboard service."
                : "Your townhouse community is secure and active today."}
            </p>
          </div>
          <div className={styles.stats}>
            <article className={styles.stat}>
              <IconClipboard size={20} className={styles.statIcon} />
              <span>Active Tasks</span>
              <strong>{loading ? "…" : `${pendingCount} open`}</strong>
            </article>
            <article className={`${styles.stat} ${styles.statGreen}`}>
              <IconUsers size={20} className={styles.statIcon} />
              <span>Visitors</span>
              <strong>{loading ? "…" : `${visitorCount} expected`}</strong>
            </article>
            <article className={styles.statWide}>
              <div>
                <span>Shift Overview</span>
                <strong>Assigned Tasks</strong>
              </div>
              <em>{tasks.length}</em>
            </article>
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
              <Link href="/staff/scanner" className={styles.actionPrimary}>
                <IconScan size={20} /> Gate Scanner
              </Link>
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

        <button
          type="button"
          className={styles.fab}
          aria-label="New maintenance log"
          onClick={() => setMaintOpen(true)}
        >
          <IconPlus size={24} />
        </button>
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
    </>
  );
}
