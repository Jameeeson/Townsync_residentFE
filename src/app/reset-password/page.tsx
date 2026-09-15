"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Home, Loader2 } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { resetPassword } from "@/lib/api/auth";
import styles from "@/styles/auth.module.css";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not reset password.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.icon}>
            <Home size={28} strokeWidth={1.5} />
          </div>
          <h1 className={styles.title}>Set New Password</h1>
          <p className={styles.subtitle}>
            {token
              ? "Choose a new password for your account."
              : "This reset link is missing or invalid."}
          </p>
        </div>

        {!token ? (
          <div style={{ padding: "0 32px 32px", textAlign: "center" }} className="ts-fade-in-up">
            <p className={styles.errorText} role="alert" style={{ marginBottom: 20 }}>
              Please use the reset link from your email, or request a new one.
            </p>
            <Link className={styles.submitBtn} href="/forgot-password" style={{ display: "inline-flex" }}>
              Request New Link
            </Link>
          </div>
        ) : done ? (
          <div style={{ padding: "0 32px 32px", textAlign: "center" }} className="ts-fade-in-up">
            <p className={styles.successText} style={{ marginBottom: 20 }}>
              Your password has been reset. You can now log in with your new password.
            </p>
            <Link className={styles.submitBtn} href="/login" style={{ display: "inline-flex" }}>
              Return to Login
            </Link>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            {error ? (
              <p className={styles.errorText} role="alert">
                {error}
              </p>
            ) : null}
            <div className={styles.field}>
              <label htmlFor="newPassword">New Password</label>
              <div className={styles.inputWrap}>
                <input
                  id="newPassword"
                  type="password"
                  name="newPassword"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className={styles.inputWrap}>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  placeholder="Re-enter your new password"
                  minLength={8}
                  required
                />
              </div>
            </div>
            <button className={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="ts-spin" aria-hidden="true" /> Saving…
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        )}

        <div className={styles.cardFooter}>
          Remembered it? <Link href="/login">Back to Login</Link>
        </div>
      </div>

      <footer className={styles.pageFooter}>
        <p>© 2026 TownSync Property Management. All rights reserved.</p>
        <div className={styles.pageFooterLinks}>
          <Link href="/support">Contact Support</Link>
        </div>
      </footer>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className={styles.page} aria-busy="true" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
