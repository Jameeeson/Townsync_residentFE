"use client";

import { FormEvent, KeyboardEvent, useRef } from "react";
import type { CSSProperties } from "react";
import { ArrowUp, Plus, X } from "lucide-react";
import styles from "@/styles/maintenance.module.css";
import type { ChatAttachment } from "@/hooks/useMaintenanceChat";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  suggestedOptions: string[];
  onPickSuggestedOption: (text: string) => void;
  attachments: ChatAttachment[];
  onAttachImage: (file: File) => void;
  onRemoveAttachment: (index: number) => void;
  maxAttachments: number;
  placeholder?: string;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  disabled,
  suggestedOptions,
  onPickSuggestedOption,
  attachments,
  onAttachImage,
  onRemoveAttachment,
  maxAttachments,
  placeholder = "Tell me what's happening…",
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSend();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <div className={styles.composerArea}>
      {suggestedOptions.length > 0 ? (
        <div className={`${styles.optionRow} ts-stagger`}>
          {suggestedOptions.map((option, i) => (
            <button
              key={option}
              type="button"
              className={styles.optionChip}
              style={{ "--ts-stagger-i": i } as CSSProperties}
              onClick={() => onPickSuggestedOption(option)}
              disabled={disabled}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}

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

      <form onSubmit={handleSubmit}>
        <div className={styles.composerWrapper}>
          <button
            type="button"
            aria-label="Add photo"
            onClick={() => fileInputRef.current?.click()}
            className={styles.attachBtn}
            disabled={disabled || attachments.length >= maxAttachments}
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
            className={styles.composerField}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-label="Message TownCare AI"
          />
          <button
            type="submit"
            className={styles.composerSendBtn}
            aria-label="Send message"
            disabled={disabled || !value.trim()}
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </form>
      <p className={styles.composerHint}>
        For emergencies, please call the resident hotline instead of using this assistant.
      </p>
    </div>
  );
}

export default ChatComposer;
