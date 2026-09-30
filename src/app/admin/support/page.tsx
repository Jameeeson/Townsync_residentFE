"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, LifeBuoy } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import AdminShell from "@/components/admin/admin-shell";
import styles from "@/components/styles/Support.module.css";

interface SupportMessage {
  id: number;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: string;
  created_at: string | null;
}

export default function AdminSupportPage() {
  const { toast, toastError } = useToast();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadMessages = () => {
    apiGet<SupportMessage[]>("/api/v1/admin/support/")
      .then(setMessages)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load support inbox"));
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const toggleStatus = async (m: SupportMessage) => {
    const nextStatus = m.status === "resolved" ? "open" : "resolved";
    setBusyId(m.id);
    try {
      await apiPatch(`/api/v1/admin/support/${m.id}`, { status: nextStatus });
      toast(nextStatus === "resolved" ? "Marked resolved." : "Reopened.", "success");
      loadMessages();
    } catch (err) {
      toastError(err, "Could not update this message.");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.topic.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q),
    );
  }, [messages, search]);

  return (
    <AdminShell>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Support Inbox</h1>
          <p>Messages submitted through the public contact/support form.</p>
        </div>

        {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}

        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by name, email, or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.card}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>From</th>
                  <th>Topic</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Received</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className={styles.empty}>
                        <LifeBuoy size={20} style={{ marginBottom: "0.5rem" }} />
                        <div>No support messages found.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <span className={styles.name}>{m.name}</span>
                        <span className={styles.email}>{m.email}</span>
                      </td>
                      <td>{m.topic}</td>
                      <td className={styles.message}>{m.message}</td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            m.status === "resolved" ? styles.badgeResolved : styles.badgeOpen
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td>{m.created_at ?? "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          disabled={busyId === m.id}
                          onClick={() => toggleStatus(m)}
                        >
                          {m.status === "resolved" ? "Reopen" : "Mark Resolved"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
