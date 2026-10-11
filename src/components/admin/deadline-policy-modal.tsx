"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";
import { apiPut } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { describeHours, POLICY_PRIORITIES, type DeadlinePolicy, type PolicyPriority } from "@/lib/deadlinePolicy";
import styles from "./deadline-policy-modal.module.css";

type Unit = "hours" | "days";
type Field = { value: string; unit: Unit };
type Draft = Record<PolicyPriority, { usual: Field; latest: Field }>;

function toField(hours: number): Field {
  return hours % 24 === 0 ? { value: String(hours / 24), unit: "days" } : { value: String(hours), unit: "hours" };
}

function toHours(field: Field): number | null {
  const n = Number(field.value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(field.unit === "days" ? n * 24 : n);
}

const HINTS: Record<PolicyPriority, string> = {
  Emergency: "Hazards and anything unsafe. Fix the same day.",
  High: "Serious problems that stop daily life.",
  Medium: "Needs a visit soon, but life goes on.",
  Low: "Cosmetic or minor, can wait.",
};

/**
 * Sets how long each priority should take once dispatched. "Usual time" is what the dispatch form pre-fills;
 * "Latest without a reason" is how far the deadline can be pushed before the dispatcher has to explain why.
 */
export default function DeadlinePolicyModal({
  policy,
  onClose,
  onSaved,
}: {
  policy: DeadlinePolicy;
  onClose: () => void;
  onSaved: (next: DeadlinePolicy) => void;
}) {
  const { toast, toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => {
    const start = {} as Draft;
    for (const name of POLICY_PRIORITIES) {
      start[name] = { usual: toField(policy[name].default_hours), latest: toField(policy[name].max_hours) };
    }
    return start;
  });

  const set = (name: PolicyPriority, which: "usual" | "latest", patch: Partial<Field>) =>
    setDraft((d) => ({ ...d, [name]: { ...d[name], [which]: { ...d[name][which], ...patch } } }));

  const save = async () => {
    const body = {} as DeadlinePolicy;
    for (const name of POLICY_PRIORITIES) {
      const usual = toHours(draft[name].usual);
      const latest = toHours(draft[name].latest);
      if (usual == null || latest == null) return setError(`${name}: enter a number greater than zero.`);
      if (usual > latest) return setError(`${name}: the usual time cannot be longer than the latest allowed time.`);
      body[name] = { default_hours: usual, max_hours: latest };
    }
    setError(null);
    setSaving(true);
    try {
      const saved = await apiPut<DeadlinePolicy>("/api/v1/admin/maintenance/deadline-policy", body);
      toast("Deadline targets saved. New dispatches use them straight away.", "success");
      onSaved(saved);
      onClose();
    } catch (err) {
      toastError(err, "Could not save the deadline targets.");
    } finally {
      setSaving(false);
    }
  };

  const unitSelect = (name: PolicyPriority, which: "usual" | "latest") => (
    <select
      value={draft[name][which].unit}
      onChange={(e) => set(name, which, { unit: e.target.value as Unit })}
      aria-label={`${name} ${which} unit`}
    >
      <option value="hours">hours</option>
      <option value="days">days</option>
    </select>
  );

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Deadline targets" onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div>
            <h2>
              <Clock size={18} /> Deadline targets
            </h2>
            <p>How long a job should take once dispatched, counted from the moment it is assigned.</p>
          </div>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className={styles.rows}>
          <div className={`${styles.row} ${styles.headRow}`} aria-hidden="true">
            <span>Priority</span>
            <span>Usual time</span>
            <span>Latest without a reason</span>
          </div>
          {POLICY_PRIORITIES.map((name) => (
            <div key={name} className={styles.row}>
              <div className={styles.name}>
                <strong>{name}</strong>
                <small>{HINTS[name]}</small>
              </div>
              <label className={styles.field}>
                <span className={styles.mobileLabel}>Usual time</span>
                <div>
                  <input
                    value={draft[name].usual.value}
                    onChange={(e) => set(name, "usual", { value: e.target.value })}
                    inputMode="decimal"
                    aria-label={`${name} usual time`}
                  />
                  {unitSelect(name, "usual")}
                </div>
              </label>
              <label className={styles.field}>
                <span className={styles.mobileLabel}>Latest without a reason</span>
                <div>
                  <input
                    value={draft[name].latest.value}
                    onChange={(e) => set(name, "latest", { value: e.target.value })}
                    inputMode="decimal"
                    aria-label={`${name} latest time`}
                  />
                  {unitSelect(name, "latest")}
                </div>
              </label>
            </div>
          ))}
        </div>

        <p className={styles.note}>
          The dispatch form fills in the usual time. A later deadline is allowed, but the dispatcher must give a short reason, which is kept in
          the ticket history for administrators. Currently:{" "}
          {POLICY_PRIORITIES.map((n) => `${n} ${describeHours(policy[n].default_hours)}`).join(" · ")}.
        </p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <footer className={styles.footer}>
          <button type="button" className={styles.ghost} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className={styles.primary} onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save targets"}
          </button>
        </footer>
      </div>
    </div>
  );
}
