"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CalendarDays, Clock, Megaphone, Pin, Trash2, X } from "lucide-react";
import { ApiClientError } from "@/lib/apiClient";
import { Announcement, dismissAnnouncement, listAnnouncements } from "@/lib/api/resident";
import { parseServerDate } from "@/lib/datetime";
import styles from "@/styles/dashboard.module.css";
import ann from "@/styles/announcements.module.css";

function formatDate(iso: string | null | undefined): string | null {
  const date = parseServerDate(iso ?? "");
  if (!date) return null;
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

function toneClass(priority: Announcement["priority"]): string {
  if (priority === "Urgent") return ann.toneUrgent;
  if (priority === "Important") return ann.toneImportant;
  return "";
}

function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError || err instanceof Error) return err.message;
  return fallback;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Announcement | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listAnnouncements();
        if (!cancelled) setAnnouncements(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(errorText(err, "Failed to load announcements."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isOpen = open !== null;

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setConfirmingDelete(false);
        lastTrigger.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const openModal = (item: Announcement, trigger: HTMLElement) => {
    lastTrigger.current = trigger;
    setConfirmingDelete(false);
    setDeleteError("");
    setOpen(item);
  };

  const closeModal = () => {
    setOpen(null);
    setConfirmingDelete(false);
    lastTrigger.current?.focus();
  };

  const handleDelete = async () => {
    if (!open) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await dismissAnnouncement(open.id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== open.id));
      lastTrigger.current = null;
      setOpen(null);
      setConfirmingDelete(false);
    } catch (err) {
      setDeleteError(errorText(err, "Could not delete this announcement."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <section className={`${styles.welcomeCard} ts-fade-in-up`}>
        <div>
          <h1 className={styles.welcomeTitle}>Announcements</h1>
          <p className={styles.welcomeUnit}>Community updates from property management</p>
        </div>
        <div className={styles.welcomeActions}>
          <Link className={styles.btnOutline} href="/resident">
            Back to Dashboard
          </Link>
        </div>
      </section>

      <section className={`${styles.card} ts-fade-in-up`}>
        {loading ? (
          <div className={`${ann.grid} ts-stagger`} aria-busy="true" aria-label="Loading announcements">
            {[0, 1].map((i) => (
              <div key={i} className={ann.card} style={{ "--ts-stagger-i": i, cursor: "default" } as CSSProperties}>
                <div className="ts-skeleton" style={{ width: "70%", height: 16, marginBottom: 10 }}>Loading</div>
                <div className="ts-skeleton" style={{ width: "100%", height: 40, marginBottom: 10 }}>Loading</div>
                <div className="ts-skeleton" style={{ width: "40%", height: 12 }}>Loading</div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="ts-badge ts-badge-danger" role="alert">{error}</p>
        ) : announcements.length === 0 ? (
          <div className={`${styles.placeholder} ts-fade-in`}>
            <Megaphone size={24} className={styles.placeholderIcon} aria-hidden="true" />
            <p>No announcements right now. Check back soon for community updates.</p>
          </div>
        ) : (
          <>
            <p className={ann.note}>
              Select an announcement to read it in full. Deleting one only removes it from your feed.
            </p>
            <div className={`${ann.grid} ts-stagger`}>
              {announcements.map((item, i) => (
                <button
                  type="button"
                  key={item.id}
                  className={`${ann.card} ${toneClass(item.priority)}`}
                  style={{ "--ts-stagger-i": i } as CSSProperties}
                  onClick={(e) => openModal(item, e.currentTarget)}
                  aria-haspopup="dialog"
                >
                  <div className={ann.cardHead}>
                    <span className={ann.category}>{item.category || "General"}</span>
                    {item.priority && item.priority !== "Normal" ? (
                      <span className={ann.priority}>{item.priority}</span>
                    ) : null}
                    {item.is_pinned ? (
                      <span className={ann.pinned}>
                        <Pin size={12} aria-hidden="true" /> Pinned
                      </span>
                    ) : null}
                  </div>
                  <h3 className={ann.title}>{item.title}</h3>
                  <p className={ann.excerpt}>{item.content}</p>
                  <div className={ann.meta}>
                    <span className={ann.metaItem}>
                      <CalendarDays size={14} aria-hidden="true" />
                      Posted <strong>{formatDate(item.created_at) ?? item.created_at}</strong>
                    </span>
                    {item.expiry_date ? (
                      <span className={ann.metaItem}>
                        <Clock size={14} aria-hidden="true" />
                        Until <strong>{formatDate(item.expiry_date) ?? item.expiry_date}</strong>
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {open ? (
        <div className={ann.overlay} onClick={closeModal}>
          <div
            className={`${ann.dialog} ${toneClass(open.priority)}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={ann.dialogHead}>
              <div>
                <div className={ann.cardHead}>
                  <span className={ann.category}>{open.category || "General"}</span>
                  {open.priority && open.priority !== "Normal" ? (
                    <span className={ann.priority}>{open.priority}</span>
                  ) : null}
                  {open.is_pinned ? (
                    <span className={ann.pinned}>
                      <Pin size={12} aria-hidden="true" /> Pinned
                    </span>
                  ) : null}
                </div>
                <h2 id="announcement-title" className={ann.dialogTitle}>
                  {open.title}
                </h2>
              </div>
              <button ref={closeRef} type="button" className={ann.iconBtn} onClick={closeModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className={ann.dialogMeta}>
              <span className={ann.metaItem}>
                <CalendarDays size={15} aria-hidden="true" />
                Posted <strong>{formatDate(open.created_at) ?? open.created_at}</strong>
              </span>
              {open.expiry_date ? (
                <span className={ann.metaItem}>
                  <Clock size={15} aria-hidden="true" />
                  Effective until <strong>{formatDate(open.expiry_date) ?? open.expiry_date}</strong>
                </span>
              ) : null}
            </div>
            <div className={ann.dialogBody}>{open.content}</div>
            {deleteError ? (
              <p role="alert" className="ts-badge ts-badge-danger" style={{ margin: "0 var(--space-6) var(--space-3)" }}>
                {deleteError}
              </p>
            ) : null}
            <div className={ann.dialogFoot}>
              {confirmingDelete ? (
                <div className={ann.confirmRow}>
                  <span>Remove this announcement from your feed?</span>
                  <button type="button" className={ann.deleteBtn} disabled={deleting} onClick={handleDelete}>
                    <Trash2 size={14} aria-hidden="true" /> {deleting ? "Deleting..." : "Yes, delete"}
                  </button>
                  <button
                    type="button"
                    className={ann.closeBtn}
                    disabled={deleting}
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Keep
                  </button>
                </div>
              ) : (
                <button type="button" className={ann.deleteBtn} onClick={() => setConfirmingDelete(true)}>
                  <Trash2 size={14} aria-hidden="true" /> Delete
                </button>
              )}
              <button type="button" className={ann.closeBtn} onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
