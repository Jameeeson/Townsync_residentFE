"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { RegisterShell } from "@/components/register/RegisterShell";
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
  });

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

    setForm({
      fullName: data.fullName,
      idNumber: data.idNumber,
      idType: data.idType || "National ID",
      email: data.email,
      unit: data.unit,
    });
  }, [router]);

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveRegisterData(form);
    router.push("/register/success");
  }

  return (
    <RegisterShell showHeading title="Register">
      <form className={styles.card} onSubmit={handleSubmit}>
        <h2 className={styles.cardTitle}>Extracted Information</h2>

        <div className={styles.field}>
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            value={form.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="idNumber">ID Number</label>
          <input
            id="idNumber"
            value={form.idNumber}
            onChange={(e) => updateField("idNumber", e.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="idType">ID Type</label>
          <input
            id="idType"
            value={form.idType}
            onChange={(e) => updateField("idType", e.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
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

        <div className={styles.field}>
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

        <div className={styles.actions}>
          <Link className={styles.btnSecondary} href="/register/scan">
            Cancel
          </Link>
          <button className={styles.btnPrimary} type="submit">
            Next Step
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </RegisterShell>
  );
}
