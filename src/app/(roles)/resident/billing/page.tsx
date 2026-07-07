"use client";
import React, { useState } from 'react';
import styles from "@/styles/BillingPayments.module.css";
import SuccessModal from "./success";
import { 
  Clock, 
  Megaphone, 
  Filter, 
  Eye, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

const PaymentHistory = [
  {
    date: "Oct 01, 2023",
    description: "Monthly Dues + Utilities",
    inv: "Inv #4092",
    amount: "₱ 1,450.00",
    status: "Unpaid"
  },
  {
    date: "Sep 01, 2023",
    description: "Monthly Dues",
    inv: "Inv #3981",
    amount: "₱ 1,200.00",
    status: "Paid"
  },
  {
    date: "Aug 01, 2023",
    description: "Monthly Dues",
    inv: "Inv #3820",
    amount: "₱ 1,200.00",
    status: "Paid"
  },
  {
    date: "Mar 15, 2023",
    description: "Pool Key Replacement",
    inv: "Inv #3105",
    amount: "₱ 50.00",
    status: "Overdue"
  }
];

export default function BillingPayments() {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const handleViewClick = (payment: any) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };
  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Billing & Payments</h1>
        <p className={styles.pageDesc}>
          Manage your resident ledger and upcoming dues securely.
        </p>
      </header>

      {/* Top Grid: Balance & Announcement */}
      <div className={styles.topGrid}>
        {/* Current Balance Card */}
        <section className={styles.balanceCard}>
          <div className={styles.balanceHeader}>
            <span className={styles.cardLabel}>CURRENT BALANCE</span>
            <div className={styles.dueBadge}>
              <Clock size={14} /> Due in 5 Days
            </div>
          </div>
          <div className={styles.amount}>₱ 1,450.00</div>
          <hr className={styles.divider} />
          <div className={styles.balanceFooter}>
            <strong>Due Date: November 1, 2023</strong>
            <p>Includes monthly HOA & recent water usage.</p>
          </div>
        </section>

        {/* Announcement Card */}
        <aside className={styles.announcementCard}>
          <div className={styles.announcementHeader}>
            <Megaphone size={18} className={styles.announceIcon} />
            <h3>Announcement</h3>
          </div>
          <div className={styles.announcementContent}>
            <div className={styles.announcementItem}>
              <div className={styles.bullet} />
              <div>
                <h4>Annual Assessment Rate</h4>
                <p>The 2024 HOA assessment rate will remain unchanged.</p>
              </div>
            </div>
          </div>
          <a href="#" className={styles.viewLink}>View all notices</a>
        </aside>
      </div>

      {/* Payment History Table Section */}
      <section className={styles.historySection}>
        <div className={styles.tableHeader}>
          <h2>Payment History</h2>
          <button className={styles.filterBtn}>
            <Filter size={14} /> Filter
          </button>
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
              {PaymentHistory.map((item, index) => (
                <tr key={index}>
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
                    onClick={() => handleViewClick(item)}
                    className={styles.actionBtn}>
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

        {selectedPayment && (
        <SuccessModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          data={selectedPayment}
        />
      )}
    </div>
  );
}

// Sub-component for Status Badges
function StatusBadge({ status }: { status: string }) {
  const getStatusClass = () => {
    switch (status) {
      case "Paid": return styles.statusPaid;
      case "Unpaid": return styles.statusUnpaid;
      case "Overdue": return styles.statusOverdue;
      default: return "";
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