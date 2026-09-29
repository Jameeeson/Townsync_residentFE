import { ApiError, PORTAL, clearSession, hasSession, markSignedIn, setAccessToken } from "./api-client";

export const STAFF_ROLES = ["Staff", "Maintenance"];

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type MeResponse = {
  user_id: number;
  email: string;
  role: string;
  status: string;
  full_name: string | null;
  unit_number: string | null;
};

/** Logs in against the real backend (OAuth2 password flow expects form-encoded fields). */
export async function login(email: string, password: string): Promise<void> {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Portal": PORTAL,
      },
      body,
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Is the backend running?");
  }

  if (!res.ok) {
    let message = "Invalid credentials.";
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") message = data.detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }

  const data = (await res.json()) as { access_token: string; token_type: string; role?: string };
  if (data.access_token) setAccessToken(data.access_token);
  if (!data.role || !STAFF_ROLES.includes(data.role)) {
    // Valid credentials but not a staff account: end that session before erroring.
    await logout();
    throw new ApiError(403, "This portal is for staff accounts only.");
  }
  markSignedIn();
}

export async function fetchMe(): Promise<MeResponse> {
  const { api } = await import("./api-client");
  return api.get<MeResponse>("/api/auth/me");
}

/** Self-service staff registration. Account is created as Pending until an admin approves it. */
export async function registerStaff(payload: {
  name: string;
  email: string;
  staff_type: "Staff" | "Maintenance";
  employee_id: string;
  password: string;
}): Promise<{ message: string }> {
  const { api } = await import("./api-client");
  return api.post<{ message: string }>("/api/auth/register/staff", payload, { auth: false });
}

/**
 * Requests a reset link. The backend picks the portal from the account's role,
 * so a staff address is emailed a link back to this portal rather than the
 * resident one. The response is deliberately identical whether or not the
 * address exists, so it cannot be used to discover accounts.
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { api } = await import("./api-client");
  return api.post<{ message: string }>("/api/auth/forgot-password", { email }, { auth: false });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ message: string }> {
  const { api } = await import("./api-client");
  return api.post<{ message: string }>(
    "/api/auth/reset-password",
    { token, new_password: newPassword },
    { auth: false },
  );
}

export async function logout(): Promise<void> {
  clearSession();
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "X-Portal": PORTAL },
    });
  } catch {
    /* best effort — the local flag is already cleared */
  }
}

export function isSignedIn(): boolean {
  return hasSession();
}
