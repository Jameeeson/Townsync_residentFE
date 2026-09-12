import type { AiSummaryState } from "@/lib/api/resident";

export interface ReportFieldDef {
  key: "category" | "location" | "description" | "urgency";
  label: string;
  value: string | null;
  collected: boolean;
}

export interface UnderstoodItem {
  key: string;
  label: string;
  value: string;
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => (word.length > 3 ? word[0].toUpperCase() + word.slice(1) : word.toUpperCase()))
    .join(" ");
}

/**
 * The backend defaults urgency_level (and confidence_score) to non-null placeholder values
 * before anything real has been gathered, so urgency only counts as "known" once another
 * real signal exists (or the report is already complete).
 */
export function deriveReportFields(
  summary: AiSummaryState | null,
  isComplete: boolean
): ReportFieldDef[] {
  const category = summary?.category ? titleCase(summary.category) : null;
  const location = summary?.location ?? null;
  const description = summary?.gathered_detail ?? null;
  const hasRealSignal = Boolean(category || location || description);
  const urgencyKnown = Boolean(summary?.urgency_level) && (hasRealSignal || isComplete);
  const urgency = urgencyKnown && summary?.urgency_level ? titleCase(summary.urgency_level) : null;

  return [
    { key: "category", label: "Issue", value: category, collected: Boolean(category) },
    { key: "location", label: "Location", value: location, collected: Boolean(location) },
    { key: "description", label: "Description", value: description, collected: Boolean(description) },
    { key: "urgency", label: "Urgency", value: urgency, collected: urgencyKnown },
  ];
}

/** Fields that just flipped from unknown to known between two snapshots — the "understood" reveal. */
export function diffNewlyCollected(
  prev: ReportFieldDef[] | null,
  next: ReportFieldDef[]
): UnderstoodItem[] {
  return next
    .filter((field) => field.collected && field.value)
    .filter((field) => {
      const before = prev?.find((f) => f.key === field.key);
      return !before?.collected;
    })
    .map((field) => ({ key: field.key, label: field.label, value: field.value as string }));
}

export function isUrgentSignal(fields: ReportFieldDef[]): boolean {
  const urgency = fields.find((f) => f.key === "urgency");
  if (!urgency?.collected || !urgency.value) return false;
  return /urgent|emergency|high/i.test(urgency.value);
}

export function reportCompletionCount(fields: ReportFieldDef[]): { done: number; total: number } {
  return { done: fields.filter((f) => f.collected).length, total: fields.length };
}
