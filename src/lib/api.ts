import { clearSession } from "./auth";

// Fail fast in production builds instead of silently talking to localhost.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");

if (!API_BASE_URL && typeof window !== "undefined") {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured for this build.");
}

// All three portals share one backend, so the session cookie lives on the API's
// domain. This header tells the backend which portal is calling so it scopes the
// cookie per portal — otherwise signing into staff would evict the admin session.
const PORTAL = "admin";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function errorMessage(response: Response): Promise<string> {
  let message = response.statusText;
  try {
    const data = await response.json();
    if (typeof data.detail === "string") message = data.detail;
    else if (Array.isArray(data.detail)) message = data.detail.map((d: { msg?: string }) => d.msg).join(", ");
  } catch {
    // response had no JSON body
  }
  return message || "Request failed";
}

function handleUnauthorized(): void {
  clearSession();
  if (typeof window !== "undefined" && window.location.pathname !== "/") {
    window.location.href = "/";
  }
}

async function send(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("X-Portal", PORTAL);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    // The httpOnly session cookie is sent automatically with credentials: "include".
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: "include" });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }

  if (response.status === 401) handleUnauthorized();
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
  return response;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await send(path, options);
  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return undefined as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

/**
 * Requests a password-reset link. The backend picks which portal the emailed
 * link points at from the account's role, so an admin address is sent back
 * here rather than to the resident portal.
 *
 * The reply is identical whether or not the address exists — it must not be
 * usable to discover accounts.
 */
export function forgotPassword(email: string): Promise<{ message: string }> {
  return apiPost<{ message: string }>("/api/auth/forgot-password", { email });
}

export function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return apiPost<{ message: string }>("/api/auth/reset-password", {
    token,
    new_password: newPassword,
  });
}

/** Authenticated file download (CSV/PDF exports); returns the raw bytes. */
export async function apiDownload(path: string): Promise<Blob> {
  const response = await send(path, { method: "GET" });
  return response.blob();
}

/** Multipart upload with the session cookie (no manual Content-Type). */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: "POST", body: form });
}

export async function login(
  email: string,
  password: string,
): Promise<{ access_token: string; token_type: string; role?: string }> {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Portal": PORTAL,
      },
      body: form.toString(),
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    throw new ApiError(response.status, (await errorMessage(response)) || "Invalid credentials");
  }

  return response.json();
}

/** Revokes the session server-side and clears the cookie; always clears the local flag. */
export async function logoutRequest(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "X-Portal": PORTAL },
    });
  } catch {
    // best effort — the local flag is cleared below regardless
  }
  clearSession();
}

export { API_BASE_URL };
