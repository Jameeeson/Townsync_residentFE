"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { IconArrowRight, IconShieldUser, IconUser } from "@/components/icons";
import { ApiError } from "@/lib/api-client";
import { forgotPassword } from "@/lib/auth";
import styles from "../login/login.module.css";

export default function StaffForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!email) {
      setError("Enter your work email.");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not send the reset link. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.visual} aria-hidden>
        <div className={styles.visualOverlay} />
        <div className={styles.visualContent}>
          <p className={styles.visualEyebrow}>TownSync Property Management</p>
          <h1 className={styles.visualTitle}>
            Account recovery
            <br />
            for on-site staff
          </h1>
          <p className={styles.visualCopy}>
            Reset links are sent to your registered work email and expire after 30
            minutes.
          </p>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.cardWrap}>
          <div className={styles.mobileBrand}>
            <span className={styles.mobileMark}>TS</span>
            <strong>TownSync</strong>
          </div>

          {sent ? (
            <div className={styles.card}>
              <div className={styles.logo}>
                <IconShieldUser size={28} />
              </div>
              <h2 className={styles.title}>Check your email</h2>
              {/* Deliberately not confirming whether the address exists. */}
              <p className={styles.subtitle}>
                If a staff account exists for that address, a reset link is on its
                way. The link expires in 30 minutes.
              </p>
              <Link href="/staff/login" className={styles.submit}>
                <span>Back to Sign In</span>
                <IconArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <form className={styles.card} onSubmit={onSubmit} noValidate>
              <div className={styles.logo}>
                <IconShieldUser size={28} />
              </div>
              <h2 className={styles.title}>Reset Password</h2>
              <p className={styles.subtitle}>
                We&apos;ll email a reset link to your work address
              </p>

              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}

              <label className={styles.field}>
                <span>Work Email</span>
                <div className={styles.inputWrap}>
                  <IconUser size={18} className={styles.inputIcon} />
                  <input
                    name="email"
                    type="email"
                    placeholder="james.rivera@townsync.local"
                    autoComplete="username"
                    aria-invalid={Boolean(error)}
                    required
                  />
                </div>
              </label>

              <button type="submit" className={styles.submit} disabled={loading}>
                {loading ? <span className={styles.spinner} aria-hidden /> : null}
                <span>{loading ? "Sending…" : "Send Reset Link"}</span>
                {!loading ? <IconArrowRight size={18} /> : null}
              </button>

              <div className={styles.forgotRow}>
                <Link href="/staff/login" className={styles.textLink}>
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
