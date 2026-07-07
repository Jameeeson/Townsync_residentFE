"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import styles from '@/styles/resident.module.css';

export const TopNav = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className={styles.topNav}>
      <div className={styles.brand}>
        <Link href="/">TownSync</Link>
      </div>
      <div className={styles.navLinks}>
        <Link href="/#features">Features</Link>
        <Link href="/about">About</Link>
        <Link href="/security">Security</Link>
      </div>
      <div className={styles.navActions}>
        <Link className={styles.navButton} href="/login">
          Resident Login
        </Link>
        <Link className={styles.outlineButton} href="/register">
          Request Access
        </Link>
      </div>
      <div className={styles.hamburger} onClick={() => setOpen(!open)}>
        <span></span>
        <span></span>
        <span></span>
      </div>
      {open && (
        <div className={styles.mobileNav}>
          <Link href="/#features">Features</Link>
          <Link href="/about">About</Link>
          <Link href="/security">Security</Link>
          <Link className={styles.navButton} href="/login">
            Resident Login
          </Link>
          <Link className={styles.outlineButton} href="/register">
            Request Access
          </Link>
        </div>
      )}
    </nav>
  );
};

export default TopNav;
