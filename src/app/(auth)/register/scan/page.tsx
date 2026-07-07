"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, ImagePlus, Info } from "lucide-react";
import { RegisterShell } from "@/components/register/RegisterShell";
import { getRegisterData, saveRegisterData } from "@/lib/registerStorage";
import styles from "@/styles/register.module.css";

type ScanStatus = "idle" | "processing" | "done" | "error";

export default function RegisterScanPage() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<ScanStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fields, setFields] = useState({
    fullName: "",
    idNumber: "",
    idType: "National ID",
  });

  useEffect(() => {
    const data = getRegisterData();
    if (!data.role) {
      router.replace("/register");
    }
  }, [router]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function processImage(file: File) {
    if (status === "processing") {
      return;
    }

    setStatus("processing");
    setProgress(10);
    setError("");

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return objectUrl;
    });

    const progressTimer = window.setInterval(() => {
      setProgress((value) => (value >= 90 ? value : value + 8));
    }, 400);

    try {
      const formData = new FormData();
      formData.append("image", file, file.name || "id-scan.jpg");

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "OCR failed");
      }

      setFields({
        fullName: payload.fullName || "Unknown",
        idNumber: payload.idNumber || "",
        idType: payload.idType || "National ID",
      });
      setProgress(100);
      setStatus("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not read ID. Try again with a clearer photo.",
      );
      setStatus("error");
      setProgress(0);
    } finally {
      window.clearInterval(progressTimer);
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
      }
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      await processImage(file);
    }
  }

  function handleNext() {
    saveRegisterData(fields);
    router.push("/register/details");
  }

  function handleCancel() {
    router.push("/register");
  }

  const statusLabel =
    status === "processing"
      ? "Processing..."
      : status === "done"
        ? "ID detected"
        : previewUrl
          ? "Photo captured"
          : "No photo yet";

  return (
    <RegisterShell
      showHeading
      title="Register"
      subtitle="Securely scan your ID to auto-fill your details and verify your residence."
    >
      <div className={styles.scanGrid}>
        <div className={styles.scanColumn}>
          <div className={styles.viewfinder}>
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Captured ID preview" className={styles.previewImage} />
            ) : (
              <div className={styles.viewfinderPlaceholder}>
                <Camera size={40} />
                <p>Your ID photo will appear here</p>
              </div>
            )}
            <div className={styles.viewfinderFrame} />
            <div className={styles.statusBadge}>
              <span className={styles.statusDot} />
              {statusLabel}
            </div>
          </div>

          <div className={styles.instructions}>
            <div className={styles.instructionsTitle}>
              <Info size={16} />
              Scanning Instructions
            </div>
            Tap &quot;Open Camera&quot; to use your phone&apos;s native camera app. Hold your ID
            steady with good lighting and no glare.
          </div>

          <div className={styles.uploadFallback}>
            <label className={styles.btnPrimary}>
              <Camera size={18} />
              Open Camera
              <input
                ref={cameraInputRef}
                className={styles.hiddenFileInput}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
              />
            </label>

            <label className={styles.btnOutline}>
              <ImagePlus size={18} />
              Choose from Gallery
              <input
                ref={galleryInputRef}
                className={styles.hiddenFileInput}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.extractHeader}>
            <h2 className={styles.cardTitle} style={{ margin: 0 }}>
              Extracted Information
            </h2>
            <span className={styles.ocrBadge}>OCR</span>
          </div>

          <div className={styles.field}>
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              value={fields.fullName}
              placeholder={status === "processing" ? "Scanning..." : "Waiting for scan..."}
              disabled
              readOnly
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="idNumber">ID Number</label>
            <input
              id="idNumber"
              value={fields.idNumber}
              placeholder="123456789"
              disabled
              readOnly
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="idType">ID Type</label>
            <input id="idType" value={fields.idType} disabled readOnly />
          </div>

          {status === "processing" || progress > 0 ? (
            <div className={styles.progressBlock}>
              <div className={styles.progressLabel}>
                <span>Processing Analysis</span>
                <span>{progress}%</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}

          {error ? <p className={styles.errorText}>{error}</p> : null}

          <div className={styles.actions}>
            <button className={styles.btnSecondary} type="button" onClick={handleCancel}>
              Cancel
            </button>
            <button
              className={styles.btnPrimary}
              type="button"
              disabled={status !== "done"}
              onClick={handleNext}
            >
              Next Step
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </RegisterShell>
  );
}
