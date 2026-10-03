"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconBell,
  IconChevron,
  IconHeadset,
  IconHelp,
  IconLogout,
  IconMail,
  IconRefresh,
  IconX,
} from "@/components/icons";
import { useToast } from "@/components/Toast";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import { ApiError } from "@/lib/api-client";
import { updateStaffPreferences } from "@/lib/services/staff";
import styles from "./settings.module.css";
import modalStyles from "@/components/ChangePasswordModal.module.css";

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
  const router = useRouter();
  const { session, loading, error, logout } = useStaffSession();
  const [push, setPush] = useState(() => readPrefs().push);
  const [email, setEmail] = useState(() => readPrefs().email);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const docsModalRef = useRef<HTMLDivElement>(null);
  const closeDocs = useCallback(() => setDocsOpen(false), []);
  useDialogA11y(docsOpen, closeDocs, docsModalRef);

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
          </div>
          <h2>{loading ? "Loading…" : error ? "Unavailable" : session?.displayName}</h2>
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
                onClick={() => setDocsOpen(true)}
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
                onClick={() => router.push("/staff/messages")}
              >
                <div className={styles.rowIcon}>
                  <IconHeadset size={18} />
                </div>
                <div className={styles.rowText}>
                  <strong>Contact System Admin</strong>
                  <span>Chat with the admin team about access or shift issues</span>
                </div>
                <IconChevron size={18} className={styles.chevron} />
              </button>
            </div>
          </section>

          <button type="button" className={styles.logout} onClick={onLogout}>
            <IconLogout size={18} /> Logout
          </button>
          <p className={styles.version}>Version 1.0.0-beta</p>
        </div>
      </div>

      {changePasswordOpen ? (
        <ChangePasswordModal
          onClose={() => setChangePasswordOpen(false)}
          onSuccess={onPasswordChanged}
        />
      ) : null}

      {docsOpen ? (
        <div className={modalStyles.overlay} role="presentation" onClick={closeDocs}>
          <div
            ref={docsModalRef}
            className={modalStyles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-docs-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className={modalStyles.header}>
              <div>
                <h2 id="staff-docs-title">Documentation</h2>
                <p>Quick guides for the scanner and visitor logs.</p>
              </div>
              <button type="button" className={modalStyles.close} onClick={closeDocs} aria-label="Close">
                <IconX size={20} />
              </button>
            </header>
            <div className={modalStyles.body}>
              <div className={styles.docsSection}>
                <strong>Gate Scanner</strong>
                <p>
                  Scan a visitor&apos;s QR pass to check them in or out. If the camera
                  won&apos;t focus, use Manual Entry and enter the visitor&apos;s ID
                  details instead. Passes outside the community&apos;s gate hours are
                  rejected automatically.
                </p>
              </div>
              <div className={styles.docsSection}>
                <strong>Visitor Logs</strong>
                <p>
                  Search by visitor name to review past entries. Each entry shows
                  check-in and check-out times; a red badge means the visitor was
                  denied entry.
                </p>
              </div>
              <div className={styles.docsSection}>
                <strong>Tasks &amp; Preferences</strong>
                <p>
                  Maintenance tickets appear on your Tasks and Calendar pages by
                  priority. Toggle Push Notifications above to get alerted when a
                  new ticket is assigned to you.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
