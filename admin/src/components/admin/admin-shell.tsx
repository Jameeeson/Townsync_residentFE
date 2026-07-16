"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { 
  LayoutGrid, 
  Users, 
  Briefcase, 
  Wrench, 
  UserSquare2, 
  Banknote, 
  HelpCircle, 
  LogOut,
  Building2,
  X
} from "lucide-react";
import TopNavBar from "./top-nav-bar";
import styles from "./admin-shell.module.css";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutGrid },
  { label: "Visitor Management", href: "/admin/visitor-management", icon: Users },
  { label: "Operations", href: "/admin/operations", icon: Briefcase },
  { label: "Maintenance", href: "/admin/maintenance", icon: Wrench },
  { label: "Residents", href: "/admin/residents", icon: UserSquare2 },
  { label: "Finance", href: "/admin/finance", icon: Banknote },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const signOut = () => void router.push("/");

  return (
    <div className={styles.pageShell}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        {/* Sidebar Header / Logo Section */}
        <div className={styles.sidebarHeader}>
          <div className={styles.logoRow}>
            <div className={styles.logoBox}>
              <Building2 size={20} color="white" />
            </div>
            <div className={styles.brandWrapper}>
              <h1 className={styles.brandName}>TownSync</h1>
              <p className={styles.brandSub}>Admin Portal</p>
            </div>
          </div>
          <button 
            className={styles.mobileClose} 
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className={styles.navList}>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                {isActive && <div className={styles.activeBar} />}
                <Icon size={20} className={styles.navIcon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className={styles.sidebarFooter}>
          <div className={styles.divider} />
          
          <Link href="/admin/support" className={styles.footerItem}>
            <HelpCircle size={20} />
            <span>Support</span>
          </Link>
          
          <button onClick={signOut} className={styles.footerItem}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div
        className={styles.backdrop}
        data-open={sidebarOpen}
        onClick={() => setSidebarOpen(false)}
      />

      <main className={styles.mainContent}>
        <TopNavBar onMenuOpen={() => setSidebarOpen(true)} />
        <section className={styles.contentInner}>{children}</section>
      </main>
    </div>
  );
}