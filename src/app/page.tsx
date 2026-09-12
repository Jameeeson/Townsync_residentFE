import Link from "next/link";
import { Fragment } from "react";
import type { CSSProperties } from "react";
import { TopNav } from "@/components/navigation/TopNav";
import { HeroBackground } from "@/components/landing/HeroBackground";
import { IntroSequence } from "@/components/landing/IntroSequence";
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
      <IntroSequence />
      <header className={`${styles.heroBanner} ${styles.heroBannerHome}`}>
        <HeroBackground />
        <TopNav />

        <div className={`${styles.heroContent} ts-fade-in-up`}>
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

      <main>
        <section id="features" className={styles.featuresSection}>
          <h2 className={styles.sectionHeadingLeft}>Everything you need, in one place.</h2>
          <div className={`${styles.featuresGrid} ts-stagger`}>
            {features.map((f, i) => (
              <div
                key={f.title}
                className={styles.featureCard}
                style={{ "--ts-stagger-i": i } as CSSProperties}
              >
                <div className={styles.iconWrapper} aria-hidden="true">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.howItWorks}>
          <h2 className={styles.sectionHeadingCenter}>How It Works</h2>
          <div className={`${styles.stepsRow} ts-stagger`}>
            {steps.map((s, i) => (
              <Fragment key={s.title}>
                {i > 0 ? <div className={styles.stepConnector} aria-hidden="true" /> : null}
                <div
                  className={styles.stepCard}
                  style={{ "--ts-stagger-i": i } as CSSProperties}
                >
                  <div className={styles.stepNumber} aria-hidden="true">{s.idx}</div>
                  <p>{s.title}</p>
                </div>
              </Fragment>
            ))}
          </div>
        </section>
      </main>

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