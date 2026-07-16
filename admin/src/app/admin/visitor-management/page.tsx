"use client";

import React, { useState } from "react";
import {
  Users,
  Activity,
  Settings,
  Filter,
  MoreHorizontal,
  CheckCircle2,
  Phone,
  Clock,
  Calendar,
  ShieldAlert,
  Car,
  Monitor,
  Radio,
  Save,
  ArrowLeft,
  ChevronRight,
  MessageSquare,
  Mail,
  Download,
  Info,
  BadgeCheck,
  Search,
  Bell,
} from "lucide-react";
import styles from "@/components/styles/VisitorManagement.module.css";
import AdminShell from "../../../components/admin/admin-shell";

type TabType = "approvals" | "monitoring" | "policy";

type VisitorRequest = {
  id: number;
  name: string;
  resident: string;
  unit: string;
  time: string;
  status: string;
  initials: string;
  role: string;
};

export default function VisitorManagement() {
  const [activeTab, setActiveTab] = useState<TabType>("approvals");
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRequest | null>(null);

  const handleSelectVisitor = (visitor: VisitorRequest) => {
    setSelectedVisitor(visitor);
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedVisitor(null);
  };

  return (
    <AdminShell>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <h1>Visitor & Security Management</h1>
            <p>Monitor facility access and manage guest approvals.</p>
          </div>
        </header>

        <nav className={styles.tabNav} aria-label="Management Sections">
          <button
            type="button"
            className={activeTab === "approvals" ? styles.activeTab : undefined}
            onClick={() => switchTab("approvals")}
          >
            <Users size={18} /> Visitor Approvals
          </button>
          <button
            type="button"
            className={activeTab === "monitoring" ? styles.activeTab : undefined}
            onClick={() => switchTab("monitoring")}
          >
            <Activity size={18} /> Active Monitoring
          </button>
          <button
            type="button"
            className={activeTab === "policy" ? styles.activeTab : undefined}
            onClick={() => switchTab("policy")}
          >
            <Settings size={18} /> Policy Settings
          </button>
        </nav>

        <div className={styles.content}>
          {activeTab === "approvals" &&
            (selectedVisitor ? (
              <VisitorDetail visitor={selectedVisitor} onBack={() => setSelectedVisitor(null)} />
            ) : (
              <VisitorApprovalsTable onSelect={handleSelectVisitor} />
            ))}
          {activeTab === "monitoring" && <ActiveMonitoringView />}
          {activeTab === "policy" && <PolicySettingsView />}
        </div>
      </div>
    </AdminShell>
  );
}

function VisitorApprovalsTable({ onSelect }: { onSelect: (v: VisitorRequest) => void }) {
  const requests: VisitorRequest[] = [
    {
      id: 1,
      name: "Michael Chang",
      resident: "Sarah Jenkins",
      unit: "Unit 402",
      time: "Today, 2:00 PM",
      status: "Pending",
      initials: "MC",
      role: "HVAC Contractor",
    },
    {
      id: 2,
      name: "John Doe",
      resident: "Alice Smith",
      unit: "Unit 4B",
      time: "Today, 3:30 PM",
      status: "Pending",
      initials: "JD",
      role: "Delivery",
    },
    {
      id: 3,
      name: "Elena Patel",
      resident: "Marcus Johnson",
      unit: "Unit 12A",
      time: "Tomorrow, 10:30 AM",
      status: "Pending",
      initials: "EP",
      role: "Guest",
    },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Pending Visitor Requests</h2>
        <div className={styles.cardActions}>
          <div className={styles.searchBox}>
            <Search size={16} />
            <input type="text" placeholder="Search visitors..." />
          </div>
          <button type="button" className={styles.iconBtn} aria-label="Filter">
            <Filter size={18} />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="More options">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Visitor Name</th>
              <th>Resident Requesting</th>
              <th>Target Unit</th>
              <th>Date/Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id} className={styles.clickableRow} onClick={() => onSelect(req)}>
                <td>
                  <div className={styles.visitorCell}>
                    <div className={styles.avatar}>{req.initials}</div>
                    <div className={styles.visitorName}>
                      <strong>{req.name}</strong>
                      <span>{req.role}</span>
                    </div>
                  </div>
                </td>
                <td>{req.resident}</td>
                <td>{req.unit}</td>
                <td>{req.time}</td>
                <td>
                  <span className={styles.badgePending}>Pending</span>
                </td>
                <td>
                  <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={styles.approveBtnAction}
                      onClick={() => onSelect(req)}
                    >
                      Approve
                    </button>
                    <button type="button" className={styles.rejectBtnAction}>
                      Reject
                    </button>
                    <MoreHorizontal size={18} className={styles.moreIcon} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VisitorDetail({
  visitor,
  onBack,
}: {
  visitor: VisitorRequest;
  onBack: () => void;
}) {
  return (
    <div className={styles.detailView}>
      <nav className={styles.breadcrumb}>
        <button type="button" onClick={onBack}>
          Visitors
        </button>
        <ChevronRight size={14} />
        <button type="button" onClick={onBack}>
          Pending Requests
        </button>
        <ChevronRight size={14} />
        <span className={styles.activeBreadcrumb}>{visitor.name}</span>
      </nav>

      <div className={styles.detailHeader}>
        <button type="button" onClick={onBack} className={styles.backBtn}>
          <ArrowLeft size={20} /> Back
        </button>
        <h1>Visitor Profile</h1>
      </div>

      <div className={styles.statusBanner}>
        <div className={styles.statusInfo}>
          <div className={styles.statusIconBox}>
            <Clock size={20} color="#f59e0b" />
          </div>
          <div>
            <p className={styles.kicker}>CURRENT STATUS</p>
            <h3>Pending Approval</h3>
          </div>
        </div>
        <div className={styles.bannerActions}>
          <button type="button" className={styles.rejectBtnOutline}>
            Reject Request
          </button>
          <button type="button" className={styles.confirmBtn}>
            <CheckCircle2 size={18} /> Confirm Approval
          </button>
        </div>
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.card}>
          <div className={styles.profileHeader}>
            <div className={styles.largeAvatar}>{visitor.initials}</div>
            <div className={styles.profileMeta}>
              <h3>{visitor.name}</h3>
              <p>{visitor.role} — Mike&apos;s HVAC Co.</p>
              <div className={styles.badgeRow}>
                <span className={styles.badgeSuccess}>
                  <BadgeCheck size={12} /> Verified Profile
                </span>
                <span className={styles.badgeMuted}>Recurring Service</span>
              </div>
            </div>
          </div>
          <div className={styles.contactInfo}>
            <div className={styles.infoField}>
              <label>Phone Number</label>
              <p>
                <Phone size={14} /> +1 (555) 012-3456
              </p>
            </div>
            <div className={styles.infoField}>
              <label>Email Address</label>
              <p>
                <Mail size={14} /> {visitor.name.toLowerCase().replace(" ", ".")}@corp.com
              </p>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Host Information</h3>
          <div className={styles.hostBox}>
            <div className={styles.hostAvatar} />
            <div className={styles.hostMeta}>
              <strong>{visitor.resident}</strong>
              <p>{visitor.unit} - Building B</p>
            </div>
          </div>
          <button type="button" className={styles.secondaryBtn}>
            <MessageSquare size={16} /> Contact Resident
          </button>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Vehicle Details</h3>
          <div className={styles.infoRow}>
            <div className={styles.infoIcon}>
              <Car size={18} />
            </div>
            <div>
              <label>Make & Model</label>
              <p>Ford Transit - White</p>
            </div>
          </div>
          <div className={styles.infoRow}>
            <div className={styles.infoIcon}>
              <Radio size={18} />
            </div>
            <div>
              <label>License Plate</label>
              <p>ABC-1234 (NY)</p>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Schedule Details</h3>
          <div className={styles.infoRow}>
            <Calendar size={18} color="#2563eb" />
            <div>
              <label>Expected Arrival</label>
              <p>{visitor.time}</p>
            </div>
          </div>
          <div className={styles.infoRow}>
            <Clock size={18} color="#2563eb" />
            <div>
              <label>Estimated Duration</label>
              <p>3 Hours</p>
            </div>
          </div>
          <div className={styles.infoRow}>
            <ShieldAlert size={18} color="#dc2626" />
            <div>
              <label>Access Expiration</label>
              <p className={styles.errorText}>Today, 5:30 PM (Auto-Revoke)</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card} style={{ marginTop: "1.5rem" }}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Previous Access Logs</h3>
          <button type="button" className={styles.textBtn}>
            <Download size={16} /> Download Report
          </button>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Entry Time</th>
                <th>Exit Time</th>
                <th>Unit Visited</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>May 12, 2024</td>
                <td>09:15 AM</td>
                <td>11:45 AM</td>
                <td>Unit 402</td>
                <td>
                  <span className={styles.statusSuccess}>Completed</span>
                </td>
              </tr>
              <tr>
                <td>Jan 22, 2024</td>
                <td>10:00 AM</td>
                <td>10:15 AM</td>
                <td>Lobby</td>
                <td>
                  <span className={styles.statusDanger}>Denied Entry</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ActiveMonitoringView() {
  return (
    <div className={styles.monitoringLayout}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Monitor size={24} color="#2441b4" />
            <span className={styles.liveIndicator}>LIVE</span>
          </div>
          <p>Active Visitors</p>
          <h2>12</h2>
          <div className={styles.progressBase}>
            <div className={styles.progressBar} style={{ width: "60%" }} />
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Radio size={24} color="#f59e0b" />
            <span className={styles.recentIndicator}>RECENT</span>
          </div>
          <p>Open Gate Events</p>
          <h2>
            4 <small>in last hour</small>
          </h2>
          <div className={styles.avatarRow}>
            <div className={styles.miniAvatar} style={{ zIndex: 3 }}>
              MA
            </div>
            <div className={styles.miniAvatar} style={{ zIndex: 2 }}>
              ER
            </div>
            <div
              className={styles.miniAvatar}
              style={{ zIndex: 1, backgroundColor: "#f1f5f9", color: "#64748b" }}
            >
              +1
            </div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <CheckCircle2 size={24} color="#10b981" />
            <span className={styles.liveIndicator}>STABLE</span>
          </div>
          <p>Security Alerts</p>
          <h2>
            0 <small>— All Clear</small>
          </h2>
          <p className={styles.smallMuted}>Last scan completed 1m ago</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Live Access Logs</h2>
          <button type="button" className={styles.textBtn}>
            View All Logs <ChevronRight size={16} />
          </button>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Entry Time</th>
              <th>Visitor Name</th>
              <th>Resident/Unit</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={styles.timeCell}>14:32:05</td>
              <td>Mark Anthony</td>
              <td>Unit 402 - Sarah Jenkins</td>
            </tr>
            <tr>
              <td className={styles.timeCell}>14:28:11</td>
              <td>Delivery: Logistics X</td>
              <td>Unit 115 - David Chen</td>
            </tr>
            <tr>
              <td className={styles.timeCell}>14:22:45</td>
              <td>Elena Rodriguez</td>
              <td>Unit 204 - Marcus West</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PolicySettingsView() {
  return (
    <div className={styles.policyLayout}>
      <div className={styles.policyGrid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconCircle}>
              <Clock size={18} />
            </div>
            <h2>Gate Operating Hours</h2>
          </div>
          <div className={styles.timeInputs}>
            <div className={styles.inputGroup}>
              <label>Opening Time</label>
              <input type="text" defaultValue="06:00 AM" />
            </div>
            <div className={styles.inputGroup}>
              <label>Closing Time</label>
              <input type="text" defaultValue="10:00 PM" />
            </div>
          </div>
          <p className={styles.note}>
            <Info size={14} /> Emergency access is always granted regardless of these hours.
          </p>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconCircle}>
              <ShieldAlert size={18} />
            </div>
            <h2>Auto-Approval Rules</h2>
          </div>
          <div className={styles.toggleRow}>
            <div className={styles.toggleText}>
              <strong>Trusted Service Providers</strong>
              <p>Allow priority verified utility and courier staff.</p>
            </div>
            <div className={styles.switch}>
              <div className={styles.switchHandle} />
            </div>
          </div>
          <div className={styles.toggleRow}>
            <div className={styles.toggleText}>
              <strong>Recurring Family Guests</strong>
              <p>Enable facial recognition for frequent visitors.</p>
            </div>
            <div className={styles.switch}>
              <div className={styles.switchHandle} />
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconCircle}>
              <Bell size={18} />
            </div>
            <h2>Security Notifications</h2>
          </div>
          <div className={styles.checkboxList}>
            <label className={styles.checkItem}>
              <input type="checkbox" defaultChecked /> Overstayed Visitors
            </label>
            <label className={styles.checkItem}>
              <input type="checkbox" defaultChecked /> Unauthorized Entry Attempts
            </label>
            <label className={styles.checkItem}>
              <input type="checkbox" /> Gate Malfunctions
            </label>
          </div>
        </section>

        <div className={styles.syncBox}>
          <strong>Policy Sync Status</strong>
          <p>Last synchronized with 4 gate controllers: 2 mins ago.</p>
          <div className={styles.syncMeta}>
            <div className={styles.dotPulse} />
            <span>All Nodes Online</span>
          </div>
        </div>
      </div>

      <div className={styles.fixedFooter}>
        <p>All changes are logged in the enterprise audit trail.</p>
        <div className={styles.footerActions}>
          <button type="button" className={styles.discardBtn}>
            Discard Changes
          </button>
          <button type="button" className={styles.saveBtn}>
            <Save size={18} /> Save Security Policy
          </button>
        </div>
      </div>
    </div>
  );
}
