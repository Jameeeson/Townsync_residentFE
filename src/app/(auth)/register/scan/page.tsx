"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  CameraOff,
  CheckCircle2,
  Circle,
  IdCard,
  Loader2,
  Mail,
  RefreshCw,
  ScanLine,
} from "lucide-react";
import { RegisterShell } from "@/components/register/RegisterShell";
import { getRegisterData, saveRegisterData } from "@/lib/registerStorage";
import styles from "@/styles/register.module.css";
import scan from "@/styles/idscan.module.css";

const SUPPORT_EMAIL = "townsync.support@gmail.com";
const ACCOUNT_REQUEST_MAILTO =
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Register - Account Request (No National ID)")}` +
  `&body=${encodeURIComponent(
    "Hello TownSync Support,\n\nI would like to request a resident account. I do not have a Philippine National ID.\n\n" +
      "Full name:\nBlock / Lot / Unit:\nHomeowner or Tenant:\nContact number:\nValid ID I can present instead:\n\nThank you.",
  )}`;

type CameraState = "starting" | "live" | "denied" | "unavailable";
type Phase = "aim" | "processing" | "done" | "rejected";
type Lighting = "unknown" | "dark" | "bright" | "glare" | "good";

interface Quality {
  lighting: Lighting;
  brightness: number; // 0..255 mean luminance inside the guide
  sharp: boolean;
}

// Below ~75 mean luminance OCR misses the thin PhilSys text. The PhilID is a
// light card, so "too bright" is judged mostly by blown-out pixels (glare on
// the laminate) rather than by the mean, which is naturally high.
const DARK_LIMIT = 75;
const BRIGHT_LIMIT = 235;
const GLARE_LEVEL = 250;
const GLARE_RATIO = 0.08;
const SHARPNESS_MIN = 45;
const CROP_MARGIN = 0.1;
const STEADY_SAMPLES = 3; // consecutive good samples (~1s) before capture is allowed
const SAMPLE_MS = 350;
// Some webcams never pass the focus check; after this many well-lit samples
// (~3.5s) capture is allowed anyway and the burst below picks the sharpest frame.
const FOCUS_GRACE_SAMPLES = 10;
const BURST_FRAMES = 5;
const BURST_GAP_MS = 110;

/** Maps the on-screen guide box to source-video pixels (the video is shown with object-fit: cover). */
function guideToVideoRect(video: HTMLVideoElement, stage: HTMLElement, guide: HTMLElement) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const s = stage.getBoundingClientRect();
  const g = guide.getBoundingClientRect();
  const scale = Math.max(s.width / vw, s.height / vh);
  const offsetX = (vw * scale - s.width) / 2;
  const offsetY = (vh * scale - s.height) / 2;
  const x = Math.max(0, (g.left - s.left + offsetX) / scale);
  const y = Math.max(0, (g.top - s.top + offsetY) / scale);
  return {
    x,
    y,
    w: Math.min(vw - x, g.width / scale),
    h: Math.min(vh - y, g.height / scale),
  };
}

/** Variance of the Laplacian over a luminance image: low when blurred or out of focus. */
function laplacianVariance(lum: Float32Array, width: number, height: number): number {
  let lapSum = 0;
  let lapSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const v = 4 * lum[i] - lum[i - 1] - lum[i + 1] - lum[i - width] - lum[i + width];
      lapSum += v;
      lapSq += v * v;
      count += 1;
    }
  }
  const mean = count ? lapSum / count : 0;
  return count ? lapSq / count - mean * mean : 0;
}

/** Focus score of a captured frame, measured on a fixed-width copy so frames compare fairly. */
function frameSharpness(frame: HTMLCanvasElement): number {
  const w = 480;
  const h = Math.max(1, Math.round((w * frame.height) / frame.width));
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const ctx = small.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;
  ctx.drawImage(frame, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  for (let i = 0, p = 0; i < lum.length; i += 1, p += 4) lum[i] = 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
  return laplacianVariance(lum, w, h);
}

function measure(pixels: Uint8ClampedArray, width: number, height: number): Quality {
  const n = width * height;
  const lum = new Float32Array(n);
  let sum = 0;
  let glare = 0;
  for (let i = 0, p = 0; i < n; i += 1, p += 4) {
    const l = 0.299 * pixels[p] + 0.587 * pixels[p + 1] + 0.114 * pixels[p + 2];
    lum[i] = l;
    sum += l;
    if (l > GLARE_LEVEL) glare += 1;
  }
  const brightness = sum / n;

  const sharpness = laplacianVariance(lum, width, height);

  let lighting: Lighting = "good";
  if (brightness < DARK_LIMIT) lighting = "dark";
  else if (glare / n > GLARE_RATIO) lighting = "glare";
  else if (brightness > BRIGHT_LIMIT) lighting = "bright";
  return { lighting, brightness, sharp: sharpness >= SHARPNESS_MIN };
}

const LIGHTING_TEXT: Record<Lighting, string> = {
  unknown: "Checking light…",
  dark: "Too dark — move to a brighter spot",
  bright: "Too bright — step away from direct light",
  glare: "Glare on the card — tilt it slightly",
  good: "Lighting is good",
};

const EMPTY_FIELDS = { fullName: "", idNumber: "", idType: "National ID", idVerification: "" };
const UNKNOWN_QUALITY: Quality = { lighting: "unknown", brightness: 0, sharp: false };

export default function RegisterScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sampleCanvas = useRef<HTMLCanvasElement | null>(null);
  const litSamples = useRef(0);

  const [camera, setCamera] = useState<CameraState>("starting");
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>("aim");
  const [quality, setQuality] = useState<Quality>(UNKNOWN_QUALITY);
  const [steady, setSteady] = useState(0);
  const [still, setStill] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fields, setFields] = useState(EMPTY_FIELDS);

  useEffect(() => {
    if (!getRegisterData().role) router.replace("/register");
  }, [router]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Open the in-app camera (rear camera on phones). There is deliberately no file
  // picker: the ID has to be captured live, not uploaded from the gallery.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) setCamera("unavailable");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setCamera("live");
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        setCamera(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraAttempt, stopCamera]);

  // Sample the guide area a few times a second to grade lighting and focus.
  useEffect(() => {
    if (camera !== "live" || phase !== "aim") return;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      const stage = stageRef.current;
      const guide = guideRef.current;
      if (!video || !stage || !guide || !video.videoWidth) return;
      const r = guideToVideoRect(video, stage, guide);
      if (r.w <= 0 || r.h <= 0) return;
      const w = 192;
      const h = Math.max(1, Math.round((w * r.h) / r.w));
      const canvas = sampleCanvas.current ?? document.createElement("canvas");
      sampleCanvas.current = canvas;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, w, h);
      const q = measure(ctx.getImageData(0, 0, w, h).data, w, h);
      setQuality(q);
      // Capture needs good light and focus; a camera that never reports focus is
      // let through after a grace period rather than blocking the resident.
      litSamples.current = q.lighting === "good" ? litSamples.current + 1 : 0;
      const focused = q.sharp || litSamples.current >= FOCUS_GRACE_SAMPLES;
      setSteady((n) => (q.lighting === "good" && focused ? Math.min(n + 1, STEADY_SAMPLES) : 0));
    }, SAMPLE_MS);
    return () => window.clearInterval(timer);
  }, [camera, phase]);

  useEffect(() => {
    return () => {
      if (still) URL.revokeObjectURL(still);
    };
  }, [still]);

  const canCapture = camera === "live" && phase === "aim" && steady >= STEADY_SAMPLES;

  async function capture() {
    const video = videoRef.current;
    const stage = stageRef.current;
    const guide = guideRef.current;
    if (!canCapture || !video || !stage || !guide) return;

    // Crop the guide area at the camera's full resolution, with a margin so a card
    // held slightly larger than the frame doesn't lose its edge text.
    const g = guideToVideoRect(video, stage, guide);
    const padX = g.w * CROP_MARGIN;
    const padY = g.h * CROP_MARGIN;
    const x0 = Math.max(0, g.x - padX);
    const y0 = Math.max(0, g.y - padY);
    const r = {
      x: x0,
      y: y0,
      w: Math.min(video.videoWidth, g.x + g.w + padX) - x0,
      h: Math.min(video.videoHeight, g.y + g.h + padY) - y0,
    };
    // Grab a short burst and keep the sharpest frame: hand shake and autofocus
    // hunting blur single frames more often than not.
    setPhase("processing");
    let canvas: HTMLCanvasElement | null = null;
    let bestScore = -1;
    for (let k = 0; k < BURST_FRAMES; k += 1) {
      if (k > 0) await new Promise((resolve) => window.setTimeout(resolve, BURST_GAP_MS));
      const frame = document.createElement("canvas");
      frame.width = Math.round(r.w);
      frame.height = Math.round(r.h);
      const ctx = frame.getContext("2d");
      if (!ctx) continue;
      ctx.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, frame.width, frame.height);
      const score = frameSharpness(frame);
      if (score > bestScore) {
        bestScore = score;
        canvas = frame;
      }
    }
    if (!canvas) {
      setPhase("aim");
      setError("Could not capture the photo. Please try again.");
      return;
    }
    const best = canvas;
    const blob = await new Promise<Blob | null>((resolve) => best.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setPhase("aim");
      setError("Could not capture the photo. Please try again.");
      return;
    }

    setStill(URL.createObjectURL(blob));
    setPhase("processing");
    setError("");

    try {
      const form = new FormData();
      form.append("image", blob, "national-id.jpg");
      const response = await fetch("/api/ocr", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "We could not read the ID.");

      if (payload.idType !== "National ID") {
        setPhase("rejected");
        setError(
          "This does not look like a Philippine National ID (PhilSys). Only the National ID is accepted for self-registration.",
        );
        return;
      }
      if (!payload.fullName || !payload.idNumber || !payload.verification) {
        throw new Error("Part of the ID could not be read. Keep the whole card inside the frame and try again.");
      }
      setFields({
        fullName: payload.fullName,
        idNumber: payload.idNumber,
        idType: "National ID",
        idVerification: payload.verification,
      });
      setPhase("done");
      stopCamera();
    } catch (err) {
      setPhase("rejected");
      setError(err instanceof Error ? err.message : "We could not read the ID. Please try again.");
    }
  }

  function retake() {
    setStill(null);
    setFields(EMPTY_FIELDS);
    setError("");
    setSteady(0);
    setQuality(UNKNOWN_QUALITY);
    setPhase("aim");
    if (!streamRef.current) {
      setCamera("starting");
      setCameraAttempt((n) => n + 1);
    }
  }

  function retryCamera() {
    setCamera("starting");
    setCameraAttempt((n) => n + 1);
  }

  function handleNext() {
    if (phase !== "done" || !fields.idVerification) return;
    saveRegisterData(fields);
    router.push("/register/details");
  }

  const tone =
    phase === "done" || quality.lighting === "good"
      ? scan.guideReady
      : quality.lighting === "unknown"
        ? ""
        : scan.guideWarn;
  const lightDot =
    quality.lighting === "good"
      ? scan.dotGood
      : quality.lighting === "unknown"
        ? ""
        : quality.lighting === "dark"
          ? scan.dotBad
          : scan.dotWarn;
  const meterLeft = `${Math.min(100, Math.max(0, (quality.brightness / 255) * 100))}%`;

  const checks = [
    { label: "Camera is on", ok: camera === "live" || phase === "done" },
    { label: "Good lighting, no glare", ok: quality.lighting === "good" || phase === "done" },
    { label: "Card held steady inside the frame", ok: steady >= STEADY_SAMPLES || phase === "done" },
    { label: "National ID details read", ok: phase === "done" },
  ];

  return (
    <RegisterShell
      step={2}
      showHeading
      title="Scan your National ID"
      subtitle="Hold your Philippine National ID inside the frame. We read your name and ID number to fill in your application."
    >
      <div className={scan.notice} role="note">
        <IdCard size={20} aria-hidden="true" />
        <div>
          <p>
            <strong>Only the Philippine National ID (PhilSys / PhilID) is accepted.</strong>{" "}
            Other IDs such as a driver&apos;s license or passport cannot be used to register here.
          </p>
          <p>
            No National ID? Request an account by emailing <a href={ACCOUNT_REQUEST_MAILTO}>{SUPPORT_EMAIL}</a> with
            the subject <strong>&quot;Register&quot;</strong>. Property management will verify you another way.
          </p>
        </div>
      </div>

      <div className={scan.layout}>
        <div className={scan.stageColumn}>
          <div className={scan.stage} ref={stageRef}>
            <video ref={videoRef} className={scan.video} playsInline muted autoPlay aria-label="Live camera view" />
            <div className={`${scan.guide} ${tone}`} ref={guideRef} aria-hidden="true">
              <span className={scan.guideHint}>{phase === "done" ? "ID captured" : "Place your National ID here"}</span>
              <span className={`${scan.corner} ${scan.cornerTL}`} />
              <span className={`${scan.corner} ${scan.cornerTR}`} />
              <span className={`${scan.corner} ${scan.cornerBL}`} />
              <span className={`${scan.corner} ${scan.cornerBR}`} />
              {still ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                <img src={still} alt="Captured National ID" className={scan.still} />
              ) : (
                <span className={scan.centerMark} />
              )}
              {camera === "live" && phase === "aim" ? <span className={scan.scanLine} /> : null}
            </div>

            {camera === "live" && phase === "aim" ? (
              <>
                <div className={scan.topBar}>
                  <span className={scan.chip} aria-live="polite">
                    <span className={`${scan.dot} ${lightDot}`} />
                    {LIGHTING_TEXT[quality.lighting]}
                  </span>
                  {quality.lighting === "good" ? (
                    <span className={scan.chip}>
                      <span className={`${scan.dot} ${quality.sharp ? scan.dotGood : scan.dotWarn}`} />
                      {quality.sharp ? "In focus" : "Hold steady to focus"}
                    </span>
                  ) : null}
                </div>
                <div className={scan.meter} aria-hidden="true">
                  <div className={scan.meterTrack}>
                    <span className={scan.meterThumb} style={{ left: meterLeft }} />
                  </div>
                </div>
              </>
            ) : null}

            {phase === "processing" ? (
              <div className={scan.processing} role="status">
                <div>
                  <Loader2 size={18} className="ts-spin" aria-hidden="true" /> Reading your ID…
                </div>
              </div>
            ) : null}

            {camera === "starting" && phase === "aim" ? (
              <div className={scan.overlayMessage} role="status">
                <Loader2 size={28} className="ts-spin" aria-hidden="true" />
                <p>Starting the camera… allow camera access when your browser asks.</p>
              </div>
            ) : null}

            {(camera === "denied" || camera === "unavailable") && phase === "aim" ? (
              <div className={scan.overlayMessage} role="alert">
                <CameraOff size={32} aria-hidden="true" />
                <h3>{camera === "denied" ? "Camera access is blocked" : "No camera found"}</h3>
                <p>
                  {camera === "denied"
                    ? "Allow camera access for this site in your browser settings, then try again. The ID has to be scanned live."
                    : "Open this page on a phone or a device with a camera to scan your National ID."}
                </p>
                <button type="button" className={scan.ghostBtn} onClick={retryCamera}>
                  <RefreshCw size={16} aria-hidden="true" /> Try again
                </button>
              </div>
            ) : null}
          </div>

          <div className={scan.controls}>
            {phase === "aim" || phase === "processing" ? (
              <button type="button" className={scan.shutter} disabled={!canCapture} onClick={() => void capture()}>
                <Camera size={18} aria-hidden="true" />
                {phase === "processing"
                  ? "Reading…"
                  : canCapture
                    ? "Capture ID"
                    : quality.lighting === "good"
                      ? "Hold steady…"
                      : "Waiting for good lighting"}
              </button>
            ) : (
              <button type="button" className={scan.ghostBtn} onClick={retake}>
                <RefreshCw size={16} aria-hidden="true" /> Retake photo
              </button>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={scan.resultHead}>
            <h2>Extracted Information</h2>
            {phase === "done" ? (
              <span className={scan.badgeOk}>
                <CheckCircle2 size={12} aria-hidden="true" /> National ID read
              </span>
            ) : phase === "rejected" ? (
              <span className={scan.badgeBad}>Not accepted</span>
            ) : (
              <span className={scan.badgeIdle}>
                <ScanLine size={12} aria-hidden="true" /> Waiting for scan
              </span>
            )}
          </div>

          {error ? (
            <p className={scan.alert} role="alert">
              {error}
            </p>
          ) : null}

          <div className={styles.field}>
            <label htmlFor="fullName">Full Name</label>
            <input id="fullName" value={fields.fullName} placeholder="Read from your ID" disabled readOnly />
          </div>
          <div className={styles.field}>
            <label htmlFor="idNumber">PhilSys Card Number</label>
            <input id="idNumber" value={fields.idNumber} placeholder="0000-0000-0000-0000" disabled readOnly />
          </div>
          <div className={styles.field}>
            <label htmlFor="idType">ID Type</label>
            <input id="idType" value="Philippine National ID" disabled readOnly />
          </div>

          <div className={scan.divider} />

          <ul className={scan.checklist}>
            {checks.map((c) => (
              <li key={c.label}>
                {c.ok ? (
                  <CheckCircle2 size={16} className={scan.checkOk} aria-hidden="true" />
                ) : (
                  <Circle size={16} className={scan.checkPending} aria-hidden="true" />
                )}
                <span>{c.label}</span>
              </li>
            ))}
          </ul>

          {phase === "rejected" ? (
            <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: "var(--space-4) 0 0" }}>
              <Mail size={13} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> No National ID?{" "}
              <a href={ACCOUNT_REQUEST_MAILTO}>Email {SUPPORT_EMAIL}</a> with the subject &quot;Register&quot;.
            </p>
          ) : null}

          <div className={styles.actions}>
            <button className={styles.btnSecondary} type="button" onClick={() => router.push("/register")}>
              Cancel
            </button>
            <button className={styles.btnPrimary} type="button" disabled={phase !== "done"} onClick={handleNext}>
              Next Step
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </RegisterShell>
  );
}
