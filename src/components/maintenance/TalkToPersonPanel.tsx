import { AlertTriangle, Loader2, UserRound, X } from "lucide-react";
import styles from "@/styles/maintenance.module.css";

interface TalkToPersonPanelProps {
  visible: boolean;
  emergency: boolean;
  escalating: boolean;
  escalateError: string;
  onEscalate: () => void;
  /** Lets the resident close the banner, e.g. when it was a misunderstanding or a test. */
  onDismiss?: () => void;
}

export function TalkToPersonPanel({
  visible,
  emergency,
  escalating,
  escalateError,
  onEscalate,
  onDismiss,
}: TalkToPersonPanelProps) {
  if (!visible) return null;

  return (
    <div
      className={`${styles.talkToPerson} ${emergency ? styles.talkToPersonEmergency : ""} ts-fade-in-up`}
      role={emergency ? "alert" : undefined}
    >
      <div className={styles.talkToPersonText}>
        {emergency ? (
          <>
            <AlertTriangle size={15} aria-hidden="true" />
            <span>This sounds urgent. Skip the rest of the questions and talk to a person now.</span>
          </>
        ) : (
          <>
            <UserRound size={15} aria-hidden="true" />
            <span>Not getting anywhere with the assistant? Talk to a person instead.</span>
          </>
        )}
      </div>
      <button
        type="button"
        className={emergency ? styles.talkToPersonBtnEmergency : styles.talkToPersonBtn}
        onClick={onEscalate}
        disabled={escalating}
      >
        {escalating ? (
          <>
            <Loader2 size={14} className="ts-spin" aria-hidden="true" /> Connecting you…
          </>
        ) : (
          "Talk to a Person"
        )}
      </button>
      {onDismiss ? (
        <button type="button" className={styles.talkToPersonDismiss} onClick={onDismiss} aria-label="Dismiss this notice">
          <X size={14} aria-hidden="true" />
        </button>
      ) : null}
      {escalateError ? (
        <p className={styles.talkToPersonError} role="alert">
          {escalateError}
        </p>
      ) : null}
    </div>
  );
}

export default TalkToPersonPanel;
