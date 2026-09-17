"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconAlert,
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconHeadset,
  IconLock,
  IconShieldUser,
  IconUser,
} from "@/components/icons";
import { ApiError } from "@/lib/api-client";
import { login } from "@/lib/auth";
import styles from "./login.module.css";

export default function StaffLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const form = new FormData(e.currentTarget);
    const identity = String(form.get("identity") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!identity) {
      setError("Enter your work email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await login(identity, password);
      router.push("/staff/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function showSoon(label: string) {
    setNotice(`${label} will be available when account services are connected.`);
    setError(null);
  }

  return (
    <div className={styles.page}>
      <div className={styles.visual} aria-hidden>
        <div className={styles.visualOverlay} />
        <div className={styles.visualContent}>
          <p className={styles.visualEyebrow}>TownSync Property Management</p>
          <h1 className={styles.visualTitle}>
            Secure operations
            <br />
            for every community
          </h1>
          <p className={styles.visualCopy}>
            Gate access, maintenance, and visitor control — unified for on-site
            staff.
          </p>
          <ul className={styles.visualList}>
            <li>Live gate scanner & visitor verification</li>
            <li>Shift tasks with priority routing</li>
            <li>Role-based staff portal access</li>
          </ul>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.cardWrap}>
          <div className={styles.mobileBrand}>
            <span className={styles.mobileMark}>TS</span>
            <strong>TownSync</strong>
          </div>

          <form className={styles.card} onSubmit={onSubmit} noValidate>
            <div className={styles.logo}>
              <IconShieldUser size={28} />
            </div>
            <h2 className={styles.title}>Staff Portal</h2>
            <p className={styles.subtitle}>Management and Operations Access</p>

            <div className={styles.warning} role="status">
              <IconAlert size={16} />
              <span>Restricted access: authorized personnel only</span>
            </div>

            <label className={styles.field}>
              <span>Work Email</span>
              <div className={styles.inputWrap}>
                <IconUser size={18} className={styles.inputIcon} />
                <input
                  name="identity"
                  type="email"
                  placeholder="james.rivera@townsync.local"
                  autoComplete="username"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                  required
                />
              </div>
            </label>

            <label className={styles.field}>
              <span>Password</span>
              <div className={styles.inputWrap}>
                <IconLock size={18} className={styles.inputIcon} />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={Boolean(error)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </label>

            {error ? (
              <p id="login-error" className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p className={styles.notice} role="status">
                {notice}
              </p>
            ) : null}

            <div className={styles.forgotRow}>
              <button
                type="button"
                className={styles.textLink}
                onClick={() => showSoon("Password recovery")}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? (
                <span className={styles.spinner} aria-hidden />
              ) : null}
              <span>{loading ? "Signing in…" : "Sign In"}</span>
              {!loading ? <IconArrowRight size={18} /> : null}
            </button>
          </form>

          <footer className={styles.footer}>
            <p>© 2026 TownSync Property Management. All rights reserved.</p>
            <p>System v4.2.1-stable · Node: SG-PROD-01</p>
            <div className={styles.footerLinks}>
              <button
                type="button"
                className={styles.footerBtn}
                onClick={() => showSoon("Administrator contact")}
              >
                <IconHeadset size={14} /> Contact Administrator
              </button>
              <span aria-hidden>·</span>
              <button
                type="button"
                className={styles.footerBtn}
                onClick={() =>
                  setNotice("Portal status: Online (connected to backend).")
                }
              >
                Portal Status
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
