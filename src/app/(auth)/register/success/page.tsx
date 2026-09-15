"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { RegisterShell } from "@/components/register/RegisterShell";
import { clearRegisterData, getRegisterData } from "@/lib/registerStorage";
import styles from "@/styles/register.module.css";

export default function RegisterSuccessPage() {
  const router = useRouter();
  // Snapshot the submitted data once on mount, before it gets cleared below.
  // Reading it fresh inside the effect (and clearing it there too) meant the
  // effect's second invocation under React StrictMode would see already-cleared
  // data and incorrectly bounce the user back to step 1.
  const [data] = useState(() => getRegisterData());
  const clearedRef = useRef(false);

  useEffect(() => {
    if (!data.email || !data.fullName) {
      router.replace("/register");
      return;
    }

    if (!clearedRef.current) {
      clearedRef.current = true;
      clearRegisterData();
    }
  }, [data, router]);

  return (
    <RegisterShell step={4}>
      <div className={`${styles.card} ${styles.successCard}`}>
        <div className={styles.successIcon}>
          <CheckCircle2 size={36} />
        </div>
        <h1 className={styles.successTitle}>Request Submitted</h1>
        <p className={styles.successText}>
          Your access request has been sent to the property administration. You can log in with the
          password you created once your account is approved.
        </p>
        <Link className={styles.btnPrimary} href="/login" style={{ width: "100%" }}>
          Return to Login
        </Link>
        <p className={styles.successBrand}>TownSync</p>
      </div>
    </RegisterShell>
  );
}
