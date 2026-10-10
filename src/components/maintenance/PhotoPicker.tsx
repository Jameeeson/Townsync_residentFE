"use client";

import { useEffect, useMemo, useRef } from "react";
import { Plus, X } from "lucide-react";
import styles from "./photoPicker.module.css";

const MAX_BYTES = 10 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  /** Called with a plain-language reason when a picked file is refused. */
  onReject?: (message: string) => void;
  max?: number;
  inputId: string;
};

/** Picks up to `max` photos (camera or gallery on a phone), with thumbnails that can each be removed. */
export default function PhotoPicker({ files, onChange, onReject, max = 5, inputId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  function add(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= max) {
        onReject?.(`You can add up to ${max} photos.`);
        break;
      }
      if (file.type && !OK_TYPES.includes(file.type)) {
        onReject?.(`${file.name} is not a photo. Use a JPG, PNG or WebP image.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        onReject?.(`${file.name} is larger than 10 MB.`);
        continue;
      }
      next.push(file);
    }
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={styles.wrap}>
      <ul className={styles.grid} aria-label="Selected photos">
        {previews.map(({ file, url }, i) => (
          <li key={`${file.name}-${file.size}-${i}`} className={styles.thumb}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={url} alt={`Photo ${i + 1}: ${file.name}`} />
            <button type="button" className={styles.remove} aria-label={`Remove photo ${i + 1}`} onClick={() => onChange(files.filter((_, n) => n !== i))}>
              <X size={14} />
            </button>
          </li>
        ))}
        {files.length < max ? (
          <li>
            <label className={styles.add} htmlFor={inputId}>
              <Plus size={20} aria-hidden="true" />
              <small>{files.length === 0 ? "Add photos" : "Add more"}</small>
            </label>
          </li>
        ) : null}
      </ul>
      <input ref={inputRef} id={inputId} className={styles.input} type="file" accept="image/*" multiple onChange={(e) => add(e.target.files)} />
      <p className={styles.count}>{files.length} of {max} photos</p>
    </div>
  );
}
