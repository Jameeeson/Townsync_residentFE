"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Home, Loader2 } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { forgotPassword } from "@/lib/api/auth";
import styles from "@/styles/auth.module.css";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();

    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not send reset link.";
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
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>
            Enter your resident email and we&apos;ll send reset instructions.
          </p>
        </div>

        {sent ? (
          <div style={{ padding: "0 32px 32px", textAlign: "center" }} className="ts-fade-in-up">
            <p className={styles.successText} style={{ marginBottom: 20 }}>
              If an account exists for that email, reset instructions are on the way. The link works once and expires in 5 minutes.
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
              <label htmlFor="email">Email Address</label>
              <div className={styles.inputWrap}>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="name@email.com"
                  required
                />
              </div>
            </div>
            <button className={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="ts-spin" aria-hidden="true" /> Sending…
                </>
              ) : (
                "Send Reset Link"
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
