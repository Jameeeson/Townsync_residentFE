import styles from "@/styles/maintenance.module.css";
import type { ChatMessageData } from "@/hooks/useMaintenanceChat";
import { UnderstoodChips } from "./UnderstoodChips";

interface MessageMomentProps {
  message: ChatMessageData;
  isLatest: boolean;
}

/**
 * An editorial "moment" rather than a chat bubble. The most recent AI turn is rendered as the
 * hero of the conversation (larger type); earlier turns recede into a quieter history above it.
 */
export function MessageMoment({ message, isLatest }: MessageMomentProps) {
  const entrance = isLatest ? "ts-fade-in-up" : "";

  if (message.role === "user") {
    return (
      <div className={`${styles.moment} ${styles.momentUser} ${entrance}`}>
        <p className={styles.momentUserText}>{message.text}</p>
      </div>
    );
  }

  return (
    <div
      className={`${styles.moment} ${styles.momentAi} ${isLatest ? styles.momentAiLatest : ""} ${entrance}`}
    >
      <div className={styles.momentLabel}>TownCare AI</div>
      <p
        className={`${styles.momentAiText} ${message.isError ? styles.momentAiTextError : ""} ${
          isLatest ? styles.momentAiTextHero : ""
        }`}
      >
        {message.text}
      </p>
      {message.understood?.length ? <UnderstoodChips items={message.understood} /> : null}
    </div>
  );
}

export default MessageMoment;
