"use client";

import React, { Suspense, useEffect, useState } from "react";
import { apiDownload, apiGet, apiPost } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Download,
  Search,
  ChevronDown,
  AlertTriangle,
  Wallet,
  CheckCircle2,
  Clock,
  X,
  Mail,
  Globe,
  Printer,
  Send,
  Home,
  Receipt,
} from "lucide-react";
import AdminShell from "../../../components/admin/admin-shell";
import PropertyRatesModal, { ordinal } from "../../../components/admin/property-rates-modal";
import ResidentBillingDrawer from "../../../components/admin/resident-billing-drawer";
import styles from "../../../components/styles/Finance.module.css";

type StatusType = "Paid" | "Unpaid" | "Overdue";

interface LedgerApiRecord {
  id: number;
  status: StatusType;
}

interface ResidentApiRow {
  resident_id: number;
  resident_name: string;
  unit_number: string | null;
  statements: number;
  unpaid_count: number;
  outstanding: number;
  status: "Overdue" | "DueToday" | "Unpaid" | "Paid";
  next_due_date: string | null;
  due_label: string | null;
  pending_receipts: number;
  focus_invoice_id: number;
  account_deleted?: boolean;
}

interface ResidentRow {
  residentId: number;
  initials: string;
  name: string;
  unit: string | null;
  statements: number;
  unpaidCount: number;
  outstanding: number;
  status: ResidentApiRow["status"];
  nextDue: string | null;
  dueLabel: string | null;
  pendingReceipts: number;
  focusInvoiceId: number;
  accountDeleted: boolean;
}

interface FinanceMetrics {
  total_collections_monthly: number;
  collection_efficiency_index: number;
  overdue_liquidity_alert: number;
}

type LedgerFilter = "All" | StatusType | "DueToday" | "Receipt";

function toRow(item: ResidentApiRow): ResidentRow {
  return {
    residentId: item.resident_id,
    initials: initialsFor(item.resident_name),
    name: item.resident_name,
    unit: item.unit_number,
    statements: item.statements,
    unpaidCount: item.unpaid_count,
    outstanding: item.outstanding,
    status: item.status,
    nextDue: item.next_due_date,
    dueLabel: item.due_label,
    pendingReceipts: item.pending_receipts,
    focusInvoiceId: item.focus_invoice_id,
    accountDeleted: Boolean(item.account_deleted),
  };
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type StatementResidentType = "All" | "Owner" | "Tenant";
type StatementDelivery = "Email" | "Portal" | "Print";

interface StatementPreview {
  billing_period: string;
  due_date: string;
  eligible_residents: number;
  already_billed: number;
  to_create: number;
  default_monthly_due: number;
  default_due_day: number;
  custom_rate_count: number;
  default_rate_count: number;
  shared_property_count: number;
  total_new_amount: number;
}

interface StatementLine {
  invoice_id: number;
  invoice_number: string;
  resident_name: string;
  unit_number: string | null;
  email: string | null;
  amount: number;
  penalty_amount: number;
  due_date: string;
  status: string;
}

interface StatementRunResult {
  message: string;
  billing_period: string;
  delivery: StatementDelivery;
  created: number;
  skipped: number;
  emails_queued: number;
  statements: StatementLine[];
}

/** Previous, current and next month as YYYY-MM, labelled for the period picker. */
function buildPeriodOptions(): { value: string; label: string }[] {
  const now = new Date();
  return [-1, 0, 1].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const name = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const suffix = offset === 0 ? " (current)" : offset === 1 ? " (next)" : " (previous)";
    return { value, label: name + suffix };
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Opens a print-ready page with one statement per sheet. */
function printStatements(lines: StatementLine[], periodLabel: string): boolean {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return false;
  const sheets = lines
    .map(
      (l) => `
      <section class="sheet">
        <header><h1>TownSync HOA Statement</h1><p>${escapeHtml(periodLabel)}</p></header>
        <table>
          <tr><th>Invoice</th><td>${escapeHtml(l.invoice_number)}</td></tr>
          <tr><th>Resident</th><td>${escapeHtml(l.resident_name)}</td></tr>
          <tr><th>Unit</th><td>${escapeHtml(l.unit_number ?? "-")}</td></tr>
          <tr><th>Amount</th><td>${escapeHtml(formatCurrency(l.amount))}</td></tr>
          ${l.penalty_amount > 0 ? `<tr><th>Penalty</th><td>${escapeHtml(formatCurrency(l.penalty_amount))}</td></tr>` : ""}
          <tr><th>Total due</th><td><strong>${escapeHtml(formatCurrency(l.amount + l.penalty_amount))}</strong></td></tr>
          <tr><th>Due date</th><td>${escapeHtml(l.due_date)}</td></tr>
          <tr><th>Status</th><td>${escapeHtml(l.status)}</td></tr>
        </table>
        <footer>Pay through the TownSync resident portal (Billing) or at the HOA office.</footer>
      </section>`,
    )
    .join("");
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Statements - ${escapeHtml(periodLabel)}</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;margin:0}
      .sheet{padding:48px;page-break-after:always;max-width:640px;margin:0 auto}
      header{border-bottom:2px solid #1e3a8a;margin-bottom:24px}
      h1{font-size:22px;margin:0 0 4px}
      header p{margin:0 0 12px;color:#475569}
      table{width:100%;border-collapse:collapse;font-size:14px}
      th{text-align:left;color:#475569;font-weight:600;padding:8px 0;width:40%}
      td{text-align:right;padding:8px 0;border-bottom:1px solid #e2e8f0}
      footer{margin-top:24px;font-size:12px;color:#64748b}
    </style></head><body>${sheets}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
  return true;
}

function breakdownOf(all: LedgerApiRecord[]) {
  if (all.length === 0) return { paidPct: 0, unpaidPct: 0, overduePct: 0 };
  const count = (status: StatusType) => all.filter((r) => r.status === status).length;
  return {
    paidPct: Math.round((count("Paid") / all.length) * 100),
    unpaidPct: Math.round((count("Unpaid") / all.length) * 100),
    overduePct: Math.round((count("Overdue") / all.length) * 100),
  };
}

function FinancePage() {
  const { toast, toastError } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkInvoice = searchParams.get("invoice");
  // Modal states
  const [isGenerateStatementOpen, setIsGenerateStatementOpen] = useState(false);

  // Opening a resident's bills (click a row, or pick an invoice from "Log Payment")
  const [drawer, setDrawer] = useState<{ residentId: number; invoiceId: number | null } | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickedInvoiceId, setPickedInvoiceId] = useState("");

  const [records, setRecords] = useState<ResidentRow[]>([]);
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<{ paidPct: number; unpaidPct: number; overduePct: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<LedgerFilter>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generatingStatements, setGeneratingStatements] = useState(false);
  const [statementMessage, setStatementMessage] = useState<string | null>(null);
  const [statementPeriodOptions] = useState(buildPeriodOptions);
  const [statementPeriod, setStatementPeriod] = useState(() => statementPeriodOptions[1].value);
  const [statementResidentType, setStatementResidentType] = useState<StatementResidentType>("All");
  const [statementDelivery, setStatementDelivery] = useState<StatementDelivery>("Email");
  const [statementPreview, setStatementPreview] = useState<StatementPreview | null>(null);
  const [statementPreviewError, setStatementPreviewError] = useState<string | null>(null);
  const [statementPreviewNonce, setStatementPreviewNonce] = useState(0);
  const [isRatesOpen, setIsRatesOpen] = useState(false);

  // The summary card reflects the chosen period and resident type.
  useEffect(() => {
    if (!isGenerateStatementOpen) return;
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect -- reset before refetch */
    setStatementPreview(null);
    setStatementPreviewError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    apiGet<StatementPreview>(
      `/api/v1/admin/finance/batch-statements/preview?billing_period=${statementPeriod}&resident_type=${statementResidentType}`,
    )
      .then((data) => {
        if (!cancelled) setStatementPreview(data);
      })
      .catch((err) => {
        if (!cancelled) setStatementPreviewError(err instanceof Error ? err.message : "Could not load the summary.");
      });
    return () => {
      cancelled = true;
    };
  }, [isGenerateStatementOpen, statementPeriod, statementResidentType, statementPreviewNonce]);

  const runStatements = async () => {
    setGeneratingStatements(true);
    setStatementMessage(null);
    try {
      const result = await apiPost<StatementRunResult>("/api/v1/admin/finance/batch-statements", {
        billing_period: statementPeriod,
        resident_type: statementResidentType,
        delivery: statementDelivery,
      });
      setStatementMessage(result.message);
      toast(result.message, result.created > 0 ? "success" : "info");
      if (statementDelivery === "Print") {
        const label = statementPeriodOptions.find((o) => o.value === statementPeriod)?.label ?? statementPeriod;
        if (result.statements.length === 0) {
          toast("There are no statements to print for this period.", "info");
        } else if (!printStatements(result.statements, label)) {
          toast("Allow pop-ups for this site to print statements.", "warning");
        }
      }
      setStatementPreviewNonce((n) => n + 1);
      refreshLedger();
    } catch (err) {
      toastError(err, "Could not generate statements.");
      setStatementMessage(err instanceof Error ? err.message : "Failed to generate statements");
    } finally {
      setGeneratingStatements(false);
    }
  };

  const visibleRecords = searchTerm.trim()
    ? records.filter((r) => {
        const term = searchTerm.trim().toLowerCase();
        return r.name.toLowerCase().includes(term) || (r.unit ?? "").toLowerCase().includes(term);
      })
    : records;

  const payableResidents = records.filter((r) => r.status !== "Paid");

  const openBills = (row: ResidentRow) => {
    setDrawer({ residentId: row.residentId, invoiceId: row.focusInvoiceId });
  };

  // Arriving from a dashboard drill-down: open that invoice's resident, then clear the param so a later refresh
  // cannot reopen it behind the admin's back.
  useEffect(() => {
    if (!deepLinkInvoice) return;
    let cancelled = false;
    apiGet<{ id: number; resident_id: number }>(`/api/v1/admin/finance/invoices/${deepLinkInvoice}`)
      .then((inv) => {
        if (!cancelled) setDrawer({ residentId: inv.resident_id, invoiceId: inv.id });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) router.replace("/admin/finance", { scroll: false });
      });
    return () => {
      cancelled = true;
    };
  }, [deepLinkInvoice, router]);

  const refreshLedger = () => {
    apiGet<FinanceMetrics>("/api/v1/admin/finance/dashboard-metrics")
      .then(setMetrics)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to refresh metrics"));
    apiGet<LedgerApiRecord[]>("/api/v1/admin/finance/ledger")
      .then((all) => setStatusBreakdown(breakdownOf(all)))
      .catch(() => setStatusBreakdown(null));
    loadRecords();
  };

  const loadRecords = () => {
    const query = statusFilter === "All" ? "" : `?status_filter=${statusFilter}`;
    apiGet<ResidentApiRow[]>(`/api/v1/admin/finance/ledger/residents${query}`)
      .then((data) => setRecords(data.map(toRow)))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load ledger"));
  };

  useEffect(() => {
    apiGet<FinanceMetrics>("/api/v1/admin/finance/dashboard-metrics")
      .then(setMetrics)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load metrics"));
    apiGet<LedgerApiRecord[]>("/api/v1/admin/finance/ledger")
      .then((all) => setStatusBreakdown(breakdownOf(all)))
      .catch(() => setStatusBreakdown(null));
  }, []);

  useEffect(() => {
    const query = statusFilter === "All" ? "" : `?status_filter=${statusFilter}`;
    apiGet<ResidentApiRow[]>(`/api/v1/admin/finance/ledger/residents${query}`)
      .then((data) => setRecords(data.map(toRow)))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load ledger"));
  }, [statusFilter]);

  // FUNCTION: Export the full ledger as CSV, straight from the backend
  const handleExportCSV = async () => {
    try {
      const blob = await apiDownload("/api/v1/admin/finance/export");
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `billing_and_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  };

  return (
    <AdminShell>
      <div className={styles.container}>
        {/* Header Title Section */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Billing & Ledger</h1>
            <p className={styles.subtitle}>
              Manage resident payments, statements, and financial health.
            </p>
          </div>
          <div className={styles.headerActions}>
            {/* Functional Export CSV Button */}
            <button className={styles.btnSecondary} onClick={handleExportCSV}>
              <Download size={16} /> Export CSV
            </button>
            <button type="button" className={styles.btnSecondary} onClick={() => setIsRatesOpen(true)}>
              <Home size={16} /> Property Rates
            </button>
            <button
              className={styles.btnPrimary}
              onClick={() => {
                setStatementMessage(null);
                setIsGenerateStatementOpen(true);
              }}
            >
              <FileText size={16} /> Generate Batch Statements
            </button>
          </div>
        </div>

        {error ? <p className={styles.cardTrendNegative}>{error}</p> : null}

        {/* Metrics Overview Grid */}
        <div className={styles.metricsGrid}>
          {/* Card 1: Monthly Collections */}
          <div className={styles.metricCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Monthly Collections</span>
              <div className={styles.iconBadge}><Wallet size={18} /></div>
            </div>
            <div className={styles.cardValue}>
              {metrics ? formatCurrency(metrics.total_collections_monthly) : "—"}
            </div>
          </div>

          {/* Card 2: Paid Bills */}
          <div className={styles.metricCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Paid Bills</span>
              <div className={styles.iconBadge}><CheckCircle2 size={18} /></div>
            </div>
            <div className={styles.cardValue}>{statusBreakdown ? `${statusBreakdown.paidPct}%` : "—"}</div>
            <div className={styles.progressTrack}>
              <div className={styles.progressBarGreen} style={{ width: `${statusBreakdown?.paidPct ?? 0}%` }} />
            </div>
          </div>

          {/* Card 3: Unpaid Bills */}
          <div className={styles.metricCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Unpaid Bills</span>
              <div className={styles.iconBadge}><Clock size={18} /></div>
            </div>
            <div className={styles.cardValue}>{statusBreakdown ? `${statusBreakdown.unpaidPct}%` : "—"}</div>
            <div className={styles.progressTrack}>
              <div className={styles.progressBarAmber} style={{ width: `${statusBreakdown?.unpaidPct ?? 0}%` }} />
            </div>
          </div>

          {/* Card 4: Overdue Payments */}
          <div className={`${styles.metricCard} ${styles.metricCardAlert}`}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitleAlert}>Overdue Payments</span>
              <AlertTriangle size={18} className={styles.alertIcon} />
            </div>
            <div className={styles.cardValueAlert}>{statusBreakdown ? `${statusBreakdown.overduePct}%` : "—"}</div>
            <p className={styles.cardTrendNegative}>
              {metrics ? `${metrics.overdue_liquidity_alert}% liquidity at risk` : ""}
            </p>
          </div>
        </div>

        {/* Ledger Table Section */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by resident name or unit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Filter by Status:</span>
              <div className={styles.selectWrapper}>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as LedgerFilter)}
                >
                  <option value="All">All Statuses</option>
                  <option value="DueToday">Due today</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Unpaid">Unpaid (not yet due)</option>
                  <option value="Receipt">Receipt to review</option>
                  <option value="Paid">Paid</option>
                </select>
                <ChevronDown size={14} className={styles.selectIcon} />
              </div>

              <button
                className={styles.btnLogPayment}
                onClick={() => setIsPickerOpen(true)}
              >
                Log Payment
              </button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Resident</th>
                  <th>Statements</th>
                  <th>Outstanding</th>
                  <th>Next Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      {records.length === 0
                        ? "No ledger records found."
                        : "No records match your search."}
                    </td>
                  </tr>
                ) : (
                  visibleRecords.map((item) => (
                    <tr
                      key={item.residentId}
                      className={styles.clickableRow}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open bills for ${item.name}`}
                      onClick={() => openBills(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openBills(item);
                        }
                      }}
                    >
                      <td>
                        <div className={styles.residentCell}>
                          <div className={styles.avatar}>{item.initials}</div>
                          <div>
                            <span className={styles.residentName}>{item.name}</span>
                            {item.accountDeleted ? <span className={styles.deletedTag}>Account deleted</span> : null}
                            {item.unit ? <div className={styles.unitLine}>{item.unit}</div> : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        {item.statements} total
                        <div className={styles.dueNote}>
                          {item.unpaidCount === 0 ? "all paid" : `${item.unpaidCount} unpaid`}
                        </div>
                      </td>
                      <td className={item.status === "Overdue" ? styles.amountRed : styles.amountBold}>
                        {formatCurrency(item.outstanding)}
                      </td>
                      <td className={item.status === "Overdue" ? styles.dateRed : undefined}>
                        {item.nextDue ?? "—"}
                        {item.status !== "Paid" && item.dueLabel ? (
                          <div className={item.status === "DueToday" ? styles.dueTodayNote : styles.dueNote}>{item.dueLabel}</div>
                        ) : null}
                      </td>
                      <td>
                        <span className={
                          item.status === "Paid"
                            ? styles.badgePaid
                            : item.status === "DueToday"
                            ? styles.badgeToday
                            : item.status === "Unpaid"
                            ? styles.badgeUnpaid
                            : styles.badgeOverdue
                        }>
                          • {item.status === "DueToday" ? "Due today" : item.status}
                        </span>
                        {item.pendingReceipts > 0 ? (
                          <span className={styles.receiptTag} title="The resident uploaded a receipt that needs checking">
                            <Receipt size={12} /> Receipt
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className={styles.pagination}>
            <span>Showing {records.length} resident{records.length === 1 ? "" : "s"}. Click a row to see their statements and adjust their bills.</span>
          </div>
        </div>
      </div>

      {/* --- LOG PAYMENT: pick the invoice, then the resident's bills open with the payment form --- */}
      {isPickerOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsPickerOpen(false)}>
          <div className={styles.modalContent} style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Log Payment</h2>
                <p>Choose who paid. Their bills open with the payment form.</p>
              </div>
              <button onClick={() => setIsPickerOpen(false)} className={styles.closeBtn} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor="pick-invoice">Resident with a balance</label>
                <select id="pick-invoice" value={pickedInvoiceId} onChange={(e) => setPickedInvoiceId(e.target.value)}>
                  <option value="" disabled>Select a resident</option>
                  {payableResidents.map((r) => (
                    <option key={r.residentId} value={r.residentId}>
                      {r.name}{r.unit ? ` · ${r.unit}` : ""} ({formatCurrency(r.outstanding)})
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.modalFooterRight}>
                <button type="button" className={styles.btnSecondary} onClick={() => setIsPickerOpen(false)}>Cancel</button>
                <button
                  type="button"
                  className={styles.btnNavy}
                  disabled={!pickedInvoiceId}
                  onClick={() => {
                    const rec = payableResidents.find((r) => String(r.residentId) === pickedInvoiceId);
                    if (rec) openBills(rec);
                    setIsPickerOpen(false);
                    setPickedInvoiceId("");
                  }}
                >
                  Open bills
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: GENERATE STATEMENT --- */}
      {isGenerateStatementOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} role="dialog" aria-modal="true" aria-labelledby="stmt-title">
            <div className={styles.modalHeader}>
              <div className={styles.titleWithIcon}>
                <FileText size={20} color="#1e3a8a" />
                <h2 id="stmt-title">Generate Statement</h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsGenerateStatementOpen(false)}
                className={styles.closeBtn}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="stmt-period">Billing Period</label>
                  <select
                    id="stmt-period"
                    value={statementPeriod}
                    onChange={(e) => setStatementPeriod(e.target.value)}
                    disabled={generatingStatements}
                  >
                    {statementPeriodOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Resident Type</label>
                  <div className={styles.segmentedControl} role="radiogroup" aria-label="Resident type">
                    {(["All", "Owner", "Tenant"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={statementResidentType === t}
                        className={statementResidentType === t ? styles.segmentActive : ""}
                        disabled={generatingStatements}
                        onClick={() => setStatementResidentType(t)}
                      >
                        {t === "All" ? "All" : t === "Owner" ? "Owners" : "Tenants"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Delivery Method</label>
                <div className={styles.deliveryGrid} role="radiogroup" aria-label="Delivery method">
                  {(
                    [
                      { key: "Email", icon: <Mail size={20} />, hint: "Email each new statement" },
                      { key: "Portal", icon: <Globe size={20} />, hint: "Post to residents' Billing page only" },
                      { key: "Print", icon: <Printer size={20} />, hint: "Open printable statements" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      role="radio"
                      aria-checked={statementDelivery === opt.key}
                      title={opt.hint}
                      className={`${styles.deliveryOption} ${
                        statementDelivery === opt.key ? styles.deliveryOptionActive : ""
                      }`}
                      disabled={generatingStatements}
                      onClick={() => setStatementDelivery(opt.key)}
                    >
                      {opt.icon}
                      <span>{opt.key}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className={styles.summaryCard}>
                <div className={styles.summaryDocPreview}>
                  <div className={styles.miniDoc} />
                </div>
                <div className={styles.summaryDetails}>
                  <h4>Statement Summary</h4>
                  <button type="button" className={styles.linkBtn} onClick={() => setIsRatesOpen(true)}>
                    Manage property rates
                  </button>
                  {statementPreviewError ? (
                    <p className={styles.sumNotice}>{statementPreviewError}</p>
                  ) : !statementPreview ? (
                    <p className={styles.sumNotice}>Calculating…</p>
                  ) : (
                    <>
                      <div className={styles.summaryStats}>
                        <div>
                          <span className={styles.sumLabel}>NEW STATEMENTS</span>
                          <p className={styles.sumValue}>{statementPreview.to_create}</p>
                        </div>
                        <div>
                          <span className={styles.sumLabel}>TOTAL BILLED</span>
                          <p className={styles.sumValueGreen}>{formatCurrency(statementPreview.total_new_amount)}</p>
                        </div>
                      </div>
                      <p className={styles.sumNotice}>
                        Each property is billed its own amount on its own due day (default: the{" "}
                        {ordinal(statementPreview.default_due_day)} of the month)
                        {statementPreview.to_create > 0
                          ? ` (${statementPreview.custom_rate_count} custom, ${statementPreview.default_rate_count} at the ${formatCurrency(statementPreview.default_monthly_due)} default)`
                          : ""}
                        .{" "}
                        {statementPreview.already_billed > 0
                          ? `${statementPreview.already_billed} of ${statementPreview.eligible_residents} active residents already have a statement for this period and will be skipped.`
                          : `${statementPreview.eligible_residents} active resident(s) match.`}
                        {statementDelivery === "Print" ? " Print includes every statement for the period." : ""}
                        {statementPreview.shared_property_count > 0
                          ? ` Note: ${statementPreview.shared_property_count} propert${statementPreview.shared_property_count === 1 ? "y has" : "ies have"} more than one resident, and each resident gets a statement.`
                          : ""}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {statementMessage ? <p className={styles.cardTrendPositive}>{statementMessage}</p> : null}

              <div className={styles.modalFooterRight}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsGenerateStatementOpen(false)}
                >
                  {statementMessage ? "Close" : "Cancel"}
                </button>
                <button
                  type="button"
                  className={styles.btnNavy}
                  disabled={
                    generatingStatements ||
                    !statementPreview ||
                    (statementDelivery !== "Print" && statementPreview.to_create === 0)
                  }
                  onClick={runStatements}
                >
                  {generatingStatements
                    ? "Generating..."
                    : statementDelivery === "Email"
                    ? "Generate & Send"
                    : statementDelivery === "Portal"
                    ? "Generate & Post"
                    : "Generate & Print"}{" "}
                  {statementDelivery === "Print" ? <Printer size={14} /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isRatesOpen ? (
        <PropertyRatesModal
          onClose={() => setIsRatesOpen(false)}
          onChanged={() => setStatementPreviewNonce((n) => n + 1)}
        />
      ) : null}

      {drawer ? (
        <ResidentBillingDrawer
          residentId={drawer.residentId}
          invoiceId={drawer.invoiceId}
          onClose={() => setDrawer(null)}
          onChanged={refreshLedger}
        />
      ) : null}
    </AdminShell>
  );
}


// useSearchParams needs a Suspense boundary for this route to prerender.
export default function FinanceLedgerPage() {
  return (
    <Suspense fallback={null}>
      <FinancePage />
    </Suspense>
  );
}
