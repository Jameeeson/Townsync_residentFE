export type MaintenancePriorityLevel = "low" | "medium" | "high" | "urgent";

export type MaintenanceCategory =
  | "plumbing"
  | "electrical"
  | "hvac"
  | "security"
  | "appliance"
  | "cleaning"
  | "structural"
  | "other";

export type MaintenanceStatus =
  | "submitted"
  | "triaged"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "closed";

export interface MaintenanceRequest {
  id: number;
  resident_id: number;
  assigned_to_id: number | null;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority_level: MaintenancePriorityLevel;
  ai_triage_summary: string | null;
  ai_confidence_score: number | null;
  status: MaintenanceStatus;
  attachment_urls: string[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}