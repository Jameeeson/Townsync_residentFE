"use client";

import styles from "@/styles/review.module.css";
import { Bot, Camera, Send, Calendar } from "lucide-react";
import { useState } from "react";
import SuccessModal from "../success/page";

export default function ReviewPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = () => {
    // logic to submit data to your backend
    setIsSubmitted(true);
  };

  return (
    <div className={styles.container}>
      {/* Breadcrumbs */}

      <div className={styles.layout}>
        {/* Left Column: Summary */}
        <aside>
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <Bot size={24} /> AI Summary
            </div>
            
            <div className={styles.summaryItem}>
              <span className={styles.label}>Category</span>
              <span className={styles.value}>Plumbing</span>
            </div>

            <div className={styles.summaryItem}>
              <span className={styles.label}>Subject</span>
              <span className={styles.value}>Leaking Faucet</span>
            </div>

            <div className={styles.summaryItem}>
              <span className={styles.label}>Location</span>
              <span className={styles.value}>Master Bathroom - Right Sink</span>
            </div>

            <div className={styles.summaryItem}>
              <span className={styles.label}>Gathered Detail</span>
              <p className={styles.quote}>
                "The resident noted a steady drip occurring even when the handle is fully closed. Constant sound of running water."
              </p>
            </div>
          </div>

          <div className={styles.infoBox}>
            <h3 className={styles.infoTitle}>What happens next?</h3>
            <p className={styles.infoText}>
              Once you submit, a local maintenance technician will review the report and schedule a visit within 24-48 hours based on urgency.
            </p>
          </div>
        </aside>

        {/* Right Column: Form */}
        <main className={styles.mainCard}>
          <h2 className={styles.cardTitle}>Final Interventions</h2>

          <div className={styles.formGroup}>
            <div className={styles.inputHeader}>
              <label className={styles.label}>Detailed Description</label>
              <span className={styles.editableLabel}>Editable</span>
            </div>
            <textarea 
              className={styles.textarea}
              defaultValue="The faucet in the master bathroom has been leaking for 3 days. It's a steady drip from the spout itself. I've tried tightening the handles but the leak persists. It seems to be getting worse today."
            />
          </div>

          <div className={styles.flexGroup}>
            <div>
              <label className={styles.label}>Urgency Level</label>
              <select className={styles.select}>
                <option>Medium - Needs Attention</option>
                <option>Low - General Maintenance</option>
                <option>High - Emergency</option>
              </select>
            </div>
            <div>
              <label className={styles.label}>Preferred Visit Date</label>
              <input type="text" placeholder="mm/dd/yyyy" className={styles.dateInput} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Reference Images</label>
            <div className={styles.imageGrid}>
              <div className={styles.imagePreview}>
                <div className={styles.imageBadge}>Submitted by User</div>
                <img src="/faucet-leak.jpg" alt="Leaking faucet" />
              </div>
              <div className={styles.uploadPlaceholder}>
                <Camera size={24} />
                <span style={{ fontSize: '11px', fontWeight: 600 }}>Add More</span>
              </div>
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '12px', fontStyle: 'italic' }}>
              You can upload up to 4 images to help our team diagnose the issue.
            </p>
          </div>

          <div className={styles.footer}>
            <button className={styles.btnSecondary} type="button">Discard Request</button>
            <button className={styles.btnPrimary} type="button" onClick={handleSubmit}>
              Submit Service Request <Send size={16} />
            </button>
          </div>
        </main>
      </div>

      <SuccessModal
        isOpen={isSubmitted}
        onClose={() => setIsSubmitted(false)}
      />
    </div>
  );
}