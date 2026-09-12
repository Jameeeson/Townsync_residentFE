import { BookOpen, Zap } from "lucide-react";
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

export function HelpfulResource({ category }: { category: string | null }) {
  if (!category) return null;
  const resource = RESOURCES.find((r) => r.match.test(category));
  if (!resource) return null;

  const Icon = resource.icon;

  return (
    <div className={`${styles.helpfulResource} ts-fade-in-up`}>
      <div className={styles.helpfulResourceHeader}>
        <Icon size={15} aria-hidden="true" />
        <span>{resource.title}</span>
      </div>
      <p className={styles.helpfulResourceBody}>{resource.body}</p>
    </div>
  );
}

export default HelpfulResource;
