"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DoorOpen, KeyRound } from "lucide-react";
import { RegisterShell } from "@/components/register/RegisterShell";
import { saveRegisterData, type RegisterRole } from "@/lib/registerStorage";
import styles from "@/styles/register.module.css";

export default function RegisterRolePage() {
  const router = useRouter();
  const [role, setRole] = useState<RegisterRole | "">("");

  function handleNext() {
    if (!role) {
      return;
    }
    saveRegisterData({ role });
    router.push("/register/scan");
  }

  return (
    <RegisterShell>
      <div className={styles.card}>
        <h1 className={styles.cardTitle}>What is your relation to the unit?</h1>
        <p className={styles.cardSubtitle}>
          Please select your primary role for this property to help us set up your account
          correctly.
        </p>

        <div className={styles.roleList} role="radiogroup" aria-label="Your relation to the unit">
          <label
            className={`${styles.roleOption} ${role === "homeowner" ? styles.roleOptionSelected : ""}`}
          >
            <input
              className={styles.radio}
              type="radio"
              name="role"
              value="homeowner"
              checked={role === "homeowner"}
              onChange={() => setRole("homeowner")}
            />
            <KeyRound className={styles.roleIcon} size={22} aria-hidden />
            <span className={styles.roleText}>
              <span className={styles.roleLabel}>Homeowner</span>
              <span className={styles.roleDesc}>I own this property.</span>
            </span>
          </label>

          <label
            className={`${styles.roleOption} ${role === "tenant" ? styles.roleOptionSelected : ""}`}
          >
            <input
              className={styles.radio}
              type="radio"
              name="role"
              value="tenant"
              checked={role === "tenant"}
              onChange={() => setRole("tenant")}
            />
            <DoorOpen className={styles.roleIcon} size={22} aria-hidden />
            <span className={styles.roleText}>
              <span className={styles.roleLabel}>Tenant</span>
              <span className={styles.roleDesc}>I am renting this property.</span>
            </span>
          </label>
        </div>

        <div className={styles.actions}>
          <span />
          <button
            className={styles.btnPrimary}
            type="button"
            disabled={!role}
            onClick={handleNext}
          >
            Next
          </button>
        </div>
      </div>
    </RegisterShell>
  );
}
