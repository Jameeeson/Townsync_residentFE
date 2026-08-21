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
    return <p style={{ padding: 24 }}>Loading pass…</p>;
  }

  if (error && !pass) {
    return (
      <div className={styles.container}>
        <p style={{ color: "#b91c1c" }}>{error}</p>
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

      {savedNote ? (
        <p style={{ color: "#15803d", marginBottom: 16, fontWeight: 600 }}>{savedNote}</p>
      ) : null}
      {error ? <p style={{ color: "#b91c1c", marginBottom: 16 }}>{error}</p> : null}

      <div className={styles.mainLayout}>
        <div className={styles.contentColumn}>
          <section className={styles.card}>
            <div className={styles.profileHeader}>
              <div className={styles.profileName}>
                {editing ? (
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      padding: 8,
                    }}
                  />
                ) : (
                  <h2>{name}</h2>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <label>
                <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>Purpose</span>
                {editing ? (
                  <input
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}
                  />
                ) : (
                  <strong>{purpose}</strong>
                )}
              </label>
              <label>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
                  <Calendar size={14} /> Scheduled
                </span>
                {editing ? (
                  <input
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}
                  />
                ) : (
                  <strong>{scheduledAt}</strong>
                )}
              </label>
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Shield size={16} /> QR Token
            </div>
            {pass?.qr_token ? (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <QRCodeSVG value={pass.qr_token} size={140} />
              </div>
            ) : null}
            <p style={{ fontSize: 12, wordBreak: "break-all" }}>{pass?.qr_token}</p>
            <button type="button" className={styles.editBtn} onClick={downloadPass} style={{ marginTop: 12 }}>
              <Download size={16} /> Download
            </button>
            {!revoked ? (
              <button
                type="button"
                onClick={() => void revokeAccess()}
                style={{
                  marginTop: 8,
                  width: "100%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
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
    <Suspense fallback={<p style={{ padding: 24 }}>Loading…</p>}>
      <VisitorDetailsInner />
    </Suspense>
  );
}
