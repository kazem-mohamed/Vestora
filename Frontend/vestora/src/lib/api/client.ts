import { authStore } from "@/lib/auth/store";
import { getRefreshToken } from "@/lib/auth/tokens";
import type { LoginResponse } from "@/lib/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5078";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

interface RequestOptions {
  method?: string;
  /** Plain object (sent as JSON) or FormData (sent as multipart). */
  body?: unknown;
  /** Attach the bearer access token and refresh on 401. Default true. */
  auth?: boolean;
  signal?: AbortSignal;
}

// Single-flight refresh: concurrent 401s share one refresh request.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new ApiError(401, "No refresh token available.");
  }

  refreshPromise = (async () => {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      authStore.clearSession();
      throw new ApiError(res.status, "Session expired. Please log in again.");
    }

    const data = (await res.json()) as LoginResponse;
    authStore.setSession(data);
    return data.accessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function buildHeaders(body: unknown, auth: boolean): Headers {
  const headers = new Headers();
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = authStore.getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (typeof FormData !== "undefined" && body instanceof FormData) return body;
  return JSON.stringify(body);
}

async function parseError(res: Response): Promise<ApiError> {
  let message = res.statusText || "Request failed.";
  let payload: unknown;
  try {
    payload = await res.json();
    const p = payload as { message?: string; title?: string; errors?: Record<string, string[]> };
    if (p?.message) {
      message = p.message;
    } else if (p?.errors) {
      const first = Object.values(p.errors)[0];
      if (first?.[0]) message = first[0];
    } else if (p?.title) {
      message = p.title;
    }
  } catch {
    // non-JSON error body
  }
  return new ApiError(res.status, message, payload);
}

async function parseBody<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, signal } = options;

  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: buildHeaders(body, auth),
      body: serializeBody(body),
      signal,
    });

  let res = await doFetch();

  // On 401, try a single refresh + one retry.
  if (res.status === 401 && auth && getRefreshToken()) {
    try {
      await refreshAccessToken();
      res = await doFetch();
    } catch {
      throw new ApiError(401, "Session expired. Please log in again.");
    }
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  return parseBody<T>(res);
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  del: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: "DELETE" }),
};

export { API_URL };
