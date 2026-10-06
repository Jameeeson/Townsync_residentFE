import { apiDownload, apiUpload } from "./api";

export type ResidentDocType = "Lease" | "Deed" | "ID";

export const DOC_TYPE_LABELS: Record<ResidentDocType, string> = {
  Lease: "Lease",
  Deed: "Ownership Deed",
  ID: "Government ID",
};

export const MAX_DOC_BYTES = 10 * 1024 * 1024;
export const MAX_DOC_COUNT = 5;
export const ACCEPTED_DOC_TYPES = ".pdf,.png,.jpg,.jpeg";

export type ResidentDocument = {
  filename: string;
  doc_type: ResidentDocType | null;
  display_name: string;
  size_bytes: number;
};

/** A document chosen in the form that has not been uploaded yet. */
export type PendingDocument = {
  id: string;
  file: File;
  type: ResidentDocType;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MAX_DOC_LABEL = `${MAX_DOC_BYTES / (1024 * 1024)} MB`;

export function docKind(name: string): "pdf" | "image" | "other" {
  if (/\.pdf$/i.test(name)) return "pdf";
  if (/\.(png|jpe?g|webp)$/i.test(name)) return "image";
  return "other";
}

/** Returns an error message if the file is unacceptable, otherwise null. */
export function validateDocFile(file: File): string | null {
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_DOC_BYTES) {
    return `File is ${formatBytes(file.size)}, over the ${MAX_DOC_LABEL} limit.`;
  }
  if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) return "Only PDF, PNG, or JPG files are allowed.";
  return null;
}

/**
 * Uploads a verification document for a resident. `userId` is the USER id returned by
 * POST /api/v1/admin/residents/onboard (the upload endpoint keys on it).
 */
export async function uploadResidentDocument(
  userId: number,
  docType: ResidentDocType,
  file: File,
): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  await apiUpload<unknown>(
    `/api/v1/admin/residents/upload-documents?resident_id=${userId}&doc_type=${docType}`,
    form,
  );
}

/**
 * Uploads every pending document one by one. Returns how many succeeded and the
 * message of each failure, so the caller can say exactly what went wrong.
 */
export async function uploadPendingDocuments(
  userId: number,
  docs: PendingDocument[],
): Promise<{ uploaded: number; failures: string[] }> {
  let uploaded = 0;
  const failures: string[] = [];
  for (const doc of docs) {
    try {
      await uploadResidentDocument(userId, doc.type, doc.file);
      uploaded += 1;
    } catch (err) {
      failures.push(`${doc.file.name}: ${err instanceof Error ? err.message : "upload failed"}`);
    }
  }
  return { uploaded, failures };
}

/** Summary line for the form banner after uploading. */
export function uploadSummary(total: number, uploaded: number, failures: string[]): string {
  if (total === 0) return "";
  if (failures.length === 0) return ` ${uploaded} document${uploaded === 1 ? "" : "s"} uploaded.`;
  return ` ${uploaded} of ${total} documents uploaded. Failed: ${failures.join("; ")}`;
}

/** Fetches a stored document (admin only) as a blob for viewing. `residentId` is RESIDENT_PROFILE.resident_id. */
export function fetchResidentDocument(residentId: number, filename: string): Promise<Blob> {
  return apiDownload(`/api/v1/admin/residents/${residentId}/documents/${encodeURIComponent(filename)}`);
}
