"use client";

import React, { useState } from "react";
import { 
  Megaphone, 
  Bot, 
  ChevronDown, 
  Bold, 
  Italic, 
  List, 
  Link2, 
  Upload, 
  AlertTriangle, 
  Calendar,
  MessageSquare,
  Smile,
  Meh,
  Frown,
  TrendingUp,
  UserMinus,
  ClipboardList,
  Filter,
  Download,
  Search
} from "lucide-react";
import AdminShell from "@/components/admin/admin-shell";
import styles from "@/components/styles/Communications.module.css";

type TabType = "announcements" | "ai-chatbot";

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("announcements");

  return (
    <AdminShell>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <h1>Communications & AI Monitoring</h1>
            <p>Manage community announcements and review AI-driven resident interactions.</p>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className={styles.tabNav}>
          <button 
            className={activeTab === "announcements" ? styles.activeTab : ""} 
            onClick={() => setActiveTab("announcements")}
          >
            <Megaphone size={18} /> Announcement Management
          </button>
          <button 
            className={activeTab === "ai-chatbot" ? styles.activeTab : ""} 
            onClick={() => setActiveTab("ai-chatbot")}
          >
            <Bot size={18} /> AI Chatbot Monitoring
          </button>
        </nav>

        <main className={styles.content}>
          {activeTab === "announcements" ? (
            <AnnouncementTab />
          ) : (
            <AIChatbotTab />
          )}
        </main>
      </div>
    </AdminShell>
  );
}

/* --- VIEW: ANNOUNCEMENT MANAGEMENT --- */
function AnnouncementTab() {
  return (
    <div className={styles.tabContent}>
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>ACTIVE NOTICES</p>
          <div className={styles.statValue}>4 <span className={styles.trendUp}>↑1</span></div>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>SCHEDULED</p>
          <div className={styles.statValue}>12</div>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>EXPIRED (30D)</p>
          <div className={styles.statValue}>28</div>
        </div>
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}><h2>Compose Announcement</h2></div>
          <div className={styles.formGroup}>
            <label>Title</label>
            <input type="text" placeholder="e.g., Upcoming Pool Maintenance" />
          </div>
          <div className={styles.formGroup}>
            <label>Message Body</label>
            <div className={styles.editor}>
              <div className={styles.toolbar}>
                <Bold size={16} /> <Italic size={16} /> <List size={16} /> <Link2 size={16} />
              </div>
              <textarea placeholder="Write your message here..." rows={8} />
            </div>
          </div>
          <div className={styles.dropzone}>
            <Upload size={20} />
            <span>Drag and drop files here or <button className={styles.textLink}>browse</button></span>
          </div>
        </section>

        <aside className={styles.sidebar}>
          <div className={styles.card}>
            <div className={styles.formGroup}>
              <label>Target Audience</label>
              <div className={styles.selectBox}><select><option>All Residents</option></select><ChevronDown size={16}/></div>
            </div>
            <div className={styles.formGroup}>
              <label>Publish Date</label>
              <div className={styles.iconInput}><Calendar size={16}/><input type="text" placeholder="mm/dd/yyyy, --:-- --"/></div>
            </div>
            <div className={styles.divider} />
            <div className={styles.distribution}>
              <label className={styles.sectionLabel}>Distribution Channels</label>
              <label className={styles.checkbox}><input type="checkbox" defaultChecked /> Push Notifications</label>
              <label className={styles.checkbox}><input type="checkbox" defaultChecked /> Email / SMS Option</label>
            </div>
            <div className={styles.urgentBanner}>
              <label className={styles.checkbox}><input type="checkbox" /><AlertTriangle size={16}/> Urgent Resident Alert</label>
            </div>
            <button className={styles.primaryBtn}>Publish Now</button>
            <button className={styles.secondaryBtn}>Schedule Announcement</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* --- VIEW: AI CHATBOT MONITORING --- */
function AIChatbotTab() {
  const interactions = [
    { name: "Marcus Bennett", unit: "Unit 402-B", time: "2 mins ago", confidence: 98, sentiment: "positive", initials: "MB" },
    { name: "Elena Lopez", unit: "Unit 115-A", time: "15 mins ago", confidence: 72, sentiment: "neutral", initials: "EL" },
    { name: "Jordan Klein", unit: "Unit 308-C", time: "24 mins ago", confidence: 45, sentiment: "negative", initials: "JK" },
  ];

  return (
    <div className={styles.tabContent}>
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconHeader}><p className={styles.statLabel}>Active Conversations</p><div className={styles.iconBox}><MessageSquare size={18} color="#2441b4"/></div></div>
          <div className={styles.statValue}>42</div>
          <p className={styles.subTrend}><TrendingUp size={14}/> 12% from last hour</p>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconHeader}><p className={styles.statLabel}>Avg. Sentiment Score</p><Smile size={18} color="#10b981"/></div>
          <div className={styles.statValue}>85% <span className={styles.subText}>Positive</span></div>
          <div className={styles.progressBase}><div className={styles.progressBar} style={{width: '85%', background: '#10b981'}} /></div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconHeader}><p className={styles.statLabel}>Escalation Rate</p><UserMinus size={18} color="#dc2626"/></div>
          <div className={styles.statValue}>3.2%</div>
          <p className={styles.subTrendDanger}>Target: &lt; 5%</p>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconHeader}><p className={styles.statLabel}>Top Intent</p><ClipboardList size={18} color="#92400e"/></div>
          <div className={styles.statValue} style={{fontSize: '1.25rem'}}>Maintenance Request</div>
          <p className={styles.subText}>24 cases today</p>
        </div>
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Recent Interactions</h2>
            <div className={styles.cardActions}><button className={styles.iconBtn}><Filter size={16}/></button><button className={styles.iconBtn}><Download size={16}/></button></div>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr><th>Resident / Unit</th><th>Start Time</th><th>AI Confidence</th><th>Sentiment</th></tr>
              </thead>
              <tbody>
                {interactions.map((chat, i) => (
                  <tr key={i}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.avatarSmall}>{chat.initials}</div>
                        <div><strong>{chat.name}</strong><span>{chat.unit}</span></div>
                      </div>
                    </td>
                    <td>{chat.time}</td>
                    <td>
                      <div className={styles.confidenceRow}>
                        <div className={styles.confidenceBarBase}>
                          <div 
                            className={styles.confidenceBarFill} 
                            style={{ 
                              width: `${chat.confidence}%`,
                              backgroundColor: chat.confidence > 80 ? '#10b981' : chat.confidence > 60 ? '#f59e0b' : '#dc2626'
                            }} 
                          />
                        </div>
                        <span>{chat.confidence}%</span>
                      </div>
                    </td>
                    <td>
                      {chat.sentiment === 'positive' && <Smile size={18} color="#10b981" />}
                      {chat.sentiment === 'neutral' && <Meh size={18} color="#64748b" />}
                      {chat.sentiment === 'negative' && <Frown size={18} color="#dc2626" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className={styles.loadMoreBtn}>Load More Conversations</button>
        </section>

        <aside className={styles.sidebar}>
          <div className={styles.card} style={{marginBottom: '1.5rem'}}>
            <h3>Sentiment Trends</h3>
            <div className={styles.chartMock}>
              {[40, 25, 60, 75, 55, 100].map((h, i) => (
                <div key={i} className={styles.bar} style={{height: `${h}%`, opacity: i === 5 ? 1 : 0.2}} />
              ))}
            </div>
            <div className={styles.chartLabels}><span>Last 7 Days</span> <strong>Today</strong></div>
          </div>
          <div className={styles.card}>
            <h3>Trending Keywords</h3>
            <div className={styles.tagCloud}>
              <span className={styles.tagGreen}>Plumbing</span>
              <span className={styles.tagBlue}>Guest Access</span>
              <span className={styles.tagRed}>Leak Emergency</span>
              <span className={styles.tagMuted}>Trash Schedule</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}