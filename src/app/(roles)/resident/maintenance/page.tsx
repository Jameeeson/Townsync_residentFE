import styles from "@/styles/maintenance.module.css";
import { MaintenanceWorkspace } from "@/components/maintenance/MaintenanceWorkspace";

export default function MaintenancePage() {
  return (
    <div className={styles.container}>
      <header className={`${styles.pageHeader} ts-fade-in-up`}>
        <div>
          <div className={styles.pageEyebrow}>
            <span className={styles.pageEyebrowDot} aria-hidden="true" />
            Resident Services
          </div>
          <h1 className={styles.pageTitle}>Maintenance Requests</h1>
          <p className={styles.pageDesc}>
            Report property repairs, monitor service status in real-time, and converse with our AI
            diagnosis desk.
          </p>
        </div>
        <div className={styles.pageStatusPill}>
          <span className={styles.pageStatusDot} aria-hidden="true" />
          Typical response: &lt; 2 hours
        </div>
      </header>

      <MaintenanceWorkspace />
    </div>
  );
}
