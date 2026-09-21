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

export function verifyPass(qrPayload: string) {
  return api.post<{
    pass_id: number;
    visitor_name: string;
    unit: string;
    status: string;
    companions?: string[];
    party_size?: number;
  }>(
    "/api/v1/staff/scanner/verify-ticket",
    { qr_payload: qrPayload },
  );
}

export function confirmEntry(passId: number, entryPoint: string) {
  return api.post<{ status: string; message: string }>(
    "/api/v1/staff/scanner/confirm-entry",
    { pass_id: passId, entry_point: entryPoint },
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
