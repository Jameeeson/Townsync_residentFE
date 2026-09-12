"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "@/styles/visitordets.module.css";
import {
  ArrowLeft,
  Edit3,
  Calendar,
  Shield,
  Download,
  XCircle,
  Check,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { ApiClientError } from "@/lib/apiClient";
import {
  VisitorPass,
  cancelVisitorPass,
  getVisitorPass,
  updateVisitorPass,
} from "@/lib/api/resident";

function VisitorDetailsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const passId = idParam ? Number(idParam) : NaN;

  const [pass, setPass] = useState<VisitorPass | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(passId)) {
      setError("Missing pass id.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await getVisitorPass(passId);
        if (cancelled) return;
        setPass(data);
        setName(data.visitor_name);
        setPurpose(data.visit_purpose);
        setScheduledAt(data.scheduled_at);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to load pass."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [passId]);

  const revoked = pass?.status === "Rejected" || pass?.status === "Cancelled";

  async function saveEdit() {
    if (!pass) return;
    setError("");
    try {
      const updated = await updateVisitorPass(pass.id, {
        visitor_name: name,
        visit_purpose: purpose,
        scheduled_at: scheduledAt,
      });
      setPass(updated);
      setEditing(false);
      setSavedNote("Visitor pass updated.");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not update pass."
      );
    }
  }

  function downloadPass() {
    if (!pass) return;
    const content = [
      "TownSync Digital Visitor Pass",
      `Pass ID: #${pass.id}`,
      `Visitor: ${name}`,
      `Purpose: ${purpose}`,
      `Scheduled: ${scheduledAt}`,
      `QR: ${pass.qr_token}`,
      `Status: ${pass.status}`,
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `visitor-pass-${pass.id}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setSavedNote("Pass file downloaded.");
  }

  async function revokeAccess() {
    if (!pass) return;
    const confirmed = window.confirm("Revoke this visitor pass immediately?");
    if (!confirmed) return;
    try {
      await cancelVisitorPass(pass.id);
      setSavedNote("Access revoked. Gate staff will be notified.");
      setTimeout(() => router.push("/resident/visitors"), 1200);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not revoke pass."
      );
    }
  }

  if (loading) {
    return (
      <div className={styles.container} aria-busy="true" aria-label="Loading pass">
        <div className="ts-skeleton" style={{ width: 200, height: 24, marginBottom: 16 }}>Loading</div>
        <div className="ts-skeleton" style={{ width: "100%", maxWidth: 600, height: 180 }}>Loading</div>
      </div>
    );
  }

  if (error && !pass) {
    return (
      <div className={styles.container}>
        <p className={styles.errorNote} role="alert">{error}</p>
        <a href="/resident/visitors" className={styles.backLink}>
          <ArrowLeft size={16} /> Visitor Passes
        </a>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <a href="/resident/visitors" className={styles.backLink}>
            <ArrowLeft size={16} /> Visitor Passes
          </a>
          <div className={styles.titleRow}>
            <h1>Visitor Details: {name}</h1>
            <span className={styles.statusBadge}>• {revoked ? "Revoked" : pass?.status}</span>
          </div>
        </div>
        {editing ? (
          <button type="button" className={styles.editBtn} onClick={() => void saveEdit()}>
            <Check size={16} /> Save Pass
          </button>
        ) : (
          <button
            type="button"
            className={styles.editBtn}
            onClick={() => setEditing(true)}
            disabled={revoked}
          >
            <Edit3 size={16} /> Edit Pass
          </button>
        )}
      </header>

      {savedNote ? <p className={styles.savedNote}>{savedNote}</p> : null}
      {error ? <p className={styles.errorNote} role="alert">{error}</p> : null}

      <div className={styles.mainLayout}>
        <div className={styles.contentColumn}>
          <section className={styles.card}>
            <div className={styles.profileHeader}>
              <div className={styles.profileName}>
                {editing ? (
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={styles.nameInput}
                  />
                ) : (
                  <h2>{name}</h2>
                )}
              </div>
            </div>

            <div className={styles.fieldGrid}>
              <label>
                <span className={styles.fieldLabel}>Purpose</span>
                {editing ? (
                  <input
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className={styles.fieldInput}
                  />
                ) : (
                  <span className={styles.fieldValue}>{purpose}</span>
                )}
              </label>
              <label>
                <span className={styles.fieldLabelIcon}>
                  <Calendar size={14} /> Scheduled
                </span>
                {editing ? (
                  <input
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className={styles.fieldInput}
                  />
                ) : (
                  <span className={styles.fieldValue}>{scheduledAt}</span>
                )}
              </label>
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.card}>
            <div className={styles.qrTokenHeader}>
              <Shield size={16} /> QR Token
            </div>
            {pass?.qr_token ? (
              <div className={styles.qrWrap}>
                <QRCodeSVG value={pass.qr_token} size={140} />
              </div>
            ) : null}
            <p className={styles.qrTokenText}>{pass?.qr_token}</p>
            <div className={styles.downloadBtnWrap}>
              <button type="button" className={styles.editBtn} onClick={downloadPass}>
                <Download size={16} /> Download
              </button>
            </div>
            {!revoked ? (
              <button type="button" className={styles.revokeBtn} onClick={() => void revokeAccess()}>
                <XCircle size={16} /> Revoke Access
              </button>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}

export default function VisitorDetails() {
  return (
    <Suspense fallback={<div className={styles.container} aria-busy="true" />}>
      <VisitorDetailsInner />
    </Suspense>
  );
}
