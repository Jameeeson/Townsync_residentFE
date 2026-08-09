"use client";

import { FormEvent, useState } from "react";
import { IconFlashlight, IconPencil } from "@/components/icons";
import { useToast } from "@/components/Toast";
import styles from "./scanner.module.css";

type LastScan = {
  initials: string;
  name: string;
  unit: string;
  result: "allowed" | "denied";
  time: string;
};

const MOCK_PASSES: Record<
  string,
  { name: string; unit: string; initials: string; allowed: boolean }
> = {
  "PASS-88214": {
    name: "Marcus Lee",
    unit: "Unit 402B · East Wing",
    initials: "ML",
    allowed: true,
  },
  "PASS-99102": {
    name: "Unknown Visitor",
    unit: "Gate A · Main Entrance",
    initials: "?",
    allowed: false,
  },
};

function nowLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StaffScannerPage() {
  const { toast } = useToast();
  const [manualOpen, setManualOpen] = useState(true);
  const [passId, setPassId] = useState("");
  const [unit, setUnit] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<LastScan>({
    initials: "ML",
    name: "Marcus Lee",
    unit: "Unit 402B · East Wing",
    result: "allowed",
    time: "10:45 AM",
  });

  function onVerify(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const id = passId.trim().toUpperCase();
    if (!id) {
      setFormError("Enter a visitor or pass ID.");
      return;
    }

    setVerifying(true);
    window.setTimeout(() => {
      const match = MOCK_PASSES[id];
      const destination = unit.trim() || match?.unit || "Unspecified unit";

      if (!match) {
        setLastScan({
          initials: "?",
          name: "Unrecognized Pass",
          unit: destination,
          result: "denied",
          time: nowLabel(),
        });
        toast("Access denied — pass not found.", "danger");
        setVerifying(false);
        return;
      }

      const result = match.allowed ? "allowed" : "denied";
      setLastScan({
        initials: match.initials,
        name: match.name,
        unit: destination || match.unit,
        result,
        time: nowLabel(),
      });
      toast(
        result === "allowed"
          ? `${match.name} checked in.`
          : `${match.name} denied.`,
        result === "allowed" ? "success" : "danger",
      );
      setVerifying(false);
    }, 450);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Access Control</p>
          <h1>Gate Scanner</h1>
          <p className={styles.lede}>
            Camera scanning is unavailable in this preview — use manual ID entry
            to verify access.
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
              <span>Switch to Manual ID Entry below</span>
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
            {manualOpen ? "Hide Manual Entry" : "Manual ID Entry"}
          </button>
        </section>

        <aside className={styles.side}>
          <article className={styles.panel}>
            <h2>Last Scan</h2>
            <div className={styles.lastScan}>
              <div className={styles.avatar}>{lastScan.initials}</div>
              <div>
                <strong>{lastScan.name}</strong>
                <p>{lastScan.unit}</p>
                <span
                  className={
                    lastScan.result === "allowed"
                      ? styles.badgeOk
                      : styles.badgeDenied
                  }
                >
                  {lastScan.result === "allowed" ? "Checked In" : "Denied"} ·{" "}
                  {lastScan.time}
                </span>
              </div>
            </div>
          </article>

          <article className={styles.panel}>
            <h2>Scanner Tips</h2>
            <ul className={styles.tips}>
              <li>
                Try <code>PASS-88214</code> (allow) or <code>PASS-99102</code>{" "}
                (deny)
              </li>
              <li>Destination unit is optional but recommended</li>
              <li>Unrecognized IDs are logged as denied locally</li>
            </ul>
          </article>

          {manualOpen ? (
            <article className={styles.panel}>
              <h2>Manual Entry</h2>
              <form onSubmit={onVerify} noValidate>
                <label className={styles.field}>
                  Visitor / Pass ID
                  <input
                    value={passId}
                    onChange={(e) => setPassId(e.target.value)}
                    placeholder="PASS-88214"
                    autoComplete="off"
                    aria-invalid={Boolean(formError)}
                  />
                </label>
                <label className={styles.field}>
                  Destination Unit
                  <input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="402B"
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
                  {verifying ? "Verifying…" : "Verify Access"}
                </button>
              </form>
            </article>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
