import styles from "../../../../styles/roles/security.module.css";

export default function SecurityDashboardPage() {
  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Security Console</p>
        <h1 className={styles.title}>Verify visitor access at the gate</h1>
        <p className={styles.description}>
          Scan QR credentials, confirm approvals, and keep entry records synchronized.
        </p>
      </header>
    </section>
  );
}