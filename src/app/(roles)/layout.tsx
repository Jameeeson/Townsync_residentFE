import type { ReactNode } from "react";
import AuthGate from "@/components/auth/AuthGate";
import { ResidentHeader } from "@/components/navigation/ResidentHeader";
import { ResidentSidebar } from "@/components/navigation/ResidentSidebar";
import styles from "@/styles/dashboard.module.css";

export default function RolesLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className={styles.shell}>
        <ResidentSidebar />
        <div className={styles.contentShell}>
          <ResidentHeader />
          <main className={styles.main}>{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
