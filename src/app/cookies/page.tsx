import Link from "next/link";
import { LegalShell } from "@/components/legal/LegalShell";
import styles from "@/styles/legal.module.css";

export default function CookiesPage() {
  return (
    <LegalShell>
      <p className={styles.eyebrow}>Legal</p>
      <h1 className={styles.title}>Cookie Policy</h1>
      <p className={styles.lead}>
        TownSync uses essential cookies to keep you signed in and remember basic portal
        preferences.
      </p>
      <div className={styles.body}>
        <h2>Essential cookies</h2>
        <p>
          Session and authentication cookies are required for login, role routing, and secure
          form submissions.
        </p>
        <h2>Preference cookies</h2>
        <p>
          Optional preferences such as notification settings may be stored locally in your
          browser.
        </p>
        <h2>Control</h2>
        <p>
          You can clear cookies in your browser settings. Doing so may sign you out of the
          resident portal.
        </p>
      </div>
      <div className={styles.actions}>
        <Link className={styles.primaryBtn} href="/privacy">
          Privacy Policy
        </Link>
        <Link className={styles.secondaryBtn} href="/">
          Back to Home
        </Link>
      </div>
    </LegalShell>
  );
}
