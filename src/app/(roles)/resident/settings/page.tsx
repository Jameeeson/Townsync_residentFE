"use client";

import React, { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "@/styles/settings.module.css";
import {
  User,
  Bell,
  Shield,
  LogOut,
  Info,
  ShieldAlert,
  Activity,
  Laptop,
  Smartphone,
  Tablet,
  Lock,
  ExternalLink,
} from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { changePassword, logout } from "@/lib/api/auth";
import {
  getPreferences,
  getProfile,
  updatePreferences,
  updateProfile,
} from "@/lib/api/resident";

type Session = {
  id: string;
  icon: React.ReactNode;
  device: string;
  location: string;
  time: string;
  current?: boolean;
};

export default function AccountSettings() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profile");

  async function handleSignOut() {
    try {
      await logout();
    } catch {
      // still clear local session via logout() finally / navigate
    }
    router.push("/login");
  }

  return (
    <div className={styles.container}>
      <header className={`${styles.header} ts-fade-in-up`}>
        <h1 className={styles.pageTitle}>Account Settings</h1>
        <p className={styles.pageDesc}>
          Manage your personal information, notifications, and security preferences.
        </p>
      </header>

      <div className={styles.mainLayout}>
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`${styles.navItem} ${activeTab === "profile" ? styles.active : ""}`}
            >
              <User size={18} /> Profile Information
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("notifications")}
              className={`${styles.navItem} ${activeTab === "notifications" ? styles.active : ""}`}
            >
              <Bell size={18} /> Notification Preferences
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`${styles.navItem} ${activeTab === "security" ? styles.active : ""}`}
            >
              <Shield size={18} /> Security
            </button>
            <hr className={styles.navDivider} />
            <button
              type="button"
              className={`${styles.navItem} ${styles.signOut}`}
              onClick={handleSignOut}
            >
              <LogOut size={18} /> Sign Out
            </button>
          </nav>
        </aside>

        <main className={styles.content}>
          <div key={activeTab} className="ts-fade-in">
            {activeTab === "profile" && <ProfileView />}
            {activeTab === "notifications" && <NotificationsView />}
            {activeTab === "security" && <SecurityView />}
          </div>
        </main>
      </div>
    </div>
  );
}

function ProfileView() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [defaults, setDefaults] = useState({ email: "", phone: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await getProfile();
        if (cancelled) return;
        setDisplayName(profile.username || "");
        setEmail(profile.email || "");
        setPhone(profile.phone_number || "");
        setUnitNumber(profile.unit_number || "");
        setLeaseEnd(profile.lease_end || "");
        setDefaults({ email: profile.email || "", phone: profile.phone_number || "" });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to load profile."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleCancel() {
    setEmail(defaults.email);
    setPhone(defaults.phone);
    setSaved(false);
    setError("");
  }

  async function handleSave() {
    setError("");
    setSubmitting(true);
    try {
      const updated = await updateProfile({
        email,
        phone_number: phone,
      });
      setDefaults({ email: updated.email, phone: updated.phone_number || "" });
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not save profile."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className={styles.card} aria-busy="true" aria-label="Loading profile">
        <div className={styles.cardHeaderRow}>
          <div style={{ width: "100%" }}>
            <div className="ts-skeleton" style={{ width: 200, height: 20, marginBottom: 8 }}>Loading</div>
            <div className="ts-skeleton" style={{ width: 260, height: 14 }}>Loading</div>
          </div>
          <div className="ts-skeleton" style={{ width: 44, height: 44, borderRadius: "50%" }}>Loading</div>
        </div>
        <div className={styles.formGrid}>
          <div className="ts-skeleton" style={{ height: 42 }}>Loading</div>
          <div className="ts-skeleton" style={{ height: 42 }}>Loading</div>
          <div className="ts-skeleton" style={{ height: 42 }}>Loading</div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHeaderRow}>
        <div>
          <h2 className={styles.cardTitle}>Profile Information</h2>
          <p className={styles.cardSubtitle}>Update your contact details and unit information.</p>
        </div>
        <div className={styles.avatarFallback} aria-hidden="true">
          {(displayName || "R").slice(0, 2).toUpperCase()}
        </div>
      </div>

      {saved ? <p className={styles.successBanner}>Profile changes saved.</p> : null}
      {error ? <p className={styles.errorBanner} role="alert">{error}</p> : null}

      <div className={styles.formGrid}>
        <div className={styles.inputGroup}>
          <label htmlFor="displayName">Username</label>
          <input id="displayName" type="text" value={displayName} disabled className={styles.disabledInput} />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.unitDetailsSection}>
        <h3 className={styles.sectionLabel}>Unit Details</h3>
        <div className={styles.unitGrid}>
          <div className={styles.inputGroup}>
            <label>Unit</label>
            <input type="text" value={unitNumber} disabled className={styles.disabledInput} />
          </div>
          <div className={styles.inputGroup}>
            <label>Lease End</label>
            <input type="text" value={leaseEnd || "—"} disabled className={styles.disabledInput} />
          </div>
        </div>
        <p className={styles.infoText}>
          <Info size={12} /> Contact property management to update unit details.
        </p>
      </div>

      <div className={styles.cardActions}>
        <button type="button" className={styles.cancelBtn} onClick={handleCancel} disabled={submitting}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={() => void handleSave()}
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </section>
  );
}

function NotificationsView() {
  const [prefs, setPrefs] = useState({
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
  });
  const [snapshot, setSnapshot] = useState(prefs);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPreferences();
        if (cancelled) return;
        setPrefs(data);
        setSnapshot(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to load preferences."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function discard() {
    setPrefs(snapshot);
    setSaved(false);
    setError("");
  }

  async function save() {
    setError("");
    setSubmitting(true);
    try {
      const updated = await updatePreferences(prefs);
      setPrefs(updated);
      setSnapshot(updated);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not save preferences."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.tabContent} aria-busy="true" aria-label="Loading preferences">
        <section className={styles.card}>
          <div className="ts-skeleton" style={{ width: 140, height: 18, marginBottom: 16 }}>Loading</div>
          <div className="ts-skeleton" style={{ height: 44, marginBottom: 10 }}>Loading</div>
          <div className="ts-skeleton" style={{ height: 44, marginBottom: 10 }}>Loading</div>
          <div className="ts-skeleton" style={{ height: 44 }}>Loading</div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      {saved ? <p className={styles.successBanner}>Notification preferences saved.</p> : null}
      {error ? <p className={styles.errorBanner} role="alert">{error}</p> : null}

      <div className={styles.settingsGrid}>
        <div className={styles.mainColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <Bell size={18} className={styles.iconBlue} />
              <h3 className={styles.cardTitle}>Channels</h3>
            </div>
            <p className={styles.cardInfoText}>
              Backend stores channel-level preferences (email / SMS / push) for all notification types.
            </p>
            <div className={`${styles.stackToggles} ts-stagger`}>
              <div style={{ "--ts-stagger-i": 0 } as CSSProperties}>
                <ToggleItem
                  label="Email Notifications"
                  active={prefs.email_notifications}
                  onToggle={() =>
                    setPrefs((p) => ({ ...p, email_notifications: !p.email_notifications }))
                  }
                />
              </div>
              <div style={{ "--ts-stagger-i": 1 } as CSSProperties}>
                <ToggleItem
                  label="SMS Updates"
                  active={prefs.sms_notifications}
                  onToggle={() =>
                    setPrefs((p) => ({ ...p, sms_notifications: !p.sms_notifications }))
                  }
                />
              </div>
              <div style={{ "--ts-stagger-i": 2 } as CSSProperties}>
                <ToggleItem
                  label="Mobile App Push"
                  active={prefs.push_notifications}
                  onToggle={() =>
                    setPrefs((p) => ({ ...p, push_notifications: !p.push_notifications }))
                  }
                />
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <div className={styles.emergencyCard}>
            <ShieldAlert size={24} />
            <p>Emergency Alerts</p>
            <span>
              Crucial safety alerts (fire, security, infrastructure) are sent via all available
              channels by default.
            </span>
            <div className={styles.priorityBadge}>ACTIVE PRIORITY</div>
          </div>
        </aside>
      </div>

      <div className={styles.stickyFooter}>
        <button type="button" className={styles.textBtn} onClick={discard} disabled={submitting}>
          Discard Changes
        </button>
        <button type="button" className={styles.saveBtn} onClick={() => void save()} disabled={submitting}>
          {submitting ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}

function SecurityView() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: "1",
      icon: <Laptop size={20} />,
      device: "MacBook Pro 14 - Chrome",
      location: "San Francisco, CA • IP: 192.168.1.45",
      time: "Last active: Just now",
      current: true,
    },
    {
      id: "2",
      icon: <Smartphone size={20} />,
      device: "iPhone 15 Pro - Safari",
      location: "Oakland, CA • IP: 73.4.212.18",
      time: "Last active: 2 hours ago",
    },
    {
      id: "3",
      icon: <Tablet size={20} />,
      device: "iPad Air - TownSync App",
      location: "San Francisco, CA • IP: 192.168.1.12",
      time: "Last active: 3 days ago",
    },
  ]);

  async function updatePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage("Fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage("New password must be at least 8 characters.");
      return;
    }
    setPasswordSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordMessage(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not update password."
      );
    } finally {
      setPasswordSubmitting(false);
    }
  }

  function revokeSession(id: string) {
    setSessions((list) => list.filter((session) => session.id !== id || session.current));
  }

  function revokeOthers() {
    setSessions((list) => list.filter((session) => session.current));
  }

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
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  id="currentPassword"
                  type="password"
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className={styles.twoColGrid} style={{ gap: "16px", margin: "16px 0" }}>
                <div className={styles.inputGroup}>
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              {passwordMessage ? (
                <p className={styles.infoText} style={{ marginBottom: 12 }}>
                  {passwordMessage}
                </p>
              ) : null}
              <button
                type="button"
                className={styles.saveBtn}
                style={{ width: "fit-content" }}
                onClick={() => void updatePassword()}
                disabled={passwordSubmitting}
              >
                {passwordSubmitting ? "Updating..." : "Update Password"}
              </button>
            </div>
          </section>

          <section className={styles.card} style={{ padding: 0 }}>
            <div className={styles.sessionHeader}>
              <div className={styles.cardHeader} style={{ marginBottom: 0 }}>
                <Activity size={18} className={styles.iconBlue} />
                <h3 className={styles.cardTitle}>Active Sessions</h3>
              </div>
              <button
                type="button"
                className={styles.textLink}
                onClick={revokeOthers}
                disabled
                title="Session management isn't available yet."
              >
                Revoke All Other Sessions
              </button>
            </div>
            <p className={styles.infoText} style={{ padding: "0 16px", marginTop: 8 }}>
              <Info size={12} /> Preview only — session tracking isn&apos;t connected to the backend yet.
            </p>
            <div className={`${styles.sessionList} ts-stagger`}>
              {sessions.map((session, i) => (
                <SessionItem
                  key={session.id}
                  icon={session.icon}
                  device={session.device}
                  location={session.location}
                  time={session.time}
                  current={session.current}
                  onRevoke={() => revokeSession(session.id)}
                  staggerIndex={i}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <div className={styles.card} style={{ textAlign: "center" }}>
            <div className={styles.shieldCircle}>
              <Shield size={24} />
            </div>
            <h4 className={styles.sideTitle}>Two-Factor Authentication</h4>
            <p className={styles.cardInfoText}>Add an extra layer of security to your account.</p>
            <div className={styles.statusBox}>
              Status <span className={styles.badgeGreen}>• Not available yet</span>
            </div>
            <p className={styles.smallText}>
              Two-factor authentication isn&apos;t connected to the backend yet — check back soon.
            </p>
            <button type="button" className={styles.outlineBtn} disabled title="Not available yet.">
              Configure 2FA Settings
            </button>
            <button type="button" className={styles.dangerTextBtn} disabled title="Not available yet.">
              Disable Two-Factor Authentication
            </button>
          </div>
          <div className={styles.securityTipCard}>
            <h4 style={{ color: "white", marginBottom: "12px" }}>Security Tip</h4>
            <p>
              Never share your password or one-time codes with anyone. TownSync staff will never
              ask for your login credentials.
            </p>
            <Link href="/security" className={styles.whiteLink}>
              Read Security Policy <ExternalLink size={12} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ToggleItem({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" className={styles.toggleItem} onClick={onToggle} aria-pressed={active}>
      <span>{label}</span>
      <div className={`${styles.switch} ${active ? styles.switchOn : ""}`}>
        <div className={styles.switchKnob} />
      </div>
    </button>
  );
}

function SessionItem({
  icon,
  device,
  location,
  time,
  current,
  onRevoke,
  staggerIndex,
}: {
  icon: React.ReactNode;
  device: string;
  location: string;
  time: string;
  current?: boolean;
  onRevoke: () => void;
  staggerIndex: number;
}) {
  return (
    <div className={styles.sessionItem} style={{ "--ts-stagger-i": staggerIndex } as CSSProperties}>
      <div className={styles.sessionIconWrapper}>{icon}</div>
      <div className={styles.sessionInfo}>
        <div className={styles.sessionDevice}>
          {device} {current && <span className={styles.currentBadge}>CURRENT DEVICE</span>}
        </div>
        <div className={styles.sessionMeta}>{location}</div>
        <div className={styles.sessionMeta}>{time}</div>
      </div>
      {!current ? (
        <button
          type="button"
          className={styles.revokeBtn}
          onClick={onRevoke}
          disabled
          title="Session management isn't available yet."
        >
          Revoke
        </button>
      ) : null}
    </div>
  );
}
