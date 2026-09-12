"use client";

import React from "react";
import styles from "@/styles/SuccessModal.module.css";
import { Check, Download, Landmark } from "lucide-react";

type PaymentData = {
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
}

export default function SuccessModal({ isOpen, onClose, data }: SuccessModalProps) {
  if (!isOpen) return null;

  const isPaid = data.status === "Paid";
  const title = isPaid ? "Payment Receipt" : "Invoice Details";
  const subtitle = isPaid
    ? "Thank you for your timely payment."
    : `${data.status} balance — pay at the admin office or online when available.`;

  function downloadReceipt() {
    const content = [
      "TownSync Official Receipt",
      `Invoice: ${data.inv}`,
      `Description: ${data.description}`,
      `Date: ${data.date}`,
      `Amount: ${data.amount}`,
      `Status: ${data.status}`,
      "",
      "Breakdown",
      "Monthly HOA Dues: ₱ 1,200.00",
      "Water & Sewage: ₱ 150.00",
      "Trash Disposal: ₱ 100.00",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${data.inv.replace(/\s+/g, "-").toLowerCase()}-receipt.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.blueHeader}>
          <div className={styles.successIcon}>
            <Check size={32} strokeWidth={3} />
          </div>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        <div className={styles.content}>
          <div className={styles.mainInfo}>
            <div>
              <label>{isPaid ? "DATE PAID" : "INVOICE DATE"}</label>
              <p>{data.date}</p>
            </div>
            <div className={styles.textRight}>
              <label>{isPaid ? "AMOUNT PAID" : "AMOUNT DUE"}</label>
              <p className={styles.amountPaid}>{data.amount}</p>
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.breakdown}>
            <label className={styles.sectionLabel}>Breakdown</label>
            <div className={styles.breakdownRow}>
              <span>Monthly HOA Dues</span>
              <span>₱ 1,200.00</span>
            </div>
            <div className={styles.breakdownRow}>
              <span>Water & Sewage</span>
              <span>₱ 150.00</span>
            </div>
            <div className={styles.breakdownRow}>
              <span>Trash Disposal</span>
              <span>₱ 100.00</span>
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.totalRow}>
            <span>Total</span>
            <span>{data.amount}</span>
          </div>

          <button type="button" className={styles.downloadBtn} onClick={downloadReceipt}>
            <Download size={18} /> Download Receipt
          </button>

          <button type="button" className={styles.closeTextBtn} onClick={onClose}>
            Close Receipt
          </button>
        </div>

        <footer className={styles.footer}>
          <Landmark size={14} /> Official TownSync Documentation
        </footer>
      </div>
    </div>
  );
}
