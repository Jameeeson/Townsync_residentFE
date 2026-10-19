/** How long a dispatched job should take, by priority. The numbers are edited by administrators (Deadline targets). */
export const POLICY_PRIORITIES = ["Emergency", "High", "Medium", "Low"] as const;
export type PolicyPriority = (typeof POLICY_PRIORITIES)[number];
export type DeadlineTier = { default_hours: number; max_hours: number };
export type DeadlinePolicy = Record<PolicyPriority, DeadlineTier>;

/** Used until the saved policy loads, or when it cannot be loaded, so the dispatch form still pre-fills. */
export const FALLBACK_POLICY: DeadlinePolicy = {
  Emergency: { default_hours: 4, max_hours: 4 },
  High: { default_hours: 24, max_hours: 48 },
  Medium: { default_hours: 72, max_hours: 120 },
  Low: { default_hours: 168, max_hours: 168 },
};

/** True when `value` has the four priorities with usable hours; anything else (an error body, an old server) is ignored. */
export function isDeadlinePolicy(value: unknown): value is DeadlinePolicy {
  if (!value || typeof value !== "object") return false;
  return POLICY_PRIORITIES.every((name) => {
    const tier = (value as Record<string, DeadlineTier | undefined>)[name];
    return Boolean(tier) && Number(tier?.default_hours) > 0 && Number(tier?.max_hours) >= Number(tier?.default_hours);
  });
}

export function policyKey(priority: string): PolicyPriority {
  const v = priority.toLowerCase();
  if (v.includes("emergency")) return "Emergency";
  if (v.includes("high")) return "High";
  if (v.includes("medium")) return "Medium";
  return "Low";
}

/** 4 -> "4 hours", 24 -> "1 day", 36 -> "36 hours", 168 -> "7 days". */
export function describeHours(hours: number): string {
  if (hours > 0 && hours % 24 === 0) {
    const days = hours / 24;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The date and time (in the admin's local time) that is `hours` from now, as the form fields expect them. */
export function deadlineIn(hours: number, from: Date = new Date()): { date: string; time: string } {
  const d = new Date(from.getTime() + hours * 3_600_000);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** True when the chosen deadline is later than `maxHours` from now (a few minutes of slack, as the server allows). */
export function isPastLimit(date: string, time: string, maxHours: number, from: Date = new Date()): boolean {
  if (!date || !time) return false;
  const chosen = new Date(`${date}T${time}`);
  if (Number.isNaN(chosen.getTime())) return false;
  return chosen.getTime() > from.getTime() + maxHours * 3_600_000 + 5 * 60_000;
}
