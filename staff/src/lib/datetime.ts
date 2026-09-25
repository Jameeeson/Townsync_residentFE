/**
 * The API stores and returns timestamps as naive UTC strings
 * ("YYYY-MM-DD HH:MM:SS", what SQLite's datetime('now') produces).
 *
 * `new Date("2026-09-25 04:07:02")` parses that as *local* time, which is how a
 * login at 12:07 PM in Manila ended up displayed as 4:07 AM. Marking the value
 * as UTC before parsing lets the browser render it in the viewer's own clock —
 * Philippine time for this community, and correct anywhere else too.
 */
export function parseServerDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  // A bare calendar date ("2026-09-25") has no time and therefore no zone to
  // correct — appending Z would make it an invalid date string. Read it as
  // local midnight so it renders as the day it says.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const dateOnly = new Date(`${text}T00:00:00`);
    return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
  }
  // Values that already carry a zone (ISO with Z or an offset) need no help.
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(text);
  const normalized = hasZone ? text : `${text.replace(" ", "T")}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const DATE_TIME: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

/** Date and time in the viewer's timezone, or `fallback` when unparseable. */
export function formatServerDateTime(
  value: string | null | undefined,
  fallback = "—",
  options: Intl.DateTimeFormatOptions = DATE_TIME,
): string {
  const parsed = parseServerDate(value);
  return parsed ? parsed.toLocaleString(undefined, options) : fallback;
}

/** Time of day only, in the viewer's timezone. */
export function formatServerTime(
  value: string | null | undefined,
  fallback = "—",
): string {
  const parsed = parseServerDate(value);
  return parsed
    ? parsed.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : fallback;
}

/** Full date, time and year — for detail views where precision matters. */
export function formatServerFull(
  value: string | null | undefined,
  fallback = "—",
): string {
  return formatServerDateTime(value, fallback, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
