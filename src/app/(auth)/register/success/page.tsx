"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { RegisterShell } from "@/components/register/RegisterShell";
import { clearRegisterData, getRegisterData } from "@/lib/registerStorage";
import styles from "@/styles/register.module.css";

export default function RegisterSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const data = getRegisterData();
    if (!data.email || !data.fullName) {
      router.replace("/register");
      return;
    }

    clearRegisterData();
  }, [router]);

  return (
    <RegisterShell>
      <div className={`${styles.card} ${styles.successCard}`}>
        <div className={styles.successIcon}>
          <CheckCircle2 size={36} />
        </div>
        <h1 className={styles.successTitle}>Request Submitted</h1>
        <p className={styles.successText}>
          Your access request has been sent to the property administration. You will receive an
          email with your login credentials once verified.
        </p>
        <Link className={styles.btnPrimary} href="/login" style={{ width: "100%" }}>
          Return to Login
        </Link>
        <p className={styles.successBrand}>TownSync</p>
      </div>
    </RegisterShell>
  );
}
