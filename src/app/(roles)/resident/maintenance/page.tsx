import styles from "@/styles/maintenance.module.css";
import { MaintenanceWorkspace } from "@/components/maintenance/MaintenanceWorkspace";

export default function MaintenancePage() {
  return (
    <div className={styles.container}>
      <header className={`${styles.pageHeader} ts-fade-in-up`}>
        <h1 className={styles.pageTitle}>Maintenance</h1>
        <p className={styles.pageDesc}>Report an issue and track every request in one place.</p>
      </header>

      <MaintenanceWorkspace />
    </div>
  );
}
