import styles from "@/styles/maintenance.module.css";
import { AIPresence } from "./AIPresence";

export function TypingIndicator() {
  return (
    <div className={`${styles.bubbleRow} ${styles.bubbleRowAi}`} role="status" aria-label="TownSync AI is composing a reply">
      <div className={`${styles.bubble} ${styles.bubbleAi}`}>
        <div className={styles.thinkingRow}>
          <AIPresence state="thinking" size={22} />
          <span className={styles.thinkingText}>Reading your message…</span>
        </div>
      </div>
    </div>
  );
}

export default TypingIndicator;
