import styles from "@/styles/maintenance.module.css";
import type { AiSummaryState } from "@/lib/api/resident";

interface GatheredBarProps {
  summaryState: AiSummaryState | null;
}

const CHIP_DEFS: Array<{ key: keyof AiSummaryState | "problem"; label: string }> = [
  { key: "category", label: "Category" },
  { key: "location", label: "Location" },
  { key: "problem", label: "Problem" },
  { key: "urgency_level", label: "Urgency" },
];

function urgencyDotColor(level: string | null): string | null {
  if (!level) return null;
  if (/emergency/i.test(level)) return "var(--color-danger-600)";
  if (/high/i.test(level)) return "var(--color-warning-600)";
  if (/medium/i.test(level)) return "var(--color-primary-600)";
  return "var(--color-text-tertiary)";
}

export function GatheredBar({ summaryState }: GatheredBarProps) {
  const confidencePct =
    summaryState?.confidence_score != null ? Math.round(summaryState.confidence_score * 100) : null;

  return (
    <div className={styles.gatheredBar}>
      <span className={styles.gatheredBarLabel}>What I&apos;ve gathered so far</span>
      <div className={styles.gatheredChips}>
        {CHIP_DEFS.map(({ key, label }) => {
          const value =
            key === "problem" ? summaryState?.subject ?? null : (summaryState?.[key] as string | null) ?? null;
          const dot = key === "urgency_level" ? urgencyDotColor(value) : null;
          return (
            <span key={key} className={styles.gatheredChip}>
              <span className={styles.gatheredChipLabel}>{label}</span>
              {dot ? <span className={styles.gatheredChipDot} style={{ background: dot }} aria-hidden="true" /> : null}
              <span className={value ? styles.gatheredChipValue : styles.gatheredChipValuePending}>
                {value ?? "Pending"}
              </span>
            </span>
          );
        })}
        {confidencePct != null ? (
          <span className={styles.gatheredConfidence}>Confidence {confidencePct}%</span>
        ) : null}
      </div>
    </div>
  );
}

export default GatheredBar;
