import { api } from "../api-client";

// ----- Dashboard -----

export type DashboardEvent = {
  event_type: string;
  description: string;
  timestamp: string;
};

export type StaffDashboard = {
  welcome_message: string;
  staff_type: string;
  pending_tasks_count: number;
  expected_visitors_count: number;
  recent_events: DashboardEvent[];
};

export function getDashboardSummary() {
  return api.get<StaffDashboard>("/api/v1/staff/dashboard/summary");
}

/** Rows behind the "Active Tasks" tile — mirrors `pending_tasks_count` exactly. */
export type ActiveTaskItem = {
  request_id: number;
  category: string;
  description: string | null;
  priority_level: string | null;
  status: string;
  unit_number: string | null;
  resident_name: string | null;
  assigned_at: string | null;
  deadline: string | null;
};

export function getActiveTaskBreakdown() {
  return api.get<ActiveTaskItem[]>("/api/v1/staff/dashboard/active-tasks");
}

/** Rows behind the "Visitors" tile — mirrors `expected_visitors_count` exactly. */
export type ExpectedVisitorItem = {
  request_id: number;
  visitor_name: string;
  status: string;
  scheduled_at: string | null;
  unit_number: string | null;
  resident_name: string | null;
  purpose: string | null;
  vehicle_plate: string | null;
  companions: string[];
  party_size: number;
  checked_in: boolean;
};

export function getExpectedVisitorBreakdown() {
  return api.get<ExpectedVisitorItem[]>("/api/v1/staff/dashboard/expected-visitors");
}

// ----- Tasks (Maintenance staff only) -----

export type TaskStatus = "Open" | "Assigned" | "Ongoing" | "Completed" | "Cancelled";
export type PriorityLevel = "Low" | "Medium" | "High" | "Emergency";

export type MaintenanceTask = {
  request_id: number;
  category: string;
  description: string;
  priority_level: PriorityLevel;
  status: TaskStatus;
  unit_number: string | null;
  resident_name: string | null;
  initial_image_url: string | null;
  assigned_at: string | null;
  deadline: string | null;
};

export function listTasks(statusFilter?: TaskStatus) {
  const qs = statusFilter ? `?status_filter=${encodeURIComponent(statusFilter)}` : "";
  return api.get<MaintenanceTask[]>(`/api/v1/staff/tasks/${qs}`);
}

export function getTask(taskId: number) {
  return api.get<MaintenanceTask>(`/api/v1/staff/tasks/${taskId}`);
}

export function updateTaskProgress(
  taskId: number,
  status: "Ongoing" | "Completed",
  workDone: string,
) {
  const form = new FormData();
  form.set("status", status);
  form.set("work_done", workDone);
  return api.patchForm<{ message: string; status: string }>(
    `/api/v1/staff/tasks/${taskId}/progress`,
    form,
  );
}

export function createOnsiteLog(payload: {
  category: string;
  description: string;
  priority: "Low" | "Medium" | "High";
  photo?: File | null;
}) {
  const form = new FormData();
  form.set("category", payload.category);
  form.set("description", payload.description);
  form.set("priority", payload.priority);
  if (payload.photo) form.set("initial_photo", payload.photo);
  return api.postForm<{ status: string; request_id: number; deadline_assigned: string }>(
    "/api/v1/staff/tasks/",
    form,
  );
}

// ----- Ticket Chat (resident <-> assigned staff) -----

export type TicketChatMessage = {
  sender_user_id: number;
  sender_role: string;
  sender_name: string;
  content: string;
  timestamp: string;
};

export type TicketChatThread = {
  ticket_id: number;
  subject: string;
  status: string;
  resident_name: string;
  staff_name: string | null;
  staff_assigned: boolean;
  messages: TicketChatMessage[];
};

export function getTicketChat(ticketId: number) {
  return api.get<TicketChatThread>(`/api/v1/chat/${ticketId}`);
}

export function sendTicketChatMessage(ticketId: number, content: string) {
  return api.post<TicketChatThread>(`/api/v1/chat/${ticketId}`, { content });
}

// ----- Gate Scanner (Security staff only) -----

export type PassVerification = {
  pass_id: number;
  visitor_name: string;
  unit: string;
  status: string;
  companions?: string[];
  party_size?: number;
  /** The pass toggles: "exit" when the party is already inside. */
  next_action: "entry" | "exit";
  inside: boolean;
  inside_since: string | null;
  overstaying: boolean;
  max_stay_hours: number;
  visit_count: number;
};

export function verifyPass(qrPayload: string) {
  return api.post<PassVerification>("/api/v1/staff/scanner/verify-ticket", {
    qr_payload: qrPayload,
  });
}

export function confirmEntry(passId: number, entryPoint: string) {
  return api.post<{ status: string; message: string }>(
    "/api/v1/staff/scanner/confirm-entry",
    { pass_id: passId, entry_point: entryPoint },
  );
}

export function confirmExit(passId: number, exitPoint: string) {
  return api.post<{ status: string; message: string }>(
    "/api/v1/staff/scanner/confirm-exit",
    { pass_id: passId, exit_point: exitPoint },
  );
}

export type OpenVisit = {
  log_id: number;
  pass_id: number;
  visitor_name: string;
  unit: string;
  time_in: string;
  hours_inside: number;
  overstaying: boolean;
  party_size: number;
};

export type OpenVisits = {
  max_stay_hours: number;
  inside_count: number;
  overstay_count: number;
  visits: OpenVisit[];
};

/** Who is on site right now, and who is past the allowed stay. */
export function getOpenVisits() {
  return api.get<OpenVisits>("/api/v1/staff/scanner/open-visits");
}

/** Guard-desk override for a visitor who left without scanning out. */
export function closeVisitManually(logId: number, reason?: string) {
  return api.post<{ status: string; message: string }>(
    `/api/v1/staff/scanner/visits/${logId}/close`,
    { reason: reason ?? null },
  );
}

export function manualCheckin(payload: {
  visitor_name: string;
  id_type: string;
  document_number: string;
  verification_notes?: string;
}) {
  return api.post<{ message: string }>("/api/v1/staff/scanner/manual-entry", payload);
}

// ----- Operational Logs -----

export type VisitorLog = {
  id: number;
  visitor_name: string;
  status: string;
  timestamp: string;
  unit_destination: string;
  companions?: string[];
  party_size?: number;
};

export function getVisitorLogs(search?: string) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return api.get<VisitorLog[]>(`/api/v1/staff/logs/visitors${qs}`);
}

// ----- Settings -----

export type StaffProfile = {
  email: string;
  full_name: string | null;
  staff_type: string;
  employee_id: string;
  specialization: string | null;
  shift_id: string | null;
  profile_pic_url: string | null;
};

export function getStaffProfile() {
  return api.get<StaffProfile>("/api/v1/staff/settings/profile");
}

export function updateStaffPreferences(prefs: { push_notifications: boolean; email_reports: boolean }) {
  return api.put<{ message: string }>("/api/v1/staff/settings/preferences", prefs);
}

export function changeStaffPassword(oldPassword: string, newPassword: string) {
  return api.post<{ message: string }>("/api/v1/staff/settings/change-password", {
    old_password: oldPassword,
    new_password: newPassword,
  });
}
