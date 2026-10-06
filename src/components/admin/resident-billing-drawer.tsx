"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Download, Eye, Pencil, Plus, Trash2, X } from "lucide-react";
import { apiDelete, apiDownload, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import DocumentViewer, { type ViewerSource } from "@/components/admin/document-viewer";
import styles from "./resident-billing-drawer.module.css";

type StatementSummary = {
  id: number;
  invoice_number: string;
  due_date: string;
  status: "Paid" | "Unpaid" | "Overdue";
  due_label: string | null;
  is_due_today: boolean;
  total: number;
  paid: number;
  balance: number;
  extra_charges: number;
  pending_receipts: number;
};

type ResidentBilling = {
  resident_id: number;
  resident_name: string;
  unit_number: string | null;
  email: string | null;
  account_deleted?: boolean;
  expected_total: number;
  invoices: StatementSummary[];
  /** Where a charge goes when the resident has nothing unpaid: their next monthly statement. */
  next_statement: { invoice_id: number | null; due_date: string; exists: boolean } | null;
};

type Line = { id: number | null; kind: "dues" | "charge" | "penalty"; category: string; label: string; amount: number };
type Receipt = {
  id: number;
  file_path: string;
  note: string | null;
  status: string;
  submitted_at: string | null;
  review_note: string | null;
  reviewed_at: string | null;
};
type StatementDetail = {
  id: number;
  invoice_number: string;
  due_date: string | null;
  status: "Paid" | "Unpaid" | "Overdue";
  due_label: string | null;
  is_due_today: boolean;
  lines: Line[];
  total: number;
  paid: number;
  balance: number;
  payments: { amount: number; method: string | null; reference: string | null; paid_at: string | null }[];
  receipts: Receipt[];
};

const CATEGORIES = ["Maintenance", "Utilities", "Other"] as const;
const METHODS = ["Bank Transfer", "E-Wallet", "Cash", "Check"];

function peso(amount: number): string {
  return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "—";
  return (parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`).toUpperCase();
}

function fileExtension(stored: string): string {
  const match = /\.[a-z0-9]+$/i.exec(stored);
  return match ? match[0].toLowerCase() : "";
}

function when(value: string | null): string {
  if (!value) return "";
  const d = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function apiPath(stored: string): string {
  return stored.startsWith("/") ? stored : `/${stored}`;
}

function statusClass(s: string, today: boolean): string {
  if (s === "Paid") return styles.paid;
  if (s === "Overdue") return styles.overdue;
  return today ? styles.today : styles.unpaid;
}

/**
 * One place to see and adjust everything a resident owes: pick a statement, add or remove extra charges
 * (Maintenance, Utilities, ...), review receipts the resident uploaded, and record payments. The total at the
 * bottom is what the resident is expected to pay overall.
 */
export default function ResidentBillingDrawer({
  residentId,
  invoiceId,
  onClose,
  onChanged,
}: {
  residentId: number;
  invoiceId: number | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { toast, toastError } = useToast();
  const [book, setBook] = useState<ResidentBilling | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(invoiceId);
  const [detail, setDetail] = useState<StatementDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<ViewerSource | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Maintenance");
  const [label, setLabel] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [editingDues, setEditingDues] = useState(false);
  const [duesValue, setDuesValue] = useState("");

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState(METHODS[0]);
  const [payDate, setPayDate] = useState("");
  const [payRef, setPayRef] = useState("");

  const [rejecting, setRejecting] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const loadBook = useCallback(async () => {
    try {
      const data = await apiGet<ResidentBilling>(`/api/v1/admin/finance/residents/${residentId}/billing`);
      setBook(data);
      setSelectedId((current) => current ?? data.invoices.find((i) => i.status !== "Paid")?.id ?? data.invoices[0]?.id ?? null);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load this resident's bills.");
    }
  }, [residentId]);

  const loadDetail = useCallback(async (id: number) => {
    try {
      const data = await apiGet<StatementDetail>(`/api/v1/admin/finance/invoices/${id}`);
      setDetail(data);
      setPayAmount(data.balance > 0 ? String(data.balance) : "");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load this statement.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on open
    void loadBook();
  }, [loadBook]);

  useEffect(() => {
    if (selectedId == null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch when another statement is chosen
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const refresh = async () => {
    await Promise.all([loadBook(), selectedId != null ? loadDetail(selectedId) : Promise.resolve()]);
    onChanged();
  };

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast(success, "success");
      await refresh();
    } catch (err) {
      toastError(err, "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  const addCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    const amount = Number(chargeAmount.replace(/[^0-9.]/g, ""));
    if (!amount || amount <= 0) {
      toast("Enter an amount greater than zero.", "warning");
      return;
    }
    const payload = { category, label: label.trim() || undefined, amount };
    if (settled) {
      // Nothing unpaid to put it on: it goes on the next monthly statement, which is created now.
      setBusy(true);
      try {
        const result = await apiPost<{ created_statement: boolean; invoice: { id: number } }>(
          `/api/v1/admin/finance/residents/${residentId}/charges`,
          payload,
        );
        toast(
          result.created_statement
            ? `${category} charge added on a new statement. The resident was notified.`
            : `${category} charge added. The resident was notified.`,
          "success",
        );
        if (selectedId === result.invoice.id) {
          await refresh();
        } else {
          setSelectedId(result.invoice.id);
          await loadBook();
          onChanged();
        }
      } catch (err) {
        toastError(err, "Could not add the charge.");
      } finally {
        setBusy(false);
      }
    } else {
      await run(
        () => apiPost(`/api/v1/admin/finance/invoices/${detail.id}/charges`, payload),
        `${category} charge added. The resident was notified.`,
      );
    }
    setLabel("");
    setChargeAmount("");
    setShowAdd(false);
  };

  const recordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    const amount = Number(payAmount.replace(/[^0-9.]/g, ""));
    if (!amount || amount <= 0) {
      toast("Enter the amount received.", "warning");
      return;
    }
    await run(
      () =>
        apiPost(`/api/v1/admin/finance/invoices/${detail.id}/payments`, {
          amount_paid: amount,
          payment_method: payMethod,
          transaction_ref: payRef.trim() || undefined,
          paid_at: payDate || undefined,
        }),
      `Payment of ${peso(amount)} recorded.`,
    );
    setPayRef("");
    setPayDate("");
  };

  const saveDues = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    const amount = Number(duesValue.replace(/[^0-9.]/g, ""));
    if (!amount || amount <= 0) {
      toast("Enter the monthly dues amount.", "warning");
      return;
    }
    await run(
      () => apiPatch(`/api/v1/admin/finance/invoices/${detail.id}/dues`, { amount }),
      "HOA dues updated. The resident was notified.",
    );
    setEditingDues(false);
  };

  const unpaidCount = book?.invoices.filter((i) => i.status !== "Paid").length ?? 0;
  const settled = detail?.status === "Paid";
  const nextStatement = book?.next_statement ?? null;

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Resident bills" onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div className={styles.who}>
            <div className={styles.avatar}>{initials(book?.resident_name ?? "")}</div>
            <div>
              <h2>
                {book?.resident_name ?? "Loading…"}
                {book?.account_deleted ? <span className={styles.deletedTag}>Account deleted</span> : null}
              </h2>
              <p>{[book?.unit_number, book?.email].filter(Boolean).join(" · ") || " "}</p>
            </div>
          </div>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        {loadError ? <p className={styles.error} role="alert">{loadError}</p> : null}

        <div className={styles.body}>
          <div className={styles.statements} role="tablist" aria-label="Statements">
            {book?.invoices.map((inv) => (
              <button
                key={inv.id}
                type="button"
                role="tab"
                aria-selected={inv.id === selectedId}
                className={`${styles.chip} ${inv.id === selectedId ? styles.chipActive : ""}`}
                onClick={() => setSelectedId(inv.id)}
              >
                <span>{inv.due_date}</span>
                <span className={`${styles.dot} ${statusClass(inv.status, inv.is_due_today)}`} />
                {inv.pending_receipts > 0 ? <span className={styles.receiptDot} title="Receipt waiting" /> : null}
              </button>
            ))}
            {book && book.invoices.length === 0 ? <p className={styles.muted}>No statements yet for this resident.</p> : null}
          </div>

          {detail ? (
            <>
              <div className={styles.statusRow}>
                <strong>{detail.invoice_number}</strong>
                <span>Due {detail.due_date}</span>
                <span className={`${styles.badge} ${statusClass(detail.status, detail.is_due_today)}`}>
                  {detail.is_due_today ? "Due today" : detail.status}
                </span>
                <button
                  type="button"
                  className={styles.ghost}
                  onClick={async () => {
                    try {
                      const blob = await apiDownload(`/api/v1/admin/finance/invoices/${detail.id}/statement.pdf`);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `statement_${detail.invoice_number}.pdf`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      toastError(err, "Could not download the statement.");
                    }
                  }}
                >
                  <Download size={14} /> PDF
                </button>
                {detail.due_label && detail.status !== "Paid" && !detail.is_due_today ? (
                  <span className={styles.muted}>{detail.due_label}</span>
                ) : null}
              </div>

              <section className={styles.card} aria-label="Bill breakdown">
                <h3>Bill breakdown</h3>
                <table className={styles.lines} data-keep-table>
                  <tbody>
                    {detail.lines.map((line) => (
                      <tr key={`${line.kind}-${line.id ?? line.label}`}>
                        <td>
                          {line.label}
                          {line.kind === "charge" && line.category !== line.label ? <em> · {line.category}</em> : null}
                        </td>
                        <td className={styles.amount}>
                          {line.kind === "dues" && editingDues ? (
                            <form className={styles.duesForm} onSubmit={saveDues}>
                              <input
                                value={duesValue}
                                onChange={(e) => setDuesValue(e.target.value)}
                                inputMode="decimal"
                                aria-label="Monthly HOA dues"
                                autoFocus
                              />
                              <button type="submit" className={styles.primary} disabled={busy}>Save</button>
                              <button type="button" className={styles.ghost} onClick={() => setEditingDues(false)}>Cancel</button>
                            </form>
                          ) : (
                            peso(line.amount)
                          )}
                        </td>
                        <td className={styles.rowAction}>
                          {line.kind === "dues" && !settled && !editingDues ? (
                            <button
                              type="button"
                              className={styles.iconBtn}
                              aria-label="Edit monthly HOA dues"
                              title="Edit the HOA dues on this statement"
                              onClick={() => {
                                setDuesValue(String(line.amount));
                                setEditingDues(true);
                              }}
                            >
                              <Pencil size={15} />
                            </button>
                          ) : null}
                          {line.kind === "charge" && !settled ? (
                            <button
                              type="button"
                              className={styles.iconBtn}
                              aria-label={`Remove ${line.label}`}
                              disabled={busy}
                              onClick={() =>
                                run(() => apiDelete(`/api/v1/admin/finance/invoices/${detail.id}/charges/${line.id}`), "Charge removed.")
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {showAdd ? (
                  <form className={styles.addForm} onSubmit={addCharge}>
                    <select value={category} onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])} aria-label="Charge type">
                      {CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="What is it for? (optional)" maxLength={80} />
                    <input
                      value={chargeAmount}
                      onChange={(e) => setChargeAmount(e.target.value)}
                      placeholder="₱ 0.00"
                      inputMode="decimal"
                      aria-label="Amount"
                      required
                    />
                    <button type="submit" className={styles.primary} disabled={busy}>Add</button>
                    <button type="button" className={styles.ghost} onClick={() => setShowAdd(false)}>Cancel</button>
                  </form>
                ) : (
                  <button type="button" className={styles.addBtn} onClick={() => setShowAdd(true)}>
                    <Plus size={15} /> Add charge (maintenance, utilities, other)
                  </button>
                )}
                <p className={styles.alertNote}>
                  <Bell size={13} />
                  <span>
                    {settled
                      ? nextStatement
                        ? nextStatement.exists
                          ? `This statement is paid, so a new charge goes on their next statement (due ${nextStatement.due_date}).`
                          : `This statement is paid, so a new charge creates their next monthly statement (due ${nextStatement.due_date}, with the regular HOA dues).`
                        : "This statement is paid, so a new charge goes on their next monthly statement."
                      : "The resident is emailed and sees a notice on their Billing page whenever a charge or the HOA dues change."}
                  </span>
                </p>

                <dl className={styles.totals}>
                  <div><dt>Statement total</dt><dd>{peso(detail.total)}</dd></div>
                  {detail.paid > 0 ? <div><dt>Paid so far</dt><dd>− {peso(detail.paid)}</dd></div> : null}
                  <div className={styles.balance}><dt>Balance</dt><dd>{peso(detail.balance)}</dd></div>
                </dl>
              </section>

              {detail.receipts.length > 0 ? (
                <section className={styles.card} aria-label="Receipts from the resident">
                  <h3>Receipts from the resident</h3>
                  {detail.receipts.map((r) => (
                    <div key={r.id} className={styles.receipt}>
                      <div className={styles.receiptTop}>
                        <span className={`${styles.badge} ${r.status === "Verified" ? styles.paid : r.status === "Rejected" ? styles.overdue : styles.unpaid}`}>
                          {r.status === "Pending" ? "Needs review" : r.status}
                        </span>
                        <span className={styles.muted}>Sent {when(r.submitted_at)}</span>
                        <button
                          type="button"
                          className={styles.ghost}
                          onClick={() =>
                            setViewer({
                              name: `Receipt ${detail.invoice_number}${fileExtension(r.file_path)}`,
                              load: () => apiDownload(apiPath(r.file_path)),
                            })
                          }
                        >
                          <Eye size={14} /> View
                        </button>
                      </div>
                      {r.note ? <p className={styles.note}>&ldquo;{r.note}&rdquo;</p> : null}
                      {r.reviewed_at ? (
                        <p className={styles.muted}>
                          {r.status === "Verified" ? "Confirmed" : "Reviewed"} {when(r.reviewed_at)}
                          {r.review_note ? ` · Reason: ${r.review_note}` : ""}
                        </p>
                      ) : null}
                      {r.status === "Pending" ? (
                        rejecting === r.id ? (
                          <div className={styles.rejectRow}>
                            <input
                              value={rejectNote}
                              onChange={(e) => setRejectNote(e.target.value)}
                              placeholder="Tell the resident why (e.g. photo is blurry)"
                              maxLength={300}
                              aria-label="Reason"
                            />
                            <button
                              type="button"
                              className={styles.danger}
                              disabled={busy || rejectNote.trim().length < 3}
                              onClick={async () => {
                                await run(
                                  () => apiPost(`/api/v1/admin/finance/receipts/${r.id}/reject`, { note: rejectNote.trim() }),
                                  "Receipt rejected. The resident was told why.",
                                );
                                setRejecting(null);
                                setRejectNote("");
                              }}
                            >
                              Send
                            </button>
                            <button type="button" className={styles.ghost} onClick={() => setRejecting(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div className={styles.rejectRow}>
                            <button
                              type="button"
                              className={styles.primary}
                              disabled={busy}
                              title={`Records a payment of ${peso(detail.balance)} (the remaining balance)`}
                              onClick={() =>
                                run(
                                  () => apiPost(`/api/v1/admin/finance/receipts/${r.id}/verify`, { payment_method: "Bank Transfer" }),
                                  `Payment of ${peso(detail.balance)} confirmed.`,
                                )
                              }
                            >
                              <CheckCircle2 size={14} /> Confirm payment ({peso(detail.balance)})
                            </button>
                            <button type="button" className={styles.danger} onClick={() => setRejecting(r.id)}>Reject</button>
                          </div>
                        )
                      ) : null}
                    </div>
                  ))}
                </section>
              ) : null}

              {!settled ? (
                <section className={styles.card} aria-label="Record a payment">
                  <h3>Record a payment</h3>
                  <form className={styles.payForm} onSubmit={recordPayment}>
                    <label>
                      Amount received
                      <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} inputMode="decimal" placeholder="₱ 0.00" required />
                    </label>
                    <label>
                      Method
                      <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                        {METHODS.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Date received
                      <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                    </label>
                    <label>
                      Reference (optional)
                      <input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Auto-generated if blank" maxLength={80} />
                    </label>
                    <button type="submit" className={styles.primary} disabled={busy}>Record payment</button>
                  </form>
                </section>
              ) : null}

              {detail.payments.length > 0 ? (
                <section className={styles.card} aria-label="Payments received">
                  <h3>Payments received</h3>
                  {detail.payments.map((p, i) => (
                    <div key={i} className={styles.payment}>
                      <span>{p.paid_at ? (p.paid_at.length > 10 ? when(p.paid_at) : p.paid_at) : "—"} · {p.method ?? "—"}</span>
                      <span className={styles.muted}>{p.reference}</span>
                      <strong>{peso(p.amount)}</strong>
                    </div>
                  ))}
                </section>
              ) : null}
            </>
          ) : !loadError ? (
            <p className={styles.muted}>Loading statement…</p>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <div>
            <span>Expected overall bill</span>
            <strong>{book ? peso(book.expected_total) : "—"}</strong>
            <small>
              {unpaidCount === 0 ? "Nothing outstanding" : `across ${unpaidCount} unpaid statement${unpaidCount === 1 ? "" : "s"}`}
            </small>
          </div>
          {book && book.expected_total > 0 && book.invoices.some((i) => i.status === "Overdue") ? (
            <span className={styles.warn}><AlertTriangle size={14} /> Includes overdue statements</span>
          ) : null}
        </footer>
      </div>
      {viewer ? <DocumentViewer source={viewer} onClose={() => setViewer(null)} /> : null}
    </div>
  );
}
