"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { docKind, formatBytes } from "@/lib/resident-documents";
import styles from "./document-viewer.module.css";

export type ViewerSource = {
  name: string;
  /** Provide the bytes directly (a file picked in the form)… */
  blob?: Blob;
  /** …or a loader for a stored document, run when the viewer opens. */
  load?: () => Promise<Blob>;
};

/** Modal that shows an uploaded image or PDF, with a download button. */
export default function DocumentViewer({ source, onClose }: { source: ViewerSource; onClose: () => void }) {
  const [loaded, setLoaded] = useState<{ blob: Blob | null; url: string | null; error: string | null }>({
    blob: null,
    url: null,
    error: null,
  });
  const { url } = loaded;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const bytes = source.blob ? Promise.resolve(source.blob) : source.load ? source.load() : Promise.reject(new Error("Nothing to show."));
    bytes
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ blob, url: objectUrl, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoaded({ blob: null, url: null, error: err instanceof Error ? err.message : "Could not load this document." });
        }
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const kind = docKind(source.name);

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`Viewing ${source.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.head}>
          <div className={styles.title}>
            <strong>{source.name}</strong>
            {loaded.blob ? <span>{formatBytes(loaded.blob.size)}</span> : null}
          </div>
          {url ? (
            <a className={styles.action} href={url} download={source.name}>
              <Download size={15} aria-hidden="true" />
              <span className={styles.actionLabel}>Download</span>
            </a>
          ) : null}
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close viewer">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.body}>
          {loaded.error ? (
            <p className={styles.state}>{loaded.error}</p>
          ) : !url ? (
            <p className={styles.state}>Loading…</p>
          ) : kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={source.name} />
          ) : kind === "pdf" ? (
            <iframe src={url} title={source.name} />
          ) : (
            <p className={styles.state}>This file type can&apos;t be previewed. Use Download.</p>
          )}
        </div>
      </div>
    </div>
  );
}
