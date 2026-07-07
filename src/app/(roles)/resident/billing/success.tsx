"use client";
import React from 'react';
import styles from "@/styles/SuccessModal.module.css";
import { Check, Download, Landmark, X } from "lucide-react";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export default function SuccessModal({ isOpen, onClose, data }: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Blue Header Section */}
        <div className={styles.blueHeader}>
          <div className={styles.successIcon}>
            <Check size={32} strokeWidth={3} />
          </div>
          <h2 className={styles.title}>Payment Successful</h2>
          <p className={styles.subtitle}>Thank you for your timely payment, John.</p>
        </div>

        {/* Receipt Content Section */}
        <div className={styles.content}>
          <div className={styles.mainInfo}>
            <div>
              <label>DATE PAID</label>
              <p>{data.date}</p>
            </div>
            <div className={styles.textRight}>
              <label>AMOUNT PAID</label>
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

          <button className={styles.downloadBtn}>
            <Download size={18} /> Download PDF Receipt
          </button>

          <button className={styles.closeTextBtn} onClick={onClose}>
            Close Receipt
          </button>
        </div>

        {/* Footer Brand */}
        <footer className={styles.footer}>
          <Landmark size={14} /> Official TownSync Documentation
        </footer>
      </div>
    </div>
  );
}