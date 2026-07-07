import Link from "next/link";
import styles from "@/styles/dashboard.module.css";

export default function ResidentDashboardPage() {
  return (
    <>
      <section className={styles.welcomeCard}>
        <div>
          <h1 className={styles.welcomeTitle}>Welcome back, James!</h1>
          <p className={styles.welcomeUnit}>Unit: Block 4, Lot 12</p>
        </div>
        <div className={styles.welcomeActions}>
          <Link className={styles.btnPrimary} href="/resident/maintenance">
            Report Issue
          </Link>
          <Link className={styles.btnOutline} href="/resident/visitors">
            Generate Visitor Pass
          </Link>
        </div>
      </section>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Outstanding Dues</h2>
          <p className={styles.duesAmount}>₱1,500</p>
          <p className={styles.duesStatus}>Payment due this week</p>
          <div className={styles.duesNote}>Please pay at the admin office.</div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Active Tickets</h2>
          <div className={styles.ticketList}>
            <div className={styles.ticketRow}>
              <div>
                <p className={styles.ticketTitle}>Plumbing Issue - Kitchen Sink</p>
                <p className={styles.ticketDate}>Reported: Oct 24, 2023</p>
              </div>
              <span className={`${styles.badge} ${styles.badgePending}`}>Pending</span>
            </div>
            <div className={styles.ticketRow}>
              <div>
                <p className={styles.ticketTitle}>Electrical - Hallway Light</p>
                <p className={styles.ticketDate}>Reported: Oct 20, 2023</p>
              </div>
              <span className={`${styles.badge} ${styles.badgeResolved}`}>Resolved</span>
            </div>
          </div>
        </div>
      </div>

      <section className={styles.card}>
        <div className={styles.announcementsHeader}>
          <h2>Recent Announcements</h2>
          <Link className={styles.viewAll} href="#">
            View All
          </Link>
        </div>
        <div className={styles.announcementGrid}>
          <div className={styles.announcementCard}>
            <h3>Scheduled Water Interruption</h3>
            <p>
              Water supply will be interrupted on Nov 5th from 9 AM to 3 PM for pipe maintenance.
            </p>
            <span className={styles.announcementDate}>Posted: Today</span>
          </div>
          <div className={styles.announcementCard}>
            <h3>Community Clean-up Drive</h3>
            <p>
              Join us this Saturday at 8 AM for our monthly community clean-up drive.
            </p>
            <span className={styles.announcementDate}>Posted: Yesterday</span>
          </div>
        </div>
      </section>
    </>
  );
}
