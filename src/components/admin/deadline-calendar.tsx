"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./deadline-calendar.module.css";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function fromKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function label(key: string): string {
  const d = fromKey(key);
  return d ? d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Pick a date";
}

/**
 * A date picker for the dispatch deadline that shows what the priority allows: the suggested day, the days that fit
 * the priority's limit, and the later days that need a reason. Days before today cannot be chosen.
 */
export default function DeadlineCalendar({
  id,
  value,
  onChange,
  usualDate,
  latestDate,
  invalid = false,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  usualDate: string;
  latestDate: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => fromKey(value) ?? new Date());
  const root = useRef<HTMLDivElement>(null);
  const today = toKey(new Date());

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setOpen(false);
      } else if (root.current && !root.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out: (string | null)[] = Array.from({ length: first.getDay() }, () => null);
    for (let d = 1; d <= days; d++) out.push(toKey(new Date(month.getFullYear(), month.getMonth(), d)));
    return out;
  }, [month]);

  const step = (by: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + by, 1));

  const classFor = (key: string) => {
    const parts = [styles.day];
    if (key < today) parts.push(styles.past);
    else if (key > latestDate) parts.push(styles.late);
    else parts.push(styles.within);
    if (key === usualDate) parts.push(styles.usual);
    if (key === latestDate) parts.push(styles.latest);
    if (key === today) parts.push(styles.today);
    if (key === value) parts.push(styles.selected);
    return parts.join(" ");
  };

  return (
    <div className={styles.root} ref={root}>
      <button
        type="button"
        id={id}
        className={`${styles.field} ${invalid ? styles.invalid : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setMonth(fromKey(value) ?? new Date());
          setOpen((o) => !o);
        }}
      >
        <Calendar size={16} />
        <span>{value ? label(value) : "Pick a date"}</span>
      </button>

      {open ? (
        <div className={styles.popover} role="dialog" aria-label="Choose the deadline date">
          <div className={styles.nav}>
            <button type="button" onClick={() => step(-1)} aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
            <strong>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong>
            <button type="button" onClick={() => step(1)} aria-label="Next month">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className={styles.grid} role="grid">
            {WEEKDAYS.map((w) => (
              <span key={w} className={styles.weekday}>
                {w}
              </span>
            ))}
            {cells.map((key, i) =>
              key ? (
                <button
                  key={key}
                  type="button"
                  className={classFor(key)}
                  disabled={key < today}
                  aria-label={label(key)}
                  aria-pressed={key === value}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                >
                  {Number(key.slice(8))}
                </button>
              ) : (
                <span key={`blank-${i}`} />
              ),
            )}
          </div>
          <ul className={styles.legend}>
            <li>
              <i className={`${styles.swatch} ${styles.swUsual}`} /> Suggested ({label(usualDate)})
            </li>
            <li>
              <i className={`${styles.swatch} ${styles.swWithin}`} /> Within the limit
            </li>
            <li>
              <i className={`${styles.swatch} ${styles.swLate}`} /> Later than usual (needs a reason)
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
