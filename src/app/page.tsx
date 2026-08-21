import Link from "next/link";
import { TopNav } from "@/components/navigation/TopNav";
import styles from "@/styles/resident.module.css";
import { Wrench, QrCode, FileText, Megaphone } from 'lucide-react';
const features = [
  {
    title: "Smart Maintenance",
    description: "Report and track facility issues in real-time.",
    icon: <Wrench size={20} />
  },
  {
    title: "QR Visitor Access",
    description: "Generate secure, temporary passes for your guests.",
    icon: <QrCode size={20} />
  },
  {
    title: "Centralized Billing",
    description: "Keep track of dues and payment history effortlessly.",
    icon: <FileText size={20} />
  },
  {
    title: "Community Board",
    description: "Stay updated with instant management announcements.",
    icon: <Megaphone size={20} />
  }
];

const steps = [
  { idx: 1, title: "Get Verified by Admin" },
  { idx: 2, title: "Access Your Dashboard" },
  { idx: 3, title: "Connect with Your Community" }
];

export default function Home() {
  return (
    <div className={styles.landing}>
      <header className={styles.heroBanner}>
        <TopNav />

        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Smarter Community Living. Seamless Operations.</h1>
          <p className={styles.heroSubtitle}>
            The all-in-one centralized platform designed to enhance communication, streamline
            maintenance, and secure your townhouse community.
          </p>

          <div className={styles.heroCTAs}>
            <Link className={styles.primaryCTA} href="/about">
              Learn More
            </Link>
            <Link className={styles.secondaryCTA} href="/security">
              View Security
            </Link>
          </div>
        </div>
      </header>

      <section id="features" className={styles.featuresSection}>
        <h2 className={styles.sectionHeadingLeft}>Everything you need, in one place.</h2>
        <div className={styles.featuresGrid}>
          {features.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.iconWrapper}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.howItWorks}>
        <h2 className={styles.sectionHeadingCenter}>How It Works</h2>
        <div className={styles.stepsRow}>
          {steps.map((s) => (
            <div key={s.title} className={styles.stepCard}>
              <div className={styles.stepNumber}>{s.idx}</div>
              <p>{s.title}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className={styles.siteFooter}>
        <div className={styles.footerContent}>
          <div className={styles.footerLeft}>
            <div className={styles.footerBrand}>TownSync</div>
            <div className={styles.copyright}>
              © 2026 TownSync Operations Platform. Built for modern townhouse communities.
            </div>
          </div>
          <div className={styles.footerLinks}>
            <a href="/support">Contact Management</a>
            <a href="/support">Help Center</a>
            <a href="/terms">Terms of Service</a>
            <a href="/privacy">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}