"use client";

import { useCallback, useRef, useState } from "react";
import {
  IconChatBubble,
  IconClock,
  IconMapPin,
  IconShield,
  IconSnowflake,
  IconWrench,
  IconX,
} from "@/components/icons";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { ChatModal } from "./ChatModal";
import { TaskPhotos } from "./TaskPhotos";
import { TaskHistory } from "./TaskHistory";
import styles from "./TaskDetailsModal.module.css";

export type TaskDetails = {
  id: number;
  title: string;
  priority: "high" | "medium" | "low";
  priorityText?: string;
  location: string;
  meta: string;
  icon: "wrench" | "snow" | "shield";
  status: "pending" | "progress" | "done";
  description?: string;
  imageUrls?: string[];
  residentReport?: string | null;
  /** Resolved (waiting for the resident) or Closed once the work report is in. */
  stage?: string | null;
};

type Props = {
  task: TaskDetails;
  onClose: () => void;
  onPrimaryAction: (id: number) => void;
};

const PRIORITY_LABEL = {
  high: "High Priority",
  medium: "Medium Priority",
  low: "Low Priority",
} as const;

const STATUS_LABEL = {
  pending: "Pending",
  progress: "In Progress",
  done: "Resolved",
} as const;

export function TaskDetailsModal({ task, onClose, onPrimaryAction }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => onClose(), [onClose]);
  useDialogA11y(true, handleClose, modalRef);
  const [chatOpen, setChatOpen] = useState(false);

  const Icon =
    task.icon === "wrench"
      ? IconWrench
      : task.icon === "snow"
        ? IconSnowflake
        : IconShield;

  return (
    <div className={styles.overlay} role="presentation" onClick={handleClose}>
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-details-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <span
              className={`${styles.priority} ${
                task.priority === "high"
                  ? styles.priorityHigh
                  : task.priority === "medium"
                    ? styles.priorityMed
                    : styles.priorityLow
              }`}
            >
              {task.priorityText ? `${task.priorityText} priority` : PRIORITY_LABEL[task.priority]}
            </span>
            <h2 id="task-details-title">{task.title}</h2>
            <p className={styles.subtitle}>Task details and next action</p>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={handleClose}
            aria-label="Close"
          >
            <IconX size={20} />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.heroIcon} aria-hidden>
            <Icon size={28} />
          </div>

          <dl className={styles.list}>
            <div>
              <dt>Location</dt>
              <dd>
                <IconMapPin size={16} /> {task.location}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{task.status === "done" ? (task.stage ?? "Resolved") : STATUS_LABEL[task.status]}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{task.priorityText ? `${task.priorityText} priority` : PRIORITY_LABEL[task.priority]}</dd>
            </div>
            <div>
              <dt>Timing</dt>
              <dd>
                <IconClock size={16} /> {task.meta}
              </dd>
            </div>
          </dl>

          {task.description ? (
            <section className={styles.section}>
              <h3>Resident&apos;s description</h3>
              <p className={styles.description}>{task.description}</p>
            </section>
          ) : null}

          {task.residentReport ? (
            <section className={styles.section}>
              <h3>Resident&apos;s own words</h3>
              <p className={styles.description} style={{ fontStyle: "italic" }}>
                &ldquo;{task.residentReport}&rdquo;
              </p>
            </section>
          ) : null}

          <TaskPhotos paths={task.imageUrls ?? []} />
          <TaskHistory taskId={task.id} />
        </div>

        <div className={styles.actions}>
          {task.status !== "done" ? (
            <button
              type="button"
              className={styles.primary}
              onClick={() => onPrimaryAction(task.id)}
            >
              {task.status === "pending" ? "Start Task" : "Submit work report"}
            </button>
          ) : (
            <button type="button" className={styles.primary} disabled>
              {task.stage === "Closed" ? "Closed by the resident" : "Report sent · waiting for the resident"}
            </button>
          )}
          <button type="button" className={styles.secondary} onClick={() => setChatOpen(true)}>
            <IconChatBubble size={18} /> Message Resident
          </button>
          <button type="button" className={styles.secondary} onClick={handleClose}>
            Close
          </button>
        </div>
      </div>

      {chatOpen ? <ChatModal ticketId={task.id} onClose={() => setChatOpen(false)} /> : null}
    </div>
  );
}
