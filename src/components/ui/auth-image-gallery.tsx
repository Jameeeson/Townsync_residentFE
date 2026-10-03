"use client";

import { useEffect, useState } from "react";
import { ImageOff, X } from "lucide-react";
import { apiDownload } from "@/lib/api";
import styles from "./auth-image-gallery.module.css";

/**
 * Uploaded files are served by an authenticated route. A plain <img src> only
 * carries the session cookie, which browsers that block third-party cookies
 * (Brave, Safari) drop, so the photo never loads. This fetches each file with
 * the Bearer header and shows it from a blob URL instead.
 */
function toApiPath(stored: string): string {
  if (/^https?:\/\//.test(stored)) {
    try {
      return new URL(stored).pathname;
    } catch {
      return stored;
    }
  }
  return stored.startsWith("/") ? stored : `/${stored}`;
}

type Loaded = { path: string; url: string | null; failed: boolean };

export default function AuthImageGallery({
  paths,
  label = "Photos from resident",
  emptyText = "No photo attached",
}: {
  paths: string[];
  label?: string;
  emptyText?: string;
}) {
  const key = paths.join("|");
  const [images, setImages] = useState<Loaded[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    const list = key ? key.split("|") : [];
    Promise.all(
      list.map(async (path) => {
        try {
          const blob = await apiDownload(toApiPath(path));
          const url = URL.createObjectURL(blob);
          created.push(url);
          return { path, url, failed: false };
        } catch {
          return { path, url: null, failed: true };
        }
      }),
    ).then((result) => {
      if (!cancelled) setImages(result);
    });
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [key]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (paths.length === 0) {
    return (
      <div className={styles.gallery}>
        <span className={styles.label}>{emptyText}</span>
      </div>
    );
  }

  return (
    <div className={styles.gallery}>
      <span className={styles.label}>
        {label} ({paths.length})
      </span>
      <div className={styles.grid}>
        {paths.map((path, i) => {
          const img = images.find((x) => x.path === path);
          if (!img) return <div key={path} className={`${styles.thumb} ${styles.loading}`} aria-label="Loading photo" />;
          if (img.failed || !img.url)
            return (
              <div key={path} className={`${styles.thumb} ${styles.failed}`} title="This photo could not be loaded.">
                <ImageOff size={18} />
              </div>
            );
          return (
            <button
              key={path}
              type="button"
              className={styles.thumb}
              onClick={() => setOpen(img.url)}
              aria-label={`Open photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
              <img src={img.url} alt={`Resident photo ${i + 1}`} />
            </button>
          );
        })}
      </div>
      {open ? (
        <div className={styles.lightbox} role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <button type="button" className={styles.lightboxClose} aria-label="Close photo" onClick={() => setOpen(null)}>
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
          <img src={open} alt="Resident photo, enlarged" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </div>
  );
}
