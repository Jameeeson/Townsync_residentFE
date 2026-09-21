"use client";

import { Plus, X } from "lucide-react";
import styles from "./GuestListEditor.module.css";

export const MAX_COMPANIONS = 10;
export const MAX_COMPANION_NAME = 80;

/** Trims, collapses spaces and drops blanks/duplicates — mirrors the backend rules. */
export function cleanGuestNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.split(/\s+/).filter(Boolean).join(" ");
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export default function GuestListEditor({ value, onChange, disabled }: Props) {
  const atLimit = value.length >= MAX_COMPANIONS;

  function update(index: number, name: string) {
    onChange(value.map((current, i) => (i === index ? name : current)));
  }

  return (
    <div className={styles.wrap}>
      {value.length > 0 ? (
        <ul className={styles.list}>
          {value.map((name, index) => (
            <li key={index} className={styles.row}>
              <input
                value={name}
                onChange={(e) => update(index, e.target.value)}
                className={styles.input}
                placeholder={`Guest ${index + 1} full name`}
                maxLength={MAX_COMPANION_NAME}
                aria-label={`Guest ${index + 1} name`}
                disabled={disabled}
              />
              <button
                type="button"
                className={styles.remove}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                aria-label={`Remove guest ${index + 1}`}
                disabled={disabled}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        className={styles.add}
        onClick={() => onChange([...value, ""])}
        disabled={disabled || atLimit}
      >
        <Plus size={16} /> Add guest
      </button>
      <p className={styles.hint}>
        {atLimit
          ? `Limit reached (${MAX_COMPANIONS} additional guests).`
          : "Everyone listed here enters with this one QR code."}
      </p>
    </div>
  );
}
