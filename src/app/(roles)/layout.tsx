import type { ReactNode } from "react";
import { ResidentHeader } from "@/components/navigation/ResidentHeader";
import { ResidentSidebar } from "@/components/navigation/ResidentSidebar";
import styles from "@/styles/dashboard.module.css";

export default function RolesLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <ResidentSidebar />
      <div className={styles.contentShell}>
        <ResidentHeader />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
