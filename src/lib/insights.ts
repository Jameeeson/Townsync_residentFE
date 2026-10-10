/** Types and small helpers for the report page (GET /api/v1/admin/insights/*). */

export type RangeKey = "7d" | "30d" | "90d" | "12m";

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "12m", label: "12 months" },
];

export type Bucket = "day" | "week" | "month";

export type Overview = {
  range: { from: string; to: string; days: number; bucket: Bucket };
  kpis: {
    filed: number;
    resolved: number;
    awaiting_confirmation: number;
    reopened_now: number;
    open_queue: number;
    in_progress: number;
    avg_resolution_hours: number | null;
    on_time_rate: number | null;
    reopen_rate: number | null;
    invoiced: number;
    collected: number;
    collection_rate: number | null;
  };
  stages_in_range: Record<string, number>;
  stages_now: Record<string, number>;
  trend: { bucket: string; filed: number; resolved: number }[];
  by_category: { label: string; count: number }[];
  by_priority: { label: string; count: number }[];
  technicians: {
    staff_id: number;
    name: string;
    specialization: string | null;
    active_tasks: number;
    resolved: number;
    avg_hours: number | null;
    reopened: number;
  }[];
  money: { bucket: string; invoiced: number; collected: number }[];
};

export type FeedItem = {
  at: string;
  kind: string;
  title: string;
  detail: string | null;
  ticket_id: number | null;
  href: string;
};

export type Feed = { items: FeedItem[]; next_before: string | null };

/** Ticket stages in the order the lifecycle runs, with the colour each one wears everywhere. */
export const STAGE_COLORS: Record<string, string> = {
  Open: "#64748b",
  Reopened: "#b91c1c",
  Assigned: "#1f4a9e",
  Ongoing: "#0e7490",
  Resolved: "#b45309",
  Closed: "#059669",
  Cancelled: "#94a3b8",
};

export const STAGE_ORDER = ["Open", "Reopened", "Assigned", "Ongoing", "Resolved", "Closed", "Cancelled"];

export const PRIORITY_COLORS: Record<string, string> = {
  Emergency: "#b91c1c",
  High: "#c2410c",
  Medium: "#b45309",
  Low: "#059669",
  Unrated: "#94a3b8",
};

/** "Oct 6" for day and week buckets, "Oct 2026" for month buckets. */
export function bucketLabel(value: string, bucket: Bucket): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return bucket === "month"
    ? date.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function hoursLabel(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return "—";
  if (hours < 1) return `${Math.max(Math.round(hours * 60), 1)} min`;
  if (hours < 48) return `${hours.toFixed(1).replace(/\.0$/, "")} h`;
  return `${(hours / 24).toFixed(1).replace(/\.0$/, "")} d`;
}

export function percentLabel(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value}%`;
}

export function pesos(value: number): string {
  return `PHP ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
