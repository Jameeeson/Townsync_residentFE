import styles from "@/styles/maintenance.module.css";
import type { ChatMessageData } from "@/hooks/useMaintenanceChat";
import { UnderstoodChips } from "./UnderstoodChips";
import { parseServerDate } from "@/lib/datetime";

interface MessageMomentProps {
  message: ChatMessageData;
  isLatest: boolean;
  urgentNote?: string | null;
}

function formatTime(iso: string): string {
  try {
    return parseServerDate(iso)?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) ?? "";
  } catch {
    return "";
  }
}

export function MessageMoment({ message, isLatest, urgentNote }: MessageMomentProps) {
  const entrance = isLatest ? "ts-fade-in-up" : "";

  if (message.role === "user") {
    return (
      <div className={`${styles.bubbleRow} ${styles.bubbleRowUser} ${entrance}`}>
        <div className={`${styles.bubble} ${styles.bubbleUser}`}>
          <p className={styles.bubbleText}>{message.text}</p>
        </div>
        <span className={styles.bubbleTimestamp}>{formatTime(message.timestamp)}</span>
      </div>
    );
  }

  const highlight = isLatest && !message.isError;

  return (
    <div className={`${styles.bubbleRow} ${styles.bubbleRowAi} ${entrance}`}>
      <div
        className={`${styles.bubble} ${styles.bubbleAi} ${highlight ? styles.bubbleAiHighlight : ""} ${
          message.isError ? styles.bubbleAiError : ""
        }`}
      >
        {highlight ? <div className={styles.diagnosticClarificationLabel}>Diagnostic Clarification</div> : null}
        <p className={styles.bubbleText}>{message.text}</p>
        {highlight && urgentNote ? <p className={styles.bubbleUrgentNote}>{urgentNote}</p> : null}
        {message.understood?.length ? <UnderstoodChips items={message.understood} /> : null}
      </div>
      <span className={styles.bubbleTimestamp}>TownSync AI · {formatTime(message.timestamp)}</span>
    </div>
  );
}

export default MessageMoment;
