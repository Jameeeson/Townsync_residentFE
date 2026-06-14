export type VisitorRequestStatus = "pending" | "approved" | "rejected" | "checked_in" | "checked_out";

export interface VisitorRequest {
  id: number;
  resident_id: number;
  visitor_name: string;
  visitor_phone: string | null;
  visitor_email: string | null;
  visit_reason: string;
  expected_arrival_at: string;
  expected_departure_at: string | null;
  qr_code_token: string;
  status: VisitorRequestStatus;
  approved_by_user_id: number | null;
  approved_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}