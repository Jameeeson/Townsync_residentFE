"use client";

import styles from "./shift-fields.module.css";

/** "08:00-17:00" -> ["08:00", "17:00"]; blank when unset. */
export function splitShift(value: string | null | undefined): [string, string] {
  const match = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(value ?? "");
  return match ? [match[1], match[2]] : ["", ""];
}

/** The API's shift string, or "" until both times are chosen. */
export function joinShift(start: string, end: string): string {
  return start && end ? `${start}-${end}` : "";
}

/** Start and end time of a work shift (Philippine time). Overnight shifts are fine. */
export default function ShiftFields({
  start,
  end,
  onChange,
  disabled = false,
  idPrefix = "shift",
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  disabled?: boolean;
  idPrefix?: string;
}) {
  const overnight = Boolean(start && end && end <= start);
  return (
    <div className={styles.wrap}>
      <div className={styles.pair}>
        <label className={styles.field} htmlFor={`${idPrefix}-start`}>
          <span>Shift starts</span>
          <input
            id={`${idPrefix}-start`}
            type="time"
            value={start}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value, end)}
          />
        </label>
        <label className={styles.field} htmlFor={`${idPrefix}-end`}>
          <span>Shift ends</span>
          <input
            id={`${idPrefix}-end`}
            type="time"
            value={end}
            disabled={disabled}
            onChange={(e) => onChange(start, e.target.value)}
          />
        </label>
      </div>
      <p className={styles.hint}>
        {overnight ? "Overnight shift: ends the next day. " : ""}Philippine time. Technicians outside their shift
        show as Off-Shift when dispatching.
      </p>
    </div>
  );
}

function clock(value: string): string {
  const [h, m] = value.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "08:00-17:00" -> "8:00 AM – 5:00 PM"; null when unset. */
export function shiftLabel(value: string | null | undefined): string | null {
  const [start, end] = splitShift(value);
  return start && end ? `${clock(start)} – ${clock(end)}` : null;
}
