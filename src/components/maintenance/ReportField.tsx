import { Check } from "lucide-react";
import styles from "@/styles/maintenance.module.css";

interface ReportFieldProps {
  index: number;
  label: string;
  value: string | null;
  collected: boolean;
}

export function ReportField({ index, label, value, collected }: ReportFieldProps) {
  return (
    <div className={styles.fieldRow}>
      <div className={styles.fieldIndex}>
        <span className={styles.fieldIndexNumber}>{String(index).padStart(2, "0")}</span>
        <span className={`${styles.fieldMark} ${collected ? styles.fieldMarkDone : ""}`}>
          {collected ? <Check size={11} aria-hidden="true" /> : null}
        </span>
      </div>
      <div className={styles.fieldBody}>
        <div className={styles.fieldLabel}>{label}</div>
        <div
          key={collected ? "filled" : "empty"}
          className={
            collected
              ? `${styles.fieldValue} ${styles.fieldValueArrive}`
              : `${styles.fieldValue} ${styles.fieldValuePending}`
          }
        >
          {collected ? value : "Not yet provided"}
        </div>
      </div>
    </div>
  );
}

export default ReportField;
