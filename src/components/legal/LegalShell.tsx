import Link from "next/link";
import type { ReactNode } from "react";
import { TopNav } from "@/components/navigation/TopNav";
import styles from "@/styles/legal.module.css";

type LegalShellProps = {
  children: ReactNode;
};

export function LegalShell({ children }: LegalShellProps) {
  return (
    <div className={styles.page}>
      <TopNav />
      <main className={styles.main}>{children}</main>
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
