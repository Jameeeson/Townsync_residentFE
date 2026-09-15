"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, Home, Loader2, Lock, Mail } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { fetchMe, login } from "@/lib/api/auth";
import styles from "@/styles/auth.module.css";

const REMEMBERED_EMAIL_KEY = "townsync_remembered_email";

function readRememberedEmail(): string {
  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
  } catch {
    // localStorage unavailable (private mode, etc.)
    return "";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberedEmail, setRememberedEmail] = useState("");

  // Read after mount (not via a lazy useState initializer) so the server-rendered
  // markup (which can't see localStorage) matches the client's first render and
  // React doesn't warn about a hydration mismatch on the input's value.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only API (localStorage) on mount; there is no way to derive this during render without a hydration mismatch.
    setRememberedEmail(readRememberedEmail());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const remember = form.get("remember") === "on";

    try {
      await login(email, password);

      try {
        if (remember) {
          window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        } else {
          window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
      } catch {
        // localStorage unavailable — non-fatal
      }

      const me = await fetchMe();
      if (me.role && me.role.toLowerCase() !== "resident") {
        // Resident portal only for now
      }
      router.push("/resident");
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Login failed. Please try again.";
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
            <Home size={28} strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h1 className={styles.title}>Resident Login</h1>
          <p className={styles.subtitle}>Access your TownSync community portal</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error ? (
            <p className={styles.errorText} role="alert">
              {error}
            </p>
          ) : null}

          <div className={styles.field}>
            <label htmlFor="email">Email Address</label>
            <div className={styles.inputWrap}>
              <Mail className={styles.inputIcon} size={16} aria-hidden="true" />
              <input
                id="email"
                type="email"
                name="email"
                placeholder="name@example.com"
                required
                autoComplete="email"
                defaultValue={rememberedEmail}
                key={rememberedEmail}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <div className={styles.inputWrap}>
              <Lock className={styles.inputIcon} size={16} aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div className={styles.options}>
            <label className={styles.remember}>
              <input
                type="checkbox"
                name="remember"
                defaultChecked={Boolean(rememberedEmail)}
                key={`remember-${rememberedEmail}`}
              />
              Remember Me
            </label>
            <Link className={styles.forgotLink} href="/forgot-password">
              Forgot Password?
            </Link>
          </div>

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="ts-spin" aria-hidden="true" /> Logging in…
              </>
            ) : (
              "Log In"
            )}
          </button>
        </form>

        <div className={styles.cardFooter}>
          New to the community? <Link href="/register">Request Access</Link>
        </div>
      </div>

      <footer className={styles.pageFooter}>
        <p>© 2026 TownSync Property Management. All rights reserved.</p>
        <div className={styles.pageFooterLinks}>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/support">Contact Support</Link>
        </div>
      </footer>
    </div>
  );
}
