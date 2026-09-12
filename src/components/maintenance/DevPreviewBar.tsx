"use client";

import styles from "@/styles/maintenance.module.css";

interface DevPreviewBarProps {
  onPreview: (target: "review" | "success") => void;
}

/**
 * Development-only affordance to jump straight to the review/success layouts without a
 * live AI backend. Never rendered in a production build.
 */
export function DevPreviewBar({ onPreview }: DevPreviewBarProps) {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className={styles.devBar}>
      <span className={styles.devBarLabel}>Dev preview</span>
      <button type="button" className={styles.devBarBtn} onClick={() => onPreview("review")}>
        Review phase
      </button>
      <button type="button" className={styles.devBarBtn} onClick={() => onPreview("success")}>
        Success phase
      </button>
      <button type="button" className={styles.devBarBtn} onClick={() => window.location.reload()}>
        Reset
      </button>
    </div>
  );
}

export default DevPreviewBar;
