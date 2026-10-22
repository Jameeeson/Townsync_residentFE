"use client";

import type { ReactNode } from "react";
import styles from "./chatKit.module.css";

/** A card above the messages, for example the original request. */
export function ChatIntro({ label, text }: { label: string; text: string }) {
  return (
    <div className={styles.intro}>
      <span>{label}</span>
      <p>{text}</p>
    </div>
  );
}

/** A small tag in the header ("on" is highlighted, "off" is muted). */
export function ChatChip({ tone = "on", icon, children }: { tone?: "on" | "off"; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`${styles.chip} ${tone === "on" ? styles.chipOn : styles.chipOff}`}>
      {icon}
      {children}
    </span>
  );
}

/** A round icon link in the header, for example "call". */
export function ChatIconLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a className={styles.iconLink} href={href} aria-label={label}>
      {children}
    </a>
  );
}
