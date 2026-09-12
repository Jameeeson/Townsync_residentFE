import Link from "next/link";
import { Home } from "lucide-react";
import type { ReactNode } from "react";
import styles from "@/styles/register.module.css";

interface RegisterShellProps {
  children: ReactNode;
  showHeading?: boolean;
  title?: string;
  subtitle?: string;
  step?: number;
  totalSteps?: number;
}

const STEP_LABELS = ["Choose Role", "Scan ID", "Your Details", "Done"];

export function RegisterShell({
  children,
  showHeading = false,
  title,
  subtitle,
  step,
  totalSteps = 4,
}: RegisterShellProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          <Home className={styles.brandIcon} size={20} />
          TownSync
        </Link>
        <Link className={styles.signIn} href="/login">
          Sign In
        </Link>
      </header>

      {typeof step === "number" ? (
        <div className={styles.stepIndicator} aria-label={`Step ${step} of ${totalSteps}`}>
          <span className={styles.stepLabel}>
            Step {step} of {totalSteps} — {STEP_LABELS[step - 1]}
          </span>
          <div className={styles.stepTrack}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <span
                key={i}
                className={`${styles.stepSegment} ${
                  i < step ? styles.stepSegmentFilled : ""
                } ${i === step - 1 ? styles.stepSegmentCurrent : ""}`}
              />
            ))}
          </div>
        </div>
      ) : null}

      <main className={styles.main}>
        {showHeading && title ? (
          <>
            <h1 className={styles.pageHeading}>{title}</h1>
            {subtitle ? <p className={styles.pageSubheading}>{subtitle}</p> : null}
          </>
        ) : null}
        {children}
      </main>

      <footer className={styles.footer}>
        <span>© 2026 TownSync Property Management. All rights reserved.</span>
        <div className={styles.footerLinks}>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/support">Contact Support</Link>
        </div>
      </footer>
    </div>
  );
}
