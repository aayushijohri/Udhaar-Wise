/**
 * apiClient.ts
 * Centralised fetch wrapper for the Udhaar Wise backend.
 *
 * Base URL is sourced from the VITE_API_URL env var so the app never has
 * hard-coded credentials.  Falls back to localhost:5000 in development.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

/**
 * Retrieve the current session access token from localStorage (set by authService).
 */
function getToken(): string | null {
  return localStorage.getItem("uw_access_token");
}

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  message?: string;
};

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** When true, the Authorization header is NOT set (for public routes). */
  public?: boolean;
}

async function request<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { body, public: isPublic, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Expires": "0",
    ...(rest.headers as Record<string, string>),
  };

  if (!isPublic) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await response.json().catch(() => ({ success: false, message: "Invalid JSON response" }));

  if (!response.ok) {
    const err = new Error(json.message ?? `HTTP ${response.status}`) as Error & { code?: string; details?: unknown };
    err.code = json.code;
    err.details = json.details;
    throw err;
  }

  return json as ApiResponse<T>;
}

export const api = {
  get: <T = unknown>(path: string, opts: RequestOptions = {}) =>
    request<T>(path, { method: "GET", ...opts }),

  post: <T = unknown>(path: string, body: unknown, opts: RequestOptions = {}) =>
    request<T>(path, { method: "POST", body, ...opts }),

  put: <T = unknown>(path: string, body: unknown, opts: RequestOptions = {}) =>
    request<T>(path, { method: "PUT", body, ...opts }),

  patch: <T = unknown>(path: string, body?: unknown, opts: RequestOptions = {}) =>
    request<T>(path, { method: "PATCH", body, ...opts }),

  delete: <T = unknown>(path: string, opts: RequestOptions = {}) =>
    request<T>(path, { method: "DELETE", ...opts }),
};
