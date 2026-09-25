import { apiClient } from "@/lib/apiClient";
import { getBackendUrl } from "@/lib/config";

/** Resolve relative upload paths against BACKEND_URL */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${getBackendUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

// --- Dashboard ---

export interface DashboardSummary {
  welcome_message: string;
  unit_number: string | null;
  outstanding_balance: number;
  recent_tickets: MaintenanceTicket[];
  latest_announcements: Announcement[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiClient.get<DashboardSummary>("/api/v1/resident/dashboard/summary");
}

// --- Maintenance ---

export interface MaintenanceTicket {
  id: number;
  subject: string;
  category: string;
  priority_level: string;
  detailed_description: string;
  status: string;
  created_at: string;
  activity_timeline?: unknown[];
  preferred_date?: string | null;
}


export async function listMaintenanceTickets(status?: string): Promise<MaintenanceTicket[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiClient.get<MaintenanceTicket[]>(`/api/v1/resident/maintenance/tickets${query}`);
}

export async function getMaintenanceTicket(ticketId: number): Promise<MaintenanceTicket> {
  return apiClient.get<MaintenanceTicket>(`/api/v1/resident/maintenance/tickets/${ticketId}`);
}

export async function createMaintenanceTicket(fields: {
  subject: string;
  category: string;
  priority_level: string;
  detailed_description: string;
  preferred_date?: string;
  images?: File[];
}): Promise<MaintenanceTicket> {
  const form = new FormData();
  form.set("subject", fields.subject);
  form.set("category", fields.category);
  form.set("priority_level", fields.priority_level);
  form.set("detailed_description", fields.detailed_description);
  if (fields.preferred_date) form.set("preferred_date", fields.preferred_date);
  fields.images?.forEach((file) => form.append("images", file));
  return apiClient.post<MaintenanceTicket>("/api/v1/resident/maintenance/tickets", form);
}

export async function cancelMaintenanceTicket(
  ticketId: number,
  reason?: string
): Promise<{ message: string; ticket_id: number; status: string }> {
  return apiClient.post(`/api/v1/resident/maintenance/tickets/${ticketId}/cancel`, {
    reason: reason ?? null,
  });
}

// --- Ticket chat (resident <-> assigned staff) ---

export interface TicketChatMessage {
  sender_user_id: number;
  sender_role: string;
  sender_name: string;
  content: string;
  timestamp: string;
}

export interface TicketChatThread {
  ticket_id: number;
  subject: string;
  status: string;
  resident_name: string;
  staff_name: string | null;
  staff_assigned: boolean;
  messages: TicketChatMessage[];
}

export async function getTicketChat(ticketId: number): Promise<TicketChatThread> {
  return apiClient.get<TicketChatThread>(`/api/v1/chat/${ticketId}`);
}

export async function sendTicketChatMessage(
  ticketId: number,
  content: string
): Promise<TicketChatThread> {
  return apiClient.post<TicketChatThread>(`/api/v1/chat/${ticketId}`, { content });
}

/** Structured, progressively-extracted fields the AI has identified so far. */
export interface AiSummaryState {
  category: string | null;
  urgency_level: string | null;
  subject: string | null;
  location: string | null;
  gathered_detail: string | null;
  confidence_score: number | null;
}

export interface AiChatTurnResponse {
  session_id: string;
  reply_message: string;
  suggested_options: string[];
  summary_state: AiSummaryState;
  is_complete: boolean;
  ticket_id: number | null;
}

/** Real, session-based AI maintenance triage chat (Groq-backed, unlike the stubbed ai-chat above). */
export async function maintenanceAiChatTurn(
  message: string,
  sessionId?: string | null
): Promise<AiChatTurnResponse> {
  return apiClient.post<AiChatTurnResponse>("/api/v1/ai_chat/maintenance", {
    session_id: sessionId ?? null,
    message,
  });
}

// --- Visitors ---

export interface VisitorPass {
  id: number;
  visitor_name: string;
  visit_purpose: string;
  scheduled_at: string;
  status: string;
  qr_token: string;
  /** Names of additional guests covered by the same QR. */
  companions?: string[];
  /** The named visitor plus companions. */
  party_size?: number;
}

export interface VisitorPassListResponse {
  passes?: VisitorPass[];
  usage_summary?: string;
  // Backend may return a plain array or wrapped object — normalize in callers
  [key: string]: unknown;
}

export async function listVisitorPasses(): Promise<VisitorPass[] | VisitorPassListResponse> {
  return apiClient.get("/api/v1/resident/visitor-passes/");
}

export async function createVisitorPass(fields: {
  visitor_name: string;
  visit_purpose: string;
  scheduled_at: string;
  companions?: string[];
}): Promise<{ message: string; qr_token: string; companions?: string[]; party_size?: number }> {
  const form = new FormData();
  form.set("visitor_name", fields.visitor_name);
  form.set("visit_purpose", fields.visit_purpose);
  form.set("scheduled_at", fields.scheduled_at);
  if (fields.companions?.length) {
    form.set("companions", JSON.stringify(fields.companions));
  }
  return apiClient.post("/api/v1/resident/visitor-passes/", form);
}

export interface GateHours {
  operating_hours: string;
  /** "HH:MM" local gate opening / closing, or null when unset. */
  opens: string | null;
  closes: string | null;
  enforced: boolean;
}

/** The arrival window the gate will actually admit visitors in. */
export async function getGateHours(): Promise<GateHours> {
  return apiClient.get<GateHours>("/api/v1/resident/visitor-passes/policy/gate-hours");
}

export async function getVisitorPass(passId: number): Promise<VisitorPass> {
  return apiClient.get<VisitorPass>(`/api/v1/resident/visitor-passes/${passId}`);
}

export async function updateVisitorPass(
  passId: number,
  body: Partial<{
    visitor_name: string;
    visit_purpose: string;
    scheduled_at: string;
    companions: string[];
  }>
): Promise<VisitorPass> {
  return apiClient.patch<VisitorPass>(`/api/v1/resident/visitor-passes/${passId}`, body);
}

export async function cancelVisitorPass(passId: number): Promise<{ message: string }> {
  return apiClient.post(`/api/v1/resident/visitor-passes/${passId}/cancel`, null);
}

// --- Billing ---

export interface BillingSummary {
  current_balance: number;
  overall_due_date: string | null;
  breakdown_notes: string | null;
  urgency_banner: string | null;
}

export interface BillingHistoryItem {
  date: string;
  description: string;
  invoice_number: string;
  amount: number;
  status: string;
  id?: number;
}

export interface BillingInvoice {
  id: number;
  invoice_number: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  currency: string;
  line_items: Array<{
    id: number;
    label: string;
    amount: number;
    description: string | null;
  }>;
}

export async function getBillingSummary(): Promise<BillingSummary> {
  return apiClient.get<BillingSummary>("/api/v1/resident/billing/summary");
}

export async function getBillingHistory(page = 1): Promise<BillingHistoryItem[]> {
  return apiClient.get<BillingHistoryItem[]>(`/api/v1/resident/billing/history?page=${page}`);
}

export async function getBillingInvoice(invoiceId: number): Promise<BillingInvoice> {
  return apiClient.get<BillingInvoice>(`/api/v1/resident/billing/invoices/${invoiceId}`);
}

export async function downloadInvoiceReceipt(invoiceId: number): Promise<string> {
  return apiClient.get<string>(`/api/v1/resident/billing/invoices/${invoiceId}/receipt`);
}

// --- Announcements ---

export interface Announcement {
  id: number;
  title: string;
  content: string;
  category: string;
  created_at: string;
  priority?: "Normal" | "Important" | "Urgent";
  is_pinned?: boolean;
  expiry_date?: string | null;
}

export async function listAnnouncements(): Promise<Announcement[]> {
  return apiClient.get<Announcement[]>("/api/v1/resident/announcements/");
}

export async function getAnnouncement(id: number): Promise<Announcement> {
  return apiClient.get<Announcement>(`/api/v1/resident/announcements/${id}`);
}

// --- Settings ---

export interface ResidentProfile {
  username: string;
  email: string;
  phone_number: string | null;
  profile_pic_url: string | null;
  unit_number: string | null;
  lease_start: string | null;
  lease_end: string | null;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
}

export async function getProfile(): Promise<ResidentProfile> {
  return apiClient.get<ResidentProfile>("/api/v1/resident/settings/profile");
}

export async function updateProfile(body: {
  email?: string;
  phone_number?: string;
}): Promise<ResidentProfile> {
  return apiClient.put<ResidentProfile>("/api/v1/resident/settings/profile", body);
}

export async function getPreferences(): Promise<NotificationPreferences> {
  return apiClient.get<NotificationPreferences>("/api/v1/resident/settings/preferences");
}

export async function updatePreferences(body: NotificationPreferences): Promise<NotificationPreferences> {
  return apiClient.put<NotificationPreferences>("/api/v1/resident/settings/preferences", body);
}

export interface LoginHistoryItem {
  timestamp: string;
  ip_address: string | null;
  success: boolean;
}

export async function getLoginHistory(limit = 10): Promise<LoginHistoryItem[]> {
  return apiClient.get<LoginHistoryItem[]>(`/api/v1/resident/settings/login-history?limit=${limit}`);
}

export interface DeactivationRequest {
  request_id: number;
  status: string;
  reason: string | null;
  created_at: string;
}

export async function getDeactivationRequest(): Promise<DeactivationRequest | null> {
  return apiClient.get<DeactivationRequest | null>("/api/v1/resident/settings/deactivation-request");
}

export async function requestDeactivation(reason?: string): Promise<DeactivationRequest> {
  return apiClient.post<DeactivationRequest>("/api/v1/resident/settings/deactivation-request", {
    reason: reason?.trim() || null,
  });
}

// --- Support ---

export async function submitSupport(body: {
  name: string;
  email: string;
  topic: string;
  message: string;
}): Promise<{ message: string; id: number }> {
  return apiClient.post("/api/v1/support/", body);
}

// --- Uploads ---

export async function uploadFile(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.set("file", file);
  return apiClient.post("/api/v1/uploads/", form);
}
