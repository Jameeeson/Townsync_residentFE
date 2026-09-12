import Link from "next/link";
import { LegalShell } from "@/components/legal/LegalShell";
import styles from "@/styles/legal.module.css";

export default function TermsPage() {
  return (
    <LegalShell>
      <h1 className={styles.title}>Terms of Service</h1>
      <p className={styles.lead}>
        By using TownSync you agree to use the portal for legitimate resident and community
        management purposes only.
      </p>
      <div className={styles.body}>
        <h2>Acceptable use</h2>
        <p>
          Do not share login credentials, submit false maintenance or visitor information, or
          attempt to access another resident&apos;s records.
        </p>
        <h2>Service availability</h2>
        <p>
          TownSync may update features, schedule maintenance windows, or temporarily interrupt
          access for security and reliability.
        </p>
        <h2>Accounts</h2>
        <p>
          Access is granted by property management. Misuse may result in revoked portal access.
        </p>
      </div>
      <div className={styles.actions}>
        <Link className={styles.primaryBtn} href="/register">
          Request Access
        </Link>
        <Link className={styles.secondaryBtn} href="/">
          Back to Home
        </Link>
      </div>
    </LegalShell>
  );
}
