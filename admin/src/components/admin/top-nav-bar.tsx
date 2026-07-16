"use client";

import { Bell, LayoutGrid, Menu, Search } from "lucide-react";
import styles from "./top-nav-bar.module.css";

type TopNavBarProps = {
  onMenuOpen?: () => void;
};

export default function TopNavBar({ onMenuOpen }: TopNavBarProps) {
  return (
    <header className={styles.topNav}>
      <div className={styles.leftSection}>
        {onMenuOpen ? (
          <button
            type="button"
            className={styles.menuButton}
            onClick={onMenuOpen}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
        ) : null}
        <span className={styles.logo}>TownSync</span>
      </div>

      <div className={styles.searchWrap}>
        <Search size={18} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search records..."
          aria-label="Search records"
        />
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.createAlertButton}>
          Create Alert
        </button>
        <span className={styles.divider} aria-hidden="true" />
        <button type="button" className={styles.iconButton} aria-label="Notifications">
          <Bell size={20} />
        </button>
        <button type="button" className={styles.iconButton} aria-label="App launcher">
          <LayoutGrid size={20} />
        </button>
        <div className={styles.avatar} aria-label="User profile">
          SM
        </div>
      </div>
    </header>
  );
}
