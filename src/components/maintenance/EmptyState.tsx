"use client";

import { FormEvent, KeyboardEvent, useRef } from "react";
import { ArrowUp, Plus, X } from "lucide-react";
import styles from "@/styles/maintenance.module.css";
import type { ChatAttachment } from "@/hooks/useMaintenanceChat";
import { AIPresence } from "./AIPresence";
import { SuggestionGrid } from "./SuggestionGrid";

interface EmptyStateProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  attachments: ChatAttachment[];
  onAttachImage: (file: File) => void;
  onRemoveAttachment: (index: number) => void;
  maxAttachments: number;
}

export function EmptyState({
  value,
  onChange,
  onSubmit,
  attachments,
  onAttachImage,
  onRemoveAttachment,
  maxAttachments,
}: EmptyStateProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
  }

  function handlePickSuggestion(text: string) {
    onChange(text);
    inputRef.current?.focus();
  }

  return (
    <div className={`${styles.workspaceEmpty} ts-fade-in-up`}>
      <AIPresence size={56} />
      <p className={styles.emptyEyebrow}>TownCare AI</p>
      <h2 className={styles.emptyTitle}>Maintenance, simplified.</h2>
      <p className={styles.emptySubtitle}>
        Tell us what&apos;s wrong, in your own words. We&apos;ll ask what we need to know and
        build the report for you.
      </p>

      {attachments.length > 0 ? (
        <div className={styles.attachmentPreviews}>
          {attachments.map((attachment, i) => (
            <div key={attachment.previewUrl} className={styles.attachmentThumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={attachment.previewUrl} alt="" />
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
      ) : null}

      <form className={styles.emptyForm} onSubmit={handleSubmit}>
        <div className={styles.emptyInputWrapper}>
          <button
            type="button"
            aria-label="Add photo"
            onClick={() => fileInputRef.current?.click()}
            className={styles.attachBtn}
            disabled={attachments.length >= maxAttachments}
          >
            <Plus size={17} />
          </button>
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
          <input
            ref={inputRef}
            className={styles.emptyInputField}
            placeholder="Tell us what happened…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            aria-label="Describe what's happening"
          />
          <button type="submit" className={styles.emptySendBtn} aria-label="Start" disabled={!value.trim()}>
            <ArrowUp size={16} />
          </button>
        </div>
      </form>

      <p className={styles.suggestionGridLabel}>Suggested reports</p>
      <SuggestionGrid onPick={handlePickSuggestion} />
    </div>
  );
}

export default EmptyState;
