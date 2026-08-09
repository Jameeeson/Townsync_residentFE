"use client";

import { FormEvent, useCallback, useRef, useState } from "react";
import {
  IconBolt,
  IconCategory,
  IconDoc,
  IconExclaim,
  IconMapPin,
  IconSearch,
  IconSend,
  IconShield,
  IconSnowflake,
  IconTree,
  IconWrench,
  IconX,
} from "@/components/icons";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import styles from "./MaintenanceModal.module.css";

const CATEGORIES = [
  { id: "plumbing", label: "Plumbing", icon: IconWrench },
  { id: "electrical", label: "Electrical", icon: IconBolt },
  { id: "hvac", label: "HVAC", icon: IconSnowflake },
  { id: "landscaping", label: "Landscaping", icon: IconTree },
  { id: "security", label: "Security", icon: IconShield },
] as const;

const PRIORITIES = [
  { id: "low", label: "Low Priority" },
  { id: "medium", label: "Medium Priority" },
  { id: "high", label: "High Priority" },
] as const;

const DRAFT_KEY = "townsync.staff.maintenanceDraft";

export type MaintenancePayload = {
  unit: string;
  category: string;
  priority: string;
  description: string;
};

type Props = {
  onClose: () => void;
  onSubmit: (payload: MaintenancePayload) => void;
  onDraftSaved?: () => void;
};

function readDraft(): MaintenancePayload {
  const fallback: MaintenancePayload = {
    unit: "212",
    category: "plumbing",
    priority: "medium",
    description: "",
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return fallback;
    const draft = JSON.parse(raw) as Partial<MaintenancePayload>;
    return {
      unit: draft.unit?.trim() || fallback.unit,
      category: draft.category || fallback.category,
      priority: draft.priority || fallback.priority,
      description: draft.description ?? fallback.description,
    };
  } catch {
    return fallback;
  }
}

/** Mount only while open so draft state rehydrates cleanly. */
export function MaintenanceModal({ onClose, onSubmit, onDraftSaved }: Props) {
  const initial = readDraft();
  const [category, setCategory] = useState(initial.category);
  const [priority, setPriority] = useState(initial.priority);
  const [unit, setUnit] = useState(initial.unit);
  const [description, setDescription] = useState(initial.description);
  const [formError, setFormError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => onClose(), [onClose]);

  useDialogA11y(true, handleClose, modalRef);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedUnit = unit.trim();
    const trimmedDesc = description.trim();
    if (!trimmedUnit || !trimmedDesc) {
      setFormError("Unit and description are required.");
      return;
    }
    setFormError(null);
    window.localStorage.removeItem(DRAFT_KEY);
    onSubmit({
      unit: trimmedUnit,
      category,
      priority,
      description: trimmedDesc,
    });
  }

  function saveDraft() {
    const payload: MaintenancePayload = {
      unit: unit.trim() || "212",
      category,
      priority,
      description: description.trim(),
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    onDraftSaved?.();
    onClose();
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={handleClose}>
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="maint-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 id="maint-title">New Maintenance Log</h2>
            <p>Report an infrastructure or unit issue</p>
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

        <form className={styles.body} onSubmit={handleSubmit} noValidate>
          <section className={styles.section}>
            <div className={styles.sectionLabel}>
              <IconMapPin size={16} /> Unit / Location
            </div>
            <div className={styles.searchWrap}>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Search Unit (e.g. 402B) or Common Area"
                aria-required
                autoComplete="off"
              />
              <IconSearch size={18} />
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionLabel}>
              <IconCategory size={16} /> Issue Category
            </div>
            <div
              className={styles.categoryGrid}
              role="group"
              aria-label="Issue category"
            >
              {CATEGORIES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={category === id}
                  className={`${styles.chip} ${category === id ? styles.chipActive : ""}`}
                  onClick={() => setCategory(id)}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionLabel}>
              <IconExclaim size={16} /> Priority Level
            </div>
            <div
              className={styles.priorityRow}
              role="group"
              aria-label="Priority level"
            >
              {PRIORITIES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={priority === id}
                  className={`${styles.chip} ${priority === id ? styles.chipActive : ""} ${
                    priority === id && id === "high" ? styles.chipHigh : ""
                  }`}
                  onClick={() => setPriority(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionLabel}>
              <IconDoc size={16} /> Description
            </div>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide specific details about the issue, location access, and urgency…"
              aria-required
            />
          </section>

          {formError ? (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button type="submit" className={styles.primary}>
              Submit Log <IconSend size={16} />
            </button>
            <button type="button" className={styles.secondary} onClick={saveDraft}>
              Save as Draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
