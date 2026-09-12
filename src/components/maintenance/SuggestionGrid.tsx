"use client";

import type { CSSProperties } from "react";
import { Droplet, Lightbulb, Lock, Wind } from "lucide-react";
import styles from "@/styles/maintenance.module.css";

const SUGGESTIONS: Array<{ icon: typeof Droplet; text: string }> = [
  { icon: Droplet, text: "My kitchen sink is leaking" },
  { icon: Lightbulb, text: "The hallway lights are out" },
  { icon: Wind, text: "My air conditioner isn't cooling" },
  { icon: Lock, text: "My door lock is broken" },
];

export function SuggestionGrid({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className={`${styles.suggestionGrid} ts-stagger`} role="group" aria-label="Suggested reports">
      {SUGGESTIONS.map(({ icon: Icon, text }, i) => (
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
          <span className={styles.suggestionCardText}>{text}</span>
        </button>
      ))}
    </div>
  );
}

export default SuggestionGrid;
