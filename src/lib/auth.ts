// The session itself is an httpOnly cookie set by the backend; JavaScript never sees the
// token. This flag is only a UI hint ("show the app vs. the login screen") — the server
// re-checks authentication and role on every request.
const SESSION_KEY = "townsync_admin_session";

export const ADMIN_ROLE = "Admin";

export function markSignedIn(): void {
  try {
    window.localStorage.setItem(SESSION_KEY, "1");
  } catch {
    // storage unavailable (private mode) — the cookie still authenticates requests
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
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
