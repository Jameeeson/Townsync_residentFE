"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
  MessageSquare,
  X
} from "lucide-react";
import TopNavBar from "./top-nav-bar";
import PostAlertPage from "./post-alert";
import { apiGet } from "../../lib/api";
import { ADMIN_ROLE } from "../../lib/auth";
import { logoutRequest } from "../../lib/api";
import { useIdleLogout } from "../../lib/use-idle-logout";
import { useAuthGuard } from "../../lib/use-auth-guard";
import { useStackedTableLabels } from "../../lib/use-stacked-tables";
import styles from "./admin-shell.module.css";

type CurrentUser = {
  user_id: string;
  email: string;
  role: string;
  status: string;
  full_name: string | null;
  unit_number: string | null;
};

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutGrid },
  { label: "Visitor Management", href: "/admin/visitor-management", icon: Users },
  { label: "Operations", href: "/admin/operations", icon: Briefcase },
  { label: "Maintenance", href: "/admin/maintenance", icon: Wrench },
  { label: "Users", href: "/admin/residents", icon: UserSquare2 },
  { label: "Finance", href: "/admin/finance", icon: Banknote },
  { label: "Staff Messages", href: "/admin/messages", icon: MessageSquare },
];

const UNREAD_POLL_MS = 30000;

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [staffUnread, setStaffUnread] = useState(0);
  const authChecked = useAuthGuard();
  useStackedTableLabels();

  // Unread staff messages, shown as a badge on the sidebar link.
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    const load = () =>
      apiGet<{ unread: number }>("/api/v1/admin/staff-messages/unread-count")
        .then((r) => {
          if (!cancelled) setStaffUnread(r.unread);
        })
        .catch(() => undefined);
    void load();
    const timer = window.setInterval(load, UNREAD_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [currentUser, pathname]);

  useEffect(() => {
    if (!authChecked) return;
    apiGet<CurrentUser>("/api/auth/me")
      .then((user) => {
        if (user.role !== ADMIN_ROLE) {
          // A non-admin session must never sit inside the admin console.
          void logoutRequest().then(() => router.replace("/"));
          return;
        }
        setCurrentUser(user);
      })
      .catch(() => setCurrentUser(null));
  }, [authChecked, router]);

  const signOut = () => {
    void logoutRequest().then(() => router.push("/"));
  };

  // "Automatic Logout" in Global Security Settings.
  useIdleLogout(() => {
    void logoutRequest().then(() => router.replace("/?idle=1"));
  }, authChecked);

  if (!authChecked) {
    return null;
  }

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
            type="button"
            className={styles.mobileClose}
            aria-label="Close menu"
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
                {item.href === "/admin/messages" && staffUnread > 0 ? (
                  <span className={styles.navBadge} aria-label={`${staffUnread} unread`}>
                    {staffUnread > 99 ? "99+" : staffUnread}
                  </span>
                ) : null}
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
          
          <button type="button" onClick={signOut} className={styles.footerItem}>
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
        <TopNavBar
          onMenuOpen={() => setSidebarOpen(true)}
          onCreateAlert={() => setAlertModalOpen(true)}
          userName={currentUser?.full_name ?? currentUser?.email ?? null}
        />
        <section className={styles.contentInner}>{children}</section>
      </main>

      {alertModalOpen ? (
        <div
          className={styles.alertModalOverlay}
          role="presentation"
          onClick={() => setAlertModalOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setAlertModalOpen(false);
          }}
        >
          <div
            className={styles.alertModalContent}
            role="dialog"
            aria-modal="true"
            aria-label="Post announcement"
            onClick={(event) => event.stopPropagation()}
          >
            <PostAlertPage onClose={() => setAlertModalOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}