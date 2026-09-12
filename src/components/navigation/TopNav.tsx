"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import styles from '@/styles/resident.module.css';

export const TopNav = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className={styles.topNav}>
      <div className={styles.topNavInner}>
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
        <button
          type="button"
          className={styles.hamburger}
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </button>
        {open && (
          <div className={styles.mobileNav}>
            <Link href="/#features" onClick={() => setOpen(false)}>Features</Link>
            <Link href="/about" onClick={() => setOpen(false)}>About</Link>
            <Link href="/security" onClick={() => setOpen(false)}>Security</Link>
            <Link className={styles.navButton} href="/login" onClick={() => setOpen(false)}>
              Resident Login
            </Link>
            <Link className={styles.outlineButton} href="/register" onClick={() => setOpen(false)}>
              Request Access
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default TopNav;
