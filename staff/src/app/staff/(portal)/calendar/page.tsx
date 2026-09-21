"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TaskDetailsModal, type TaskDetails } from "@/components/TaskDetailsModal";
import { useToast } from "@/components/Toast";
import { IconChevron, IconClipboard } from "@/components/icons";
import { ApiError } from "@/lib/api-client";
import { listTasks, updateTaskProgress, type MaintenanceTask } from "@/lib/services/staff";
import styles from "./calendar.module.css";

type UiStatus = "pending" | "progress" | "done";

type CalTask = {
  id: number;
  title: string;
  priority: "high" | "medium" | "low";
  location: string;
  meta: string;
  icon: "wrench" | "snow" | "shield";
  status: UiStatus;
  deadline: string | null;
};

function toUiStatus(status: MaintenanceTask["status"]): UiStatus {
  if (status === "Completed") return "done";
  if (status === "Ongoing") return "progress";
  return "pending";
}

function toUiPriority(priority: MaintenanceTask["priority_level"]): CalTask["priority"] {
  if (priority === "High" || priority === "Emergency") return "high";
  if (priority === "Medium") return "medium";
  return "low";
}

function iconForCategory(category: string): CalTask["icon"] {
  const c = category.toLowerCase();
  if (c.includes("hvac") || c.includes("snow") || c.includes("cool")) return "snow";
  if (c.includes("security") || c.includes("gate") || c.includes("camera")) return "shield";
  return "wrench";
}

function toCalTask(t: MaintenanceTask): CalTask {
  return {
    id: t.request_id,
    title: t.category,
    priority: toUiPriority(t.priority_level),
    location: t.unit_number ?? "Common Area",
    meta: t.resident_name ? `Resident: ${t.resident_name}` : t.description,
    icon: iconForCategory(t.category),
    status: toUiStatus(t.status),
    deadline: t.deadline,
  };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function StaffCalendarPage() {
  const { toast } = useToast();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [tasks, setTasks] = useState<CalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const raw = await listTasks();
        if (!cancelled) setTasks(raw.map(toCalTask));
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 403) {
            setError("Task calendar is available to Maintenance Staff accounts.");
          } else {
            setError(e instanceof ApiError ? e.message : "Could not load your tasks.");
          }
          setTasks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, CalTask[]>();
    for (const t of tasks) {
      if (!t.deadline || t.status === "done") continue;
      const d = new Date(t.deadline.replace(" ", "T"));
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));
    }
    return map;
  }, [tasks]);

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

  const unscheduled = tasks.filter((t) => !t.deadline && t.status !== "done");
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selected: TaskDetails | null = tasks.find((t) => t.id === selectedId) ?? null;

  async function completeTask(id: number) {
    setBusyTaskId(id);
    try {
      await updateTaskProgress(id, "Completed", "Work completed on-site.");
      setSelectedId(null);
      toast("Task marked complete.", "success");
      reload();
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
      setSelectedId(null);
      toast("Task moved to In Progress.", "info");
      reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not update the task.", "danger");
    } finally {
      setBusyTaskId(null);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>Schedule</p>
        <h1>Maintenance Calendar</h1>
        <p className={styles.lede}>Your assigned jobs, plotted by deadline.</p>
      </section>

      {error ? (
        <p className={styles.empty} role="status">
          {error}
        </p>
      ) : (
        <>
          <section className={styles.card}>
            <div className={styles.monthNav}>
              <button
                type="button"
                className={styles.navBtn}
                aria-label="Previous month"
                onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
              >
                <IconChevron size={16} style={{ transform: "rotate(180deg)" }} />
              </button>
              <h2>{monthLabel}</h2>
              <button
                type="button"
                className={styles.navBtn}
                aria-label="Next month"
                onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
              >
                <IconChevron size={16} />
              </button>
              <button
                type="button"
                className={styles.todayBtn}
                onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
              >
                Today
              </button>
            </div>

            <div className={styles.grid}>
              {WEEKDAYS.map((d) => (
                <div key={d} className={styles.weekday}>
                  {d}
                </div>
              ))}
              {cells.map(({ date, inMonth }) => {
                const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                const dayTasks = tasksByDay.get(key) ?? [];
                const visible = dayTasks.slice(0, 3);
                const overflow = dayTasks.length - visible.length;
                return (
                  <div
                    key={key}
                    className={`${styles.cell} ${inMonth ? "" : styles.cellOutside} ${
                      isSameDay(date, today) ? styles.cellToday : ""
                    }`}
                  >
                    <span className={styles.dayNum}>{date.getDate()}</span>
                    {loading
                      ? null
                      : visible.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className={`${styles.chip} ${
                              t.priority === "high"
                                ? styles.chipHigh
                                : t.priority === "medium"
                                  ? styles.chipMedium
                                  : styles.chipLow
                            }`}
                            title={`${t.title} — ${t.location}`}
                            onClick={() => setSelectedId(t.id)}
                          >
                            {t.title}
                          </button>
                        ))}
                    {overflow > 0 ? <span className={styles.chipMore}>+{overflow} more</span> : null}
                  </div>
                );
              })}
            </div>

            <div className={styles.legend}>
              <span className={styles.legendHigh}>High priority</span>
              <span className={styles.legendMedium}>Medium priority</span>
              <span className={styles.legendLow}>Low priority</span>
            </div>
          </section>

          {unscheduled.length > 0 ? (
            <section className={styles.card}>
              <div className={styles.unscheduledHead}>
                <IconClipboard size={18} />
                <h2>No deadline set ({unscheduled.length})</h2>
              </div>
              <ul className={styles.unscheduledList}>
                {unscheduled.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => setSelectedId(t.id)}>
                      <strong>{t.title}</strong>
                      <span>{t.location}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      {selected ? (
        <TaskDetailsModal
          task={selected}
          onClose={() => setSelectedId(null)}
          onPrimaryAction={(id) => {
            const task = tasks.find((t) => t.id === id);
            if (!task || task.status === "done" || busyTaskId) return;
            if (task.status === "pending") startTask(id);
            else completeTask(id);
          }}
        />
      ) : null}
    </div>
  );
}
