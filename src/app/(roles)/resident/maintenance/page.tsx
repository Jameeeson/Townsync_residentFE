import styles from "@/styles/maintenance.module.css";
import { 
  MessageSquare, User, Bot, Image as ImageIcon, Send, 
  ClipboardCheck, Clock, BookOpen, Zap 
} from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.headerSection}>
        <h1 className={styles.pageTitle}>Maintenance Center</h1>
        <p className={styles.pageDesc}>Troubleshoot issues with our AI assistant or track your current requests.</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <div className={`${styles.tab} ${styles.activeTab}`}>Current Support</div>
        <a className={styles.tab} href="/resident/maintenance/history">
          Maintenance History
        </a>
      </div>

      <div className={styles.mainGrid}>
        {/* Left: Chat Interface */}
        <div className={styles.chatCard}>
          <div className={styles.chatHeader}>
            <div className={styles.aiProfile}>
              <div className={styles.aiIcon}><MessageSquare size={20} /></div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>TownCare AI Assistant</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Available 24/7 for troubleshooting</div>
              </div>
            </div>
            <div className={styles.statusText}>
              <span className={styles.statusDot}></span> Live agent option available
            </div>
          </div>

          <div className={styles.chatBody}>
            <div className={styles.dateSeparator}>TODAY, 10:24 AM</div>
            
            {/* AI Message 1 */}
            <div className={styles.messageRow}>
              <div className={styles.avatar}><Bot size={18} /></div>
              <div className={styles.aiBubble}>
                Hello! I'm your virtual maintenance assistant. Describe the issue you're experiencing, and I can help troubleshoot or pre-fill a work order for you.
              </div>
            </div>

            {/* User Message */}
            <div className={`${styles.messageRow} ${styles.userRow}`}>
              <div className={styles.avatar}>JD</div>
              <div className={styles.userBubble}>
                My kitchen sink has a steady drip, even when turned off tight.
              </div>
            </div>

            {/* AI Response with Options */}
            <div className={styles.messageRow}>
              <div className={styles.avatar}><Bot size={18} /></div>
              <div className={styles.aiBubble}>
                I can help get that fixed. A steady drip usually means a worn-out washer or cartridge.<br/><br/>
                Is the water leaking from the spout itself, or from around the handles/base of the faucet?
              </div>
            </div>
            <div className={styles.optionButtons}>
              <button className={styles.optionBtn}>From the Spout</button>
              <button className={styles.optionBtn}>From the Base</button>
            </div>
          </div>

          <div className={styles.chatInputArea}>
            <div className={styles.inputWrapper}>
              <ImageIcon size={20} color="#94a3b8" />
              <input className={styles.inputField} placeholder="Tell me what's wrong..." />
              <a className={styles.sendBtn} href="/resident/maintenance/review"><Send size={16} /></a>
            </div>
            <p style={{ textAlign: 'center', fontSize: '10px', color: '#94a3b8', marginTop: '12px' }}>
              AI can help identify issues. For emergencies, please call the resident hotline.
            </p>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div>
          {/* Troubleshooting Summary */}
          <div className={styles.sidebarCard}>
            <div className={styles.summaryHeader}>
              <ClipboardCheck size={14} /> TROUBLESHOOTING SUMMARY
            </div>
            <div className={styles.summaryContent}>
              <div className={styles.infoRow}>
                <span>Detected Category</span>
                <span className={styles.badge}>Plumbing</span>
              </div>
              <div className={styles.infoRow}>
                <span>Urgency Level</span>
                <span className={styles.badge}>Standard</span>
              </div>
              <p className={styles.summaryText}>
                "Steady kitchen sink drip. Likely washer/cartridge replacement needed. Waiting for resident to confirm leak location."
              </p>
            </div>
          </div>

          {/* Active Requests */}
          <div className={styles.sidebarCard}>
          <div className={styles.activeRequestHeader}> {/* Add a class here instead of inline style */}
            <span className={styles.requestCountText}>Active Requests (1)</span>
            <span className={styles.historyLinkText}>History</span>
          </div>
            <div className={styles.requestItem}>
              <div className={styles.requestMeta}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>#TC-8492</span>
                <span className={styles.statusBadge}>IN PROGRESS</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>HVAC Making Grinding Noise</div>
              <div style={{ display: 'flex', gap: '8px', color: '#64748b', fontSize: '12px' }}>
                <Clock size={14} /> Scheduled: Tomorrow, 2:00 PM
              </div>
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
               <button style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '6px', fontSize: '12px', color: '#64748b' }}>
                + Finish Troubleshooting to Submit
               </button>
            </div>
          </div>

          {/* Knowledge Base */}
          <div style={{ marginTop: '32px' }}>
            <div className={styles.kbTitle}>Knowledge Base</div>
            <div className={styles.kbLink}><BookOpen size={16} /> How to shut off main water valve</div>
            <div className={styles.kbLink}><Zap size={16} /> Circuit breaker basic safety</div>
          </div>
        </div>
      </div>
    </div>
  );
}