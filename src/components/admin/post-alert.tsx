"use client";

import React, { useState } from "react";
import { 
  ArrowLeft, 
  ChevronDown, 
  Bell, 
  User, 
  Share2, 
  Lightbulb,
  Pin,
  Signal,
  Wifi,
  Battery
} from "lucide-react";
import { apiPost, ApiError } from "../../lib/api";
import { useToast } from "../ui/toast";
import styles from "./post-alert.module.css";

type PostAlertPageProps = {
  onClose?: () => void;
};

const AUDIENCE_OPTIONS: { label: string; value: "All" | "Resident" | "Staff" }[] = [
  { label: "All Residents & Staff", value: "All" },
  { label: "Residents Only", value: "Resident" },
  { label: "Staff Only", value: "Staff" },
];

function audienceToBackendValue(audience: string): "All" | "Resident" | "Staff" {
  return AUDIENCE_OPTIONS.find((o) => o.label === audience)?.value ?? "All";
}

export default function PostAlertPage({ onClose }: PostAlertPageProps) {
  const { toast, toastError } = useToast();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [audience, setAudience] = useState(AUDIENCE_OPTIONS[0].label);
  const [content, setContent] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [expiry, setExpiry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackIsError, setFeedbackIsError] = useState(false);

  const handlePostAnnouncement = async () => {
    if (!title.trim() || !content.trim()) {
      setFeedback("Title and content are required.");
      setFeedbackIsError(true);
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiPost("/api/v1/admin/operations/announcements", {
        title: title.trim(),
        content: content.trim(),
        target_audience: audienceToBackendValue(audience),
        category,
        priority: isUrgent ? "Urgent" : "Normal",
        is_pinned: isPinned,
        expiry_date: expiry || null,
      });
      setFeedback("Alert posted successfully.");
      toast("Alert posted to the community.", "success");
      setFeedbackIsError(false);
      setTitle("");
      setContent("");
      setIsUrgent(false);
      setIsPinned(false);
      setExpiry("");
      setTimeout(() => onClose?.(), 1200);
    } catch (err) {
      toastError(err, "Could not post the alert.");
      setFeedback(err instanceof ApiError ? err.message : "Failed to post the alert.");
      setFeedbackIsError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Header */}
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onClose} aria-label="Close">
          <ArrowLeft size={24} />
        </button>
        <h1>Post Alert</h1>
        <p>Reach your community instantly with updates and notices.</p>
      </header>

      <div className={styles.mainGrid}>
        {/* Left Column: Form */}
        <section className={styles.formCard}>
          <div className={styles.formGroup}>
            <label>Announcement Title</label>
            <input 
              type="text" 
              placeholder="e.g. Scheduled Water Maintenance"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Category</label>
              <div className={styles.selectWrapper}>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option>General</option>
                  <option>Maintenance</option>
                  <option>Security</option>
                  <option>Billing</option>
                  <option>Event</option>
                </select>
                <ChevronDown size={16} className={styles.selectIcon} />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Target Audience</label>
              <div className={styles.selectWrapper}>
                <select value={audience} onChange={(e) => setAudience(e.target.value)}>
                  {AUDIENCE_OPTIONS.map((o) => (
                    <option key={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className={styles.selectIcon} />
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Content</label>
            <textarea 
              placeholder="Provide detailed information about the announcement..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
            />
          </div>

          <div className={styles.divider} />

          <div className={styles.urgentToggleBox}>
            <div className={styles.toggleIcon}>
              <Bell size={20} color="#1f4a9e" />
            </div>
            <div className={styles.toggleText}>
              <h3>Mark as Urgent</h3>
              <p>Residents see an Urgent badge on this announcement.</p>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={isUrgent} onChange={() => setIsUrgent(!isUrgent)} aria-label="Mark as urgent" />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.urgentToggleBox}>
            <div className={styles.toggleIcon}>
              <Pin size={20} color="#1f4a9e" />
            </div>
            <div className={styles.toggleText}>
              <h3>Pin to Top</h3>
              <p>Pinned announcements stay first in the resident feed.</p>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={isPinned} onChange={() => setIsPinned(!isPinned)} aria-label="Pin to top" />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.formGroup}>
            <label>Expires (optional)</label>
            <input type="datetime-local" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>

          {feedback ? (
            <p
              role={feedbackIsError ? "alert" : undefined}
              style={{
                margin: 0,
                fontSize: "0.85rem",
                fontWeight: 600,
                color: feedbackIsError ? "#b91c1c" : "#047857",
              }}
            >
              {feedback}
            </p>
          ) : null}

          <div className={styles.formActions}>
            <button type="button" className={styles.textButton} onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handlePostAnnouncement}
              disabled={submitting}
            >
              {submitting ? "Posting..." : "Post Announcement"}
            </button>
          </div>
        </section>

        {/* Right Column: Preview */}
        <aside className={styles.previewColumn}>
          <p className={styles.previewLabel}>LIVE PREVIEW</p>
          
          <div className={styles.phoneMockup}>
            <div className={styles.statusLine}>
              <div className={styles.statusIcons}>
                <Signal size={14} />
                <Wifi size={14} />
              </div>
              <span className={styles.time}>9:41 AM</span>
              <Battery size={14} />
            </div>

            <div className={styles.phoneContent}>
              <div className={styles.previewMeta}>
                <span className={styles.categoryBadge}>{isUrgent ? `Urgent - ${category}` : category}{isPinned ? " (Pinned)" : ""}</span>
                <span className={styles.todayText}>Today</span>
              </div>

              <h2 className={styles.previewTitle}>
                {title || "ALERT TITLE"}
              </h2>

              <div className={styles.previewImage}>
                <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80" alt="Building" />
              </div>

              <p className={styles.previewBody}>
                {content || "Your content will appear here as you type. This preview reflects exactly how residents will see the post in their TownCare app."}
              </p>

              <div className={styles.authorSection}>
                <div className={styles.avatar}>
                  <User size={16} />
                </div>
                <div className={styles.authorInfo}>
                  <strong>Property Management</strong>
                  <span>Sent to: {audience}</span>
                </div>
              </div>

              <div className={styles.previewActions}>
                <button className={styles.ackButton}>Acknowledge</button>
                <button className={styles.shareIconButton}><Share2 size={18} /></button>
              </div>
            </div>
          </div>

          <div className={styles.proTip}>
            <Lightbulb size={20} color="#059669" />
            <p><strong>Pro Tip:</strong> Keep the title short — it&apos;s what residents see first in their notification feed.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}