import Link from "next/link";
import { LegalShell } from "@/components/legal/LegalShell";
import styles from "@/styles/legal.module.css";

export default function PrivacyPage() {
  return (
    <LegalShell>
      <p className={styles.eyebrow}>Legal</p>
      <h1 className={styles.title}>Privacy Policy</h1>
      <p className={styles.lead}>
        TownSync collects account, unit, and service data only to operate your community portal,
        process maintenance requests, visitor passes, and billing notices.
      </p>
      <div className={styles.body}>
        <h2>What we collect</h2>
        <p>
          Profile details, unit assignment, support tickets, visitor pass records, and payment
          history associated with your residence.
        </p>
        <h2>How we use it</h2>
        <ul>
          <li>Authenticate residents and route requests to property staff</li>
          <li>Notify you about tickets, dues, and community announcements</li>
          <li>Improve AI triage for maintenance troubleshooting</li>
        </ul>
        <h2>Your choices</h2>
        <p>
          You can update contact preferences in Settings and contact support to request account
          corrections.
        </p>
      </div>
      <div className={styles.actions}>
        <Link className={styles.primaryBtn} href="/support">
          Contact Support
        </Link>
        <Link className={styles.secondaryBtn} href="/">
          Back to Home
        </Link>
      </div>
    </LegalShell>
  );
}
