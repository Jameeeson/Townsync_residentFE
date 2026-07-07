import styles from "@/styles/ticketdetail.module.css";
import { 
  ArrowLeft, MessageSquare, AlertCircle, RefreshCcw, 
  Bot, Clock, CheckCircle2, UserCircle2 
} from "lucide-react";

export default function TicketDetailPage() {
  return (
    <div className={styles.container}>
      {/* Top Nav */}
      <div className={styles.navRow}>
        <div className={styles.breadcrumb}>
          Maintenance &gt; <strong>Ticket #REQ-2023-092</strong>
        </div>
        <a href="/resident/maintenance" className={styles.backBtn}>
        <div className={styles.backBtn} >
          <ArrowLeft size={16} /> Return to Maintenance Center
        </div>
        </a>
      </div>

      {/* Hero Header */}
      <div className={styles.titleRow}>
        <div className={styles.titleMain}>
          <h1>Plumbing Issue - Kitchen Sink</h1>
          <div className={styles.badgeGroup}>
            <span className={`${styles.badge} ${styles.inProgress}`}>
              <RefreshCcw size={12} /> In Progress
            </span>
            <span className={`${styles.badge} ${styles.urgent}`}>
              <AlertCircle size={12} /> Urgent
            </span>
          </div>
        </div>
        <div className={styles.actionGroup}>
          <button className={styles.btnPrimary}>
            <MessageSquare size={18} /> Message Management
          </button>
          <button className={styles.btnSecondary}>Cancel Request</button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Left Side: Content */}
        <div className={styles.contentColumn}>
          <div className={styles.mainCard}>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <label>Submitted</label>
                <span>Oct 24, 2023, 10:24 AM</span>
              </div>
              <div className={styles.metaItem}>
                <label>Category</label>
                <span>Plumbing</span>
              </div>
              <div className={styles.metaItem}>
                <label>Assigned To</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCircle2 size={16} color="#1e3a8a" />
                  <span>Master Flow Priority Plumbing Co.</span>
                </div>
              </div>
            </div>

            <div className={styles.contentBody}>
              <h3>Description</h3>
              <p className={styles.description}>
                Noticed a steady drip from the kitchen sink spout yesterday. 
                Troubleshooting with AI confirmed potential O-ring failure. 
                Requesting replacement of the internal valve seat or O-ring components 
                to stop the leak and prevent water waste.
              </p>

              <h3>Attachments</h3>
              <div className={styles.attachmentContainer}>
                <img 
                  src="/sink-leak.jpg" 
                  alt="Attachment" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
            </div>
          </div>

          {/* Reimagined AI Insight Card */}
          <div className={styles.aiInsightBox}>
            <div className={styles.aiHeader}>
              <Bot size={20} /> AI Diagnosis: Potential Valve Seat/O-Ring Wear
            </div>
            <div className={styles.aiGrid}>
              <div className={styles.aiStatItem}>
                <div className={styles.aiStatLabel}>Recommended Action</div>
                <div className={styles.aiStatValue}>Component replacement (O-Ring Kit #42)</div>
              </div>
              <div className={styles.aiStatItem}>
                <div className={styles.aiStatLabel}>Est. Repair Time</div>
                <div className={styles.aiStatValue}>45 minutes</div>
              </div>
              <div className={styles.aiStatItem}>
                <div className={styles.aiStatLabel}>Confidence Score</div>
                <div className={styles.aiStatValue}>94% (Based on visual & user report)</div>
              </div>
              <div className={styles.aiStatItem}>
                <div className={styles.aiStatLabel}>Priority Level</div>
                <div className={styles.aiStatValue}>Escalated due to water waste</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Timeline */}
        <aside>
          <div className={styles.timelineCard}>
            <h3 className={styles.timelineTitle}>Activity Timeline</h3>
            
            <div className={styles.timelineItem}>
              <div className={`${styles.timelineDot} ${styles.dotActive}`}></div>
              <div className={styles.timelineDate}>Oct 25, 10:30 AM</div>
              <div className={styles.timelineHeading}>Vendor Dispatched</div>
              <p className={styles.timelineText}>
                Technician <strong>Carlos R.</strong> is scheduled to arrive between 1:00 PM - 3:00 PM today.
              </p>
            </div>

            <div className={styles.timelineItem}>
              <div className={styles.timelineDot}></div>
              <div className={styles.timelineDate}>Oct 24, 2:15 PM</div>
              <div className={styles.timelineHeading}>Request Approved</div>
              <p className={styles.timelineText}>
                Property Management has reviewed the AI triage and dispatched an external vendor.
              </p>
            </div>

            <div className={styles.timelineItem}>
              <div className={styles.timelineDot}></div>
              <div className={styles.timelineDate}>Oct 24, 10:25 AM</div>
              <div className={styles.timelineHeading}>AI Submission</div>
              <p className={styles.timelineText}>
                Request Submitted via TownCare AI Assistant with visual triage.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}