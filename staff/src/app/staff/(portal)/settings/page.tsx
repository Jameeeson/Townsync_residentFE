"use client";

import { useState } from "react";
import {
  IconBell,
  IconChevron,
  IconHeadset,
  IconHelp,
  IconLogout,
  IconMail,
  IconPencil,
  IconRefresh,
} from "@/components/icons";
import { useToast } from "@/components/Toast";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import { ApiError } from "@/lib/api-client";
import { updateStaffPreferences } from "@/lib/services/staff";
import styles from "./settings.module.css";

const PREFS_KEY = "townsync.staff.notificationPrefs";

function readPrefs(): { push: boolean; email: boolean } {
  if (typeof window === "undefined") return { push: true, email: false };
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { push: true, email: false };
    const prefs = JSON.parse(raw) as { push?: boolean; email?: boolean };
    return {
      push: typeof prefs.push === "boolean" ? prefs.push : true,
      email: typeof prefs.email === "boolean" ? prefs.email : false,
    };
  } catch {
    return { push: true, email: false };
  }
}

export default function StaffSettingsPage() {
  const { toast } = useToast();
  const { session, loading, error, logout } = useStaffSession();
  const [push, setPush] = useState(() => readPrefs().push);
  const [email, setEmail] = useState(() => readPrefs().email);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  function persist(next: { push: boolean; email: boolean }) {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  async function syncPrefs(
    next: { push: boolean; email: boolean },
    previous: { push: boolean; email: boolean },
    successMessage: string,
  ) {
    setSavingPrefs(true);
    try {
      await updateStaffPreferences({
        push_notifications: next.push,
        email_reports: next.email,
      });
      toast(successMessage, "success");
    } catch (e) {
      // Revert the optimistic update — local and backend state must not diverge.
      setPush(previous.push);
      setEmail(previous.email);
      persist(previous);
      toast(e instanceof ApiError ? e.message : "Could not save preferences.", "danger");
    } finally {
      setSavingPrefs(false);
    }
  }

  function togglePush() {
    const previous = { push, email };
    const next = { push: !push, email };
    setPush(next.push);
    persist(next);
    void syncPrefs(next, previous, next.push ? "Push notifications enabled." : "Push notifications disabled.");
  }

  function toggleEmail() {
    const previous = { push, email };
    const next = { push, email: !email };
    setEmail(next.email);
    persist(next);
    void syncPrefs(next, previous, next.email ? "Email reports enabled." : "Email reports disabled.");
  }

  function comingSoon(label: string) {
    toast(`${label} opens when account services are connected.`, "info");
  }

  function onPasswordChanged() {
    setChangePasswordOpen(false);
    toast("Password updated successfully.", "success");
  }

  async function onLogout() {
    await logout();
    toast("Signed out.", "info");
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Account</p>
          <h1>Settings</h1>
          <p className={styles.lede}>
            Manage notifications, security, and support for your staff shift.
          </p>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.profileCard}>
          <div className={styles.photoWrap}>
            <div className={styles.photo} aria-hidden>
              {session?.initials ?? "ST"}
            </div>
            <button
              type="button"
              className={styles.editPhoto}
              aria-label="Edit photo"
              onClick={() => comingSoon("Photo upload")}
            >
              <IconPencil size={14} />
            </button>
          </div>
          <h2>{loading ? "Loading…" : error ? "Unavailable" : session?.displayName}</h2>
          <span className={styles.shiftId}>
            Shift ID: {session?.profile.shift_id ?? "N/A"}
          </span>
          <p className={styles.role}>
            {session
              ? `${session.profile.staff_type} · ${session.profile.employee_id}`
              : error ?? ""}
          </p>
        </aside>

        <div className={styles.panels}>
          <section>
            <h3 className={styles.sectionTitle}>Notification Preferences</h3>
            <div className={styles.card}>
              <div className={styles.row}>
                <div className={styles.rowIcon}>
                  <IconBell size={18} />
                </div>
                <div className={styles.rowText}>
                  <strong>Push Notifications</strong>
                  <span>Urgent task alerts</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={push}
                  aria-label="Push notifications"
                  disabled={savingPrefs}
                  className={`${styles.toggle} ${push ? styles.toggleOn : ""}`}
                  onClick={togglePush}
                >
                  <span />
                </button>
              </div>
              <div className={styles.row}>
                <div className={styles.rowIcon}>
                  <IconMail size={18} />
                </div>
                <div className={styles.rowText}>
                  <strong>Email Reports</strong>
                  <span>Daily summary logs</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={email}
                  aria-label="Email reports"
                  disabled={savingPrefs}
                  className={`${styles.toggle} ${email ? styles.toggleOn : ""}`}
                  onClick={toggleEmail}
                >
                  <span />
                </button>
              </div>
            </div>
          </section>

          <section>
            <h3 className={styles.sectionTitle}>Security & Auth</h3>
            <div className={styles.card}>
              <button
                type="button"
                className={styles.linkRow}
                onClick={() => setChangePasswordOpen(true)}
              >
                <div className={styles.rowIcon}>
                  <IconRefresh size={18} />
                </div>
                <div className={styles.rowText}>
                  <strong>Change Password</strong>
                  <span>Update your staff credentials</span>
                </div>
                <IconChevron size={18} className={styles.chevron} />
              </button>
            </div>
          </section>

          <section>
            <h3 className={styles.sectionTitle}>Help & Support</h3>
            <div className={styles.card}>
              <button
                type="button"
                className={styles.linkRow}
                onClick={() => comingSoon("Documentation")}
              >
                <div className={styles.rowIcon}>
                  <IconHelp size={18} />
                </div>
                <div className={styles.rowText}>
                  <strong>Documentation</strong>
                  <span>Guides for scanner and logs</span>
                </div>
                <IconChevron size={18} className={styles.chevron} />
              </button>
              <button
                type="button"
                className={styles.linkRow}
                onClick={() => comingSoon("Admin contact")}
              >
                <div className={styles.rowIcon}>
                  <IconHeadset size={18} />
                </div>
                <div className={styles.rowText}>
                  <strong>Contact System Admin</strong>
                  <span>Escalate access or shift issues</span>
                </div>
                <IconChevron size={18} className={styles.chevron} />
              </button>
            </div>
          </section>

          <button type="button" className={styles.logout} onClick={onLogout}>
            <IconLogout size={18} /> Logout
          </button>
          <p className={styles.version}>Version 2.4.1 (Build 8842)</p>
        </div>
      </div>

      {changePasswordOpen ? (
        <ChangePasswordModal
          onClose={() => setChangePasswordOpen(false)}
          onSuccess={onPasswordChanged}
        />
      ) : null}
    </div>
  );
}
