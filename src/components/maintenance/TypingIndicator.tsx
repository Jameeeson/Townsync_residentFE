import styles from "@/styles/maintenance.module.css";
import { AIPresence } from "./AIPresence";

export function TypingIndicator() {
  return (
    <div className={`${styles.moment} ${styles.momentAi}`} role="status" aria-label="TownCare AI is composing a reply">
      <div className={styles.momentLabel}>TownCare AI</div>
      <div className={styles.thinkingRow}>
        <AIPresence state="thinking" size={22} />
        <span className={styles.thinkingText}>Reading your message…</span>
      </div>
    </div>
  );
}

export default TypingIndicator;
