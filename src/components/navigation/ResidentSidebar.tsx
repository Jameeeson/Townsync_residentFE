"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Menu,
  LayoutDashboard,
  Settings,
  Ticket,
  X,
  Wrench,
} from "lucide-react";
import styles from "@/styles/dashboard.module.css";

const navItems = [
  { href: "/resident", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/resident/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/resident/visitors", label: "Visitor Passes", icon: Ticket },
  { href: "/resident/billing", label: "Billing", icon: CreditCard },
  { href: "/resident/settings", label: "Settings", icon: Settings },
];

export function ResidentSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.mobileSidebarToggle}
        onClick={() => setMobileOpen((current) => !current)}
        aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div
        className={`${styles.mobileSidebarBackdrop} ${mobileOpen ? styles.mobileSidebarBackdropOpen : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>T</div>
          <div className={styles.brandText}>
            TownSync
            <br />
            Resident Portal
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.user}>
          <div className={styles.avatar} />
          <div className={styles.userInfo}>
            <div className={styles.userName}>John Smith</div>
            <div className={styles.userUnit}>Unit 42</div>
          </div>
        </div>
      </aside>
    </>
  );
}
