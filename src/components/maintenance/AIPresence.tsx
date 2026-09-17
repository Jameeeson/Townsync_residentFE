import styles from "@/styles/maintenance.module.css";

interface AIPresenceProps {
  state?: "idle" | "thinking";
  size?: number;
}

/**
 * TownSync AI's visual identity: a small signal mark rather than a mascot or bot icon.
 * Idle = slow breathing pulse. Thinking = tighter, faster rotation while a reply is composing.
 */
export function AIPresence({ state = "idle", size = 36 }: AIPresenceProps) {
  return (
    <span
      className={`${styles.presence} ${state === "thinking" ? styles.presenceThinking : ""}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label={state === "thinking" ? "TownSync AI is thinking" : "TownSync AI"}
    >
      <span className={styles.presenceRing} aria-hidden="true" />
      <span className={styles.presenceCore} aria-hidden="true" />
    </span>
  );
}

export default AIPresence;
