"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import styles from "@/styles/chat.module.css";
import {
  ArrowLeft,
  Paperclip,
  Image as ImageIcon,
  Send,
  CheckCircle2,
  Calendar,
  Phone,
  ShieldCheck,
  Plus,
  CheckCheck,
} from "lucide-react";

type Message = {
  id: string;
  author: string;
  role?: "Manager" | "Vendor" | "You";
  time: string;
  text: string;
  outgoing?: boolean;
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      author: "Sarah M.",
      role: "Manager",
      time: "09:15 AM",
      text: "Hello Alex, I've assigned Carlos from Master Flow Priority Plumbing to your kitchen sink request. He is available this afternoon to inspect the leak.",
    },
    {
      id: "2",
      author: "Carlos R.",
      role: "Vendor",
      time: "10:30 AM",
      text: "Hi Alex, this is Carlos. I can be at your unit around 1:00 PM today. Could you please confirm if you'll be home or if I should use the management key for access?",
    },
    {
      id: "3",
      author: "Alex Johnson",
      role: "You",
      time: "10:45 AM",
      text: "That works for me, Carlos. I'll be home to let you in. Please just ring the doorbell at unit 402B when you arrive.",
      outgoing: true,
    },
  ]);
  const [draft, setDraft] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [visitDate, setVisitDate] = useState("2023-10-25");
  const [visitTime, setVisitTime] = useState("13:00");
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [mediaCount, setMediaCount] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const now = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        author: "Alex Johnson",
        role: "You",
        time: now,
        text,
        outgoing: true,
      },
    ]);
    setDraft("");
  }

  function attachFile(kind: "message" | "media") {
    const input = kind === "message" ? fileRef.current : mediaRef.current;
    input?.click();
  }

  function onFileSelected(file: File | undefined, kind: "message" | "media") {
    if (!file) return;
    if (kind === "media") {
      setMediaCount((n) => Math.min(n + 1, 4));
      return;
    }
    const now = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        author: "Alex Johnson",
        role: "You",
        time: now,
        text: `Shared file: ${file.name}`,
        outgoing: true,
      },
    ]);
  }

  function confirmReschedule() {
    setRescheduleNote(`Visit rescheduled to ${visitDate} at ${visitTime}.`);
    setShowReschedule(false);
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Link href="/resident/maintenance/ticket" aria-label="Back to ticket">
            <ArrowLeft size={20} color="#1e3a8a" />
          </Link>
          <div>
            <div className={styles.titleMain}>Messages: Plumbing Issue - Kitchen Sink</div>
            <div className={styles.titleSub}>REQ-2023-092 • 3 Participants</div>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <main className={styles.chatArea}>
          <div className={styles.messageList}>
            <div className={styles.dateDivider}>
              <span className={styles.dateLabel}>Wednesday, Oct 25</span>
            </div>

            {messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.messageRow} ${message.outgoing ? styles.userRow : ""}`}
              >
                <div
                  className={styles.avatar}
                  style={{
                    background: "#e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {message.author
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className={styles.msgContent}>
                  <div className={styles.msgHeader}>
                    {message.outgoing ? (
                      <>
                        <span className={styles.time}>{message.time}</span>
                        <span className={styles.userName}>{message.author}</span>
                      </>
                    ) : (
                      <>
                        <span className={styles.userName}>{message.author}</span>
                        {message.role === "Manager" ? (
                          <span className={`${styles.roleBadge} ${styles.managerBadge}`}>
                            Manager
                          </span>
                        ) : null}
                        {message.role === "Vendor" ? (
                          <span className={`${styles.roleBadge} ${styles.vendorBadge}`}>
                            Vendor
                          </span>
                        ) : null}
                        <span className={styles.time}>{message.time}</span>
                      </>
                    )}
                  </div>
                  <div
                    className={`${styles.bubble} ${
                      message.outgoing ? styles.outgoingBubble : styles.incomingBubble
                    }`}
                  >
                    {message.text}
                  </div>
                  {message.outgoing ? (
                    <div className={styles.readStatus}>
                      <CheckCheck size={14} color="#2563eb" /> READ
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            <div className={styles.systemMsg}>
              <CheckCircle2 size={18} color="#22c55e" /> Ticket Status Updated: Vendor Dispatched
            </div>
            {rescheduleNote ? (
              <div className={styles.systemMsg}>
                <Calendar size={18} color="#2563eb" /> {rescheduleNote}
              </div>
            ) : null}
          </div>

          <form className={styles.inputSection} onSubmit={sendMessage}>
            <div className={styles.inputWrapper}>
              <input
                className={styles.textArea}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message..."
                aria-label="Message"
              />
              <button
                type="button"
                aria-label="Attach file"
                onClick={() => attachFile("message")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <Paperclip size={20} color="#64748b" />
              </button>
              <button
                type="button"
                aria-label="Attach image"
                onClick={() => attachFile("message")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <ImageIcon size={20} color="#64748b" />
              </button>
              <button type="submit" className={styles.sendBtn} aria-label="Send">
                <Send size={20} />
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              hidden
              onChange={(e) => {
                onFileSelected(e.target.files?.[0], "message");
                e.target.value = "";
              }}
            />
            <p style={{ textAlign: "center", fontSize: "11px", color: "#94a3b8", marginTop: "12px" }}>
              Messages are visible to property management and the assigned technician.
            </p>
          </form>
        </main>

        <aside className={styles.sidebar}>
          <section className={styles.sideSection}>
            <h4>Ticket Details</h4>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Status</span>
              <div className={styles.statusBadge}>
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    background: "#22c55e",
                    borderRadius: "50%",
                  }}
                />
                Vendor Dispatched
              </div>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Scheduled For</span>
              <div className={styles.detailValue}>
                {visitDate} {visitTime}
              </div>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Priority</span>
              <div className={styles.detailValue} style={{ color: "#b91c1c" }}>
                High Priority
              </div>
            </div>
          </section>

          <section className={styles.sideSection}>
            <h4>Media Shared</h4>
            <div className={styles.mediaGrid}>
              {Array.from({ length: mediaCount }).map((_, index) => (
                <div key={index} className={styles.mediaItem}>
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "#dbeafe",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      color: "#1e40af",
                    }}
                  >
                    Media {index + 1}
                  </div>
                </div>
              ))}
              {mediaCount < 4 ? (
                <button
                  type="button"
                  className={`${styles.mediaItem} ${styles.addMedia}`}
                  onClick={() => attachFile("media")}
                  aria-label="Add media"
                >
                  <Plus size={24} />
                </button>
              ) : null}
              <input
                ref={mediaRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  onFileSelected(e.target.files?.[0], "media");
                  e.target.value = "";
                }}
              />
            </div>
          </section>

          <section className={styles.sideSection}>
            <h4>Quick Actions</h4>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => setShowReschedule((v) => !v)}
            >
              <Calendar size={18} /> Reschedule Visit
            </button>
            {showReschedule ? (
              <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  style={{ padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}
                />
                <input
                  type="time"
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  style={{ padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}
                />
                <button type="button" className={styles.actionBtn} onClick={confirmReschedule}>
                  Confirm New Time
                </button>
              </div>
            ) : null}
            <a
              className={styles.actionBtn}
              href="tel:+15550123456"
              style={{ textDecoration: "none" }}
            >
              <Phone size={18} /> Call Concierge
            </a>
          </section>

          <div className={styles.safetyBox}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <ShieldCheck size={16} color="#1e40af" />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "#1e293b",
                  textTransform: "uppercase",
                }}
              >
                Community Safety
              </span>
            </div>
            <p style={{ fontSize: "11px", color: "#64748b", lineHeight: 1.4 }}>
              Always verify the vendor&apos;s ID badge before allowing entry to your residence.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
