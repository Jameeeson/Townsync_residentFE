"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  AlertTriangle,
  Briefcase,
  Lock,
  Eye,
  EyeOff,
  LogIn
} from "lucide-react";
import { ApiError, login, logoutRequest, resendTwoFactor, verifyTwoFactor } from "../../lib/api";
import { ADMIN_ROLE, markSignedIn } from "../../lib/auth";
import styles from "./login-screen.module.css";

/** Shown on the sign-in page after the automatic logout sent the user here. */
function IdleNotice() {
  const params = useSearchParams();
  if (!params.has("idle")) return null;
  return (
    <p role="status" className={styles.warningBanner}>
      You were signed out after a period of inactivity. Sign in again to continue.
    </p>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [challenge, setChallenge] = useState<{ token: string; hint: string } | null>(null);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  async function finish(role: string | undefined) {
    if (role !== ADMIN_ROLE) {
      // Valid credentials, wrong portal: end that session before showing the error.
      await logoutRequest();
      setChallenge(null);
      setError("This portal is for administrators only.");
      return;
    }
    markSignedIn();
    router.push("/admin/dashboard");
  }

  async function submitCode() {
    if (!challenge) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await verifyTwoFactor(challenge.token, code);
      await finish(result.role);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reach the server.");
      if (err instanceof ApiError && (err.status === 429 || /expired/i.test(err.message))) setChallenge(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function resendCode() {
    if (!challenge) return;
    setError(null);
    try {
      const hint = await resendTwoFactor(challenge.token);
      setNotice(`A new code was sent to ${hint || challenge.hint}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reach the server.");
    }
  }

  if (challenge) {
    return (
      <main className={styles.loginPage}>
        <section className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <div className={styles.logoBox}>
              <Building2 size={24} color="white" />
            </div>
            <h1>TownSync</h1>
            <span className={styles.adminBadge}>VERIFY SIGN-IN</span>
          </div>
          <form
            className={styles.loginForm}
            onSubmit={(event) => {
              event.preventDefault();
              void submitCode();
            }}
          >
            <p>
              We emailed a 6-digit code to <strong>{challenge.hint}</strong>. Enter it to finish signing in.
            </p>
            {error ? (
              <p role="alert" className={styles.warningBanner}>
                {error}
              </p>
            ) : null}
            {notice ? <p role="status">{notice}</p> : null}
            <label>
              Verification code
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={18} />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  autoFocus
                  required
                />
              </div>
            </label>
            <button type="submit" className={styles.primaryButton} disabled={submitting || code.length < 6}>
              <LogIn size={18} />
              {submitting ? "Verifying..." : "Verify and sign in"}
            </button>
          </form>
          <div className={styles.linkRow}>
            <button type="button" className={styles.textLink} onClick={() => void resendCode()}>
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
        </section>
      </main>
    );
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

        <div className={styles.warningBanner}>
          <AlertTriangle size={16} />
          <p>Restricted Access: Authorized Personnel Only</p>
        </div>

        <Suspense fallback={null}>
          <IdleNotice />
        </Suspense>

        <form
          className={styles.loginForm}
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setSubmitting(true);
            try {
              const result = await login(email, password);
              if (result.two_factor_required && result.challenge_token) {
                setChallenge({ token: result.challenge_token, hint: result.email_hint ?? "your email" });
                setCode("");
                setNotice(null);
                return;
              }
              await finish(result.role);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Unable to reach the server.");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {error ? (
            <p role="alert" className={styles.warningBanner}>
              {error}
            </p>
          ) : null}

          <label>
            Employee ID or Work Email
            <div className={styles.inputWrapper}>
              <Briefcase className={styles.inputIcon} size={18} />
              <input
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="e.g. TC-8492 or email"
                required
              />
            </div>
          </label>

          <label>
            Password
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
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

          <button type="submit" className={styles.primaryButton} disabled={submitting}>
            <LogIn size={18} />
            {submitting ? "Signing in..." : "Secure Login"}
          </button>
        </form>

        <div className={styles.linkRow}>
          <Link href="/forgot-password" className={styles.textLink}>
            Forgot Password?
          </Link>
        </div>

        <footer className={styles.cardFooter}>
          TownSync OS v1.0.0-beta
        </footer>
      </section>
    </main>
  );
}