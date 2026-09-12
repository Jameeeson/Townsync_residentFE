import Link from "next/link";
import { Home } from "lucide-react";
import type { ReactNode } from "react";
import styles from "@/styles/legal.module.css";

type LegalShellProps = {
  children: ReactNode;
};

export function LegalShell({ children }: LegalShellProps) {
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
      <main className={`${styles.main} ts-fade-in-up`}>{children}</main>
      <footer className={styles.footer}>
        <span>© 2026 TownSync Property Management. All rights reserved.</span>
        <div className={styles.footerLinks}>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/cookies">Cookie Policy</Link>
          <Link href="/support">Support</Link>
        </div>
      </footer>
    </div>
  );
}
