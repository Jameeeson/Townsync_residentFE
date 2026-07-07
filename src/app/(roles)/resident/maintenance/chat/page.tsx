import styles from "@/styles/chat.module.css";
import { 
  ArrowLeft, Bell, Paperclip, Image, Send, 
  CheckCircle2, Calendar, Phone, ShieldCheck, Plus, CheckCheck 
} from "lucide-react";

export default function MessagesPage() {
  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <ArrowLeft size={20} color="#1e3a8a" style={{ cursor: 'pointer' }} />
          <div>
            <div className={styles.titleMain}>Messages: Plumbing Issue - Kitchen Sink</div>
            <div className={styles.titleSub}>REQ-2023-092 • 3 Participants</div>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        {/* Chat Main Area */}
        <main className={styles.chatArea}>
          <div className={styles.messageList}>
            <div className={styles.dateDivider}>
              <span className={styles.dateLabel}>Wednesday, Oct 25</span>
            </div>

            {/* Manager Message */}
            <div className={styles.messageRow}>
              <img src="/sarah-avatar.jpg" className={styles.avatar} alt="Sarah M." />
              <div className={styles.msgContent}>
                <div className={styles.msgHeader}>
                  <span className={styles.userName}>Sarah M.</span>
                  <span className={`${styles.roleBadge} ${styles.managerBadge}`}>Manager</span>
                  <span className={styles.time}>09:15 AM</span>
                </div>
                <div className={`${styles.bubble} ${styles.incomingBubble}`}>
                  Hello Alex, I've assigned Carlos from Master FLow Priority Plumbing to your kitchen sink request. He is available this afternoon to inspect the leak.
                </div>
              </div>
            </div>

            {/* Vendor Message */}
            <div className={styles.messageRow}>
              <img src="/carlos-avatar.jpg" className={styles.avatar} alt="Carlos R." />
              <div className={styles.msgContent}>
                <div className={styles.msgHeader}>
                  <span className={styles.userName}>Carlos R.</span>
                  <span className={`${styles.roleBadge} ${styles.vendorBadge}`}>Vendor</span>
                  <span className={styles.time}>10:30 AM</span>
                </div>
                <div className={`${styles.bubble} ${styles.incomingBubble}`}>
                  Hi Alex, this is Carlos. I can be at your unit around 1:00 PM today. Could you please confirm if you'll be home or if I should use the management key for access?
                </div>
              </div>
            </div>

            {/* User Message (Alex) */}
            <div className={`${styles.messageRow} ${styles.userRow}`}>
              <img src="/alex-avatar.jpg" className={styles.avatar} alt="Alex Johnson" />
              <div className={styles.msgContent}>
                <div className={styles.msgHeader}>
                  <span className={styles.time}>10:45 AM</span>
                  <span className={styles.userName}>Alex Johnson</span>
                </div>
                <div className={`${styles.bubble} ${styles.outgoingBubble}`}>
                  That works for me, Carlos. I'll be home to let you in. Please just ring the doorbell at unit 402B when you arrive.
                </div>
                <div className={styles.readStatus}>
                   <CheckCheck size={14} color="#2563eb" /> READ
                </div>
              </div>
            </div>

            {/* System Notification */}
            <div className={styles.systemMsg}>
              <CheckCircle2 size={18} color="#22c55e" /> Ticket Status Updated: Vendor Dispatched
            </div>
          </div>

          {/* Chat Input */}
          <div className={styles.inputSection}>
            <div className={styles.inputWrapper}>
              <div className={styles.textArea}>Write a message...</div>
              <Paperclip size={20} color="#64748b" />
              <Image size={20} color="#64748b" />
              <button className={styles.sendBtn}><Send size={20} /></button>
            </div>
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '12px' }}>
              Messages are visible to property management and the assigned technician.
            </p>
          </div>
        </main>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <section className={styles.sideSection}>
            <h4>Ticket Details</h4>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Status</span>
              <div className={styles.statusBadge}>
                <div style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%' }}></div>
                Vendor Dispatched
              </div>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Scheduled For</span>
              <div className={styles.detailValue}>Oct 25, 1:00 PM</div>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Priority</span>
              <div className={styles.detailValue} style={{ color: '#b91c1c' }}>High Priority</div>
            </div>
          </section>

          <section className={styles.sideSection}>
            <h4>Media Shared</h4>
            <div className={styles.mediaGrid}>
              <div className={styles.mediaItem}>
                <img src="/sink-thumb.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div className={`${styles.mediaItem} ${styles.addMedia}`}>
                <Plus size={24} />
              </div>
            </div>
          </section>

          <section className={styles.sideSection}>
            <h4>Quick Actions</h4>
            <button className={styles.actionBtn}><Calendar size={18} /> Reschedule Visit</button>
            <button className={styles.actionBtn}><Phone size={18} /> Call Concierge</button>
          </section>

          <div className={styles.safetyBox}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={16} color="#1e40af" />
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>Community Safety</span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
              Always verify the vendor's ID badge before allowing entry to your residence.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}