"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, LifeBuoy, X } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import AdminShell from "@/components/admin/admin-shell";
import styles from "@/components/styles/Support.module.css";
import modalStyles from "@/components/styles/Resident.module.css";

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

  const [confirmTarget, setConfirmTarget] = useState<SupportMessage | null>(null);
  const [confirmNote, setConfirmNote] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  const loadMessages = () => {
    apiGet<SupportMessage[]>("/api/v1/admin/support/")
      .then(setMessages)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load support inbox"));
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const openConfirm = (m: SupportMessage) => {
    setConfirmTarget(m);
    setConfirmNote("");
    setNotifyEmail(true);
  };

  const submitToggleStatus = async () => {
    if (!confirmTarget) return;
    const nextStatus = confirmTarget.status === "resolved" ? "open" : "resolved";
    setBusyId(confirmTarget.id);
    setConfirmSubmitting(true);
    try {
      const res = await apiPatch<{ message: string; emailed: boolean }>(
        `/api/v1/admin/support/${confirmTarget.id}`,
        {
          status: nextStatus,
          note: confirmNote.trim() || null,
          notify_email: nextStatus === "resolved" && notifyEmail,
        },
      );
      toast(
        nextStatus === "resolved"
          ? res.emailed
            ? "Marked resolved and emailed the sender."
            : "Marked resolved (in-app only)."
          : "Reopened.",
        "success",
      );
      setConfirmTarget(null);
      loadMessages();
    } catch (err) {
      toastError(err, "Could not update this message.");
    } finally {
      setBusyId(null);
      setConfirmSubmitting(false);
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
                          onClick={() => openConfirm(m)}
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

      {confirmTarget ? (
        <div className={modalStyles.modalOverlay}>
          <div className={modalStyles.modalContent}>
            <div className={modalStyles.modalHeader}>
              <div>
                <h2>{confirmTarget.status === "resolved" ? "Reopen Message" : "Mark Resolved"}</h2>
                <p>
                  {confirmTarget.name} - &quot;{confirmTarget.topic}&quot;
                </p>
              </div>
              <button
                type="button"
                className={modalStyles.closeBtn}
                onClick={() => setConfirmTarget(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className={modalStyles.modalBody}>
              <div className={modalStyles.formGroup}>
                <label>
                  {confirmTarget.status === "resolved"
                    ? "Note (visible to admins only)"
                    : "Note for the sender (optional)"}
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Fixed on our end, please try again."
                  value={confirmNote}
                  onChange={(e) => setConfirmNote(e.target.value)}
                />
              </div>
              {confirmTarget.status !== "resolved" ? (
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                  />
                  Email {confirmTarget.email} that this was resolved
                </label>
              ) : (
                <p className={styles.email}>
                  Reopening only changes status in this inbox - the sender is not emailed.
                </p>
              )}
            </div>
            <div className={modalStyles.modalFooter}>
              <button
                type="button"
                className={modalStyles.cancelBtn}
                onClick={() => setConfirmTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={modalStyles.submitBtn}
                disabled={confirmSubmitting}
                onClick={submitToggleStatus}
              >
                {confirmSubmitting
                  ? "Saving..."
                  : confirmTarget.status === "resolved"
                  ? "Reopen"
                  : "Mark Resolved"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
