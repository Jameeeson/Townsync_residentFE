"use client";

import { useEffect, useState } from "react";
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
import { fetchMe } from "@/lib/api/auth";
import { getAccessToken } from "@/lib/apiClient";

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
  const [fullName, setFullName] = useState("Resident");
  const [unit, setUnit] = useState("—");

  useEffect(() => {
    if (!getAccessToken()) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        setFullName(me.full_name || me.email || "Resident");
        setUnit(me.unit_number || "—");
      } catch {
        // keep defaults when unauthenticated / API down
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

        <Link
          href="/resident/settings"
          className={styles.user}
          onClick={() => setMobileOpen(false)}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className={styles.avatar} />
          <div className={styles.userInfo}>
            <div className={styles.userName}>{fullName}</div>
            <div className={styles.userUnit}>{unit}</div>
          </div>
        </Link>
      </aside>
    </>
  );
}
