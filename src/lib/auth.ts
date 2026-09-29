// The primary session is an httpOnly cookie set by the backend. It doesn't
// reach the app on browsers that block third-party cookies for cross-site
// requests (notably every iOS browser, which all run on WebKit) since the
// API and the frontend are on different domains. The access token below is
// sent as an Authorization header instead, which those browsers don't block.
const SESSION_KEY = "townsync_admin_session";
const TOKEN_KEY = "townsync_admin_token";

export const ADMIN_ROLE = "Admin";

export function markSignedIn(): void {
  try {
    window.localStorage.setItem(SESSION_KEY, "1");
  } catch {
    // storage unavailable (private mode) — the cookie still authenticates requests
  }
}

export function setAccessToken(token: string): void {
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage unavailable — falls back to cookie-only auth
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}
