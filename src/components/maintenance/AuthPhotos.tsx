"use client";

import { useEffect, useState } from "react";
import { ImageOff, X } from "lucide-react";
import { apiBlob } from "@/lib/apiClient";
import styles from "./authPhotos.module.css";

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

type Loaded = { path: string; url: string | null };

/**
 * Photos are served by a route that needs the sign-in. A plain <img> would lose it on browsers that block
 * third-party cookies, so each one is fetched with the access token and shown from a local blob.
 */
export default function AuthPhotos({ paths, label }: { paths: string[]; label: string }) {
  const key = paths.join("|");
  const [images, setImages] = useState<Loaded[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    Promise.all(
      (key ? key.split("|") : []).map(async (path) => {
        try {
          const url = URL.createObjectURL(await apiBlob(toApiPath(path)));
          created.push(url);
          return { path, url };
        } catch {
          return { path, url: null };
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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (paths.length === 0) return null;
  return (
    <div className={styles.wrap}>
      <div className={styles.grid} role="list" aria-label={label}>
        {paths.map((path, i) => {
          const img = images.find((x) => x.path === path);
          if (!img) return <div key={path} role="listitem" className={`${styles.thumb} ${styles.loading}`} aria-label="Loading photo" />;
          if (!img.url)
            return (
              <div key={path} role="listitem" className={`${styles.thumb} ${styles.failed}`} title="This photo could not be loaded.">
                <ImageOff size={18} aria-hidden="true" />
              </div>
            );
          return (
            <button key={path} role="listitem" type="button" className={styles.thumb} onClick={() => setOpen(img.url)} aria-label={`Open ${label.toLowerCase()} ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
              <img src={img.url} alt={`${label} ${i + 1}`} />
            </button>
          );
        })}
      </div>
      {open ? (
        <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={label} onClick={() => setOpen(null)}>
          <button type="button" className={styles.close} aria-label="Close photo" onClick={() => setOpen(null)}>
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
          <img src={open} alt={`${label}, enlarged`} onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </div>
  );
}
