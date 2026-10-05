import { API_BASE_URL, ApiError, PORTAL, clearSession, hasSession, markSignedIn, setAccessToken } from "./api-client";

export const STAFF_ROLES = ["Staff", "Maintenance"];

export type MeResponse = {
  user_id: number;
  email: string;
  role: string;
  status: string;
  full_name: string | null;
  unit_number: string | null;
};

export type StaffLoginStep = { challengeToken: string; emailHint: string } | null;

type LoginPayload = {
  access_token?: string;
  token_type?: string;
  role?: string;
  two_factor_required?: boolean;
  challenge_token?: string;
  email_hint?: string;
};

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    /* ignore */
  }
  return fallback;
}

async function finishLogin(data: LoginPayload): Promise<void> {
  if (data.access_token) setAccessToken(data.access_token);
  if (!data.role || !STAFF_ROLES.includes(data.role)) {
    // Valid credentials but not a staff account: end that session before erroring.
    await logout();
    throw new ApiError(403, "This portal is for staff accounts only.");
  }
  markSignedIn();
}

/**
 * Logs in against the real backend (OAuth2 password flow expects form-encoded fields).
 * Returns null when signed in, or the second step when two-factor sign-in is on and an emailed
 * code still has to be entered (see verifyTwoFactor).
 */
export async function login(email: string, password: string): Promise<StaffLoginStep> {
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
    throw new ApiError(res.status, await readError(res, "Invalid credentials."));
  }

  const data = (await res.json()) as LoginPayload;
  if (data.two_factor_required && data.challenge_token) {
    return { challengeToken: data.challenge_token, emailHint: data.email_hint ?? "your email" };
  }
  await finishLogin(data);
  return null;
}

async function postJson(path: string, payload: unknown): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Portal": PORTAL },
      body: JSON.stringify(payload),
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Is the backend running?");
  }
  if (!res.ok) throw new ApiError(res.status, await readError(res, "Something went wrong."));
  return res;
}

/** Second step of sign-in: the code that was emailed to the staff member. */
export async function verifyTwoFactor(challengeToken: string, code: string): Promise<void> {
  const res = await postJson("/api/auth/login/verify-2fa", { challenge_token: challengeToken, code: code.trim() });
  await finishLogin((await res.json()) as LoginPayload);
}

/** Emails a fresh code; returns the masked address it went to. */
export async function resendTwoFactor(challengeToken: string): Promise<string> {
  const res = await postJson("/api/auth/login/resend-2fa", { challenge_token: challengeToken });
  return ((await res.json()) as { email_hint?: string }).email_hint ?? "";
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
  specialization?: string;
  shift: string;
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
