"use client";

import { useRouter } from "next/navigation";
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
import { STAFF_PROFILE } from "@/lib/staff-profile";
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
  const router = useRouter();
  const { toast } = useToast();
  const [push, setPush] = useState(() => readPrefs().push);
  const [email, setEmail] = useState(() => readPrefs().email);
  function persist(next: { push: boolean; email: boolean }) {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function togglePush() {
    setPush((v) => {
      const next = !v;
      persist({ push: next, email });
      toast(
        next ? "Push notifications enabled." : "Push notifications disabled.",
        "success",
      );
      return next;
    });
  }

  function toggleEmail() {
    setEmail((v) => {
      const next = !v;
      persist({ push, email: next });
      toast(
        next ? "Email reports enabled." : "Email reports disabled.",
        "success",
      );
      return next;
    });
  }

  function comingSoon(label: string) {
    toast(`${label} opens when account services are connected.`, "info");
  }

  function logout() {
    try {
      window.sessionStorage.removeItem("townsync.staff.previewSession");
    } catch {
      /* ignore */
    }
    toast("Signed out of preview session.", "info");
    router.push("/staff/login");
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
              {STAFF_PROFILE.initials}
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
          <h2>{STAFF_PROFILE.displayName}</h2>
          <span className={styles.shiftId}>Shift ID: {STAFF_PROFILE.shiftId}</span>
          <p className={styles.role}>
            {STAFF_PROFILE.role} · {STAFF_PROFILE.block}
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
                onClick={() => comingSoon("Change password")}
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

          <button type="button" className={styles.logout} onClick={logout}>
            <IconLogout size={18} /> Logout
          </button>
          <p className={styles.version}>Version 2.4.1 (Build 8842)</p>
        </div>
      </div>
    </div>
  );
}
