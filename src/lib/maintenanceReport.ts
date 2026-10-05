import type { AiSummaryState } from "@/lib/api/resident";

export interface ReportFieldDef {
  key: "category" | "location" | "description" | "urgency";
  label: string;
  value: string | null;
  collected: boolean;
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => (word.length > 3 ? word[0].toUpperCase() + word.slice(1) : word.toUpperCase()))
    .join(" ");
}

const PLACEHOLDERS = new Set(["", "pending", "n/a", "none", "unknown", "unspecified location"]);

/** A value the resident actually gave, not the backend's "Pending" placeholder. */
function isReal(value: string | null | undefined): value is string {
  return Boolean(value) && !PLACEHOLDERS.has((value as string).trim().toLowerCase());
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
  const location = isReal(summary?.location) ? summary.location : null;
  // "Hi" is not a description: it takes at least a couple of words to say what is wrong.
  const description =
    isReal(summary?.gathered_detail) && summary.gathered_detail.trim().split(/\s+/).length >= 2
      ? summary.gathered_detail
      : null;
  // The backend labels a greeting "Other"; a category only counts once something real was said.
  const category =
    isReal(summary?.category) && (description || summary.category.toLowerCase() !== "other")
      ? titleCase(summary.category)
      : null;
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

export function isUrgentSignal(fields: ReportFieldDef[]): boolean {
  const urgency = fields.find((f) => f.key === "urgency");
  if (!urgency?.collected || !urgency.value) return false;
  return /urgent|emergency|high/i.test(urgency.value);
}

export function reportCompletionCount(fields: ReportFieldDef[]): { done: number; total: number } {
  return { done: fields.filter((f) => f.collected).length, total: fields.length };
}
