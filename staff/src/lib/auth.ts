import { ApiError, clearToken, getToken, setToken } from "./api-client";

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
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
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

  const data = (await res.json()) as { access_token: string; token_type: string };
  setToken(data.access_token);
}

export async function fetchMe(): Promise<MeResponse> {
  const { api } = await import("./api-client");
  return api.get<MeResponse>("/api/auth/me");
}

export async function logout(): Promise<void> {
  const token = getToken();
  clearToken();
  if (!token) return;
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    /* best effort — token is already cleared locally */
  }
}

export function isSignedIn(): boolean {
  return Boolean(getToken());
}
