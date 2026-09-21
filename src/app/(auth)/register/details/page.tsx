"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowRight, Search } from "lucide-react";
import { RegisterShell } from "@/components/register/RegisterShell";
import { ApiClientError } from "@/lib/apiClient";
import { registerResident } from "@/lib/api/auth";
import { getRegisterData, saveRegisterData } from "@/lib/registerStorage";
import styles from "@/styles/register.module.css";

export default function RegisterDetailsPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    idNumber: "",
    idType: "National ID",
    email: "",
    unit: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const data = getRegisterData();
    if (!data.role) {
      router.replace("/register");
      return;
    }
    if (!data.fullName && !data.idNumber) {
      router.replace("/register/scan");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of client-only registration data on mount; deriving it during render would cause a hydration mismatch.
    setForm((prev) => ({
      ...prev,
      fullName: data.fullName,
      idNumber: data.idNumber,
      idType: data.idType || "National ID",
      email: data.email,
      unit: data.unit,
    }));
  }, [router]);

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    saveRegisterData({
      fullName: form.fullName,
      idNumber: form.idNumber,
      idType: form.idType,
      email: form.email,
      unit: form.unit,
    });

    try {
      await registerResident({
        name: form.fullName,
        email: form.email,
        id_type: form.idType,
        id_number: form.idNumber,
        address: form.unit,
        password: form.password,
      });
      router.push("/register/success");
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Registration failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <RegisterShell step={3} showHeading title="Register">
      <form className={styles.card} onSubmit={handleSubmit}>
        <h2 className={styles.cardTitle}>Extracted Information</h2>

        {error ? (
          <p className={styles.errorText} role="alert">
            {error}
          </p>
        ) : null}

        <div className="ts-stagger">
          <div className={styles.field} style={{ "--ts-stagger-i": 0 } as CSSProperties}>
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              value={form.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              required
            />
          </div>

          <div className={styles.field} style={{ "--ts-stagger-i": 1 } as CSSProperties}>
            <label htmlFor="idNumber">ID Number</label>
            <input
              id="idNumber"
              value={form.idNumber}
              onChange={(e) => updateField("idNumber", e.target.value)}
              required
            />
          </div>

          <div className={styles.field} style={{ "--ts-stagger-i": 2 } as CSSProperties}>
            <label htmlFor="idType">ID Type</label>
            <input
              id="idType"
              value={form.idType}
              onChange={(e) => updateField("idType", e.target.value)}
              required
            />
          </div>

          <div className={styles.field} style={{ "--ts-stagger-i": 3 } as CSSProperties}>
            <label htmlFor="email">Type your email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="Email Address"
              required
            />
          </div>

          <div className={styles.field} style={{ "--ts-stagger-i": 4 } as CSSProperties}>
            <label htmlFor="unit">Block and Lot / Unit Number</label>
            <div className={styles.searchWrap}>
              <Search className={styles.searchIcon} size={16} />
              <input
                id="unit"
                value={form.unit}
                onChange={(e) => updateField("unit", e.target.value)}
                placeholder="Search for your unit..."
                required
              />
            </div>
          </div>

          <div className={styles.field} style={{ "--ts-stagger-i": 5 } as CSSProperties}>
            <label htmlFor="password">Create Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field} style={{ "--ts-stagger-i": 6 } as CSSProperties}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              placeholder="Re-enter password"
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className={styles.actions}>
          <Link className={styles.btnSecondary} href="/register/scan">
            Cancel
          </Link>
          <button className={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? "Submitting…" : "Submit Application"}
            {!loading ? <ArrowRight size={16} /> : null}
          </button>
        </div>
      </form>
    </RegisterShell>
  );
}
