"use client";

import { useEffect, useRef } from "react";
import styles from "@/styles/maintenance.module.css";
import type { ChatMessageData } from "@/hooks/useMaintenanceChat";
import { MessageMoment } from "./MessageMoment";
import { TypingIndicator } from "./TypingIndicator";

interface ConversationStreamProps {
  messages: ChatMessageData[];
  loading: boolean;
}

export function ConversationStream({ messages, loading }: ConversationStreamProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  return (
    <div className={styles.stream} ref={bodyRef}>
      {messages.map((message, i) => (
        <MessageMoment key={message.id} message={message} isLatest={i === messages.length - 1} />
      ))}
      {loading ? <TypingIndicator /> : null}
    </div>
  );
}

export default ConversationStream;
