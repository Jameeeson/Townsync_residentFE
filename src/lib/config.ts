/**
 * Backend base URL from env.
 * Next.js only exposes NEXT_PUBLIC_* to the browser — set both in .env:
 *   BACKEND_URL=...
 *   NEXT_PUBLIC_BACKEND_URL=...  (same value)
 */
export function getBackendUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.BACKEND_URL?.trim() ||
    "";

  if (!raw) {
    throw new Error(
      "Missing BACKEND_URL / NEXT_PUBLIC_BACKEND_URL. Add it to .env (e.g. NEXT_PUBLIC_BACKEND_URL=http://localhost:8000)."
    );
  }

  return raw.replace(/\/$/, "");
}
