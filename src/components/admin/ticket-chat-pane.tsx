"use client";

import { useMemo } from "react";
import { HardHat, Phone } from "lucide-react";
import { parseServerDate } from "@/lib/datetime";
import type { TicketChatMessage, TicketChatThread } from "@/lib/chat";
import { ChatChip, ChatIconLink, ChatIntro } from "@/components/chat-kit/ChatBits";
import { ChatPanel } from "@/components/chat-kit/ChatPanel";
import { initialsOf, type ChatLine } from "@/components/chat-kit/chatKit";

type Props = {
  residentName: string;
  residentUnit: string;
  residentPhone?: string | null;
  /** The ticket as the resident described it, shown as the opening card. */
  request: { text: string; filedAt: string | null };
  thread: TicketChatThread | null;
  error: string | null;
  input: string;
  sending: boolean;
  onInput: (value: string) => void;
  onSend: () => void;
  onBack: () => void;
  /** "pane" sits in the page, "dialog" fits a pop-up. */
  variant?: "pane" | "dialog";
};

/** The administrator's view: management (you) on the right; the resident and the technician are named. */
function toLine(message: TicketChatMessage, index: number): ChatLine {
  const base = { key: `${message.timestamp}-${index}`, text: message.content, at: parseServerDate(message.timestamp) };
  if (message.sender_role === "Resident") return { ...base, side: "theirs", name: message.sender_name, badge: "Resident" };
  if (/admin/i.test(message.sender_role) || message.sender_name === "Property Admin") {
    return { ...base, side: "mine", name: "Management", badge: "Management" };
  }
  return { ...base, side: "theirs", name: message.sender_name, badge: "Technician" };
}

/** The administrator's view of a ticket conversation. */
export default function TicketChatPane({
  residentName,
  residentUnit,
  residentPhone,
  request,
  thread,
  error,
  input,
  sending,
  onInput,
  onSend,
  onBack,
  variant = "pane",
}: Props) {
  const lines = useMemo(() => (thread?.messages ?? []).map(toLine), [thread?.messages]);
  const first = residentName.split(" ")[0] || "the resident";
  const filed = parseServerDate(request.filedAt);

  return (
    <ChatPanel
      variant={variant}
      label={`Conversation with ${residentName}`}
      header={{
        avatar: initialsOf(residentName),
        title: residentName,
        subtitle: `Resident · ${residentUnit}`,
        onBack,
        extra: (
          <>
            {thread ? (
              <ChatChip tone={thread.staff_assigned ? "on" : "off"} icon={<HardHat size={14} aria-hidden="true" />}>
                {thread.staff_assigned ? thread.staff_name : "No technician assigned"}
              </ChatChip>
            ) : null}
            {residentPhone ? (
              <ChatIconLink href={`tel:${residentPhone}`} label={`Call ${residentName}`}>
                <Phone size={18} aria-hidden="true" />
              </ChatIconLink>
            ) : null}
          </>
        ),
      }}
      intro={
        <ChatIntro
          label={`Original request${filed ? ` · ${filed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}` : ""}`}
          text={request.text}
        />
      }
      lines={lines}
      ready={Boolean(thread)}
      error={error}
      empty={<p>No messages yet. Write to {first} below.</p>}
      input={input}
      onInput={onInput}
      onSend={onSend}
      placeholder={`Message ${first}`}
      sending={sending}
      readOnly={Boolean(thread?.read_only)}
    />
  );
}
