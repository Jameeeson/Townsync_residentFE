import { getBackendUrl } from "@/lib/config";

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
  body?: BodyInit | Record<string, unknown> | object | null;
  headers?: HeadersInit;
}

export interface ApiClientMethodOptions extends Omit<ApiRequestOptions, "body"> {}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function shouldJsonSerialize(body: ApiRequestOptions["body"]): body is object {
  if (body == null) return false;
  if (typeof FormData !== "undefined" && body instanceof FormData) return false;
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return false;
  if (typeof Blob !== "undefined" && body instanceof Blob) return false;
  if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) return false;
  return typeof body === "object";
}

function normalizeBaseUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const base = getBackendUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatApiErrorDetail(payload: FastApiErrorPayload | null, fallback: string): string {
  if (!payload) {
    return fallback;
  }

  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  if (Array.isArray(payload.detail)) {
    return payload.detail.map((item) => item.msg).filter(Boolean).join("; ") || fallback;
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return fallback;
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

function buildHeaders(
  headers: HeadersInit | undefined,
  accessToken: string | null,
  body: ApiRequestOptions["body"]
): Headers {
  const requestHeaders = new Headers(headers);
  const hasJsonBody = shouldJsonSerialize(body);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const isUrlEncoded = typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;

  if (hasJsonBody && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (isUrlEncoded && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/x-www-form-urlencoded");
  }

  // Let the browser set multipart boundary for FormData
  if (isFormData) {
    requestHeaders.delete("Content-Type");
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
  const hasJsonBody = shouldJsonSerialize(body);
  const requestBody = hasJsonBody ? JSON.stringify(body) : (body as BodyInit | null | undefined);

  const response = await fetch(normalizeBaseUrl(path), {
    ...requestInit,
    body: requestBody,
    credentials: "include",
    headers: buildHeaders(headers, resolvedAccessToken, body),
  });

  if (!response.ok) {
    const payload = await parseErrorPayload(response);
    const message = formatApiErrorDetail(payload, `Request failed with status ${response.status}`);
    throw new ApiClientError(response.status, message, payload);
  }

  return parseResponseBody<TResponse>(response);
}

export const apiClient = {
  get<TResponse>(path: string, options: ApiClientMethodOptions = {}): Promise<TResponse> {
    return apiFetch<TResponse>(path, { ...options, method: "GET" });
  },
  post<TResponse>(path: string, body: ApiRequestOptions["body"] = null, options: ApiClientMethodOptions = {}): Promise<TResponse> {
    return apiFetch<TResponse>(path, { ...options, body, method: "POST" });
  },
  put<TResponse>(path: string, body: ApiRequestOptions["body"] = null, options: ApiClientMethodOptions = {}): Promise<TResponse> {
    return apiFetch<TResponse>(path, { ...options, body, method: "PUT" });
  },
  patch<TResponse>(path: string, body: ApiRequestOptions["body"] = null, options: ApiClientMethodOptions = {}): Promise<TResponse> {
    return apiFetch<TResponse>(path, { ...options, body, method: "PATCH" });
  },
  delete<TResponse>(path: string, options: ApiClientMethodOptions = {}): Promise<TResponse> {
    return apiFetch<TResponse>(path, { ...options, method: "DELETE" });
  },
};
