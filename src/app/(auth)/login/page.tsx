import styles from "../../../styles/auth.module.css";

export default function LoginPage() {
  return (
    <main className={styles.authShell}>
      <section className={styles.authCard}>
        <div className={styles.authStack}>
          <div className={styles.authBadge}>TownSync</div>
          <h1 className={styles.authTitle}>Sign in to your residential workspace</h1>
          <p className={styles.authCopy}>
            Access the admin console, resident portal, security gate tools, or maintenance queue.
          </p>

          <form className={styles.authForm}>
            <label className={styles.field}>
              <span>Email</span>
              <input type="email" name="email" placeholder="name@townsync.com" />
            </label>

            <label className={styles.field}>
              <span>Password</span>
              <input type="password" name="password" placeholder="Enter your password" />
            </label>

            <button className={styles.primaryButton} type="submit">
              Sign in
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}