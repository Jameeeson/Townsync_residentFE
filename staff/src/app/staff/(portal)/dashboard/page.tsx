"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MaintenanceModal,
  type MaintenancePayload,
} from "@/components/MaintenanceModal";
import { SuccessModal } from "@/components/SuccessModal";
import { TaskDetailsModal } from "@/components/TaskDetailsModal";
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
import { STAFF_PROFILE } from "@/lib/staff-profile";
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

const INITIAL_TASKS: Task[] = [
  {
    id: 1,
    title: "Burst Pipe Repair",
    priority: "high",
    location: "Block A, Unit 402",
    meta: "Due: 2h ago",
    icon: "wrench",
    status: "pending",
  },
  {
    id: 2,
    title: "HVAC Filter Check",
    priority: "medium",
    location: "Lobby, Central",
    meta: "Started: 10m",
    icon: "snow",
    status: "progress",
  },
  {
    id: 3,
    title: "Lobby Camera Reset",
    priority: "low",
    location: "Gate B, Lobby",
    meta: "Due: Today 4 PM",
    icon: "shield",
    status: "pending",
  },
];

const ACTIVITY = [
  {
    title: "Visitor 'Marcus Lee' checked in",
    meta: "Gate A · 10:45 AM",
    tone: "blue" as const,
    icon: "shield" as const,
  },
  {
    title: "Water leak log updated",
    meta: "Unit 4B · 9:12 AM",
    tone: "green" as const,
    icon: "wrench" as const,
  },
  {
    title: "Security perimeter check complete",
    meta: `Officer ${STAFF_PROFILE.firstName} · 8:30 AM`,
    tone: "blue" as const,
    icon: "check" as const,
  },
];

export default function StaffDashboardPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [maintOpen, setMaintOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [submittedUnit, setSubmittedUnit] = useState("212");

  const pendingCount = tasks.filter((t) => t.status !== "done").length;

  const filtered = tasks.filter((t) => {
    if (filter === "all") return t.status !== "done";
    if (filter === "pending") return t.status === "pending";
    if (filter === "progress") return t.status === "progress";
    return t.status === "done";
  });

  const selected = tasks.find((t) => t.id === selectedId) ?? null;

  function completeTask(id: number) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: "done", meta: "Completed just now" } : t,
      ),
    );
    setSelectedId(null);
    toast("Task marked complete.", "success");
  }

  function startTask(id: number) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id && t.status === "pending"
          ? { ...t, status: "progress", meta: "Started: just now" }
          : t,
      ),
    );
    setSelectedId(null);
    toast("Task moved to In Progress.", "info");
  }
  return (
    <>
      <div className={styles.page}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>Staff Tasks · {STAFF_PROFILE.block}</p>
            <h1>Welcome back, {STAFF_PROFILE.firstName}</h1>
            <p className={styles.lede}>
              Your townhouse community is secure and active today.
            </p>
          </div>
          <div className={styles.stats}>
            <article className={styles.stat}>
              <IconClipboard size={20} className={styles.statIcon} />
              <span>Active Tasks</span>
              <strong>{pendingCount} open</strong>
            </article>
            <article className={`${styles.stat} ${styles.statGreen}`}>
              <IconUsers size={20} className={styles.statIcon} />
              <span>Visitors</span>
              <strong>12 expected</strong>
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
              <p className={styles.manageHint}>
                Manage your operational duties for {STAFF_PROFILE.block}.
              </p>
            </div>

            {filtered.length === 0 ? (
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
                          onClick={() =>
                            task.status === "pending"
                              ? startTask(task.id)
                              : completeTask(task.id)
                          }
                        >
                          {task.status === "pending" ? "Start" : "Complete"}
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
              <ul className={styles.activityList}>
                {ACTIVITY.map((item) => (
                  <li key={item.title}>
                    <span
                      className={`${styles.activityIcon} ${
                        item.tone === "green" ? styles.iconGreen : styles.iconBlue
                      }`}
                    >
                      {item.icon === "wrench" ? (
                        <IconWrench size={16} />
                      ) : item.icon === "check" ? (
                        <IconShieldCheck size={16} />
                      ) : (
                        <IconShield size={16} />
                      )}
                    </span>
                    <div>
                      <p>{item.title}</p>
                      <span>{item.meta}</span>
                    </div>
                  </li>
                ))}
              </ul>
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
          onSubmit={(payload: MaintenancePayload) => {
            setSubmittedUnit(payload.unit);
            setMaintOpen(false);
            setSuccessOpen(true);
          }}
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
