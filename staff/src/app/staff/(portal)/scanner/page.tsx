"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconFlashlight, IconPencil, IconScan } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import { ApiError } from "@/lib/api-client";
import {
  closeVisitManually,
  confirmEntry,
  confirmExit,
  getOpenVisits,
  manualCheckin,
  verifyPass,
  type OpenVisits,
} from "@/lib/services/staff";
import styles from "./scanner.module.css";

type LastScan = {
  initials: string;
  name: string;
  unit: string;
  companions: string[];
  result: "allowed" | "denied";
  direction: "in" | "out" | null;
  time: string;
};

type GateMode = "pass" | "manual";

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
  const router = useRouter();
  const { loading: sessionLoading, isMaintenance, canUseScanner } = useStaffSession();
  const [mode, setMode] = useState<GateMode>("pass");
  const [passId, setPassId] = useState("");
  const [entryPoint, setEntryPoint] = useState("Main Gate");
  const [verifying, setVerifying] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<LastScan | null>(null);
  const [onSite, setOnSite] = useState<OpenVisits | null>(null);
  const [onSiteError, setOnSiteError] = useState<string | null>(null);
  const [closingLogId, setClosingLogId] = useState<number | null>(null);

  const refreshOnSite = useCallback(async () => {
    try {
      setOnSite(await getOpenVisits());
      setOnSiteError(null);
    } catch (err) {
      setOnSiteError(
        err instanceof ApiError ? err.message : "Could not load who is on site.",
      );
    }
  }, []);

  const [visitorName, setVisitorName] = useState("");
  const [idType, setIdType] = useState("Government ID");
  const [documentNumber, setDocumentNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Whoever is overstaying is the reason this list exists; they stay pinned to
  // the top regardless of how many people are on site, so a long roster can
  // never bury the one row that actually needs attention. Longest-inside next.
  const sortedVisits = useMemo(() => {
    if (!onSite) return [];
    return [...onSite.visits].sort((a, b) => {
      if (a.overstaying !== b.overstaying) return a.overstaying ? -1 : 1;
      return b.hours_inside - a.hours_inside;
    });
  }, [onSite]);

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
      // The same pass checks a party in and back out — the backend tells us
      // which way this scan goes based on whether they are currently inside.
      const verified = await verifyPass(token);
      const leaving = verified.next_action === "exit";

      if (leaving) {
        await confirmExit(verified.pass_id, entryPoint || "Main Gate");
      } else {
        await confirmEntry(verified.pass_id, entryPoint || "Main Gate");
      }

      setLastScan({
        initials: initialsFor(verified.visitor_name),
        name: verified.visitor_name,
        unit: verified.unit,
        companions: verified.companions ?? [],
        result: "allowed",
        direction: leaving ? "out" : "in",
        time: nowLabel(),
      });

      const extra = verified.companions?.length ?? 0;
      const party =
        extra > 0
          ? `${verified.visitor_name} + ${extra} guest${extra === 1 ? "" : "s"}`
          : verified.visitor_name;
      toast(`${party} checked ${leaving ? "out" : "in"}.`, "success");

      if (leaving && verified.overstaying) {
        toast(
          `${verified.visitor_name} stayed past the ${verified.max_stay_hours}h limit.`,
          "warning",
        );
      }
      setPassId("");
      refreshOnSite();
    } catch (err) {
      setLastScan({
        initials: "?",
        name: "Unrecognized Pass",
        unit: entryPoint || "Unspecified",
        companions: [],
        result: "denied",
        direction: null,
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
        companions: [],
        result: "allowed",
        direction: "in",
        time: nowLabel(),
      });
      toast(`${name} logged in manually.`, "success");
      setVisitorName("");
      setDocumentNumber("");
      setNotes("");
      refreshOnSite();
    } catch (err) {
      setManualError(
        err instanceof ApiError ? err.message : "Could not log this manual entry.",
      );
    } finally {
      setManualSubmitting(false);
    }
  }

  // Deep links and stale tabs can still land a Maintenance account here even
  // though the nav entry is hidden — bounce them rather than let every action
  // fail with a 403.
  useEffect(() => {
    if (isMaintenance) router.replace("/staff/dashboard");
  }, [isMaintenance, router]);

  useEffect(() => {
    if (!canUseScanner) return;
    // Guarded separately from refreshOnSite so a navigation away mid-flight
    // can't set state on an unmounted page.
    let cancelled = false;
    (async () => {
      try {
        const data = await getOpenVisits();
        if (cancelled) return;
        setOnSite(data);
        setOnSiteError(null);
      } catch (err) {
        if (cancelled) return;
        setOnSiteError(
          err instanceof ApiError ? err.message : "Could not load who is on site.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canUseScanner]);

  async function closeVisit(logId: number, name: string) {
    setClosingLogId(logId);
    try {
      await closeVisitManually(logId, "Closed at the gate desk");
      toast(`${name} marked as departed.`, "success");
      refreshOnSite();
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Could not close that visit.",
        "danger",
      );
    } finally {
      setClosingLogId(null);
    }
  }

  if (!canUseScanner) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Access Control</p>
            <h1>Gate Scanner</h1>
            <p className={styles.lede}>
              {sessionLoading
                ? "Checking your access…"
                : "The gate scanner is for security staff. Redirecting you to your tasks…"}
            </p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Access Control</p>
          <h1>Gate Scanner</h1>
        </div>
        <span className={styles.offline} role="status">
          <span className={styles.offlineDot} /> Camera Unavailable
        </span>
      </header>

      <div className={styles.layout}>
        <section className={styles.actionCard}>
          <div className={styles.scanStrip}>
            <span className={styles.scanStripIcon} aria-hidden>
              <IconScan size={20} />
            </span>
            <div className={styles.scanStripCopy}>
              <p>Live camera capture isn&apos;t connected in this preview</p>
              <span>Verify a pass or log a visitor manually below.</span>
            </div>
            <button
              type="button"
              className={styles.torch}
              disabled
              title="Torch requires an active camera"
              aria-disabled="true"
            >
              <IconFlashlight size={16} />
              <span>Torch</span>
            </button>
          </div>

          <div className={styles.tabs} role="tablist" aria-label="Gate action">
            <button
              type="button"
              role="tab"
              id="tab-pass"
              aria-selected={mode === "pass"}
              aria-controls="panel-pass"
              className={styles.tab}
              onClick={() => setMode("pass")}
            >
              <IconScan size={17} /> Verify Pass
            </button>
            <button
              type="button"
              role="tab"
              id="tab-manual"
              aria-selected={mode === "manual"}
              aria-controls="panel-manual"
              className={styles.tab}
              onClick={() => setMode("manual")}
            >
              <IconPencil size={17} /> Manual Entry
            </button>
          </div>

          {mode === "pass" ? (
            <form
              id="panel-pass"
              role="tabpanel"
              aria-labelledby="tab-pass"
              className={styles.tabPanel}
              onSubmit={onVerify}
              noValidate
            >
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
              <button type="submit" className={styles.verifyBtn} disabled={verifying}>
                {verifying ? "Verifying…" : "Verify & Record Movement"}
              </button>
            </form>
          ) : (
            <form
              id="panel-manual"
              role="tabpanel"
              aria-labelledby="tab-manual"
              className={styles.tabPanel}
              onSubmit={onManualCheckin}
              noValidate
            >
              <label className={styles.field}>
                Visitor Name
                <input
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="Full name"
                  autoComplete="off"
                />
              </label>
              <div className={styles.fieldRow}>
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
              </div>
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
          )}
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
                  {lastScan.companions.length > 0 ? (
                    <p className={styles.party}>
                      With {lastScan.companions.length} guest
                      {lastScan.companions.length === 1 ? "" : "s"}:{" "}
                      {lastScan.companions.join(", ")}
                    </p>
                  ) : null}
                  <span
                    className={
                      lastScan.result === "allowed" ? styles.badgeOk : styles.badgeDenied
                    }
                  >
                    {lastScan.result === "allowed"
                      ? lastScan.direction === "out"
                        ? "Checked Out"
                        : "Checked In"
                      : "Denied"}{" "}
                    · {lastScan.time}
                  </span>
                </div>
              </div>
            ) : (
              <p className={styles.lede}>No scans yet this shift.</p>
            )}
          </article>

          <article className={`${styles.panel} ${styles.onSitePanel}`}>
            <div className={styles.panelHead}>
              <h2>On Site Now</h2>
              {onSite ? (
                <span
                  className={
                    onSite.overstay_count > 0 ? styles.countWarn : styles.countOk
                  }
                >
                  {onSite.inside_count} inside
                  {onSite.overstay_count > 0
                    ? ` · ${onSite.overstay_count} overstaying`
                    : ""}
                </span>
              ) : null}
            </div>
            {onSiteError ? (
              <p className={styles.formError} role="alert">
                {onSiteError}
              </p>
            ) : !onSite ? (
              <p className={styles.lede}>Loading…</p>
            ) : sortedVisits.length === 0 ? (
              <p className={styles.lede}>Nobody is checked in right now.</p>
            ) : (
              // A busy day can put dozens of people on site; this list scrolls
              // within its own fixed height instead of ever stretching the page,
              // and the header count above stays accurate even when scrolled.
              <ul className={styles.visitList}>
                {sortedVisits.map((v) => (
                  <li
                    key={v.log_id}
                    className={v.overstaying ? styles.visitOver : undefined}
                  >
                    <div>
                      <strong>{v.visitor_name}</strong>
                      <span>
                        {v.unit} · {v.hours_inside.toFixed(1)}h inside
                        {v.party_size > 1 ? ` · party of ${v.party_size}` : ""}
                      </span>
                      {v.overstaying ? (
                        <span className={styles.overTag}>
                          Past the {onSite.max_stay_hours}h limit
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className={styles.closeVisitBtn}
                      disabled={closingLogId === v.log_id}
                      onClick={() => closeVisit(v.log_id, v.visitor_name)}
                      title="Record a departure that was not scanned"
                    >
                      {closingLogId === v.log_id ? "Closing…" : "Mark departed"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </aside>
      </div>
    </div>
  );
}
