"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import styles from "@/styles/BillingPayments.module.css";
import SuccessModal from "./success";
import { Clock, Megaphone, Filter, Eye, CheckCircle2, AlertCircle } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import {
  BillingHistoryItem,
  BillingSummary,
  getBillingHistory,
  getBillingSummary,
  listAnnouncements,
} from "@/lib/api/resident";

type PaymentRow = {
  id?: number;
  date: string;
  description: string;
  inv: string;
  amount: string;
  status: "Paid" | "Unpaid" | "Overdue" | string;
};

function formatMoney(amount: number): string {
  return `₱ ${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function normalizeStatus(status: string): PaymentRow["status"] {
  const s = status.trim();
  if (s === "Paid" || s === "Unpaid" || s === "Overdue") return s;
  return s;
}

export default function BillingPayments() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | "Paid" | "Unpaid" | "Overdue">("All");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [history, setHistory] = useState<PaymentRow[]>([]);
  const [announcementTitle, setAnnouncementTitle] = useState("Community notice");
  const [announcementBody, setAnnouncementBody] = useState("Check announcements for the latest updates.");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sum, hist, anns] = await Promise.all([
          getBillingSummary(),
          getBillingHistory(1),
          listAnnouncements().catch(() => []),
        ]);
        if (cancelled) return;
        setSummary(sum);
        setHistory(
          (hist ?? []).map((item: BillingHistoryItem) => ({
            id: item.id,
            date: item.date,
            description: item.description,
            inv: item.invoice_number,
            amount: formatMoney(Number(item.amount)),
            status: normalizeStatus(item.status),
          }))
        );
        if (anns[0]) {
          setAnnouncementTitle(anns[0].title);
          setAnnouncementBody(anns[0].content);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to load billing."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showFilterMenu) return;
    function onPointerDown(e: MouseEvent) {
      if (!filterMenuRef.current?.contains(e.target as Node)) {
        setShowFilterMenu(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowFilterMenu(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showFilterMenu]);

  const filtered = useMemo(
    () =>
      statusFilter === "All" ? history : history.filter((item) => item.status === statusFilter),
    [history, statusFilter]
  );

  const handleViewClick = (payment: PaymentRow) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  return (
    <div className={styles.container}>
      <header className={`${styles.header} ts-fade-in-up`}>
        <h1 className={styles.pageTitle}>Billing & Payments</h1>
        <p className={styles.pageDesc}>
          Manage your resident ledger and upcoming dues securely.
        </p>
      </header>

      {error ? <p className={styles.errorBanner} role="alert">{error}</p> : null}
      {loading ? <p className={styles.loadingText}>Loading billing…</p> : null}

      <div className={`${styles.topGrid} ts-stagger`}>
        <section className={styles.balanceCard} style={{ "--ts-stagger-i": 0 } as CSSProperties}>
          <div className={styles.balanceHeader}>
            <span className={styles.cardLabel}>CURRENT BALANCE</span>
            <div className={styles.dueBadge}>
              <Clock size={14} /> {summary?.urgency_banner || "Due soon"}
            </div>
          </div>
          <div className={styles.amount}>
            {summary ? formatMoney(summary.current_balance) : "₱ —"}
          </div>
          <hr className={styles.divider} />
          <div className={styles.balanceFooter}>
            <strong>
              Due Date: {summary?.overall_due_date || "—"}
            </strong>
            <p>{summary?.breakdown_notes || "Includes monthly HOA & utilities when applicable."}</p>
          </div>
        </section>

        <aside className={styles.announcementCard} style={{ "--ts-stagger-i": 1 } as CSSProperties}>
          <div className={styles.announcementHeader}>
            <Megaphone size={18} className={styles.announceIcon} />
            <h3>Announcement</h3>
          </div>
          <div className={styles.announcementContent}>
            <div className={styles.announcementItem}>
              <div className={styles.bullet} />
              <div>
                <h4>{announcementTitle}</h4>
                <p>{announcementBody}</p>
              </div>
            </div>
          </div>
          <Link href="/resident/announcements" className={styles.viewLink}>
            View all notices
          </Link>
        </aside>
      </div>

      <section className={styles.historySection}>
        <div className={styles.tableHeader}>
          <h2>Payment History</h2>
          <div className={styles.filterWrap} ref={filterMenuRef}>
            <button
              type="button"
              className={styles.filterBtn}
              onClick={() => setShowFilterMenu((v) => !v)}
              aria-expanded={showFilterMenu}
            >
              <Filter size={14} /> Filter{statusFilter !== "All" ? `: ${statusFilter}` : ""}
            </button>
            {showFilterMenu ? (
              <div className={styles.filterMenu}>
                {(["All", "Paid", "Unpaid", "Overdue"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setStatusFilter(option);
                      setShowFilterMenu(false);
                    }}
                    className={`${styles.filterOption} ${statusFilter === option ? styles.filterOptionActive : ""}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th className={styles.textRight}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={`${item.inv}-${item.date}`}>
                  <td className={styles.dateCell}>{item.date}</td>
                  <td>
                    <div className={styles.descMain}>{item.description}</div>
                    <div className={styles.descSub}>{item.inv}</div>
                  </td>
                  <td className={styles.amountCell}>{item.amount}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td className={styles.textRight}>
                    <button
                      type="button"
                      onClick={() => handleViewClick(item)}
                      className={styles.actionBtn}
                      aria-label={`View ${item.inv}`}
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    No payments match this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {selectedPayment ? (
        <SuccessModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={selectedPayment}
        />
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getStatusClass = () => {
    switch (status) {
      case "Paid":
        return styles.statusPaid;
      case "Unpaid":
        return styles.statusUnpaid;
      case "Overdue":
        return styles.statusOverdue;
      default:
        return "";
    }
  };

  return (
    <span className={`${styles.statusBadge} ${getStatusClass()}`}>
      {status === "Paid" && <CheckCircle2 size={12} />}
      {status === "Overdue" && <AlertCircle size={12} />}
      {status}
    </span>
  );
}
