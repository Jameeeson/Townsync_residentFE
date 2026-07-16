import AdminShell from "../../../components/admin/admin-shell";
import styles from "../../../components/admin/admin-shell.module.css";

export default function ResidentsPage() {
  return (
    <AdminShell>
      <section className={styles.contentGrid}>
        <article className={styles.panel}>
          <p className={styles.panelLabel}>Current section</p>
          <h3>Residents</h3>
          <p>Publish notices, answer requests, and keep resident communication organized.</p>
          <div className={styles.panelList}>
            <div className={styles.listRow}>
              <span />
              <p>Review support requests</p>
            </div>
            <div className={styles.listRow}>
              <span />
              <p>Prepare community notices</p>
            </div>
            <div className={styles.listRow}>
              <span />
              <p>Track community replies</p>
            </div>
            <div className={styles.listRow}>
              <span />
              <p>Send resident updates</p>
            </div>
          </div>
        </article>

        <article className={styles.panelAccent}>
          <p className={styles.panelLabel}>Resident care</p>
          <h3>Clear communication</h3>
          <p>
            Keep the resident experience organized with notices, response tracking, and
            follow-up visibility.
          </p>
        </article>
      </section>
    </AdminShell>
  );
}