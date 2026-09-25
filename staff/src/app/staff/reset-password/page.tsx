"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { IconArrowRight, IconEye, IconEyeOff, IconLock, IconShieldUser } from "@/components/icons";
import { ApiError } from "@/lib/api-client";
import { resetPassword } from "@/lib/auth";
import styles from "../login/login.module.css";

function ResetForm() {
  // The token arrives only in the emailed link; there is no other way in.
  const token = useSearchParams().get("token") ?? "";

  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not reset your password. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className={styles.card}>
        <div className={styles.logo}>
          <IconShieldUser size={28} />
        </div>
        <h2 className={styles.title}>Link not valid</h2>
        <p className={styles.subtitle}>
          This page needs the reset link from your email. Request a new one if the
          link is older than 30 minutes.
        </p>
        <Link href="/staff/forgot-password" className={styles.submit}>
          <span>Request a New Link</span>
          <IconArrowRight size={18} />
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.card}>
        <div className={styles.logo}>
          <IconShieldUser size={28} />
        </div>
        <h2 className={styles.title}>Password updated</h2>
        <p className={styles.subtitle}>Sign in with your new password.</p>
        <Link href="/staff/login" className={styles.submit}>
          <span>Go to Sign In</span>
          <IconArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.card} onSubmit={onSubmit} noValidate>
      <div className={styles.logo}>
        <IconShieldUser size={28} />
      </div>
      <h2 className={styles.title}>Set New Password</h2>
      <p className={styles.subtitle}>Choose a password you haven&apos;t used before</p>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <label className={styles.field}>
        <span>New Password</span>
        <div className={styles.inputWrap}>
          <IconLock size={18} className={styles.inputIcon} />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            aria-invalid={Boolean(error)}
            minLength={8}
            required
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

      <label className={styles.field}>
        <span>Confirm Password</span>
        <div className={styles.inputWrap}>
          <IconLock size={18} className={styles.inputIcon} />
          <input
            name="confirm"
            type={showPassword ? "text" : "password"}
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
      </label>

      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? <span className={styles.spinner} aria-hidden /> : null}
        <span>{loading ? "Updating…" : "Update Password"}</span>
        {!loading ? <IconArrowRight size={18} /> : null}
      </button>

      <div className={styles.forgotRow}>
        <Link href="/staff/login" className={styles.textLink}>
          Back to Sign In
        </Link>
      </div>
    </form>
  );
}

export default function StaffResetPasswordPage() {
  return (
    <div className={styles.page}>
      <div className={styles.visual} aria-hidden>
        <div className={styles.visualOverlay} />
        <div className={styles.visualContent}>
          <p className={styles.visualEyebrow}>TownSync Property Management</p>
          <h1 className={styles.visualTitle}>
            Set a new
            <br />
            staff password
          </h1>
          <p className={styles.visualCopy}>
            Reset links can only be used once. Requesting a new link voids any
            earlier one.
          </p>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.cardWrap}>
          <div className={styles.mobileBrand}>
            <span className={styles.mobileMark}>TS</span>
            <strong>TownSync</strong>
          </div>
          {/* useSearchParams needs a Suspense boundary to prerender. */}
          <Suspense fallback={<div className={styles.card} aria-busy="true" />}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
