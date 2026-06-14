import styles from "../../../styles/roles/admin.module.css";

export default function AdminDashboardPage() {
  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Admin Dashboard</p>
        <h1 className={styles.title}>Operations, billing, and maintenance oversight</h1>
        <p className={styles.description}>
          Monitor the residential system, review announcements, and manage high-priority workflows.
        </p>
      </header>
    </section>
  );
}