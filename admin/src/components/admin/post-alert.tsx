"use client";

import React, { useState } from "react";
import { 
  ArrowLeft, 
  ChevronDown, 
  Bell, 
  User, 
  Share2, 
  Lightbulb,
  Signal,
  Wifi,
  Battery
} from "lucide-react";
import styles from "./post-alert.module.css";

export default function PostAlertPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [audience, setAudience] = useState("All Residents");
  const [content, setContent] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  return (
    <div className={styles.pageWrapper}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backButton}><ArrowLeft size={24} /></button>
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
                </select>
                <ChevronDown size={16} className={styles.selectIcon} />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Target Audience</label>
              <div className={styles.selectWrapper}>
                <select value={audience} onChange={(e) => setAudience(e.target.value)}>
                  <option>All Residents</option>
                  <option>Owners Only</option>
                  <option>Tenants Only</option>
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
              <Bell size={20} color="#2441b4" />
            </div>
            <div className={styles.toggleText}>
              <h3>Urgent Push Notification</h3>
              <p>Send an immediate alert to all selected devices.</p>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={isUrgent} onChange={() => setIsUrgent(!isUrgent)} />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.formActions}>
            <button className={styles.textButton}>Save Draft</button>
            <button className={styles.primaryButton}>Post Announcement</button>
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
                <span className={styles.categoryBadge}>{category}</span>
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
                  <strong>Alex Miller</strong>
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
            <p><strong>Pro Tip:</strong> Urgent announcements are pinned to the top of the resident feed for 48 hours.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}