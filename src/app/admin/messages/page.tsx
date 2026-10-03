"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Search } from "lucide-react";
import AdminShell from "@/components/admin/admin-shell";
import { StaffChat } from "@/components/admin/staff-chat";
import { apiGet } from "@/lib/api";
import { parseServerDate } from "@/lib/datetime";
import styles from "./messages.module.css";

type ThreadSummary = {
  staff_user_id: number;
  staff_name: string;
  staff_email: string;
  staff_type: string | null;
  last_message: string | null;
  last_message_side: "admin" | "staff" | null;
  last_message_at: string | null;
  unread: number;
};

const LIST_POLL_MS = 10000;

function initials(name: string): string {
  const parts = name.replace(/@.*/, "").trim().split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`).toUpperCase();
}

function when(value: string | null): string {
  const d = parseServerDate(value);
  if (!d) return "";
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function StaffMessagesInbox() {
  const searchParams = useSearchParams();
  const initialId = Number(searchParams.get("staff")) || null;
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(initialId);
  const [search, setSearch] = useState("");

  const loadThreads = useCallback(() => {
    apiGet<ThreadSummary[]>("/api/v1/admin/staff-messages/")
      .then((data) => {
        setThreads(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load conversations."));
  }, []);

  useEffect(() => {
    loadThreads();
    const timer = window.setInterval(loadThreads, LIST_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadThreads]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!threads) return [];
    if (!term) return threads;
    return threads.filter(
      (t) => t.staff_name.toLowerCase().includes(term) || t.staff_email.toLowerCase().includes(term),
    );
  }, [threads, search]);

  const selected = threads?.find((t) => t.staff_user_id === selectedId) ?? null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Staff Messages</h1>
        <p>Direct conversations with staff and maintenance accounts. They reply from Messages in the staff portal.</p>
      </header>

      <div className={styles.layout}>
        <aside className={styles.list} aria-label="Conversations">
          <label className={styles.search}>
            <Search size={15} aria-hidden="true" />
            <input
              placeholder="Search staff…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search staff"
            />
          </label>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          {!threads ? <p className={styles.muted}>Loading…</p> : null}
          {threads && visible.length === 0 ? <p className={styles.muted}>No staff accounts match.</p> : null}
          <ul>
            {visible.map((t) => (
              <li key={t.staff_user_id}>
                <button
                  type="button"
                  className={`${styles.item} ${t.staff_user_id === selectedId ? styles.itemActive : ""}`}
                  aria-current={t.staff_user_id === selectedId ? "true" : undefined}
                  onClick={() => setSelectedId(t.staff_user_id)}
                >
                  <span className={styles.avatar}>{initials(t.staff_name)}</span>
                  <span className={styles.itemText}>
                    <span className={styles.itemTop}>
                      <strong>{t.staff_name}</strong>
                      <time>{when(t.last_message_at)}</time>
                    </span>
                    <span className={styles.itemBottom}>
                      <span className={t.unread ? styles.previewUnread : styles.preview}>
                        {t.last_message
                          ? `${t.last_message_side === "admin" ? "You: " : ""}${t.last_message}`
                          : t.staff_type ?? "Staff"}
                      </span>
                      {t.unread ? <span className={styles.badge}>{t.unread}</span> : null}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className={styles.conversation}>
          {selected ? (
            <>
              <header className={styles.convHead}>
                <span className={styles.avatar}>{initials(selected.staff_name)}</span>
                <div>
                  <h2>{selected.staff_name}</h2>
                  <p>
                    {selected.staff_type ?? "Staff"} · {selected.staff_email}
                  </p>
                </div>
              </header>
              <StaffChat key={selected.staff_user_id} staffUserId={selected.staff_user_id} onActivity={loadThreads} />
            </>
          ) : (
            <div className={styles.placeholder}>
              <MessageSquare size={28} aria-hidden="true" />
              <p>Select a staff member to read or start a conversation.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function StaffMessagesPage() {
  return (
    <AdminShell>
      <Suspense fallback={null}>
        <StaffMessagesInbox />
      </Suspense>
    </AdminShell>
  );
}
