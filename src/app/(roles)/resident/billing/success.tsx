"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "@/styles/SuccessModal.module.css";
import { AlertCircle, Check, Clock, Download, Landmark, Upload } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { formatDueDate } from "@/lib/billingDates";
import { downloadStatementPdf, getBillingInvoice, uploadBillingReceipt, type BillingInvoice } from "@/lib/api/resident";

type PaymentData = {
  id?: number;
  date: string;
  description: string;
  inv: string;
  amount: string;
  status: string;
};

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PaymentData;
  /** Called after a receipt is sent, so the page can refresh its list. */
  onChanged?: () => void;
}

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

/** A stored UTC timestamp ("2026-10-06 13:23:21") as the resident's local date and time. */
function when(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value.length > 10 ? `${value.replace(" ", "T")}Z` : `${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return value.length > 10
    ? d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function peso(amount: number): string {
  return `₱ ${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SuccessModal({ isOpen, onClose, data, onChanged }: SuccessModalProps) {
  const [fetchedInvoice, setInvoice] = useState<BillingInvoice | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const invoice = isOpen && data.id ? fetchedInvoice : null;

  useEffect(() => {
    if (!isOpen || !data.id) return;
    let cancelled = false;
    getBillingInvoice(data.id)
      .then((inv) => {
        if (!cancelled) setInvoice(inv);
      })
      .catch(() => {
        if (!cancelled) setInvoice(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, data.id]);

  if (!isOpen) return null;

  const status = invoice?.status ?? data.status;
  const isPaid = status === "Paid";
  const dueToday = Boolean(invoice?.is_due_today);
  const title = isPaid ? "Payment Receipt" : "Statement Details";
  const subtitle = isPaid
    ? "Thank you for your timely payment."
    : dueToday
      ? "This statement is due today."
      : `${status} balance. Pay at the admin office, or pay online and upload your receipt below.`;

  const total = invoice ? peso(invoice.amount) : data.amount;
  const lineItems = invoice?.line_items?.length
    ? invoice.line_items.map((li) => ({
        label: li.label,
        category: li.description,
        amount: peso(li.amount),
        kind: li.kind ?? "charge",
      }))
    : [{ label: data.description, category: null, amount: data.amount, kind: "dues" }];

  async function downloadStatement() {
    if (!data.id) return;
    setDownloading(true);
    setError("");
    try {
      const blob = await downloadStatementPdf(data.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `statement-${data.inv.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download the statement.");
    } finally {
      setDownloading(false);
    }
  }

  async function sendReceipt() {
    if (!file || !data.id) return;
    setError("");
    if (file.size > MAX_RECEIPT_BYTES) {
      setError("That file is over 10 MB. Please choose a smaller photo.");
      return;
    }
    setSending(true);
    try {
      const updated = await uploadBillingReceipt(data.id, file, note);
      setInvoice(updated);
      setFile(null);
      setNote("");
      if (fileInput.current) fileInput.current.value = "";
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiClientError || err instanceof Error ? err.message : "Could not send your receipt.");
    } finally {
      setSending(false);
    }
  }

  const receipts = invoice?.receipts ?? [];
  const pending = receipts.find((r) => r.status === "Pending");
  const lastRejected = !pending ? receipts.find((r) => r.status === "Rejected") : undefined;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.blueHeader}>
          <div className={styles.successIcon}>
            {isPaid ? <Check size={32} strokeWidth={3} /> : dueToday ? <AlertCircle size={30} /> : <Clock size={30} />}
          </div>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        <div className={styles.content}>
          <div className={styles.mainInfo}>
            <div>
              <label>DUE DATE</label>
              <p>{formatDueDate(invoice?.due_date ?? data.date)}</p>
              {isPaid && invoice?.payments?.length ? (
                <span className={styles.chip}>Paid {when(invoice.payments[invoice.payments.length - 1].paid_at)}</span>
              ) : null}
              {!isPaid && invoice?.due_label ? (
                <span className={`${styles.chip} ${dueToday || (invoice.days_left ?? 1) < 0 ? styles.chipAlert : ""}`}>
                  {invoice.due_label}
                </span>
              ) : null}
            </div>
            <div className={styles.textRight}>
              <label>{isPaid ? "AMOUNT PAID" : "BALANCE TO PAY"}</label>
              <p className={styles.amountPaid}>{invoice && !isPaid ? peso(invoice.balance ?? invoice.amount) : total}</p>
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.breakdown}>
            <label className={styles.sectionLabel}>What you are paying for</label>
            {lineItems.map((li, idx) => (
              <div className={styles.breakdownRow} key={idx}>
                <span>
                  {li.label}
                  {li.category && li.category !== li.label && li.kind === "charge" ? (
                    <em className={styles.category}> · {li.category}</em>
                  ) : null}
                </span>
                <span>{li.amount}</span>
              </div>
            ))}
          </div>

          <div className={styles.divider} />

          <div className={styles.totalRow}>
            <span>Total</span>
            <span>{total}</span>
          </div>
          {invoice && (invoice.paid ?? 0) > 0 ? (
            <>
              <div className={styles.breakdownRow}>
                <span>Already paid</span>
                <span>− {peso(invoice.paid ?? 0)}</span>
              </div>
              <div className={styles.breakdownRow}>
                <strong>Remaining</strong>
                <strong>{peso(invoice.balance ?? 0)}</strong>
              </div>
            </>
          ) : null}

          {invoice && (invoice.payments?.length ?? 0) > 0 ? (
            <div className={styles.receiptList}>
              <label className={styles.sectionLabel}>Payments received</label>
              {invoice.payments?.map((p, i) => (
                <div key={i} className={styles.paymentRow}>
                  <span>
                    <strong>{when(p.paid_at)}</strong>
                    <em className={styles.category}> · {p.method ?? "Payment"}</em>
                  </span>
                  <span>{peso(p.amount)}</span>
                </div>
              ))}
            </div>
          ) : null}

          {receipts.length > 0 ? (
            <div className={styles.receiptList}>
              <label className={styles.sectionLabel}>Your receipts</label>
              {receipts.map((r) => (
                <div key={r.id} className={styles.receiptRow}>
                  <span
                    className={`${styles.receiptStatus} ${
                      r.status === "Verified" ? styles.receiptOk : r.status === "Rejected" ? styles.receiptBad : ""
                    }`}
                  >
                    {r.status === "Pending" ? "Under review" : r.status === "Verified" ? "Confirmed" : "Not accepted"}
                  </span>
                  <span className={styles.receiptMeta}>
                    Sent {when(r.submitted_at)}
                    {r.reviewed_at ? ` · ${r.status === "Verified" ? "Confirmed" : "Reviewed"} ${when(r.reviewed_at)}` : ""}
                    {r.review_note ? ` · Reason: ${r.review_note}` : ""}
                  </span>
                </div>
              ))}
              {pending ? (
                <p className={styles.hint}>We got your receipt and will confirm your payment shortly.</p>
              ) : null}
            </div>
          ) : null}

          {invoice?.can_upload_receipt ? (
            <div className={styles.uploadBox}>
              <label className={styles.sectionLabel}>Paid online? Upload your receipt</label>
              {lastRejected ? (
                <p className={styles.errorText}>
                  Your last receipt was not accepted{lastRejected.review_note ? ` (reason: ${lastRejected.review_note})` : ""}. Please send a new one.
                </p>
              ) : null}
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className={styles.fileInput}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                aria-label="Receipt photo or PDF"
              />
              <input
                type="text"
                className={styles.noteInput}
                placeholder="Reference number or note (optional)"
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <p className={styles.hint}>Photo or PDF up to 10 MB. Your bill stays unpaid until we confirm it.</p>
              {error ? <p className={styles.errorText} role="alert">{error}</p> : null}
              <button type="button" className={styles.uploadBtn} disabled={!file || sending} onClick={sendReceipt}>
                <Upload size={16} /> {sending ? "Sending…" : "Send receipt"}
              </button>
            </div>
          ) : null}

          <button type="button" className={styles.downloadBtn} onClick={downloadStatement} disabled={downloading || !data.id}>
            <Download size={18} /> {downloading ? "Preparing PDF…" : "Download Statement (PDF)"}
          </button>

          <button type="button" className={styles.closeTextBtn} onClick={onClose}>
            Close
          </button>
        </div>

        <footer className={styles.footer}>
          <Landmark size={14} /> Official TownSync Documentation
        </footer>
      </div>
    </div>
  );
}
