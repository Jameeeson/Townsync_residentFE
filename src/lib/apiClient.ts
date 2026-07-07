const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

const ACCESS_TOKEN_STORAGE_KEY = "townsync_access_token";

export interface FastApiValidationError {
  loc: Array<string | number>;
  msg: string;
  type: string;
}

export interface FastApiErrorPayload {
  detail?: string | FastApiValidationError[];
  message?: string;
  [key: string]: unknown;
}

export class ApiClientError extends Error {
  public readonly status: number;

  public readonly payload: FastApiErrorPayload | null;

  constructor(status: number, message: string, payload: FastApiErrorPayload | null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "headers"> {
  accessToken?: string;
  body?: BodyInit | Record<string, unknown> | null;
  headers?: HeadersInit;
}

export interface ApiClientMethodOptions extends Omit<ApiRequestOptions, "body"> {}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function normalizeBaseUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${DEFAULT_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function setAccessToken(accessToken: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

function resolveAccessToken(explicitToken: string | undefined): string | null {
  return explicitToken ?? getAccessToken();
}

function buildHeaders(headers: HeadersInit | undefined, accessToken: string | null, hasJsonBody: boolean): Headers {
  const requestHeaders = new Headers(headers);

  if (hasJsonBody && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (accessToken && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return requestHeaders;
}

async function parseResponseBody<TResponse>(response: Response): Promise<TResponse> {
  if (response.status === 204) {
    return undefined as TResponse;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as TResponse;
  }

  return (await response.text()) as TResponse;
}

async function parseErrorPayload(response: Response): Promise<FastApiErrorPayload | null> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return (await response.json()) as FastApiErrorPayload;
  } catch {
    return null;
  }
}

export async function apiFetch<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
  const { accessToken, body, headers, ...requestInit } = options;
  const resolvedAccessToken = resolveAccessToken(accessToken);
  const hasJsonBody = isPlainObject(body);
  const requestBody = hasJsonBody ? JSON.stringify(body) : body;

  const response = await fetch(normalizeBaseUrl(path), {
    ...requestInit,
    body: requestBody,
    credentials: "include",
    headers: buildHeaders(headers, resolvedAccessToken, hasJsonBody),
  });

  if (!response.ok) {
    const payload = await parseErrorPayload(response);
    const message =
      typeof payload?.detail === "string"
        ? payload.detail
        : payload?.message ?? `Request failed with status ${response.status}`;

    throw new ApiClientError(response.status, message, payload);
  }

  return parseResponseBody<TResponse>(response);
}

export const apiClient = {
  get<TResponse>(path: string, options: ApiClientMethodOptions = {}): Promise<TResponse> {
    return apiFetch<TResponse>(path, { ...options, method: "GET" });
  },
  post<TResponse>(path: string, body: ApiRequestOptions["body"], options: ApiClientMethodOptions = {}): Promise<TResponse> {
    return apiFetch<TResponse>(path, { ...options, body, method: "POST" });
  },
  put<TResponse>(path: string, body: ApiRequestOptions["body"], options: ApiClientMethodOptions = {}): Promise<TResponse> {
    return apiFetch<TResponse>(path, { ...options, body, method: "PUT" });
  },
  patch<TResponse>(path: string, body: ApiRequestOptions["body"], options: ApiClientMethodOptions = {}): Promise<TResponse> {
    return apiFetch<TResponse>(path, { ...options, body, method: "PATCH" });
  },
  delete<TResponse>(path: string, options: ApiClientMethodOptions = {}): Promise<TResponse> {
    return apiFetch<TResponse>(path, { ...options, method: "DELETE" });
  },
};