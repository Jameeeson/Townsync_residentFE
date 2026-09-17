"use client";

import { FormEvent, KeyboardEvent, useRef } from "react";
import { ArrowUp } from "lucide-react";
import styles from "@/styles/maintenance.module.css";
import { AIPresence } from "./AIPresence";
import { SuggestionGrid } from "./SuggestionGrid";

interface EmptyStateProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function EmptyState({ value, onChange, onSubmit }: EmptyStateProps) {
  const inputRef = useRef<HTMLInputElement>(null);

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
      <p className={styles.emptyEyebrow}>TownSync AI Diagnostic Assistant</p>
      <h2 className={styles.emptyTitle}>
        Maintenance, <em>simplified.</em>
      </h2>
      <p className={styles.emptySubtitle}>
        Tell us what&apos;s wrong, in your own words. We&apos;ll ask what we need to know and
        build the complete work order for building management.
      </p>

      <form className={styles.emptyForm} onSubmit={handleSubmit}>
        <div className={styles.emptyInputWrapper}>
          <input
            ref={inputRef}
            className={styles.emptyInputField}
            placeholder="Tell us what happened… (e.g. 'The dishwasher is overflowing soapy water in 4B')"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            aria-label="Describe what's happening"
          />
          <span className={styles.emptyReturnHint}>Return</span>
          <button type="submit" className={styles.emptySendBtn} aria-label="Start" disabled={!value.trim()}>
            <ArrowUp size={16} />
          </button>
        </div>
      </form>

      <div className={styles.suggestionGridHeader}>
        <p className={styles.suggestionGridLabel}>Common quick-reports</p>
        <p className={styles.suggestionGridHint}>Click to autofill diagnostic</p>
      </div>
      <SuggestionGrid onPick={handlePickSuggestion} />
    </div>
  );
}

export default EmptyState;
