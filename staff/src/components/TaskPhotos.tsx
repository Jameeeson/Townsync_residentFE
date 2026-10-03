"use client";

import { useEffect, useState } from "react";
import { fetchBlob } from "@/lib/api-client";
import { IconX } from "@/components/icons";
import styles from "./TaskPhotos.module.css";

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

/** Photos the resident attached to the ticket, fetched with the staff session. */
export function TaskPhotos({ paths }: { paths: string[] }) {
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
          const url = URL.createObjectURL(await fetchBlob(toApiPath(path)));
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

  return (
    <section className={styles.wrap}>
      <h3>Resident photos {paths.length ? `(${paths.length})` : ""}</h3>
      {paths.length === 0 ? (
        <p className={styles.empty}>No photos were attached to this request.</p>
      ) : (
        <div className={styles.grid}>
          {paths.map((path, i) => {
            const img = images.find((x) => x.path === path);
            if (!img) return <div key={path} className={`${styles.thumb} ${styles.loading}`} aria-label="Loading photo" />;
            if (!img.url)
              return (
                <div key={path} className={`${styles.thumb} ${styles.failed}`}>
                  Unavailable
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
      )}
      {open ? (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(null);
          }}
        >
          <button type="button" className={styles.close} aria-label="Close photo" onClick={() => setOpen(null)}>
            <IconX size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
          <img src={open} alt="Resident photo, enlarged" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </section>
  );
}
