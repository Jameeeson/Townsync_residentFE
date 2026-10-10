"use client";

import { FormEvent, useCallback, useRef, useState } from "react";
import { IconCheck, IconDoc, IconExclaim, IconX } from "@/components/icons";
import { PhotoPicker } from "@/components/PhotoPicker";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { AssessedPriority } from "@/lib/services/staff";
import styles from "./MaintenanceModal.module.css";

const OPTIONS: { id: AssessedPriority; hint: string }[] = [
  { id: "Low", hint: "Could have waited" },
  { id: "Medium", hint: "Needed fixing soon" },
  { id: "High", hint: "Needed same-day work" },
  { id: "Emergency", hint: "Danger to people or property" },
];

/** The technician's work report: what was done, photos of it, and their own priority call. */
export type CompletionAssessment = {
  priority: AssessedPriority;
  comment: string;
  workDone: string;
  photos: File[];
};

const MIN_WORK_CHARS = 10;

type Props = {
  taskTitle: string;
  filedPriority?: string | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (assessment: CompletionAssessment) => void;
};

/** Asked before a job can be completed: the technician's own priority call is
 * the heaviest vote in the ticket's priority verdict, which future triage learns from. */
export function CompleteTaskModal({ taskTitle, filedPriority, busy, onClose, onConfirm }: Props) {
  const [priority, setPriority] = useState<AssessedPriority | null>(null);
  const [comment, setComment] = useState("");
  const [workDone, setWorkDone] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => onClose(), [onClose]);
  useDialogA11y(true, handleClose, modalRef);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (workDone.trim().length < MIN_WORK_CHARS) {
      setFormError("Describe what you did, in at least a sentence. The administrator and the resident will read it.");
      return;
    }
    if (photos.length === 0) {
      setFormError("Add at least one photo of the finished work.");
      return;
    }
    if (!priority) {
      setFormError("Choose how urgent this job really was.");
      return;
    }
    setFormError(null);
    onConfirm({ priority, comment: comment.trim(), workDone: workDone.trim(), photos });
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={handleClose}>
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 id="complete-title">Submit work report</h2>
            <p>
              {taskTitle}
              {filedPriority ? ` · filed as ${filedPriority}` : ""}
            </p>
          </div>
          <button type="button" className={styles.close} onClick={handleClose} aria-label="Close">
            <IconX size={20} />
          </button>
        </header>

        <form className={styles.body} onSubmit={handleSubmit} noValidate>
          <section className={styles.section}>
            <label className={styles.sectionLabel} htmlFor="work-done">
              <IconDoc size={16} /> What did you do? (required)
            </label>
            <textarea
              id="work-done"
              rows={4}
              maxLength={2000}
              value={workDone}
              onChange={(e) => setWorkDone(e.target.value)}
              placeholder="e.g. Replaced the worn washer under the sink and tightened the fittings. No more leaking."
            />
          </section>

          <section className={styles.section}>
            <div className={styles.sectionLabel} id="work-photos-label">
              <IconCheck size={16} /> Photos of the finished work (required)
            </div>
            <PhotoPicker files={photos} onChange={setPhotos} onReject={setFormError} inputId="work-photos" />
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)" }}>
              The administrator and the resident see these in the ticket history.
            </p>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionLabel} id="assessed-label">
              <IconExclaim size={16} /> Now that it&apos;s fixed, how urgent was it really?
            </div>
            <div
              className={styles.priorityRow}
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}
              role="radiogroup"
              aria-labelledby="assessed-label"
            >
              {OPTIONS.map(({ id, hint }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={priority === id}
                  title={hint}
                  className={`${styles.chip} ${priority === id ? styles.chipActive : ""} ${
                    priority === id && (id === "High" || id === "Emergency") ? styles.chipHigh : ""
                  }`}
                  onClick={() => setPriority(id)}
                >
                  {id}
                </button>
              ))}
            </div>
            {priority ? (
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
                {OPTIONS.find((o) => o.id === priority)?.hint}
              </p>
            ) : null}
          </section>

          <section className={styles.section}>
            <label className={styles.sectionLabel} htmlFor="assessed-comment">
              <IconDoc size={16} /> Comment (optional)
            </label>
            <textarea
              id="assessed-comment"
              rows={3}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Hinge had snapped and the unit could not be locked"
            />
          </section>

          {formError ? (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={busy}>
              {busy ? "Sending…" : "Submit report"} <IconCheck size={16} />
            </button>
            <button type="button" className={styles.secondary} onClick={handleClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
