const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const TOKEN_KEY = "townsync.staff.token";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
      return body.detail.map((d: { msg?: string }) => d.msg).join(", ");
    }
  } catch {
    /* body wasn't JSON */
  }
  if (res.status === 401) return "Your session has expired. Please sign in again.";
  if (res.status === 403) return "You don't have permission to do that.";
  if (res.status === 404) return "That resource could not be found.";
  if (res.status >= 500) return "The server ran into a problem. Please try again shortly.";
  return `Request failed (${res.status}).`;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  form?: FormData;
  auth?: boolean;
  headers?: Record<string, string>;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, form, auth = true, headers = {} } = opts;
  const finalHeaders: Record<string, string> = { ...headers };

  if (auth) {
    const token = getToken();
    if (!token) {
      throw new ApiError(401, "Not signed in.");
    }
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let requestBody: BodyInit | undefined;
  if (form) {
    requestBody = form;
  } else if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: requestBody,
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }

  if (res.status === 401) {
    clearToken();
    throw new ApiError(401, await parseErrorMessage(res));
  }

  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorMessage(res));
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body" | "form">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  postForm: <T>(path: string, form: FormData, opts?: Omit<RequestOptions, "method" | "form">) =>
    request<T>(path, { ...opts, method: "POST", form }),
  patchForm: <T>(path: string, form: FormData, opts?: Omit<RequestOptions, "method" | "form">) =>
    request<T>(path, { ...opts, method: "PATCH", form }),
};
