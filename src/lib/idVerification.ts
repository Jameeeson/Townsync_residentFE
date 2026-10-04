import { createHmac } from "node:crypto";

// Server-side only (reads ID_VERIFICATION_SECRET); imported by app/api/ocr.
// A short-lived proof that /api/ocr read a Philippine National ID. It names the
// card number and the name on the card; the photo is never kept or sent on.
// The backend checks both at registration (app/utils/id_verification.py), so an
// application cannot skip the scan or swap the number or name afterwards.
// Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256).

const TOKEN_TTL_SECONDS = 30 * 60;

export function idVerificationConfigured(): boolean {
  return Boolean(process.env.ID_VERIFICATION_SECRET);
}

export function signNationalIdScan(scan: { cardNumber: string; fullName: string }): string {
  const secret = process.env.ID_VERIFICATION_SECRET;
  if (!secret) throw new Error("ID_VERIFICATION_SECRET is not set");
  const payload = Buffer.from(
    JSON.stringify({
      typ: "National ID",
      pcn: scan.cardNumber.replace(/\D/g, ""),
      nm: scan.fullName,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
