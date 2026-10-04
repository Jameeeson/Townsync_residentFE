"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { CSSProperties } from "react";
import { Loader2 } from "lucide-react";
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
    setSent(false);
    setLoading(true);

    // Captured before the await: React clears event.currentTarget afterwards,
    // so resetting through the event used to throw after a successful send.
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      await submitSupport({
        name: String(form.get("name") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        topic: String(form.get("topic") ?? "").trim(),
        message: String(form.get("message") ?? "").trim(),
      });
      setSent(true);
      formElement.reset();
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
      <h1 className={styles.title}>Contact Support</h1>
      <p className={styles.lead}>
        Reach property management for access issues, billing questions, or community concerns.
        Your message goes to the admin team, and you will get a confirmation by email.
      </p>

      {sent ? (
        <div className={styles.successBox}>
          Your message was sent. A TownSync support agent will follow up by email.
        </div>
      ) : null}

      {error ? (
        <p className={styles.errorBox} role="alert">
          {error}
        </p>
      ) : null}

      <form className={`${styles.form} ts-stagger`} onSubmit={handleSubmit}>
        <div className={styles.field} style={{ "--ts-stagger-i": 0 } as CSSProperties}>
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" required maxLength={120} placeholder="Alex Resident" />
        </div>
        <div className={styles.field} style={{ "--ts-stagger-i": 1 } as CSSProperties}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required placeholder="name@email.com" />
        </div>
        <div className={styles.field} style={{ "--ts-stagger-i": 2 } as CSSProperties}>
          <label htmlFor="topic">Topic</label>
          <input id="topic" name="topic" required maxLength={150} placeholder="Billing, access, visitors..." />
        </div>
        <div className={styles.field} style={{ "--ts-stagger-i": 3 } as CSSProperties}>
          <label htmlFor="message">Message</label>
          <textarea id="message" name="message" required maxLength={5000} placeholder="How can we help?" />
        </div>
        <div className={styles.actions}>
          <button className={styles.primaryBtn} type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="ts-spin" aria-hidden="true" /> Sending…
              </>
            ) : (
              "Send Message"
            )}
          </button>
          <a className={styles.secondaryBtn} href="mailto:townsync.support@gmail.com">
            Email townsync.support@gmail.com
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
