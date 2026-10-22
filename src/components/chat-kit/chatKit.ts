/**
 * TownSync chat kit: the one chat design used by the resident, admin and staff apps.
 *
 * These files are kept IDENTICAL in adminfe, frontned and staff (src/components/chat-kit). Change them in all three or
 * in none: the backend test `test_chat_kit_is_identical_in_all_apps` fails when the copies drift apart. They depend on
 * nothing app-specific (own CSS, own icons), so the look cannot differ between apps.
 */

export type ChatSide = "mine" | "theirs";

/** One message, already mapped for the person looking at it. */
export type ChatLine = {
  key: string;
  side: ChatSide;
  /** Who wrote it, as shown above a "theirs" group. */
  name: string;
  /** A small tag next to the name: "Technician", "Management", "Resident". */
  badge?: string | null;
  text: string;
  at: Date | null;
};

export type ChatRun = { kind: "run"; side: ChatSide; name: string; badge: string | null; lines: ChatLine[]; end: Date | null };
export type ChatDay = { kind: "day"; label: string };
export type ChatItem = ChatRun | ChatDay;

export const GROUP_GAP_MS = 5 * 60 * 1000;

export function dayLabel(date: Date | null): string {
  if (!date) return "";
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function clockLabel(date: Date | null): string {
  return date ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
}

export function initialsOf(name: string): string {
  const parts = name.replace(/@.*/, "").trim().split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`).toUpperCase();
}

/** Groups consecutive messages from one sender, and starts a new group after a pause or on a new day. */
export function groupLines(lines: ChatLine[]): ChatItem[] {
  const items: ChatItem[] = [];
  let lastDay = "";
  let current: ChatRun | null = null;
  let lastAt: Date | null = null;
  for (const line of lines) {
    const day = line.at ? line.at.toDateString() : "";
    if (day !== lastDay) {
      items.push({ kind: "day", label: dayLabel(line.at) });
      lastDay = day;
      current = null;
    }
    const paused = line.at && lastAt ? line.at.getTime() - lastAt.getTime() > GROUP_GAP_MS : false;
    if (current && current.side === line.side && current.name === line.name && !paused) {
      current.lines.push(line);
      current.end = line.at;
    } else {
      current = { kind: "run", side: line.side, name: line.name, badge: line.badge ?? null, lines: [line], end: line.at };
      items.push(current);
    }
    lastAt = line.at;
  }
  return items;
}
