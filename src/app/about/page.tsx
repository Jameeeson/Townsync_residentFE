import Link from "next/link";
import type { CSSProperties } from "react";
import { TopNav } from "@/components/navigation/TopNav";
import { HeroBackground } from "@/components/landing/HeroBackground";
import sharedStyles from "@/styles/resident.module.css";
import styles from "@/styles/about.module.css";
import { Sparkles, Paintbrush, Network, Eye, Zap, Users } from 'lucide-react';
export default function AboutPage() {
  return (
    <div className={sharedStyles.landing}>
      <header className={`${sharedStyles.heroBanner} ${sharedStyles.heroBannerHome}`}>
        <HeroBackground />
        <TopNav />
        <div className={`${sharedStyles.heroContent} ts-fade-in-up`}>
          <h1 className={sharedStyles.heroTitle}>Modernizing Community Management.</h1>
          <p className={sharedStyles.heroSubtitle}>
            TownSync helps townhouse communities coordinate maintenance, communication, and
            resident services in one modern platform.
          </p>
          <div className={sharedStyles.heroCTAs}>
            <Link className={sharedStyles.primaryCTA} href="/security">
              Explore Security
            </Link>
            <Link className={sharedStyles.secondaryCTA} href="/">
              Back to Home
            </Link>
          </div>
        </div>
      </header>
      <section className={sharedStyles.howItWorks}>
        <section className={styles.missionSection}>
        <div className={styles.missionText}>
          <h2 className={styles.missionTitle}>Our Mission</h2>
          <p>
            To provide a centralized and intelligent townhouse management platform 
            capable of improving operational efficiency, communication coordination, 
            and administrative processes within residential communities.
          </p>
          <div className={styles.missionBadge}>
            <span className={styles.line}></span>
            EFFICIENCY REDEFINED
          </div>
        </div>

        <div className={styles.missionVisual}>
          <div className={`${styles.missionGrid} ts-stagger`}>
            <div className={styles.whiteCard} style={{ "--ts-stagger-i": 0 } as CSSProperties}>
              <Sparkles className={styles.iconBlue} size={28} />
              <h3>AI-Driven</h3>
              <p>Automating complex workflow priorities with precision, including our 24/7 Agentic Maintenance Chat for instant resident support.</p>
            </div>
            <div className={styles.blueCard} style={{ "--ts-stagger-i": 1 } as CSSProperties}>
              <Paintbrush className={styles.iconWhite} size={28} />
              <h3>Intuitive Design</h3>
              <p>Crafting experiences that feel natural and effortless.</p>
            </div>
            <div className={`${styles.whiteCard} ${styles.wideCard}`} style={{ "--ts-stagger-i": 2 } as CSSProperties}>
               <div className={styles.wideCardContent}>
                  <div>
                    <h3 className={styles.greenText}>Scalable Infrastructure</h3>
                    <p className={styles.greenTextSub}>Built to grow with your community, from 10 to 100 units.</p>
                  </div>
                  <Network className={styles.iconGreen} size={28} />
               </div>
            </div>
          </div>
        </div>
      </section>
      </section>

      {/* Core Values Section */}
      <section className={styles.valuesSection}>
        <div className={styles.valuesHeader}>
          <h2>Core Values</h2>
          <p>The principles that guide every line of code we write.</p>
        </div>

        <div className={`${styles.valuesGrid} ts-stagger`}>
          <div className={sharedStyles.featureCard} style={{ "--ts-stagger-i": 0 } as CSSProperties}>
            <div className={sharedStyles.iconWrapper}><Eye size={20} /></div>
            <h3>Transparency</h3>
            <p>Real-time data access for all stakeholders. No hidden fees, no opaque processes.</p>
          </div>
          <div className={sharedStyles.featureCard} style={{ "--ts-stagger-i": 1 } as CSSProperties}>
            <div className={sharedStyles.iconWrapper}><Zap size={20} /></div>
            <h3>Efficiency</h3>
            <p>Doing more with less. We optimize every touchpoint to save time and resources.</p>
          </div>
          <div className={sharedStyles.featureCard} style={{ "--ts-stagger-i": 2 } as CSSProperties}>
            <div className={sharedStyles.iconWrapper}><Users size={20} /></div>
            <h3>Security First</h3>
            <p>Strengthens community security procedures through real-time QR-based verification and automated entry tracking.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.aboutFooter}>
        <div className={styles.footerBrandSide}>
          <div className={sharedStyles.footerBrand}>TownSync</div>
          <p>© 2026 TownSync Property Management. All rights reserved.</p>
        </div>
        <div className={styles.footerLinkSide}>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
          <a href="/cookies">Cookie Policy</a>
          <a href="/support">Support</a>
        </div>
      </footer>
    </div>
  );
}