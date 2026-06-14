export type BillingInvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

export interface BillingInvoiceLineItem {
  id: number;
  label: string;
  amount: number;
  description: string | null;
}

export interface BillingInvoice {
  id: number;
  resident_id: number;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  status: BillingInvoiceStatus;
  issued_at: string | null;
  paid_at: string | null;
  line_items: BillingInvoiceLineItem[];
  created_at: string;
  updated_at: string;
}