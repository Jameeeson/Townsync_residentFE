"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, Zap } from "lucide-react";
import styles from "@/styles/maintenance.module.css";

const RESOURCES: Array<{ match: RegExp; icon: typeof BookOpen; title: string; body: string }> = [
  {
    match: /plumb|water|leak|sink|pipe/i,
    icon: BookOpen,
    title: "How to shut off the main water valve",
    body: "Locate the main shutoff valve near your water meter or under the kitchen sink. Turn clockwise until fully closed, then open a faucet to relieve pressure.",
  },
  {
    match: /electric|power|breaker|outlet|light/i,
    icon: Zap,
    title: "Circuit breaker basic safety",
    body: "Open your breaker panel, identify the tripped breaker (usually midway), flip it fully OFF, then back ON. If it trips again, leave it off and submit a ticket.",
  },
];

/**
 * A short safety tip for the issue's category. On phones it starts collapsed
 * to its title so it doesn't push the conversation off screen; on wider
 * screens the body is always shown (see .helpfulResourceBodyCollapsed).
 */
export function HelpfulResource({ category }: { category: string | null }) {
  const [open, setOpen] = useState(false);
  if (!category) return null;
  const resource = RESOURCES.find((r) => r.match.test(category));
  if (!resource) return null;

  const Icon = resource.icon;

  return (
    <div className={`${styles.helpfulResource} ts-fade-in-up`}>
      <button
        type="button"
        className={styles.helpfulResourceHeader}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon size={15} aria-hidden="true" />
        <span>{resource.title}</span>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={`${styles.helpfulResourceChevron} ${open ? styles.helpfulResourceChevronOpen : ""}`}
        />
      </button>
      <p className={`${styles.helpfulResourceBody} ${open ? "" : styles.helpfulResourceBodyCollapsed}`}>
        {resource.body}
      </p>
    </div>
  );
}

export default HelpfulResource;
