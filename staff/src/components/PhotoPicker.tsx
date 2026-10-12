"use client";

import { useEffect, useMemo, useRef } from "react";
import { IconX } from "@/components/icons";
import styles from "./PhotoPicker.module.css";

const MAX_BYTES = 10 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Phone photos are often 5 to 10 MB each. Anything bigger than this is shrunk before it is uploaded, which keeps a
// five-photo work report small enough to send on a weak connection.
const SHRINK_ABOVE_BYTES = 1.5 * 1024 * 1024;
const MAX_EDGE = 1920;

/** Returns a smaller JPEG of the photo, or the original when it is already small or cannot be shrunk. */
async function shrink(file: File): Promise<File> {
  if (file.size <= SHRINK_ABOVE_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  /** Called with a plain-language reason when a picked file is refused. */
  onReject?: (message: string) => void;
  max?: number;
  inputId?: string;
};

/** Picks up to `max` photos (camera or gallery on a phone), shows thumbnails and lets each one be removed. */
export function PhotoPicker({ files, onChange, onReject, max = 5, inputId = "photo-picker" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  async function add(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const picked of Array.from(list)) {
      if (next.length >= max) {
        onReject?.(`You can add up to ${max} photos.`);
        break;
      }
      if (picked.type && !OK_TYPES.includes(picked.type)) {
        onReject?.(`${picked.name} cannot be used. Use a JPG, PNG or WebP image (on an iPhone, choose a photo saved as JPEG).`);
        continue;
      }
      if (picked.size > MAX_BYTES) {
        onReject?.(`${picked.name} is larger than 10 MB.`);
        continue;
      }
      next.push(await shrink(picked));
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
              <IconX size={14} />
            </button>
          </li>
        ))}
        {files.length < max ? (
          <li>
            <label className={styles.add} htmlFor={inputId}>
              <span aria-hidden="true">+</span>
              <small>{files.length === 0 ? "Add photos" : "Add more"}</small>
            </label>
          </li>
        ) : null}
      </ul>
      <input ref={inputRef} id={inputId} className={styles.input} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => void add(e.target.files)} />
      <p className={styles.count}>{files.length} of {max} photos</p>
    </div>
  );
}
