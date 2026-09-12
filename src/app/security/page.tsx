import Link from "next/link";
import type { CSSProperties } from "react";
import { TopNav } from "@/components/navigation/TopNav";
import { HeroBackground } from "@/components/landing/HeroBackground";
import sharedStyles from "@/styles/resident.module.css";
import styles from "@/styles/security.module.css";
import { QrCode, LogIn, ShieldCheck, Lock, Cpu, Shield } from 'lucide-react';

export default function SecurityPage() {
  return (
    <div className={sharedStyles.landing}>
      <header className={`${sharedStyles.heroBanner} ${sharedStyles.heroBannerHome}`}>
        <HeroBackground />
        <TopNav />
        <div className={`${sharedStyles.heroContent} ts-fade-in-up`}>
          <h1 className={sharedStyles.heroTitle}>Security for Your Community.</h1>
          <p className={sharedStyles.heroSubtitle}>
            TownSync combines encrypted access control, visitor verification, and audit-ready
            record keeping to help residents feel safe, protected, and private.
          </p>
          <div className={sharedStyles.heroCTAs}>
            <Link className={sharedStyles.primaryCTA} href="/login">
              Resident Login
            </Link>
            <Link className={sharedStyles.secondaryCTA} href="/">
              Back to Home
            </Link>
          </div>
        </div>
      </header>
      <main className={sharedStyles.howItWorks}>
        <section className={styles.ecosystemSection}>
        <h2 className={styles.sectionTitle}>Security Ecosystem</h2>

        <div className={`${styles.ecosystemContainer} ts-stagger`}>
          {/* Top Light Card */}
          <div className={styles.qrCard} style={{ "--ts-stagger-i": 0 } as CSSProperties}>
            <div className={styles.qrContent}>
              <QrCode className={styles.iconBlue} size={32} />
              <h3>QR-Based Visitor Verification</h3>
              <p>
                Residents can request visitor entry through the platform, which generates a QR 
                code upon administrative approval. Security personnel simply scan this QR code 
                to automatically record the visitor&apos;s entry and exit in the centralized database.
              </p>
              <div className={styles.tagRow}>
                <span className={styles.tag}>Timed Access</span>
                <span className={styles.tag}>Guest Logs</span>
                <span className={styles.tag}>Instant Alerts</span>
              </div>
            </div>
            {/* Simple CSS-based Shield shape for the background watermark */}
            <div className={styles.shieldWatermark}><Shield size={200} strokeWidth={0.5} /></div>
          </div>

          {/* Bottom Dark Blue Card */}
          <div className={styles.loggingCard} style={{ "--ts-stagger-i": 1 } as CSSProperties}>
            <LogIn size={32} />
            <h3>Digital Visitor Logging</h3>
            <p>
              Replaces vulnerable manual logbooks to prevent falsified identities, 
              incomplete records, and unauthorized physical access to the premises.
            </p>
          </div>
        </div>
      </section>

      {/* --- Section 2: Dark Data Section --- */}
      <section className={styles.darkSection}>
        <h2 className={styles.darkTitle}>Your Data, Under Lock and Key.</h2>
        
        <div className={`${styles.dataGrid} ts-stagger`}>
          {/* Card 1 */}
          <div className={styles.glassCard} style={{ "--ts-stagger-i": 0 } as CSSProperties}>
            <div className={styles.glassIconWrapper}><ShieldCheck size={20} /></div>
            <h3>Role-Based Access Control (RBAC)</h3>
            <p>
              Limits system access based on specific job descriptions, ensuring security guards
              only access visitor logs while administrative staff manage billing and requests.
            </p>
          </div>

          {/* Card 2 */}
          <div className={styles.glassCard} style={{ "--ts-stagger-i": 1 } as CSSProperties}>
            <div className={styles.glassIconWrapper}><Lock size={20} /></div>
            <h3>Encrypted Credentials</h3>
            <p>
              Account credentials are secured using industry-standard hashing algorithms like
              bcrypt or SHA-256 to prevent unauthorized access.
            </p>
          </div>

          {/* Card 3 (Centered Below) */}
          <div className={`${styles.glassCard} ${styles.centeredCard}`} style={{ "--ts-stagger-i": 2 } as CSSProperties}>
            <div className={styles.glassIconWrapper}><Cpu size={20} /></div>
            <h3>Agentic AI Triage</h3>
            <p>
              Our 24/7 maintenance chat is a core security feature. AI agents instantly triage 
              facility reports—like broken gates or failed lighting—ensuring critical repairs are 
              initiated immediately without human bottlenecks.
            </p>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className={styles.securityFooter}>
        <div className={styles.footerBrand}>
           <Shield size={18} /> TownSync
        </div>
        <div className={styles.footerLinks}>
           <a href="/privacy">Privacy Policy</a>
           <a href="/terms">Terms of Service</a>
           <a href="/cookies">Cookie Policy</a>
           <a href="/support">Support</a>
        </div>
        <div className={styles.footerCopyright}>
           © 2026 TownSync Property Management. All rights reserved.
        </div>
      </footer>
      </main>
    </div>
  );
}