"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Briefcase, Building2, Loader2, Send } from "lucide-react";
import { ApiError, forgotPassword } from "../../lib/api";
import styles from "../../components/auth/login-screen.module.css";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to reach the server."
      );
    } finally {
      setSubmitting(false);
    }
  }

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

        {sent ? (
          <>
            {/* Worded so it reveals nothing about whether the address exists. */}
            <p className={styles.successBanner}>
              If an administrator account exists for that address, a reset link has
              been sent. The link expires in 30 minutes and can be used once.
            </p>
            <Link href="/" className={styles.primaryButton}>
              Back to Login
            </Link>
          </>
        ) : (
          <>
            <p className={styles.subtitle}>
              Enter your work email and we&apos;ll send a link to set a new password.
            </p>
            <form className={styles.loginForm} onSubmit={onSubmit}>
              {error ? (
                <p role="alert" className={styles.warningBanner}>
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </p>
              ) : null}

              <label>
                Work Email
                <div className={styles.inputWrapper}>
                  <Briefcase className={styles.inputIcon} size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@townsync.local"
                    autoComplete="username"
                    required
                  />
                </div>
              </label>

              <button type="submit" className={styles.primaryButton} disabled={submitting}>
                {submitting ? (
                  <Loader2 size={18} className={styles.spin} aria-hidden />
                ) : (
                  <Send size={18} />
                )}
                {submitting ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
            <div className={styles.linkRow}>
              <Link href="/" className={styles.textLink}>
                Back to Login
              </Link>
            </div>
          </>
        )}

        <footer className={styles.cardFooter}>TownSync OS v1.0.4</footer>
      </section>
    </main>
  );
}
