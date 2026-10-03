"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  AlertTriangle,
  Briefcase,
  Lock,
  Eye,
  EyeOff,
  LogIn
} from "lucide-react";
import { ApiError, login, logoutRequest } from "../../lib/api";
import { ADMIN_ROLE, markSignedIn } from "../../lib/auth";
import styles from "./login-screen.module.css";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

        <form
          className={styles.loginForm}
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setSubmitting(true);
            try {
              const { role } = await login(email, password);
              if (role !== ADMIN_ROLE) {
                // Valid credentials, wrong portal: end that session before showing the error.
                await logoutRequest();
                setError("This portal is for administrators only.");
                return;
              }
              markSignedIn();
              router.push("/admin/dashboard");
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