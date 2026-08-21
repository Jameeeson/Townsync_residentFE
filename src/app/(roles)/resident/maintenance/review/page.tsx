"use client";

import styles from "@/styles/review.module.css";
import { Bot, Camera, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, Suspense } from "react";
import SuccessModal from "../success/page";
import { ApiClientError } from "@/lib/apiClient";
import { createMaintenanceTicket } from "@/lib/api/resident";

function priorityFromSelect(value: string): string {
  if (value.startsWith("Low")) return "Low";
  if (value.startsWith("High")) return "High";
  return "Medium";
}

function ReviewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftSubject = searchParams.get("subject") || "Maintenance Request";
  const draftCategory = searchParams.get("category") || "Other";
  const draftPriority = searchParams.get("priority") || "Medium";

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [subject, setSubject] = useState(draftSubject);
  const [category, setCategory] = useState(draftCategory);
  const [description, setDescription] = useState(
    searchParams.get("description") ||
      "Describe the issue in detail so maintenance can diagnose it quickly."
  );
  const [urgency, setUrgency] = useState(
    draftPriority === "High"
      ? "High - Emergency"
      : draftPriority === "Low"
        ? "Low - General Maintenance"
        : "Medium - Needs Attention"
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await createMaintenanceTicket({
        subject,
        category,
        priority_level: priorityFromSelect(urgency),
        detailed_description: description,
        images: imageFiles,
      });
      setIsSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to submit request."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = () => {
    router.push("/resident/maintenance");
  };

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <aside>
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <Bot size={24} /> AI Summary
            </div>

            <div className={styles.summaryItem}>
              <span className={styles.label}>Category</span>
              <input
                className={styles.value}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 6 }}
              />
            </div>

            <div className={styles.summaryItem}>
              <span className={styles.label}>Subject</span>
              <input
                className={styles.value}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 6, width: "100%" }}
              />
            </div>

            <div className={styles.summaryItem}>
              <span className={styles.label}>Gathered Detail</span>
              <p className={styles.quote}>
                Review and edit the description, then submit your service request.
              </p>
            </div>
          </div>

          <div className={styles.infoBox}>
            <h3 className={styles.infoTitle}>What happens next?</h3>
            <p className={styles.infoText}>
              Once you submit, a local maintenance technician will review the report and schedule a
              visit within 24-48 hours based on urgency.
            </p>
          </div>
        </aside>

        <main className={styles.mainCard}>
          <h2 className={styles.cardTitle}>Final Interventions</h2>

          {error ? (
            <p style={{ color: "#b91c1c", marginBottom: 12 }} role="alert">
              {error}
            </p>
          ) : null}

          <div className={styles.formGroup}>
            <div className={styles.inputHeader}>
              <label className={styles.label}>Detailed Description</label>
              <span className={styles.editableLabel}>Editable</span>
            </div>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={styles.flexGroup}>
            <div>
              <label className={styles.label}>Urgency Level</label>
              <select
                className={styles.select}
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
              >
                <option>Medium - Needs Attention</option>
                <option>Low - General Maintenance</option>
                <option>High - Emergency</option>
              </select>
            </div>
            <div>
              <label className={styles.label}>Preferred Visit Date</label>
              <input type="date" className={styles.dateInput} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Reference Images</label>
            <div className={styles.imageGrid}>
              {previews.map((src) => (
                <div key={src} className={styles.imagePreview}>
                  <img src={src} alt="Uploaded reference" />
                </div>
              ))}
              {previews.length < 4 ? (
                <button
                  type="button"
                  className={styles.uploadPlaceholder}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: "pointer", font: "inherit", color: "inherit" }}
                >
                  <Camera size={24} />
                  <span style={{ fontSize: "11px", fontWeight: 600 }}>Add More</span>
                </button>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = URL.createObjectURL(file);
                  setImageFiles((files) => [...files, file].slice(0, 4));
                  setPreviews((imgs) => [...imgs, url].slice(0, 4));
                  e.target.value = "";
                }}
              />
            </div>
            <p style={{ fontSize: "11px", color: "#64748b", marginTop: "12px", fontStyle: "italic" }}>
              You can upload up to 4 images to help our team diagnose the issue.
            </p>
          </div>

          <div className={styles.footer}>
            <button className={styles.btnSecondary} type="button" onClick={handleDiscard}>
              Discard Request
            </button>
            <button
              className={styles.btnPrimary}
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading}
            >
              {loading ? "Submitting…" : "Submit Service Request"} <Send size={16} />
            </button>
          </div>
        </main>
      </div>

      <SuccessModal
        isOpen={isSubmitted}
        onClose={() => {
          setIsSubmitted(false);
          router.push("/resident/maintenance/history");
        }}
      />
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Loading…</p>}>
      <ReviewForm />
    </Suspense>
  );
}
