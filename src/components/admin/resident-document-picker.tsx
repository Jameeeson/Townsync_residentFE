"use client";

import { useState } from "react";
import { Eye, Trash2, UploadCloud } from "lucide-react";
import {
  ACCEPTED_DOC_TYPES,
  DOC_TYPE_LABELS,
  MAX_DOC_COUNT,
  MAX_DOC_LABEL,
  formatBytes,
  validateDocFile,
  type PendingDocument,
  type ResidentDocType,
} from "@/lib/resident-documents";
import DocumentViewer, { type ViewerSource } from "./document-viewer";
import styles from "./resident-document-picker.module.css";

/**
 * Pick several verification documents for a new resident. Each file is checked for type and
 * size the moment it is chosen, can be previewed before the account is created, and gets its
 * own document type.
 */
export default function ResidentDocumentPicker({
  docs,
  onChange,
  disabled = false,
}: {
  docs: PendingDocument[];
  onChange: (docs: PendingDocument[]) => void;
  disabled?: boolean;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [viewing, setViewing] = useState<ViewerSource | null>(null);

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const next = [...docs];
    const issues: string[] = [];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_DOC_COUNT) {
        issues.push(`Only ${MAX_DOC_COUNT} documents can be attached.`);
        break;
      }
      const error = validateDocFile(file);
      if (error) {
        issues.push(`${file.name}: ${error}`);
        continue;
      }
      if (next.some((d) => d.file.name === file.name && d.file.size === file.size)) {
        issues.push(`${file.name}: already added.`);
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${next.length}`,
        file,
        type: next.some((d) => d.type === "Lease") ? "ID" : "Lease",
      });
    }
    setProblem(issues.length ? issues.join(" ") : null);
    onChange(next);
  }

  const setType = (id: string, type: ResidentDocType) =>
    onChange(docs.map((d) => (d.id === id ? { ...d, type } : d)));
  const remove = (id: string) => {
    setProblem(null);
    onChange(docs.filter((d) => d.id !== id));
  };

  return (
    <div className={styles.picker}>
      <label
        className={`${styles.drop} ${dragging ? styles.dropActive : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) addFiles(event.dataTransfer.files);
        }}
      >
        <UploadCloud size={24} aria-hidden="true" />
        <strong>Click to choose files, or drop them here</strong>
        <span>Uploaded right after the account is created.</span>
        <div className={styles.limits}>
          <em>PDF, PNG, JPG</em>
          <em>Max {MAX_DOC_LABEL} each</em>
          <em>Up to {MAX_DOC_COUNT} files</em>
        </div>
        <input
          type="file"
          multiple
          accept={ACCEPTED_DOC_TYPES}
          disabled={disabled || docs.length >= MAX_DOC_COUNT}
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      {problem ? (
        <p className={styles.error} role="alert">
          {problem}
        </p>
      ) : null}

      {docs.length > 0 ? (
        <ul className={styles.list}>
          {docs.map((doc) => (
            <li key={doc.id} className={styles.item}>
              <div className={styles.file}>
                <strong title={doc.file.name}>{doc.file.name}</strong>
                <span>{formatBytes(doc.file.size)}</span>
              </div>
              <div className={styles.controls}>
                <select
                  value={doc.type}
                  disabled={disabled}
                  onChange={(event) => setType(doc.id, event.target.value as ResidentDocType)}
                  aria-label={`Document type for ${doc.file.name}`}
                >
                  {(Object.keys(DOC_TYPE_LABELS) as ResidentDocType[]).map((t) => (
                    <option key={t} value={t}>
                      {DOC_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => setViewing({ name: doc.file.name, blob: doc.file })}
                  aria-label={`View ${doc.file.name}`}
                >
                  <Eye size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  disabled={disabled}
                  onClick={() => remove(doc.id)}
                  aria-label={`Remove ${doc.file.name}`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {viewing ? <DocumentViewer source={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}
