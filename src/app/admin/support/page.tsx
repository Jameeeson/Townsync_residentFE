"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, LifeBuoy } from "lucide-react";
import { apiGet } from "@/lib/api";
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
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<SupportMessage[]>("/api/v1/admin/support/")
      .then(setMessages)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load support inbox"));
  }, []);

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
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
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
                            m.status === "Resolved" ? styles.badgeResolved : styles.badgeOpen
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td>{m.created_at ?? "—"}</td>
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
