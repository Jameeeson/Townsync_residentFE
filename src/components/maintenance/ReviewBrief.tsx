"use client";

import { useRef, type DragEvent } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, X } from "lucide-react";
import styles from "@/styles/maintenance.module.css";
import type { ChatAttachment, RequestDraft } from "@/hooks/useMaintenanceChat";

const URGENCY_LEVELS: Array<{ level: string; description: string; dot: string }> = [
  { level: "Low", description: "Non-critical repair", dot: "var(--color-text-tertiary)" },
  { level: "Medium", description: "Standard issue (default)", dot: "var(--color-primary-600)" },
  { level: "High", description: "Major inconvenience", dot: "var(--color-warning-600)" },
];

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function quickDateOptions(): Array<{ label: string; value: string }> {
  const today = new Date();
  const options: Array<{ label: string; value: string }> = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const label =
      i === 1 ? "Tomorrow" : d.toLocaleDateString([], { weekday: "long" });
    options.push({
      label: `${label} (${d.toLocaleDateString([], { month: "short", day: "numeric" })})`,
      value: toDateInput(d),
    });
  }
  options.push({ label: "First Available", value: "" });
  return options;
}

function loggedAgo(startedAt: number | null): string {
  if (!startedAt) return "";
  const minutes = Math.max(0, Math.round((Date.now() - startedAt) / 60000));
  if (minutes < 1) return "Logged just now";
  if (minutes < 60) return `Logged ${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  return `Logged ${hours} hour${hours === 1 ? "" : "s"} ago`;
}

interface ReviewBriefProps {
  draft: RequestDraft;
  draftStartedAt: number | null;
  onUpdateDraft: (patch: Partial<RequestDraft>) => void;
  attachments: ChatAttachment[];
  onAttachImage: (file: File) => void;
  onRemoveAttachment: (index: number) => void;
  maxAttachments: number;
  onBackToConversation: () => void;
  onDiscard: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string;
}

export function ReviewBrief({
  draft,
  draftStartedAt,
  onUpdateDraft,
  attachments,
  onAttachImage,
  onRemoveAttachment,
  maxAttachments,
  onBackToConversation,
  onDiscard,
  onSubmit,
  submitting,
  submitError,
}: ReviewBriefProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requiredFilled = [draft.category, draft.description, draft.urgency].filter(Boolean).length;
  const ready = requiredFilled === 3;
  const dateOptions = quickDateOptions();

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && attachments.length < maxAttachments) onAttachImage(file);
  }

  return (
    <div className={`${styles.reviewDoc} ts-fade-in-up`}>
      <div className={styles.reviewHeader}>
        <div className={styles.reviewTopRow}>
          <button type="button" className={styles.reviewBack} onClick={onBackToConversation}>
            <ArrowLeft size={14} /> Continue conversation with AI
          </button>
          <span className={styles.ticketDraftPill}>Draft #TCR-{String(draftStartedAt ?? 0).slice(-4)}</span>
        </div>

        <h1 className={styles.reviewPageTitle}>Review &amp; Confirm Request</h1>
        <p className={styles.reviewPageSubtitle}>
          Please verify the AI-synthesized ticket details and specify your availability before
          submission.
        </p>

        <div className={styles.reviewBadgeRow}>
          <span className={styles.diagnosticModeBadge}>Generated via AI Chat</span>
          <span className={styles.reviewStepBadge}>Step 2 of 3</span>
          {draftStartedAt ? <span className={styles.reviewLoggedAt}>{loggedAgo(draftStartedAt)}</span> : null}
        </div>
      </div>

      <div className={styles.reviewScrollArea}>
      <input
        className={styles.reviewSubject}
        value={draft.subject}
        onChange={(e) => onUpdateDraft({ subject: e.target.value })}
        placeholder="Maintenance request"
        aria-label="Request subject"
      />

      <div className={styles.reviewTagsRow}>
        {draft.category ? <span className={styles.reviewTag}>{draft.category}</span> : null}
        {draft.location ? <span className={styles.reviewTag}>{draft.location}</span> : null}
      </div>

      <div className={styles.reviewSection}>
        <div className={styles.reviewSectionLabel}>Synthesized Problem Summary</div>
        <div className={styles.summaryCard}>
          <textarea
            className={styles.reviewDescription}
            value={draft.description}
            onChange={(e) => onUpdateDraft({ description: e.target.value })}
            placeholder="Describe the issue…"
            rows={4}
            aria-label="Description"
          />
        </div>
      </div>

      <div className={styles.reviewSection}>
        <div className={styles.reviewSectionLabel}>Preferred Visit Window (optional)</div>
        <div className={styles.visitWindowRow}>
          <input
            type="date"
            className={styles.reviewDateInput}
            value={draft.preferredDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => onUpdateDraft({ preferredDate: e.target.value })}
            aria-label="Preferred visit date"
          />
          <div className={styles.segmented}>
            {dateOptions.map((opt) => {
              return (
                <button
                  key={opt.label}
                  type="button"
                  className={`${styles.segmentedBtn} ${
                    opt.value === draft.preferredDate ? styles.segmentedBtnActive : ""
                  }`}
                  onClick={() => onUpdateDraft({ preferredDate: opt.value })}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <p className={styles.visitWindowNote}>Technician visits occur 8am–8pm.</p>
      </div>

      <div className={styles.reviewSection}>
        <div className={styles.reviewSectionLabel}>Urgency Level</div>
        <div className={styles.urgencyGrid}>
          {URGENCY_LEVELS.map(({ level, description, dot }) => {
            const active = draft.urgency.toLowerCase() === level.toLowerCase();
            return (
              <button
                key={level}
                type="button"
                className={`${styles.urgencyCard} ${active ? styles.urgencyCardActive : ""}`}
                aria-pressed={active}
                onClick={() => onUpdateDraft({ urgency: level })}
              >
                <span className={styles.urgencyCardTop}>
                  <span className={styles.gatheredChipDot} style={{ background: dot }} aria-hidden="true" />
                  {level}
                </span>
                <span className={styles.urgencyCardDesc}>{description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.reviewSection}>
        <div className={styles.reviewSectionLabel}>Photo &amp; Video Attachments</div>
        <div className={styles.reviewAttachmentsGrid}>
          {attachments.map((a, i) => (
            <div key={a.previewUrl} className={styles.reviewAttachmentThumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.previewUrl} alt="" />
              <button
                type="button"
                className={styles.attachmentRemove}
                aria-label="Remove attachment"
                onClick={() => onRemoveAttachment(i)}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        {attachments.length < maxAttachments ? (
          <div
            className={styles.dropzone}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
          >
            <ImagePlus size={18} aria-hidden="true" />
            <span>Add photos or drag files here to assist the technician</span>
            <span className={styles.dropzoneNote}>PNG, JPG up to 25MB</span>
          </div>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAttachImage(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className={styles.reviewSection}>
        <div className={styles.reviewSectionLabel}>Access Permission &amp; Entry Notes</div>
        <label className={styles.entryCheckboxRow}>
          <input
            type="checkbox"
            checked={draft.entryPermission}
            onChange={(e) => onUpdateDraft({ entryPermission: e.target.checked })}
          />
          <span>
            <span className={styles.entryCheckboxTitle}>Permission to enter if resident is not home</span>
            <span className={styles.entryCheckboxDesc}>
              TownSync maintenance staff may use the master key to enter your unit if no one
              answers the door.
            </span>
          </span>
        </label>
        {draft.entryPermission ? (
          <input
            className={styles.entryNotesInput}
            value={draft.entryNotes}
            onChange={(e) => onUpdateDraft({ entryNotes: e.target.value })}
            placeholder="Optional notes for technician (e.g. dog is crated, use side entry code)…"
            aria-label="Entry notes"
          />
        ) : null}
      </div>

      {submitError ? (
        <p className={styles.errorBanner} role="alert">
          {submitError}
        </p>
      ) : null}
      </div>

      <div className={styles.reviewFooterWrap}>
        <div className={styles.reviewFooter}>
          <div className={`${styles.readyIndicator} ${ready ? styles.readyIndicatorDone : ""}`}>
            {ready
              ? "Ready for dispatch submission · Estimated confirmation within 30 minutes."
              : `${requiredFilled} / 3 required details complete`}
          </div>
          <div className={styles.reviewFooterActions}>
            <button type="button" className={styles.reviewBtnSecondary} onClick={onDiscard}>
              <span className={styles.hideOnPhone}>Cancel &amp; </span>Discard
            </button>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={onSubmit}
              disabled={submitting || !ready}
            >
              {submitting ? (
                "Submitting…"
              ) : (
                <>
                  Submit <span className={styles.hideOnPhone}>Maintenance </span>Request
                </>
              )}{" "}
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>

        <p className={styles.trustBar}>
          Insured &amp; Verified Contractors · Secure Resident Information · 24/7 Audit History
        </p>
      </div>
    </div>
  );
}

export default ReviewBrief;
