"use client";
import React, { useState } from 'react';
import styles from "@/styles/history.module.css";
import { 
  Calendar, Wind, Droplets, Battery, 
  CheckCircle, Users, ArrowLeft 
} from "lucide-react";

interface MaintenanceTicket {
  id: string;
  title: string;
  status: string;
  category: string;
  date: string;
  priority: string;
  vendor: string;
  desc: string;
  icon: React.ReactNode;
}

export default function HistoryPage() {
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);

  const tickets: MaintenanceTicket[] = [
    {
      id: "REQ-2023-084",
      title: "AC Unit Leaking",
      status: "In Progress",
      category: "HVAC",
      date: "Oct 12, 2023",
      priority: "High Priority",
      vendor: "Mike's HVAC Co.",
      desc: "The air conditioning unit in the master bedroom has started leaking water down the wall. It happens after an hour of use.",
      icon: <Wind size={12} />
    },
    {
      id: "REQ-2023-071",
      title: "Kitchen Sink Slow Drain",
      status: "Pending",
      category: "Plumbing",
      date: "Oct 08, 2023",
      priority: "Medium",
      vendor: "TBD",
      desc: "The kitchen sink is taking a very long time to drain. Possible clog in the main pipe.",
      icon: <Droplets size={12} />
    }
  ];

  // Logic: On Desktop, show first ticket by default. On Mobile, show nothing until clicked.
  const activeTicket = selectedTicket || tickets[0];

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h1 className={styles.pageTitle}>Maintenance Center</h1>
        <p className={styles.pageDesc}>Track and manage your service requests.</p>
      </div>

      <nav className={styles.tabs}>
        <a className={styles.tab} href="/resident/maintenance">Current Support</a>
        <div className={`${styles.tab} ${styles.activeTab}`}>Maintenance History</div>
      </nav>

      <div className={styles.mainLayout}>
        {/* Sidebar - Hidden on mobile when a ticket is open */}
        <aside className={`${styles.sidebar} ${selectedTicket ? styles.sidebarHidden : ""}`}>
          <div className={styles.filters}>
            <button className={`${styles.filterBtn} ${styles.filterBtnActive}`}>All</button>
            <button className={styles.filterBtn}>Completed</button>
          </div>

          <div className={styles.requestList}>
            {tickets.map((ticket) => (
              <div 
                key={ticket.id}
                className={`${styles.requestCard} ${activeTicket.id === ticket.id ? styles.requestCardActive : ""}`}
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.requestId}>{ticket.id}</span>
                  <span className={`${styles.badge} ${ticket.status === 'In Progress' ? styles.inProgress : styles.pending}`}>
                    • {ticket.status}
                  </span>
                </div>
                <div className={styles.cardTitle}>{ticket.title}</div>
                <div className={styles.cardMeta}>
                  <span><Calendar size={12} /> {ticket.date}</span>
                  <span>{ticket.icon} {ticket.category}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Detail View - Fixed overlay on mobile when open */}
        <main className={`${styles.detailView} ${selectedTicket ? styles.detailViewOpen : ""}`}>
          
          {/* Back Button - Only functional/visible on Mobile */}
          <button className={styles.mobileBackButton} onClick={() => setSelectedTicket(null)}>
            <ArrowLeft size={18} /> Back to Requests
          </button>

          <div className={styles.detailHeader}>
            <h2 style={{ fontSize: '24px', fontWeight: 800 }}>{activeTicket.title}</h2>
            <span className={`${styles.badge} ${styles.inProgress}`} style={{ padding: '6px 12px' }}>
              • {activeTicket.status}
            </span>
          </div>
          <div className={styles.detailTicket}>Ticket #{activeTicket.id}</div>

          <div className={styles.infoGrid}>
            <div>
              <div className={styles.infoLabel}>Submitted</div>
              <div className={styles.infoValue}>{activeTicket.date}</div>
            </div>
            <div>
              <div className={styles.infoLabel}>Category</div>
              <div className={styles.infoValue}>{activeTicket.category}</div>
            </div>
            <div>
              <div className={styles.infoLabel}>Priority</div>
              <div className={styles.infoValue} style={{ color: '#9a3412' }}>{activeTicket.priority}</div>
            </div>
            <div>
              <div className={styles.infoLabel}>Vendor</div>
              <div className={styles.infoValue}>{activeTicket.vendor}</div>
            </div>
          </div>

          <div className={styles.descriptionSection}>
            <h4>Description</h4>
            <p className={styles.descriptionText}>{activeTicket.desc}</p>
          </div>

          <div className={styles.timelineSection}>
            <h3 className={styles.timelineTitle}>Activity</h3>
            <div className={styles.timelineItem}>
              <div className={styles.timelineIcon}><Users size={20} /></div>
              <div className={styles.timelineCard}>
                <p style={{ fontSize: '13px', margin: 0 }}>Vendor assigned to the task.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}