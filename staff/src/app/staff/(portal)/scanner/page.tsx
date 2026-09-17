"use client";

import { FormEvent, useState } from "react";
import { IconFlashlight, IconPencil } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { ApiError } from "@/lib/api-client";
import { confirmEntry, manualCheckin, verifyPass } from "@/lib/services/staff";
import styles from "./scanner.module.css";

type LastScan = {
  initials: string;
  name: string;
  unit: string;
  result: "allowed" | "denied";
  time: string;
};

function nowLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function initialsFor(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default function StaffScannerPage() {
  const { toast } = useToast();
  const [manualOpen, setManualOpen] = useState(true);
  const [passId, setPassId] = useState("");
  const [entryPoint, setEntryPoint] = useState("Main Gate");
  const [verifying, setVerifying] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<LastScan | null>(null);

  const [noPassOpen, setNoPassOpen] = useState(false);
  const [visitorName, setVisitorName] = useState("");
  const [idType, setIdType] = useState("Government ID");
  const [documentNumber, setDocumentNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const token = passId.trim();
    if (!token) {
      setFormError("Enter a visitor pass QR token.");
      return;
    }

    setVerifying(true);
    try {
      const verified = await verifyPass(token);
      await confirmEntry(verified.pass_id, entryPoint || "Main Gate");
      setLastScan({
        initials: initialsFor(verified.visitor_name),
        name: verified.visitor_name,
        unit: verified.unit,
        result: "allowed",
        time: nowLabel(),
      });
      toast(`${verified.visitor_name} checked in.`, "success");
      setPassId("");
    } catch (err) {
      setLastScan({
        initials: "?",
        name: "Unrecognized Pass",
        unit: entryPoint || "Unspecified",
        result: "denied",
        time: nowLabel(),
      });
      const message =
        err instanceof ApiError ? err.message : "Access denied — pass not found.";
      toast(message, "danger");
    } finally {
      setVerifying(false);
    }
  }

  async function onManualCheckin(e: FormEvent) {
    e.preventDefault();
    setManualError(null);
    const name = visitorName.trim();
    const doc = documentNumber.trim();
    if (!name || !doc) {
      setManualError("Visitor name and document number are required.");
      return;
    }

    setManualSubmitting(true);
    try {
      await manualCheckin({
        visitor_name: name,
        id_type: idType,
        document_number: doc,
        verification_notes: notes.trim() || undefined,
      });
      setLastScan({
        initials: initialsFor(name),
        name,
        unit: entryPoint || "Unspecified",
        result: "allowed",
        time: nowLabel(),
      });
      toast(`${name} logged in manually.`, "success");
      setVisitorName("");
      setDocumentNumber("");
      setNotes("");
    } catch (err) {
      setManualError(
        err instanceof ApiError ? err.message : "Could not log this manual entry.",
      );
    } finally {
      setManualSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Access Control</p>
          <h1>Gate Scanner</h1>
          <p className={styles.lede}>
            Camera scanning is unavailable in this preview — use pass verification
            or manual entry below.
          </p>
        </div>
        <span className={styles.offline} role="status">
          <span className={styles.offlineDot} /> Camera Unavailable
        </span>
      </header>

      <div className={styles.banner} role="status">
        Live QR capture is not connected yet. Torch and auto-detect stay disabled
        until a camera feed is available.
      </div>

      <div className={styles.layout}>
        <section className={styles.cameraCard}>
          <div className={styles.camera}>
            <div className={styles.viewfinder} aria-hidden>
              <span className={styles.corner} data-pos="tl" />
              <span className={styles.corner} data-pos="tr" />
              <span className={styles.corner} data-pos="bl" />
              <span className={styles.corner} data-pos="br" />
            </div>
            <div className={styles.cameraCopy}>
              <p>Camera preview offline</p>
              <span>Use Pass Verification below</span>
            </div>
            <button
              type="button"
              className={styles.torch}
              disabled
              title="Torch requires an active camera"
              aria-disabled="true"
            >
              <IconFlashlight size={20} />
              <span>Torch Unavailable</span>
            </button>
          </div>
          <button
            type="button"
            className={styles.manualBtn}
            aria-expanded={manualOpen}
            onClick={() => setManualOpen((v) => !v)}
          >
            <IconPencil size={18} />{" "}
            {manualOpen ? "Hide Pass Verification" : "Verify Visitor Pass"}
          </button>
        </section>

        <aside className={styles.side}>
          <article className={styles.panel}>
            <h2>Last Scan</h2>
            {lastScan ? (
              <div className={styles.lastScan}>
                <div className={styles.avatar}>{lastScan.initials}</div>
                <div>
                  <strong>{lastScan.name}</strong>
                  <p>{lastScan.unit}</p>
                  <span
                    className={
                      lastScan.result === "allowed" ? styles.badgeOk : styles.badgeDenied
                    }
                  >
                    {lastScan.result === "allowed" ? "Checked In" : "Denied"} ·{" "}
                    {lastScan.time}
                  </span>
                </div>
              </div>
            ) : (
              <p className={styles.lede}>No scans yet this shift.</p>
            )}
          </article>

          {manualOpen ? (
            <article className={styles.panel}>
              <h2>Verify Visitor Pass</h2>
              <form onSubmit={onVerify} noValidate>
                <label className={styles.field}>
                  Visitor Pass QR Token
                  <input
                    value={passId}
                    onChange={(e) => setPassId(e.target.value)}
                    placeholder="QR-A1B2C3D4E5"
                    autoComplete="off"
                    aria-invalid={Boolean(formError)}
                  />
                </label>
                <label className={styles.field}>
                  Entry Point
                  <input
                    value={entryPoint}
                    onChange={(e) => setEntryPoint(e.target.value)}
                    placeholder="Main Gate"
                    autoComplete="off"
                  />
                </label>
                {formError ? (
                  <p className={styles.formError} role="alert">
                    {formError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className={styles.verifyBtn}
                  disabled={verifying}
                >
                  {verifying ? "Verifying…" : "Verify & Check In"}
                </button>
              </form>
            </article>
          ) : null}

          <article className={styles.panel}>
            <button
              type="button"
              className={styles.manualBtn}
              aria-expanded={noPassOpen}
              onClick={() => setNoPassOpen((v) => !v)}
            >
              {noPassOpen ? "Hide Manual Entry" : "Log Entry Without a Pass"}
            </button>
            {noPassOpen ? (
              <form onSubmit={onManualCheckin} noValidate style={{ marginTop: "0.85rem" }}>
                <label className={styles.field}>
                  Visitor Name
                  <input
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="Full name"
                    autoComplete="off"
                  />
                </label>
                <label className={styles.field}>
                  ID Type
                  <input
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    placeholder="Government ID"
                    autoComplete="off"
                  />
                </label>
                <label className={styles.field}>
                  Document Number
                  <input
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="ID number"
                    autoComplete="off"
                  />
                </label>
                <label className={styles.field}>
                  Notes (optional)
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Destination, host unit, etc."
                    autoComplete="off"
                  />
                </label>
                {manualError ? (
                  <p className={styles.formError} role="alert">
                    {manualError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className={styles.verifyBtn}
                  disabled={manualSubmitting}
                >
                  {manualSubmitting ? "Logging…" : "Log Manual Entry"}
                </button>
              </form>
            ) : null}
          </article>
        </aside>
      </div>
    </div>
  );
}
