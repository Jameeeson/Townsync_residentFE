import { apiUpload } from "./api";

export type ResidentDocType = "Lease" | "Deed" | "ID";

export const DOC_TYPE_LABELS: Record<ResidentDocType, string> = {
  Lease: "Lease",
  Deed: "Ownership Deed",
  ID: "Government ID",
};

export const MAX_DOC_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_DOC_TYPES = ".pdf,.png,.jpg,.jpeg";

export type ResidentDocument = {
  filename: string;
  doc_type: ResidentDocType | null;
  display_name: string;
  size_bytes: number;
};

/** Returns an error message if the file is unacceptable, otherwise null. */
export function validateDocFile(file: File): string | null {
  if (file.size > MAX_DOC_BYTES) return "File is larger than 10MB.";
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
