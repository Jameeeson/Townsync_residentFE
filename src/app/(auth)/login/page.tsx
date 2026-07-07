"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, Home, Lock, Mail } from "lucide-react";
import styles from "@/styles/auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/resident");
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.icon}>
            <Home size={28} strokeWidth={1.5} />
          </div>
          <h1 className={styles.title}>Resident Login</h1>
          <p className={styles.subtitle}>Access your TownSync community portal</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="email">Email Address</label>
            <div className={styles.inputWrap}>
              <Mail className={styles.inputIcon} size={16} />
              <input
                id="email"
                type="email"
                name="email"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <div className={styles.inputWrap}>
              <Lock className={styles.inputIcon} size={16} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className={styles.options}>
            <label className={styles.remember}>
              <input type="checkbox" name="remember" />
              Remember Me
            </label>
            <Link className={styles.forgotLink} href="#">
              Forgot Password?
            </Link>
          </div>

          <button className={styles.submitBtn} type="submit">
            Log In
          </button>
        </form>

        <div className={styles.cardFooter}>
          New to the community? <Link href="/register">Request Access</Link>
        </div>
      </div>

      <footer className={styles.pageFooter}>
        <p>© 2026 TownSync Property Management. All rights reserved.</p>
        <div className={styles.pageFooterLinks}>
          <Link href="#">Privacy Policy</Link>
          <Link href="#">Contact Support</Link>
        </div>
      </footer>
    </div>
  );
}
