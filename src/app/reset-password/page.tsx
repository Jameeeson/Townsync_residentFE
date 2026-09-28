"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { ApiError, resetPassword } from "../../lib/api";
import styles from "../../components/auth/login-screen.module.css";

function ResetPasswordForm() {
  // The token exists only in the emailed link.
  const token = useSearchParams().get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to reach the server."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <>
        <p className={styles.subtitle}>
          This page needs the reset link from your email. Request a new one if
          your link is more than 30 minutes old.
        </p>
        <Link href="/forgot-password" className={styles.primaryButton}>
          Request a New Link
        </Link>
      </>
    );
  }

  if (done) {
    return (
      <>
        <p className={styles.successBanner}>
          Your password has been updated. Sign in with your new password.
        </p>
        <Link href="/" className={styles.primaryButton}>
          Go to Login
        </Link>
      </>
    );
  }

  return (
    <>
      <p className={styles.subtitle}>Choose a password you haven&apos;t used before.</p>
      <form className={styles.loginForm} onSubmit={onSubmit}>
        {error ? (
          <p role="alert" className={styles.warningBanner}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </p>
        ) : null}

        <label>
          New Password
          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} size={18} />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button
              type="button"
              className={styles.eyeButton}
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <label>
          Confirm Password
          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} size={18} />
            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </label>

        <button type="submit" className={styles.primaryButton} disabled={submitting}>
          {submitting ? (
            <Loader2 size={18} className={styles.spin} aria-hidden />
          ) : (
            <ShieldCheck size={18} />
          )}
          {submitting ? "Updating..." : "Update Password"}
        </button>
      </form>
      <div className={styles.linkRow}>
        <Link href="/" className={styles.textLink}>
          Back to Login
        </Link>
      </div>
    </>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.logoBox}>
            <Building2 size={24} color="white" />
          </div>
          <h1>TownSync</h1>
          <span className={styles.adminBadge}>ADMIN PORTAL</span>
        </div>

        {/* useSearchParams needs a Suspense boundary to prerender. */}
        <Suspense fallback={<p className={styles.subtitle}>Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>

        <footer className={styles.cardFooter}>TownSync OS v1.0.4</footer>
      </section>
    </main>
  );
}
