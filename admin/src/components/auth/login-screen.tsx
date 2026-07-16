"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  AlertTriangle, 
  Briefcase, 
  Lock, 
  Eye, 
  LogIn 
} from "lucide-react";
import styles from "./login-screen.module.css";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
          onSubmit={(event) => {
            event.preventDefault();
            void router.push("/admin/dashboard");
          }}
        >
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
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
              <Eye className={styles.eyeIcon} size={18} />
            </div>
          </label>

          <button type="submit" className={styles.primaryButton}>
            <LogIn size={18} />
            Secure Login
          </button>
        </form>

        <footer className={styles.cardFooter}>
          TownSync OS v1.0.4
        </footer>
      </section>
    </main>
  );
}