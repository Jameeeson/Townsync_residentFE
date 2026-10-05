/** Work shifts arrive from the API as "HH:MM-HH:MM" in Philippine time (UTC+8). */

export function splitShift(value: string | null | undefined): [string, string] {
  const match = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(value ?? "");
  return match ? [match[1], match[2]] : ["", ""];
}

export function joinShift(start: string, end: string): string {
  return start && end ? `${start}-${end}` : "";
}

function minutes(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}

function label(clock: string): string {
  const [h, m] = clock.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "08:00-17:00" -> "8:00 AM – 5:00 PM"; null when no shift is set. */
export function shiftLabel(value: string | null | undefined): string | null {
  const [start, end] = splitShift(value);
  return start && end ? `${label(start)} – ${label(end)}` : null;
}

/** True/false against the Philippine clock; null when no shift is set. Handles overnight shifts. */
export function isOnShift(value: string | null | undefined, now: Date = new Date()): boolean | null {
  const [start, end] = splitShift(value);
  if (!start || !end) return null;
  const pht = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const current = pht.getUTCHours() * 60 + pht.getUTCMinutes();
  const from = minutes(start);
  const to = minutes(end);
  return from < to ? current >= from && current < to : current >= from || current < to;
}
