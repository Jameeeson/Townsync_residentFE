"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
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

/** The same code is ignored for this long after it was read, even if the guard resumes with it still in view. */
const SAME_CODE_BLOCK_MS = 8000;
/** With no scan for this long the camera switches itself off. */
const IDLE_STOP_MS = 2 * 60 * 1000;

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  // After a read the scanner pauses until the guard taps "Scan next pass". Without this the QR still in view is
  // read again and again, and each read flips the pass between check-in and check-out.
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const inFlightRef = useRef(false);
  const lastReadRef = useRef<{ token: string; at: number } | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraStatus, setCameraStatus] = useState<"idle" | "starting" | "active" | "error">("idle");
  const [idleStopped, setIdleStopped] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

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

  const verifyToken = useCallback(async (rawToken: string) => {
    setFormError(null);
    const token = rawToken.trim();
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
  }, [entryPoint, refreshOnSite, toast]);

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    await verifyToken(passId);
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

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current !== null) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    pausedRef.current = false;
    setPaused(false);
    setCameraStatus("idle");
    setTorchSupported(false);
    setTorchOn(false);
  }, []);

  // Grabs one video frame per animation tick, decodes it for a QR code, and
  // auto-submits the same verify flow manual entry uses. A cooldown after a
  // hit stops the still-visible QR from re-triggering dozens of times before
  // the guard moves the pass out of frame.
  //
  // tickRef holds the current tick so the loop can recurse through a stable
  // wrapper instead of referencing `tick` before it's declared.
  const tickRef = useRef<() => void>(() => {});

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      scanLoopRef.current = requestAnimationFrame(() => tickRef.current());
      return;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      scanLoopRef.current = requestAnimationFrame(() => tickRef.current());
      return;
    }
    if (pausedRef.current) {
      scanLoopRef.current = requestAnimationFrame(() => tickRef.current());
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });

    const last = lastReadRef.current;
    const sameAsJustRead = Boolean(code?.data && last && last.token === code.data && Date.now() - last.at < SAME_CODE_BLOCK_MS);
    if (code?.data && !pausedRef.current && !inFlightRef.current && !sameAsJustRead) {
      // Stop reading right away; the guard resumes once the pass has left the frame.
      pausedRef.current = true;
      inFlightRef.current = true;
      setPaused(true);
      lastReadRef.current = { token: code.data, at: Date.now() };
      setPassId(code.data);
      verifyToken(code.data).finally(() => {
        inFlightRef.current = false;
        lastReadRef.current = { token: code.data, at: Date.now() };
      });
    }
    scanLoopRef.current = requestAnimationFrame(() => tickRef.current());
  }, [verifyToken]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  // The camera turns itself off after a quiet spell, so a tab left open at the desk is not filming all shift.
  const stopRef = useRef<() => void>(() => {});
  const armIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      stopRef.current();
      setIdleStopped(true);
    }, IDLE_STOP_MS);
  }, []);
  useEffect(() => {
    stopRef.current = stopCamera;
  }, [stopCamera]);

  const resumeScan = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
    armIdleTimer();
  }, [armIdleTimer]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("error");
      setCameraError("This browser doesn't support camera capture. Use manual entry below.");
      return;
    }
    setCameraStatus("starting");
    setCameraError(null);
    setIdleStopped(false);
    pausedRef.current = false;
    setPaused(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const [track] = stream.getVideoTracks();
      const capabilities = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
      setTorchSupported(Boolean(capabilities && "torch" in capabilities));
      setCameraStatus("active");
      armIdleTimer();
      scanLoopRef.current = requestAnimationFrame(() => tickRef.current());
    } catch (err) {
      setCameraStatus("error");
      setCameraError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access in your browser settings, or use manual entry below."
          : "Could not access the camera. Use manual entry below.",
      );
    }
  }, [armIdleTimer]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn((v) => !v);
    } catch {
      // Torch control isn't supported on this device/browser — button stays a no-op.
    }
  }

  // Only run the camera on the Verify Pass tab, and only for staff who can
  // actually use the scanner — stop it the moment either stops being true so
  // the camera light never stays on when it shouldn't (privacy + battery).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- starting/stopping the
       camera is inherently a side effect with an internal state machine
       (idle/starting/active/error); there's no derived-state alternative. */
    if (mode === "pass" && canUseScanner) {
      startCamera();
    } else {
      stopCamera();
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, canUseScanner]);

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
        {cameraStatus === "active" ? (
          <span className={styles.online} role="status">
            <span className={styles.onlineDot} /> Camera Active
          </span>
        ) : (
          <span className={styles.offline} role="status">
            <span className={styles.offlineDot} />
            {cameraStatus === "starting" ? "Starting Camera…" : "Camera Unavailable"}
          </span>
        )}
      </header>

      <div className={styles.layout}>
        <section className={styles.actionCard}>
          {mode === "pass" && cameraStatus !== "error" ? (
            <div className={styles.cameraFrame}>
              <video
                ref={videoRef}
                className={styles.cameraVideo}
                playsInline
                muted
                autoPlay
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />
              {cameraStatus === "active" && !paused ? <div className={styles.cameraReticle} aria-hidden /> : null}
              {cameraStatus === "active" && paused ? (
                <div className={styles.pausedOverlay} role="status">
                  <strong>{verifying ? "Checking the pass…" : "Scan recorded"}</strong>
                  <span>Scanning is paused so the same pass is not read twice.</span>
                  <button type="button" className={styles.resumeBtn} onClick={resumeScan} disabled={verifying}>
                    Scan next pass
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className={`${styles.scanStrip} ${cameraStatus === "error" ? styles.scanStripDanger : ""}`}>
            <span className={styles.scanStripIcon} aria-hidden>
              <IconScan size={20} />
            </span>
            <div className={styles.scanStripCopy}>
              <p>
                {cameraStatus === "active"
                  ? paused
                    ? "Paused after a scan"
                    : "Point the camera at the visitor's QR pass"
                  : cameraStatus === "starting"
                    ? "Starting camera…"
                    : cameraStatus === "error"
                      ? (cameraError ?? "Camera unavailable")
                      : idleStopped
                        ? "Camera turned off after 2 minutes without a scan"
                        : "Camera is off"}
              </p>
              <span>Verify a pass or log a visitor manually below.</span>
            </div>
            {mode === "pass" && cameraStatus !== "error" ? (
              <button
                type="button"
                className={styles.torch}
                onClick={() => (cameraStatus === "idle" ? void startCamera() : stopCamera())}
                disabled={cameraStatus === "starting"}
              >
                <span>{cameraStatus === "idle" ? "Start camera" : "Stop camera"}</span>
              </button>
            ) : null}
            <button
              type="button"
              className={`${styles.torch} ${torchOn ? styles.torchActive : ""}`}
              disabled={!torchSupported}
              onClick={toggleTorch}
              title={torchSupported ? "Toggle flashlight" : "Torch not supported on this device"}
              aria-pressed={torchOn}
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
