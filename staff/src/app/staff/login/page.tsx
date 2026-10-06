"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { ApiError, API_BASE_URL } from "@/lib/api-client";
import { login, resendTwoFactor, verifyTwoFactor } from "@/lib/auth";
import styles from "./login.module.css";

/** Shown on the sign-in page after the automatic logout sent the user here. */
function IdleNotice() {
  const params = useSearchParams();
  if (!params.has("idle")) return null;
  return (
    <p role="status" className={styles.notice}>
      You were signed out after a period of inactivity. Sign in again to continue.
    </p>
  );
}

export default function StaffLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<{ token: string; hint: string } | null>(null);
  const [code, setCode] = useState("");

  async function onCodeSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!challenge) return;
    setError(null);
    setLoading(true);
    try {
      await verifyTwoFactor(challenge.token, code);
      router.push("/staff/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed. Please try again.");
      if (err instanceof ApiError && (err.status === 429 || /expired/i.test(err.message))) setChallenge(null);
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (!challenge) return;
    setError(null);
    try {
      const hint = await resendTwoFactor(challenge.token);
      setNotice(`A new code was sent to ${hint || challenge.hint}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resend the code.");
    }
  }

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
      const step = await login(identity, password);
      if (step) {
        setChallenge({ token: step.challengeToken, hint: step.emailHint });
        setCode("");
        setNotice(null);
        return;
      }
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

          {challenge ? (
            <form className={styles.card} onSubmit={onCodeSubmit} noValidate>
              <div className={styles.logo}>
                <IconShieldUser size={28} />
              </div>
              <h2 className={styles.title}>Verify sign-in</h2>
              <p className={styles.subtitle}>
                We emailed a 6-digit code to {challenge.hint}. Enter it to finish signing in.
              </p>
              <label className={styles.field}>
                <span>Verification code</span>
                <div className={styles.inputWrap}>
                  <IconLock size={18} className={styles.inputIcon} />
                  <input
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                    required
                  />
                </div>
              </label>
              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p className={styles.notice} role="status">
                  {notice}
                </p>
              ) : null}
              <div className={styles.forgotRow}>
                <button type="button" className={styles.textLink} onClick={() => void onResend()}>
                  Resend code
                </button>
                <button
                  type="button"
                  className={styles.textLink}
                  onClick={() => {
                    setChallenge(null);
                    setCode("");
                    setError(null);
                    setNotice(null);
                  }}
                >
                  Back
                </button>
              </div>
              <button type="submit" className={styles.submit} disabled={loading || code.length < 6}>
                {loading ? <span className={styles.spinner} aria-hidden /> : null}
                <span>{loading ? "Verifying…" : "Verify and sign in"}</span>
                {!loading ? <IconArrowRight size={18} /> : null}
              </button>
            </form>
          ) : (
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
            <Suspense fallback={null}>
              <IdleNotice />
            </Suspense>

            <label className={styles.field}>
              <span>Work Email</span>
              <div className={styles.inputWrap}>
                <IconUser size={18} className={styles.inputIcon} />
                <input
                  name="identity"
                  type="email"
                  placeholder="user@email.com"
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
              <Link href="/staff/register" className={styles.textLink}>
                Create Account
              </Link>
              <Link href="/staff/forgot-password" className={styles.textLink}>
                Forgot Password?
              </Link>
            </div>

            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? (
                <span className={styles.spinner} aria-hidden />
              ) : null}
              <span>{loading ? "Signing in…" : "Sign In"}</span>
              {!loading ? <IconArrowRight size={18} /> : null}
            </button>
          </form>
          )}

          <footer className={styles.footer}>
            <p>© 2026 TownSync Property Management. All rights reserved.</p>
            <p>System v1.0.0-beta · Beta release</p>
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
                onClick={async () => {
                  setNotice("Checking portal status…");
                  try {
                    const res = await fetch(`${API_BASE_URL}/health`);
                    setNotice(
                      res.ok
                        ? "Portal status: Online (connected to backend)."
                        : "Portal status: Backend is reachable but reporting an error.",
                    );
                  } catch {
                    setNotice("Portal status: Cannot reach the backend right now.");
                  }
                }}
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
