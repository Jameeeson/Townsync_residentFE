import styles from "../../../styles/roles/resident.module.css";

export default function ResidentDashboardPage() {
  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Resident Portal</p>
        <h1 className={styles.title}>Billing, visitors, and maintenance requests</h1>
        <p className={styles.description}>
          Submit concerns, track invoices, and coordinate access for guests from one place.
        </p>
      </header>
    </section>
  );
}