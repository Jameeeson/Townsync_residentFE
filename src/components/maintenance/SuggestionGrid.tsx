"use client";

import type { CSSProperties } from "react";
import { Droplet, Lightbulb, Lock, Snowflake } from "lucide-react";
import styles from "@/styles/maintenance.module.css";

const SUGGESTIONS: Array<{ icon: typeof Droplet; text: string; subtitle: string }> = [
  { icon: Droplet, text: "My kitchen sink is leaking", subtitle: "Plumbing · Urgent priority" },
  { icon: Lightbulb, text: "The hallway lights are out", subtitle: "Electrical · Corridor" },
  { icon: Snowflake, text: "My A/C isn't cooling properly", subtitle: "HVAC · Climate unit" },
  { icon: Lock, text: "My door lock is broken", subtitle: "Security · Access hardware" },
];

export function SuggestionGrid({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className={`${styles.suggestionGrid} ts-stagger`} role="group" aria-label="Suggested reports">
      {SUGGESTIONS.map(({ icon: Icon, text, subtitle }, i) => (
        <button
          key={text}
          type="button"
          className={styles.suggestionCard}
          style={{ "--ts-stagger-i": i } as CSSProperties}
          onClick={() => onPick(text)}
        >
          <span className={styles.suggestionCardIcon}>
            <Icon size={15} aria-hidden="true" />
          </span>
          <span className={styles.suggestionCardBody}>
            <span className={styles.suggestionCardText}>{text}</span>
            <span className={styles.suggestionCardSubtitle}>{subtitle}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export default SuggestionGrid;
