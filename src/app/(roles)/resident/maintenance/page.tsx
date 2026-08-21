"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import styles from "@/styles/maintenance.module.css";
import {
  MessageSquare,
  Bot,
  Image as ImageIcon,
  Send,
  ClipboardCheck,
  Clock,
  BookOpen,
  Zap,
} from "lucide-react";

type ChatMessage = {
  id: string;
  role: "ai" | "user";
  text: string;
};

const kbArticles: Record<string, string> = {
  water:
    "Locate the main shutoff valve near your water meter or under the kitchen sink. Turn clockwise until fully closed, then open a faucet to relieve pressure.",
  breaker:
    "Open your breaker panel, identify the tripped breaker (usually midway), flip it fully OFF, then back ON. If it trips again, leave it off and submit a ticket.",
};

export default function MaintenancePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "ai",
      text: "Hello! I'm your virtual maintenance assistant. Describe the issue you're experiencing, and I can help troubleshoot or pre-fill a work order for you.",
    },
    {
      id: "2",
      role: "user",
      text: "My kitchen sink has a steady drip, even when turned off tight.",
    },
    {
      id: "3",
      role: "ai",
      text: "I can help get that fixed. A steady drip usually means a worn-out washer or cartridge.\n\nIs the water leaking from the spout itself, or from around the handles/base of the faucet?",
    },
  ]);
  const [input, setInput] = useState("");
  const [leakLocation, setLeakLocation] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(true);
  const [kbOpen, setKbOpen] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const summaryText = leakLocation
    ? `Steady kitchen sink drip (${leakLocation}). Likely washer/cartridge replacement needed. Ready to submit a work order.`
    : "Steady kitchen sink drip. Likely washer/cartridge replacement needed. Waiting for resident to confirm leak location.";

  function appendUserAndAi(userText: string, aiText: string) {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-u`, role: "user", text: userText },
      { id: `${Date.now()}-a`, role: "ai", text: aiText },
    ]);
  }

  function chooseOption(label: string) {
    setShowOptions(false);
    setLeakLocation(label.toLowerCase());
    appendUserAndAi(
      label,
      `Got it — leak ${label.toLowerCase()}. I can pre-fill a plumbing work order for you. Tap Finish Troubleshooting when you're ready to review and submit.`
    );
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setShowOptions(false);
    setMessages((prev) => [...prev, { id: `${Date.now()}-u`, role: "user", text }]);

    try {
      const { maintenanceAiChat } = await import("@/lib/api/resident");
      const result = await maintenanceAiChat(text);
      if (result.suggested_fields) {
        sessionStorage.setItem(
          "townsync_maintenance_draft",
          JSON.stringify({
            subject: text.slice(0, 80),
            description: text,
            category: result.suggested_fields.category || "Other",
            priority: result.suggested_fields.priority_level || "Medium",
          })
        );
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: "ai",
          text:
            result.response ||
            "Thanks — I've noted that. Finish troubleshooting when you're ready to submit a request.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: "ai",
          text: "I couldn't reach the assistant just now. You can still finish troubleshooting and submit a work order.",
        },
      ]);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h1 className={styles.pageTitle}>Maintenance Center</h1>
        <p className={styles.pageDesc}>
          Troubleshoot issues with our AI assistant or track your current requests.
        </p>
      </div>

      <div className={styles.tabs}>
        <div className={`${styles.tab} ${styles.activeTab}`}>Current Support</div>
        <Link className={styles.tab} href="/resident/maintenance/history">
          Maintenance History
        </Link>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.chatCard}>
          <div className={styles.chatHeader}>
            <div className={styles.aiProfile}>
              <div className={styles.aiIcon}>
                <MessageSquare size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px" }}>TownCare AI Assistant</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Available 24/7 for troubleshooting
                </div>
              </div>
            </div>
            <div className={styles.statusText}>
              <span className={styles.statusDot}></span> Live agent option available
            </div>
          </div>

          <div className={styles.chatBody}>
            <div className={styles.dateSeparator}>TODAY, 10:24 AM</div>

            {messages.map((message) =>
              message.role === "ai" ? (
                <div key={message.id} className={styles.messageRow}>
                  <div className={styles.avatar}>
                    <Bot size={18} />
                  </div>
                  <div className={styles.aiBubble} style={{ whiteSpace: "pre-wrap" }}>
                    {message.text}
                  </div>
                </div>
              ) : (
                <div key={message.id} className={`${styles.messageRow} ${styles.userRow}`}>
                  <div className={styles.avatar}>JD</div>
                  <div className={styles.userBubble}>{message.text}</div>
                </div>
              )
            )}

            {showOptions ? (
              <div className={styles.optionButtons}>
                <button
                  type="button"
                  className={styles.optionBtn}
                  onClick={() => chooseOption("From the Spout")}
                >
                  From the Spout
                </button>
                <button
                  type="button"
                  className={styles.optionBtn}
                  onClick={() => chooseOption("From the Base")}
                >
                  From the Base
                </button>
              </div>
            ) : null}
          </div>

          <form className={styles.chatInputArea} onSubmit={handleSubmit}>
            <div className={styles.inputWrapper}>
              <button
                type="button"
                aria-label="Attach image"
                onClick={() => fileInputRef.current?.click()}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
              >
                <ImageIcon size={20} color="#94a3b8" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  appendUserAndAi(
                    `[Attached image: ${file.name}]`,
                    "Thanks for the photo — that helps with triage. Continue chatting or finish troubleshooting to submit."
                  );
                  e.target.value = "";
                }}
              />
              <input
                className={styles.inputField}
                placeholder="Tell me what's wrong..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button type="submit" className={styles.sendBtn} aria-label="Send message">
                <Send size={16} />
              </button>
            </div>
            <p style={{ textAlign: "center", fontSize: "10px", color: "#94a3b8", marginTop: "12px" }}>
              AI can help identify issues. For emergencies, please call the resident hotline.
            </p>
          </form>
        </div>

        <div>
          <div className={styles.sidebarCard}>
            <div className={styles.summaryHeader}>
              <ClipboardCheck size={14} /> TROUBLESHOOTING SUMMARY
            </div>
            <div className={styles.summaryContent}>
              <div className={styles.infoRow}>
                <span>Detected Category</span>
                <span className={styles.badge}>Plumbing</span>
              </div>
              <div className={styles.infoRow}>
                <span>Urgency Level</span>
                <span className={styles.badge}>Standard</span>
              </div>
              <p className={styles.summaryText}>&quot;{summaryText}&quot;</p>
            </div>
          </div>

          <div className={styles.sidebarCard}>
            <div className={styles.activeRequestHeader}>
              <span className={styles.requestCountText}>Active Requests (1)</span>
              <Link href="/resident/maintenance/history" className={styles.historyLinkText}>
                History
              </Link>
            </div>
            <Link
              href="/resident/maintenance/ticket"
              className={styles.requestItem}
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
            >
              <div className={styles.requestMeta}>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>#TC-8492</span>
                <span className={styles.statusBadge}>IN PROGRESS</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "8px" }}>
                HVAC Making Grinding Noise
              </div>
              <div style={{ display: "flex", gap: "8px", color: "#64748b", fontSize: "12px" }}>
                <Clock size={14} /> Scheduled: Tomorrow, 2:00 PM
              </div>
            </Link>
            <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9" }}>
              <button
                type="button"
                onClick={() => {
                  let draft: {
                    subject?: string;
                    description?: string;
                    category?: string;
                    priority?: string;
                  } = {};
                  try {
                    draft = JSON.parse(sessionStorage.getItem("townsync_maintenance_draft") || "{}");
                  } catch {
                    draft = {};
                  }
                  const params = new URLSearchParams({
                    subject: draft.subject || "Maintenance Request",
                    description: draft.description || summaryText,
                    category: draft.category || "Plumbing",
                    priority: draft.priority || "Medium",
                  });
                  router.push(`/resident/maintenance/review?${params.toString()}`);
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                + Finish Troubleshooting to Submit
              </button>
            </div>
          </div>

          <div style={{ marginTop: "32px" }}>
            <div className={styles.kbTitle}>Knowledge Base</div>
            <button
              type="button"
              className={styles.kbLink}
              onClick={() => setKbOpen(kbOpen === "water" ? null : "water")}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                font: "inherit",
              }}
            >
              <BookOpen size={16} /> How to shut off main water valve
            </button>
            {kbOpen === "water" ? (
              <p style={{ fontSize: 13, color: "#475569", margin: "0 0 12px", lineHeight: 1.5 }}>
                {kbArticles.water}
              </p>
            ) : null}
            <button
              type="button"
              className={styles.kbLink}
              onClick={() => setKbOpen(kbOpen === "breaker" ? null : "breaker")}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                font: "inherit",
              }}
            >
              <Zap size={16} /> Circuit breaker basic safety
            </button>
            {kbOpen === "breaker" ? (
              <p style={{ fontSize: 13, color: "#475569", margin: 0, lineHeight: 1.5 }}>
                {kbArticles.breaker}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
