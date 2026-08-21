"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { LegalShell } from "@/components/legal/LegalShell";
import { ApiClientError } from "@/lib/apiClient";
import { submitSupport } from "@/lib/api/resident";
import styles from "@/styles/legal.module.css";

export default function SupportPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);

    try {
      await submitSupport({
        name: String(form.get("name") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        topic: String(form.get("topic") ?? "").trim(),
        message: String(form.get("message") ?? "").trim(),
      });
      setSent(true);
      event.currentTarget.reset();
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not send message.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LegalShell>
      <p className={styles.eyebrow}>Help</p>
      <h1 className={styles.title}>Contact Support</h1>
      <p className={styles.lead}>
        Reach property management for access issues, billing questions, or urgent community
        concerns. For unit emergencies, call your resident hotline.
      </p>

      {sent ? (
        <div className={styles.successBox}>
          Your message was sent. A TownSync support agent will follow up by email.
        </div>
      ) : null}

      {error ? (
        <p style={{ color: "#b91c1c", marginBottom: 16 }} role="alert">
          {error}
        </p>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" required placeholder="Alex Resident" />
        </div>
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required placeholder="name@example.com" />
        </div>
        <div className={styles.field}>
          <label htmlFor="topic">Topic</label>
          <input id="topic" name="topic" required placeholder="Billing, access, visitors..." />
        </div>
        <div className={styles.field}>
          <label htmlFor="message">Message</label>
          <textarea id="message" name="message" required placeholder="How can we help?" />
        </div>
        <div className={styles.actions}>
          <button className={styles.primaryBtn} type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send Message"}
          </button>
          <a className={styles.secondaryBtn} href="mailto:support@townsync.app">
            Email support@townsync.app
          </a>
        </div>
      </form>

      <div className={styles.actions} style={{ marginTop: 40 }}>
        <Link className={styles.secondaryBtn} href="/login">
          Back to Login
        </Link>
      </div>
    </LegalShell>
  );
}
