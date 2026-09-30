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
} from "lucide-react";
import AdminShell from "../../../components/admin/admin-shell";
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
    apiGet<FinanceMetrics>("/api/v1/admin/finance/dashboard-metrics").then(setMetrics).catch(() => {});
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
            <button 
              className={styles.btnPrimary} 
              onClick={() => setIsGenerateStatementOpen(true)}
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
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.titleWithIcon}>
                <FileText size={20} color="#1e3a8a" />
                <h2>Generate Statement</h2>
              </div>
              <button onClick={() => setIsGenerateStatementOpen(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formRow} title="Not configurable yet — the batch run always covers every resident for the current period.">
                <div className={styles.formGroup}>
                  <label>Billing Period</label>
                  <select defaultValue="October 2024" disabled>
                    <option value="October 2024">Current period</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Resident Type</label>
                  <div className={styles.segmentedControl}>
                    <button className={styles.segmentActive} disabled>
                      All
                    </button>
                    <button disabled>Owners</button>
                    <button disabled>Tenants</button>
                  </div>
                </div>
              </div>

              <div className={styles.formGroup} title="Not configurable yet — statements are always emailed.">
                <label>Delivery Method</label>
                <div className={styles.deliveryGrid}>
                  <button className={`${styles.deliveryOption} ${styles.deliveryOptionActive}`} disabled>
                    <Mail size={20} />
                    <span>Email</span>
                  </button>
                  <button className={styles.deliveryOption} disabled>
                    <Globe size={20} />
                    <span>Portal</span>
                  </button>
                  <button className={styles.deliveryOption} disabled>
                    <Printer size={20} />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className={styles.summaryCard}>
                <div className={styles.summaryDocPreview}>
                  <div className={styles.miniDoc} />
                </div>
                <div className={styles.summaryDetails}>
                  <h4>Statement Summary</h4>
                  <p className={styles.sumNotice}>
                    This runs the backend&apos;s monthly billing engine in the background; it does not report a statement count or delivery time.
                  </p>
                </div>
              </div>

              {statementMessage ? <p className={styles.cardTrendPositive}>{statementMessage}</p> : null}

              <div className={styles.modalFooterRight}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => setIsGenerateStatementOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className={styles.btnNavy}
                  disabled={generatingStatements}
                  onClick={async () => {
                    setGeneratingStatements(true);
                    try {
                      const result = await apiPost<{ status: string; message: string }>(
                        "/api/v1/admin/finance/batch-statements",
                      );
                      setStatementMessage(result.message);
                      toast(result.message || "Batch statement run started.", "success");
                    } catch (err) {
                      toastError(err, "Could not start the batch statement run.");
                      setStatementMessage(err instanceof Error ? err.message : "Failed to start batch run");
                    } finally {
                      setGeneratingStatements(false);
                    }
                  }}
                >
                  {generatingStatements ? "Starting..." : "Generate & Send"} <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
