"use client";
import React, { useState } from 'react';
import styles from "@/styles/settings.module.css";
import { 
  User, Bell, Shield, LogOut, Wrench, Megaphone, Info,
  Wallet, ShieldAlert, Activity, Laptop, Smartphone, 
  Tablet, Lock, ExternalLink
} from "lucide-react";

export default function AccountSettings() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Account Settings</h1>
        <p className={styles.pageDesc}>Manage your personal information, notifications, and security preferences.</p>
      </header>

      <div className={styles.mainLayout}>
        {/* Sidebar Navigation */}
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`${styles.navItem} ${activeTab === 'profile' ? styles.active : ""}`}
            >
              <User size={18} /> Profile Information
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`${styles.navItem} ${activeTab === 'notifications' ? styles.active : ""}`}
            >
              <Bell size={18} /> Notification Preferences
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`${styles.navItem} ${activeTab === 'security' ? styles.active : ""}`}
            >
              <Shield size={18} /> Security
            </button>
            <hr className={styles.navDivider} />
            <button className={`${styles.navItem} ${styles.signOut}`}>
              <LogOut size={18} /> Sign Out
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <main className={styles.content}>
          {activeTab === 'profile' && <ProfileView />}
          {activeTab === 'notifications' && <NotificationsView />}
          {activeTab === 'security' && <SecurityView />}
        </main>
      </div>
    </div>
  );
}

/* --- TAB: PROFILE --- */
function ProfileView() {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeaderRow}>
        <div>
          <h2 className={styles.cardTitle}>Profile Information</h2>
          <p className={styles.cardSubtitle}>Update your contact details and unit information.</p>
        </div>
        <img src="/avatar-placeholder.jpg" alt="Profile" className={styles.avatar} />
      </div>

      <div className={styles.formGrid}>
        <div className={styles.inputGroup}>
          <label>First Name</label>
          <input type="text" defaultValue="Alex" />
        </div>
        <div className={styles.inputGroup}>
          <label>Last Name</label>
          <input type="text" defaultValue="Resident" />
        </div>
        <div className={styles.inputGroup}>
          <label>Email Address</label>
          <input type="email" defaultValue="alex.r@example.com" />
        </div>
        <div className={styles.inputGroup}>
          <label>Phone Number</label>
          <input type="text" defaultValue="(555) 123-4567" />
        </div>
      </div>

      <div className={styles.unitDetailsSection}>
        <h3 className={styles.sectionLabel}>Unit Details</h3>
        <div className={styles.unitGrid}>
          <div className={styles.inputGroup}>
            <label>Building</label>
            <input type="text" defaultValue="North Tower" disabled className={styles.disabledInput} />
          </div>
          <div className={styles.inputGroup}>
            <label>Unit</label>
            <input type="text" defaultValue="4B" disabled className={styles.disabledInput} />
          </div>
          <div className={styles.inputGroup}>
            <label>Lease End</label>
            <input type="text" defaultValue="Oct 2024" disabled className={styles.disabledInput} />
          </div>
        </div>
        <p className={styles.infoText}>
          <Info size={12} /> Contact property management to update unit details.
        </p>
      </div>

      <div className={styles.cardActions}>
        <button className={styles.cancelBtn}>Cancel</button>
        <button className={styles.saveBtn}>Save Changes</button>
      </div>
    </section>
  );
}

/* --- TAB: NOTIFICATIONS --- */
function NotificationsView() {
  return (
    <div className={styles.tabContent}>
      <div className={styles.settingsGrid}>
        <div className={styles.mainColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <Wrench size={18} className={styles.iconBlue} />
              <h3 className={styles.cardTitle}>Maintenance Updates</h3>
            </div>
            <p className={styles.cardInfoText}>Ticket status changes, vendor arrivals, and scheduled inspections.</p>
            <div className={styles.toggleRow}>
              <ToggleBox label="Email" sub="DEFAULT" active={true} />
              <ToggleBox label="SMS" active={false} />
              <ToggleBox label="Push" active={true} />
            </div>
          </section>

          <div className={styles.twoColGrid}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <Megaphone size={18} className={styles.iconBlue} />
                <h3 className={styles.cardTitle}>Community Announcements</h3>
              </div>
              <p className={styles.cardInfoText}>Upcoming events, neighborhood newsletters, and management alerts.</p>
              <div className={styles.stackToggles}>
                <ToggleItem label="Email Notifications" active={true} />
                <ToggleItem label="SMS Updates" active={false} />
                <ToggleItem label="Mobile App Push" active={false} />
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <Wallet size={18} className={styles.iconBlue} />
                <h3 className={styles.cardTitle}>Financial Notifications</h3>
              </div>
              <p className={styles.cardInfoText}>Bill reminders, automated payment receipts, and balance updates.</p>
              <div className={styles.stackToggles}>
                <ToggleItem label="Email (Official Records)" active={true} />
                <ToggleItem label="SMS (Due Reminders)" active={true} />
                <ToggleItem label="App Push (Daily)" active={false} />
              </div>
            </section>
          </div>
        </div>

        <aside className={styles.sideColumn}>
          <div className={styles.emergencyCard}>
            <ShieldAlert size={24} />
            <p>Emergency Alerts</p>
            <span>Crucial safety alerts (fire, security, infrastructure) are sent via all available channels by default.</span>
            <div className={styles.priorityBadge}>ACTIVE PRIORITY</div>
          </div>

          <div className={styles.card}>
            <h4 className={styles.sideTitle}>System Health</h4>
            <div className={styles.healthItem}>
              <span>Email Delivery</span>
              <span className={styles.healthOk}>Operational</span>
            </div>
            <div className={styles.healthBar}><div className={styles.healthFill} /></div>
            <div className={styles.healthItem} style={{marginTop: '12px'}}>
              <span>SMS Gateway</span>
              <span className={styles.healthOk}>Operational</span>
            </div>
            <div className={styles.healthBar}><div className={styles.healthFill} /></div>
          </div>
        </aside>
      </div>

      <div className={styles.stickyFooter}>
        <button className={styles.textBtn}>Discard Changes</button>
        <button className={styles.saveBtn}>Save Preferences</button>
      </div>
    </div>
  );
}

/* --- TAB: SECURITY --- */
function SecurityView() {
  return (
    <div className={styles.tabContent}>
      <div className={styles.settingsGrid}>
        <div className={styles.mainColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <Lock size={18} className={styles.iconBlue} />
              <h3 className={styles.cardTitle}>Change Password</h3>
            </div>
            <div className={styles.passwordForm}>
              <div className={styles.inputGroup}>
                <label>Current Password</label>
                <input type="password" placeholder="••••••••••••" />
              </div>
              <div className={styles.twoColGrid} style={{gap: '16px', margin: '16px 0'}}>
                <div className={styles.inputGroup}>
                  <label>New Password</label>
                  <input type="password" placeholder="••••••••••••" />
                </div>
                <div className={styles.inputGroup}>
                  <label>Confirm New Password</label>
                  <input type="password" placeholder="••••••••••••" />
                </div>
              </div>
              <button className={styles.saveBtn} style={{width: 'fit-content'}}>Update Password</button>
            </div>
          </section>

          <section className={styles.card} style={{padding: 0}}>
            <div className={styles.sessionHeader}>
              <div className={styles.cardHeader} style={{marginBottom: 0}}>
                <Activity size={18} className={styles.iconBlue} />
                <h3 className={styles.cardTitle}>Active Sessions</h3>
              </div>
              <button className={styles.textLink}>Revoke All Other Sessions</button>
            </div>
            <div className={styles.sessionList}>
              <SessionItem icon={<Laptop size={20} />} device="MacBook Pro 14 - Chrome" location="San Francisco, CA • IP: 192.168.1.45" time="Last active: Just now" current />
              <SessionItem icon={<Smartphone size={20} />} device="iPhone 15 Pro - Safari" location="Oakland, CA • IP: 73.4.212.18" time="Last active: 2 hours ago" />
              <SessionItem icon={<Tablet size={20} />} device="iPad Air - TownSync App" location="San Francisco, CA • IP: 192.168.1.12" time="Last active: 3 days ago" />
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <div className={styles.card} style={{textAlign: 'center'}}>
            <div className={styles.shieldCircle}><Shield size={24} /></div>
            <h4 className={styles.sideTitle}>Two-Factor Authentication</h4>
            <p className={styles.cardInfoText}>Add an extra layer of security to your account.</p>
            <div className={styles.statusBox}>Status <span className={styles.badgeGreen}>• Enabled</span></div>
            <p className={styles.smallText}>Your identity is verified via SMS to ending in ••82.</p>
            <button className={styles.outlineBtn}>Configure 2FA Settings</button>
            <button className={styles.dangerTextBtn}>Disable Two-Factor Authentication</button>
          </div>
          <div className={styles.securityTipCard}>
             <h4 style={{color: 'white', marginBottom: '12px'}}>Security Tip</h4>
             <p>Never share your password or one-time codes with anyone. TownSync staff will never ask for your login credentials.</p>
             <a href="#" className={styles.whiteLink}>Read Security Policy <ExternalLink size={12}/></a>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* Helper Components */
function ToggleBox({ label, sub, active }: any) {
  return (
    <div className={styles.toggleBox}>
      <div>
        <div className={styles.toggleLabel}>{label}</div>
        {sub && <div className={styles.toggleSub}>{sub}</div>}
      </div>
      <div className={`${styles.switch} ${active ? styles.switchOn : ""}`}>
        <div className={styles.switchKnob} />
      </div>
    </div>
  );
}

function ToggleItem({ label, active }: any) {
  return (
    <div className={styles.toggleItem}>
      <span>{label}</span>
      <div className={`${styles.switch} ${active ? styles.switchOn : ""}`}>
        <div className={styles.switchKnob} />
      </div>
    </div>
  );
}

function SessionItem({ icon, device, location, time, current }: any) {
  return (
    <div className={styles.sessionItem}>
      <div className={styles.sessionIconWrapper}>{icon}</div>
      <div className={styles.sessionInfo}>
        <div className={styles.sessionDevice}>
          {device} {current && <span className={styles.currentBadge}>CURRENT DEVICE</span>}
        </div>
        <div className={styles.sessionMeta}>{location}</div>
        <div className={styles.sessionMeta}>{time}</div>
      </div>
      <button className={styles.revokeBtn}>Revoke</button>
    </div>
  );
}