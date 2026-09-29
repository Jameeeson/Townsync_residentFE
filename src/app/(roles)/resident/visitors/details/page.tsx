"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
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
  Users,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { ApiClientError } from "@/lib/apiClient";
import GuestListEditor, { cleanGuestNames } from "@/components/visitors/GuestListEditor";
import {
  VisitorPass,
  cancelVisitorPass,
  getVisitorPass,
  updateVisitorPass,
} from "@/lib/api/resident";
import { parseServerDate } from "@/lib/datetime";

// Backend stores/returns scheduled_at as "YYYY-MM-DD HH:MM" (or ISO 8601).
// <input type="datetime-local"> needs "YYYY-MM-DDTHH:MM" — convert both ways.
function toDatetimeLocalValue(raw: string): string {
  if (!raw) return "";
  // Stored as UTC; the picker must show the resident their own Manila clock.
  const date = parseServerDate(raw);
  if (!date) return "";

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function fromDatetimeLocalValue(value: string): string {
  return value.replace("T", " ");
}

// Returns an error message, or "" if the scheduled time is valid.
function validateScheduledAt(value: string): string {
  if (!value.trim()) {
    return "Scheduled time is required.";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Enter a valid date and time.";
  }

  if (date.getTime() < Date.now()) {
    return "Scheduled time cannot be in the past.";
  }

  return "";
}

function VisitorDetailsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const passId = idParam ? Number(idParam) : NaN;

  const qrRef = useRef<HTMLDivElement>(null);
  const [pass, setPass] = useState<VisitorPass | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [guests, setGuests] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduledAtInput, setScheduledAtInput] = useState("");
  const [scheduledAtError, setScheduledAtError] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [fetchError, setError] = useState("");
  const [fetching, setLoading] = useState(true);
  const invalidId = !Number.isFinite(passId);
  const error = invalidId ? "Missing pass id." : fetchError;
  const loading = invalidId ? false : fetching;

  useEffect(() => {
    if (invalidId) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await getVisitorPass(passId);
        if (cancelled) return;
        setPass(data);
        setName(data.visitor_name);
        setPurpose(data.visit_purpose);
        setGuests(data.companions ?? []);
        setScheduledAt(data.scheduled_at);
        setScheduledAtInput(toDatetimeLocalValue(data.scheduled_at));
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
  }, [passId, invalidId]);

  const revoked =
    pass?.status === "Rejected" || pass?.status === "Cancelled" || pass?.status === "Expired";

  function statusBadgeClass(status: string | undefined): string {
    if (status === "Approved") return styles.statusBadge;
    if (status === "Pending") return styles.statusBadgePending;
    if (status === "Rejected" || status === "Cancelled") return styles.statusBadgeDanger;
    return styles.statusBadgeNeutral;
  }

  async function saveEdit() {
    if (!pass) return;
    setError("");

    const validationMessage = validateScheduledAt(scheduledAtInput);
    setScheduledAtError(validationMessage);
    if (validationMessage) {
      return;
    }

    const nextScheduledAt = fromDatetimeLocalValue(scheduledAtInput);

    try {
      const updated = await updateVisitorPass(pass.id, {
        visitor_name: name,
        visit_purpose: purpose,
        scheduled_at: nextScheduledAt,
        companions: cleanGuestNames(guests),
      });
      setPass(updated);
      setGuests(updated.companions ?? []);
      setScheduledAt(updated.scheduled_at ?? nextScheduledAt);
      setScheduledAtInput(toDatetimeLocalValue(updated.scheduled_at ?? nextScheduledAt));
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

  function downloadTextFallback() {
    if (!pass) return;
    const content = [
      "TownSync Digital Visitor Pass",
      `Pass ID: #${pass.id}`,
      `Visitor: ${name}`,
      `Additional guests (${guests.length}): ${guests.length ? guests.join(", ") : "none"}`,
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

  // Rasterizes the on-page QR SVG onto a canvas at a higher resolution than
  // its display size, so the download is crisp enough for gate staff to
  // actually scan (140px on-screen is too small to print or re-scan reliably).
  async function downloadPass() {
    if (!pass) return;
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) {
      downloadTextFallback();
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const pngBlob = await new Promise<Blob | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const size = 512;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        canvas.toBlob((blob) => resolve(blob), "image/png");
      };
      img.onerror = () => resolve(null);
      img.src = svgUrl;
    });
    URL.revokeObjectURL(svgUrl);

    if (!pngBlob) {
      downloadTextFallback();
      return;
    }

    const url = URL.createObjectURL(pngBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `visitor-pass-${pass.id}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
    setSavedNote("Pass QR code downloaded.");
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
            <span className={statusBadgeClass(pass?.status)}>• {revoked ? "Revoked" : pass?.status}</span>
          </div>
        </div>
        {editing ? (
          <button
            type="button"
            className={styles.editBtn}
            onClick={() => void saveEdit()}
            disabled={scheduledAtError !== ""}
          >
            <Check size={16} /> Save Pass
          </button>
        ) : (
          <button
            type="button"
            className={styles.editBtn}
            onClick={() => {
              setScheduledAtInput(toDatetimeLocalValue(scheduledAt));
              setScheduledAtError("");
              setEditing(true);
            }}
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
              <div>
                <span className={styles.fieldLabelIcon}>
                  <Users size={14} /> Additional guests
                </span>
                {editing ? (
                  <GuestListEditor value={guests} onChange={setGuests} />
                ) : guests.length > 0 ? (
                  <ul className={styles.guestList}>
                    {guests.map((guest) => (
                      <li key={guest}>{guest}</li>
                    ))}
                  </ul>
                ) : (
                  <span className={styles.fieldValue}>None — this pass is for one person.</span>
                )}
              </div>
              <label>
                <span className={styles.fieldLabelIcon}>
                  <Calendar size={14} /> Scheduled
                </span>
                {editing ? (
                  <>
                    <input
                      type="datetime-local"
                      value={scheduledAtInput}
                      min={toDatetimeLocalValue(new Date().toISOString())}
                      onChange={(e) => {
                        const value = e.target.value;
                        setScheduledAtInput(value);
                        setScheduledAtError(validateScheduledAt(value));
                      }}
                      className={styles.fieldInput}
                      aria-invalid={scheduledAtError ? true : undefined}
                      aria-describedby={scheduledAtError ? "scheduledAt-error" : undefined}
                    />
                    {scheduledAtError ? (
                      <span id="scheduledAt-error" className={styles.fieldError} role="alert">
                        {scheduledAtError}
                      </span>
                    ) : null}
                  </>
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
              <div className={styles.qrWrap} ref={qrRef}>
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
