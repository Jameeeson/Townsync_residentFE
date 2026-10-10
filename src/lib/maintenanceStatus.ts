/** Shared status/priority → badge-tone mapping for every maintenance surface (history, ticket detail). */

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

export function statusTone(status: string): BadgeTone {
  switch (status) {
    case "Completed":
    case "Closed":
      return "success";
    case "Resolved":
      return "warning";
    case "Reopened":
      return "danger";
    case "Ongoing":
      return "info";
    case "Assigned":
      return "warning";
    case "Cancelled":
      return "neutral";
    case "Open":
    default:
      return "info";
  }
}

export function priorityTone(priority: string): BadgeTone {
  switch (priority) {
    case "Emergency":
      return "danger";
    case "High":
      return "warning";
    case "Medium":
      return "info";
    case "Low":
    default:
      return "neutral";
  }
}

export function badgeClassName(tone: BadgeTone): string {
  return `ts-badge ts-badge-${tone}`;
}
