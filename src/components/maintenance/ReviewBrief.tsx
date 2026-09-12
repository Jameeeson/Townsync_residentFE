"use client";

import { useRef } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import styles from "@/styles/maintenance.module.css";
import type { ChatAttachment, RequestDraft } from "@/hooks/useMaintenanceChat";

const URGENCY_LEVELS = ["Low", "Medium", "High", "Emergency"];

interface ReviewBriefProps {
  draft: RequestDraft;
  onUpdateDraft: (patch: Partial<RequestDraft>) => void;
  attachments: ChatAttachment[];
  onAttachImage: (file: File) => void;
  onRemoveAttachment: (index: number) => void;
  maxAttachments: number;
  onBackToConversation: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string;
}

export function ReviewBrief({
  draft,
  onUpdateDraft,
  attachments,
  onAttachImage,
  onRemoveAttachment,
  maxAttachments,
  onBackToConversation,
  onSubmit,
  submitting,
  submitError,
}: ReviewBriefProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requiredFilled = [draft.category, draft.description, draft.urgency].filter(Boolean).length;
  const ready = requiredFilled === 3;

  return (
    <div className={`${styles.reviewDoc} ts-fade-in-up`}>
      <button type="button" className={styles.reviewBack} onClick={onBackToConversation}>
        <ArrowLeft size={14} /> Continue the conversation
      </button>

      <div className={styles.reviewEyebrow}>Review your request</div>

      <input
        className={styles.reviewSubject}
        value={draft.subject}
        onChange={(e) => onUpdateDraft({ subject: e.target.value })}
        placeholder="Maintenance request"
        aria-label="Request subject"
      />

      <div className={styles.reviewMetaRow}>
        <input
          className={styles.reviewMetaInput}
          value={draft.category}
          onChange={(e) => onUpdateDraft({ category: e.target.value })}
          placeholder="Category"
          aria-label="Category"
        />
        <span className={styles.reviewMetaDivider}>•</span>
        <input
          className={styles.reviewMetaInput}
          value={draft.location}
          onChange={(e) => onUpdateDraft({ location: e.target.value })}
          placeholder="Location (optional)"
          aria-label="Location"
        />
      </div>

      <textarea
        className={styles.reviewDescription}
        value={draft.description}
        onChange={(e) => onUpdateDraft({ description: e.target.value })}
        placeholder="Describe the issue…"
        rows={4}
        aria-label="Description"
      />

      <div className={styles.reviewSection}>
        <div className={styles.reviewSectionLabel}>Urgency</div>
        <div className={styles.segmented}>
          {URGENCY_LEVELS.map((level) => {
            const active = draft.urgency.toLowerCase() === level.toLowerCase();
            return (
              <button
                key={level}
                type="button"
                className={`${styles.segmentedBtn} ${active ? styles.segmentedBtnActive : ""}`}
                aria-pressed={active}
                onClick={() => onUpdateDraft({ urgency: level })}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.reviewSection}>
        <div className={styles.reviewSectionLabel}>Attachments</div>
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
          {attachments.length < maxAttachments ? (
            <button
              type="button"
              className={styles.reviewAddAttachment}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Add photo"
            >
              <Plus size={18} />
            </button>
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
      </div>

      {submitError ? (
        <p className={styles.errorBanner} role="alert">
          {submitError}
        </p>
      ) : null}

      <div className={styles.reviewFooter}>
        <div className={`${styles.readyIndicator} ${ready ? styles.readyIndicatorDone : ""}`}>
          {ready ? "Ready to submit" : `${requiredFilled} / 3 required details complete`}
        </div>
        <button
          type="button"
          className={styles.submitBtn}
          onClick={onSubmit}
          disabled={submitting || !ready}
        >
          {submitting ? "Submitting…" : "Submit request"}
        </button>
      </div>
    </div>
  );
}

export default ReviewBrief;
