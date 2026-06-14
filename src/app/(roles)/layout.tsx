"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "../../lib/apiClient";
import styles from "../../styles/layout.module.css";

type AuthCheckState = "checking" | "authorized";

export default function RolesLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthCheckState>("checking");

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setState("authorized");
  }, [router]);

  if (state !== "authorized") {
    return (
      <main className={styles.shell}>
        <div className={styles.loadingCard}>
          <p className={styles.loadingLabel}>Checking session</p>
          <h1 className={styles.loadingTitle}>Verifying access to TownSync</h1>
        </div>
      </main>
    );
  }

  return <main className={styles.shell}>{children}</main>;
}