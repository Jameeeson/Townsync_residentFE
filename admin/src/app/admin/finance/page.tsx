import AdminShell from "../../../components/admin/admin-shell";
import styles from "../../../components/admin/admin-shell.module.css";

export default function FinancePage() {
  return (
    <AdminShell>
      <section className={styles.contentGrid}>
        <article className={styles.panel}>
          <p className={styles.panelLabel}>Current section</p>
          <h3>Finance</h3>
          <p>Review payments, reconcile accounts, and monitor billing progress.</p>
          <div className={styles.panelList}>
            <div className={styles.listRow}>
              <span />
              <p>Review payment queue</p>
            </div>
            <div className={styles.listRow}>
              <span />
              <p>Resolve payment disputes</p>
            </div>
            <div className={styles.listRow}>
              <span />
              <p>Close monthly books</p>
            </div>
            <div className={styles.listRow}>
              <span />
              <p>Prepare billing summary</p>
            </div>
          </div>
        </article>

        <article className={styles.panelAccent}>
          <p className={styles.panelLabel}>Billing status</p>
          <h3>Reconcile early</h3>
          <p>
            Keep the finance team moving by clearing discrepancies before they roll into
            the next billing cycle.
          </p>
        </article>
      </section>
    </AdminShell>
  );
}