"use client";

import { FormEvent, KeyboardEvent } from "react";
import type { CSSProperties } from "react";
import { AlertTriangle, ArrowUp } from "lucide-react";
import styles from "@/styles/maintenance.module.css";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  suggestedOptions: string[];
  onPickSuggestedOption: (text: string) => void;
  placeholder?: string;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  disabled,
  suggestedOptions,
  onPickSuggestedOption,
  placeholder = "Explain details, or choose an option above…",
}: ChatComposerProps) {
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

      <form onSubmit={handleSubmit}>
        <div className={styles.composerWrapper}>
          <input
            className={styles.composerField}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-label="Message TownSync AI"
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
        <AlertTriangle size={12} aria-hidden="true" />
        For emergencies threatening safety or active flooding, please call the Emergency Hotline
        immediately.
      </p>
    </div>
  );
}

export default ChatComposer;
