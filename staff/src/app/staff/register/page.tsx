"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  IconAlert,
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconShieldCheck,
  IconShieldUser,
  IconUser,
} from "@/components/icons";
import { ApiError } from "@/lib/api-client";
import { registerStaff } from "@/lib/auth";
import { joinShift } from "@/lib/shift";
import styles from "../login/login.module.css";

export default function StaffRegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [role, setRole] = useState<"Staff" | "Maintenance">("Staff");
  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const employeeId = String(form.get("employee_id") ?? "").trim();
    const staffType = String(form.get("staff_type") ?? "Staff") as "Staff" | "Maintenance";
    const specialization = String(form.get("specialization") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirm_password") ?? "");

    if (!name || !email || !employeeId) {
      setError("Full name, work email, and employee ID are required.");
      return;
    }
    if (staffType === "Maintenance" && !specialization) {
      setError("Specialization is required for maintenance staff (e.g. Plumbing, HVAC).");
      return;
    }
    const shift = joinShift(shiftStart, shiftEnd);
    if (!shift) {
      setError("Set the start and end time of your shift.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await registerStaff({
        name,
        email,
        employee_id: employeeId,
        staff_type: staffType,
        shift,
        ...(staffType === "Maintenance" ? { specialization } : {}),
        password,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.visual} aria-hidden>
        <div className={styles.visualOverlay} />
        <div className={styles.visualContent}>
          <p className={styles.visualEyebrow}>TownSync Property Management</p>
          <h1 className={styles.visualTitle}>
            Join the team
            <br />
            keeping every site running
          </h1>
          <p className={styles.visualCopy}>
            Register for staff portal access. An administrator reviews and approves every
            new account before it can sign in.
          </p>
          <ul className={styles.visualList}>
            <li>Live gate scanner & visitor verification</li>
            <li>Shift tasks with priority routing</li>
            <li>Role-based staff portal access</li>
          </ul>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.cardWrap}>
          <div className={styles.mobileBrand}>
            <span className={styles.mobileMark}>TS</span>
            <strong>TownSync</strong>
          </div>

          {submitted ? (
            <div className={styles.card}>
              <div className={styles.logo}>
                <IconShieldCheck size={28} />
              </div>
              <h2 className={styles.title}>Registration submitted</h2>
              <p className={styles.subtitle}>
                Your account is pending administrator approval. You&apos;ll be able to sign in
                once it&apos;s reviewed.
              </p>
              <Link href="/staff/login" className={styles.submit}>
                <span>Back to Sign In</span>
                <IconArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <form className={styles.card} onSubmit={onSubmit} noValidate>
              <div className={styles.logo}>
                <IconShieldUser size={28} />
              </div>
              <h2 className={styles.title}>Staff Registration</h2>
              <p className={styles.subtitle}>Create an account for operations access</p>

              <div className={styles.warning} role="status">
                <IconAlert size={16} />
                <span>New accounts require admin approval before first sign-in</span>
              </div>

              <label className={styles.field}>
                <span>Full Name</span>
                <div className={styles.inputWrap}>
                  <IconUser size={18} className={styles.inputIcon} />
                  <input name="name" type="text" placeholder="Jane Rivera" autoComplete="name" required />
                </div>
              </label>

              <label className={styles.field}>
                <span>Work Email</span>
                <div className={styles.inputWrap}>
                  <IconMail size={18} className={styles.inputIcon} />
                  <input
                    name="email"
                    type="email"
                    placeholder="jane.rivera@townsync.local"
                    autoComplete="username"
                    required
                  />
                </div>
              </label>

              <label className={styles.field}>
                <span>Employee ID</span>
                <div className={styles.inputWrap}>
                  <IconUser size={18} className={styles.inputIcon} />
                  <input name="employee_id" type="text" placeholder="EMP-2026-014" required />
                </div>
              </label>

              <label className={styles.field}>
                <span>Role</span>
                <select
                  name="staff_type"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "Staff" | "Maintenance")}
                  className={styles.roleSelect}
                >
                  <option value="Staff">Staff (Operations)</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </label>

              {role === "Maintenance" ? (
                <label className={styles.field}>
                  <span>Specialization</span>
                  <div className={styles.inputWrap}>
                    <IconUser size={18} className={styles.inputIcon} />
                    <input
                      name="specialization"
                      type="text"
                      placeholder="e.g. Plumbing, HVAC, Electrical"
                      maxLength={80}
                      required
                    />
                  </div>
                </label>
              ) : null}

              <div className={styles.shiftRow}>
                <label className={styles.field}>
                  <span>Shift starts</span>
                  <input
                    name="shift_start"
                    type="time"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    className={styles.timeInput}
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span>Shift ends</span>
                  <input
                    name="shift_end"
                    type="time"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    className={styles.timeInput}
                    required
                  />
                </label>
              </div>

              <label className={styles.field}>
                <span>Password</span>
                <div className={styles.inputWrap}>
                  <IconLock size={18} className={styles.inputIcon} />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </div>
              </label>

              <label className={styles.field}>
                <span>Confirm Password</span>
                <div className={styles.inputWrap}>
                  <IconLock size={18} className={styles.inputIcon} />
                  <input
                    name="confirm_password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
              </label>

              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}

              <button type="submit" className={styles.submit} disabled={loading}>
                {loading ? <span className={styles.spinner} aria-hidden /> : null}
                <span>{loading ? "Submitting…" : "Create Account"}</span>
                {!loading ? <IconArrowRight size={18} /> : null}
              </button>
            </form>
          )}

          <footer className={styles.footer}>
            <p>
              Already have an account?{" "}
              <Link href="/staff/login" className={styles.footerBtn} style={{ display: "inline-flex" }}>
                Sign In
              </Link>
            </p>
            <p>© 2026 TownSync Property Management. All rights reserved.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
