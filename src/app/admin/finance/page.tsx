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
  ShieldCheck,
  Send,
  Home,
} from "lucide-react";
import AdminShell from "../../../components/admin/admin-shell";
import PropertyRatesModal, { ordinal } from "../../../components/admin/property-rates-modal";
import styles from "../../../components/styles/Finance.module.css";

type StatusType = "Paid" | "Unpaid" | "Overdue";

interface LedgerApiRecord {
  id: number;
  date: string;
  resident_name: string;
  invoice_number: string;
  amount: number;
  status: StatusType;
}

interface LedgerRecord {
  id: number;
  initials: string;
  name: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  status: StatusType;
}

interface FinanceMetrics {
  total_collections_monthly: number;
  collection_efficiency_index: number;
  overdue_liquidity_alert: number;
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

function FinancePage() {
  const { toast, toastError } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkInvoice = searchParams.get("invoice");
  // Modal states
  const [isLogPaymentOpen, setIsLogPaymentOpen] = useState(false);
  const [isGenerateStatementOpen, setIsGenerateStatementOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  // Form State for Payment
  const [paymentStatus, setPaymentStatus] = useState<"full" | "partial" | "unreconciled">("full");
  const [paymentInvoiceId, setPaymentInvoiceId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<{
    residentLabel: string;
    amount: string;
    method: string;
    date: string;
    reference: string;
  } | null>(null);

  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<{ paidPct: number; unpaidPct: number; overduePct: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | StatusType>("All");
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
        return r.name.toLowerCase().includes(term) || r.invoiceNumber.toLowerCase().includes(term);
      })
    : records;

  const payableInvoices = records.filter((r) => r.status !== "Paid");

  // Arriving from a dashboard drill-down: select that invoice and open the
  // payment panel once the ledger has loaded, then clear the param so a later
  // refresh cannot reopen it behind the admin's back.
  useEffect(() => {
    if (!deepLinkInvoice) return;
    if (!records.some((r) => String(r.id) === deepLinkInvoice)) return; // ledger still loading
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot sync from the
       URL, cleared immediately below so it cannot cascade or re-apply. */
    setPaymentInvoiceId(deepLinkInvoice);
    setIsLogPaymentOpen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    router.replace("/admin/finance", { scroll: false });
  }, [deepLinkInvoice, records, router]);
  const selectedInvoice = payableInvoices.find((r) => String(r.id) === paymentInvoiceId) ?? null;

  const refreshLedger = () => {
    apiGet<FinanceMetrics>("/api/v1/admin/finance/dashboard-metrics")
      .then(setMetrics)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to refresh metrics"));
    const query = statusFilter === "All" ? "" : `?status_filter=${statusFilter}`;
    apiGet<LedgerApiRecord[]>(`/api/v1/admin/finance/ledger${query}`)
      .then((data) =>
        setRecords(
          data.map((item) => ({
            id: item.id,
            initials: initialsFor(item.resident_name),
            name: item.resident_name,
            invoiceNumber: item.invoice_number,
            amount: formatCurrency(item.amount),
            dueDate: item.date,
            status: item.status,
          })),
        ),
      )
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load ledger"));
  };

  useEffect(() => {
    apiGet<FinanceMetrics>("/api/v1/admin/finance/dashboard-metrics")
      .then(setMetrics)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load metrics"));
    apiGet<LedgerApiRecord[]>("/api/v1/admin/finance/ledger")
      .then((all) => {
        if (all.length === 0) {
          setStatusBreakdown({ paidPct: 0, unpaidPct: 0, overduePct: 0 });
          return;
        }
        const count = (status: StatusType) => all.filter((r) => r.status === status).length;
        setStatusBreakdown({
          paidPct: Math.round((count("Paid") / all.length) * 100),
          unpaidPct: Math.round((count("Unpaid") / all.length) * 100),
          overduePct: Math.round((count("Overdue") / all.length) * 100),
        });
      })
      .catch(() => setStatusBreakdown(null));
  }, []);

  useEffect(() => {
    const query = statusFilter === "All" ? "" : `?status_filter=${statusFilter}`;
    apiGet<LedgerApiRecord[]>(`/api/v1/admin/finance/ledger${query}`)
      .then((data) =>
        setRecords(
          data.map((item) => ({
            id: item.id,
            initials: initialsFor(item.resident_name),
            name: item.resident_name,
            invoiceNumber: item.invoice_number,
            amount: formatCurrency(item.amount),
            dueDate: item.date,
            status: item.status,
          })),
        ),
      )
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

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) {
      setPaymentError("Select an invoice to apply this payment to.");
      return;
    }
    const amountNumber = Number(paymentAmount.replace(/[^0-9.]/g, ""));
    if (!amountNumber || amountNumber <= 0) {
      setPaymentError("Enter a valid amount paid.");
      return;
    }

    setPaymentSubmitting(true);
    setPaymentError(null);
    try {
      await apiPost(`/api/v1/admin/finance/invoices/${selectedInvoice.id}/payments`, {
        amount_paid: amountNumber,
        payment_method: paymentMethod,
        transaction_ref: paymentRef || undefined,
        paid_at: paymentDate || undefined,
      });

      setPaymentReceipt({
        residentLabel: selectedInvoice.name,
        amount: formatCurrency(amountNumber),
        method: paymentMethod,
        date: paymentDate || new Date().toISOString().slice(0, 10),
        reference: paymentRef || "Auto-generated",
      });

      setIsLogPaymentOpen(false);
      setIsSuccessOpen(true);
      setPaymentInvoiceId("");
      setPaymentAmount("");
      setPaymentRef("");
      setPaymentDate("");
      toast(
        `Payment of ${formatCurrency(amountNumber)} recorded for ${selectedInvoice.name}.`,
        "success",
      );
      refreshLedger();
    } catch (err) {
      toastError(err, "Could not record the payment.");
      setPaymentError(err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setPaymentSubmitting(false);
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
                placeholder="Search by name or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Filter by Status:</span>
              <div className={styles.selectWrapper}>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "All" | StatusType)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Overdue">Overdue</option>
                </select>
                <ChevronDown size={14} className={styles.selectIcon} />
              </div>

              <button
                className={styles.btnLogPayment}
                onClick={() => setIsLogPaymentOpen(true)}
              >
                Log Payment
              </button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Resident Name</th>
                  <th>Invoice Number</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      {records.length === 0
                        ? "No ledger records found."
                        : "No records match your search."}
                    </td>
                  </tr>
                ) : (
                  visibleRecords.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.residentCell}>
                          <div className={styles.avatar}>{item.initials}</div>
                          <span className={styles.residentName}>{item.name}</span>
                        </div>
                      </td>
                      <td>{item.invoiceNumber}</td>
                      <td className={item.status === "Overdue" ? styles.amountRed : styles.amountBold}>
                        {item.amount}
                      </td>
                      <td className={item.status === "Overdue" ? styles.dateRed : undefined}>
                        {item.dueDate}
                      </td>
                      <td>
                        <span className={
                          item.status === "Paid"
                            ? styles.badgePaid
                            : item.status === "Unpaid"
                            ? styles.badgeUnpaid
                            : styles.badgeOverdue
                        }>
                          • {item.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {/* Optional action buttons */}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className={styles.pagination}>
            <span>Showing {records.length} record{records.length === 1 ? "" : "s"}</span>
          </div>
        </div>
      </div>

      {/* --- MODAL 1: LOG NEW PAYMENT --- */}
      {isLogPaymentOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Log New Payment</h2>
                <p>Record a resident transaction manually.</p>
              </div>
              <button onClick={() => setIsLogPaymentOpen(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            {paymentError ? (
              <p className={styles.cardTrendNegative} style={{ padding: "0 1.5rem" }}>{paymentError}</p>
            ) : null}

            <form onSubmit={handleRecordPayment} className={styles.modalBody}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Invoice</label>
                  <select
                    value={paymentInvoiceId}
                    onChange={(e) => setPaymentInvoiceId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select an unpaid or overdue invoice</option>
                    {payableInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.name} ({inv.amount})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Resident</label>
                  <div className={styles.inputIconWrapper}>
                    <Search size={16} className={styles.inputIcon} />
                    <input type="text" value={selectedInvoice?.name ?? ""} readOnly placeholder="Select an invoice first" />
                  </div>
                </div>
              </div>

              <div className={styles.formRow3}>
                <div className={styles.formGroup}>
                  <label>Amount Paid</label>
                  <input
                    type="text"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="₱ 0.00"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Payment Method</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                    <option value="E-Wallet">E-Wallet</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Transaction Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Reference / Check No. (Optional)</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Auto-generated if left blank"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Status Assignment</label>
                <div className={styles.statusToggleGrid}>
                  <button
                    type="button"
                    className={`${styles.statusOption} ${paymentStatus === "full" ? styles.statusOptionActiveGreen : ""}`}
                    onClick={() => setPaymentStatus("full")}
                  >
                    <CheckCircle2 size={18} />
                    <span>Full Payment</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.statusOption} ${paymentStatus === "partial" ? styles.statusOptionActiveBlue : ""}`}
                    onClick={() => setPaymentStatus("partial")}
                  >
                    <Clock size={18} />
                    <span>Partial Payment</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.statusOption} ${paymentStatus === "unreconciled" ? styles.statusOptionActiveGray : ""}`}
                    onClick={() => setPaymentStatus("unreconciled")}
                  >
                    <AlertTriangle size={18} />
                    <span>Unreconciled</span>
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Admin Notes (Internal)</label>
                <textarea
                  rows={3}
                  placeholder="Add specific details about the check number, bank name, or resident special requests..."
                />
              </div>

              <div className={styles.modalFooter}>
                <div className={styles.securedNotice}>
                  <ShieldCheck size={16} />
                  <span>Secured Transaction Logging</span>
                </div>
                <div className={styles.footerBtns}>
                  <button 
                    type="button" 
                    className={styles.btnSecondary} 
                    onClick={() => setIsLogPaymentOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.btnNavy} disabled={paymentSubmitting}>
                    {paymentSubmitting ? "Recording…" : "Confirm & Record Payment"}
                  </button>
                </div>
              </div>
            </form>
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

      {/* --- MODAL 3: PAYMENT SUCCESS --- */}
      {isSuccessOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.modalSuccess}`}>
            <div className={styles.successIconCircle}>
              <CheckCircle2 size={36} color="#ffffff" />
            </div>

            <h2 className={styles.successTitle}>Payment Recorded Successfully</h2>
            <p className={styles.successSubtitle}>
              The transaction for <strong>{paymentReceipt?.residentLabel ?? "this resident"}</strong> has been added to the ledger.
            </p>

            <div className={styles.receiptBox}>
              <div className={styles.receiptRow}>
                <div>
                  <span className={styles.receiptLabel}>REFERENCE</span>
                  <p className={styles.receiptValue}>{paymentReceipt?.reference ?? "—"}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className={styles.receiptLabel}>AMOUNT PAID</span>
                  <p className={styles.receiptValueLarge}>{paymentReceipt?.amount ?? "—"}</p>
                </div>
              </div>
              <div className={styles.receiptRow} style={{ marginTop: "1rem" }}>
                <div>
                  <span className={styles.receiptLabel}>PAYMENT METHOD</span>
                  <p className={styles.receiptValue}>{paymentReceipt?.method ?? "—"}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className={styles.receiptLabel}>DATE</span>
                  <p className={styles.receiptValue}>{paymentReceipt?.date ?? "—"}</p>
                </div>
              </div>
            </div>

            <div className={styles.successActions}>
              <button
                className={styles.btnNavy}
                onClick={() => {
                  if (!paymentReceipt) return;
                  const lines = [
                    "TownSync — Payment Receipt",
                    `Resident: ${paymentReceipt.residentLabel}`,
                    `Reference: ${paymentReceipt.reference}`,
                    `Amount Paid: ${paymentReceipt.amount}`,
                    `Payment Method: ${paymentReceipt.method}`,
                    `Date: ${paymentReceipt.date}`,
                  ];
                  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `receipt_${paymentReceipt.reference || "payment"}.txt`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download size={16} /> Download Receipt
              </button>
              <button 
                className={styles.btnLink} 
                onClick={() => setIsSuccessOpen(false)}
              >
                Back to Billing Dashboard
              </button>
            </div>

            <p className={styles.copyNotice}>
              A copy of the receipt has also been sent to j.miller@email.com
            </p>
          </div>
        </div>
      )}
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
