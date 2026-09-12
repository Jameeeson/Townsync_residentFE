import type { CSSProperties } from "react";
import styles from "@/styles/maintenance.module.css";
import type { UnderstoodItem } from "@/lib/maintenanceReport";

export function UnderstoodChips({ items }: { items: UnderstoodItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className={styles.understoodBlock}>
      <div className={styles.understoodLabel}>What I understand</div>
      <div className={`${styles.understoodChips} ts-stagger`}>
        {items.map((item, i) => (
          <span
            key={item.key}
            className={styles.understoodChip}
            style={{ "--ts-stagger-i": i } as CSSProperties}
          >
            <span className={styles.understoodChipLabel}>{item.label}</span>
            <span className={styles.understoodChipValue}>{item.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default UnderstoodChips;
