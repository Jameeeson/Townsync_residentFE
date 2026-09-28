import { apiGet, apiPost } from "@/lib/api";

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

export function getTicketChat(ticketId: number | string) {
  return apiGet<TicketChatThread>(`/api/v1/chat/${ticketId}`);
}

export function sendTicketChatMessage(ticketId: number | string, content: string) {
  return apiPost<TicketChatThread>(`/api/v1/chat/${ticketId}`, { content });
}
