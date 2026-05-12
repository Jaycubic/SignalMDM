/**
 * src/services/api.ts
 * -------------------
 * Base HTTP client for the SignalMDM FastAPI backend.
 *
 * Auth:
 *   - Authorization: Bearer <encrypted_jwt>  (stored in localStorage as 'auth_token')
 *   - X-Device-ID: <device_fingerprint>       (stored in localStorage as 'device_id')
 *
 * Every endpoint wraps its response in StandardResponse:
 *   { success: bool, message: string, data: T | null, errors: string[] }
 */

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000/api/v1';

// ─── Standard response envelope ───────────────────────────────────────────
export interface StandardResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[];
}

// ─── Typed API error ───────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Auth headers helper ───────────────────────────────────────────────────
function getHeaders(): Record<string, string> {
  const token    = localStorage.getItem('auth_token') ?? '';
  const deviceId = localStorage.getItem('device_id')  ?? 'web-client';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Device-ID': deviceId,
  };
}

// ─── Core request ─────────────────────────────────────────────────────────
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<StandardResponse<T>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: getHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let json: StandardResponse<T>;
  try {
    json = (await response.json()) as StandardResponse<T>;
  } catch {
    throw new ApiError(
      `Server returned a non-JSON response (HTTP ${response.status})`,
      response.status,
    );
  }

  if (!response.ok) {
    throw new ApiError(
      json?.message ?? `Request failed with status ${response.status}`,
      response.status,
      json?.errors ?? [],
    );
  }

  return json;
}

// ─── Convenience methods ───────────────────────────────────────────────────
export const api = {
  get:    <T>(path: string)                => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown) => request<T>('POST',   path, body),
  put:    <T>(path: string, body: unknown) => request<T>('PUT',    path, body),
  delete: <T>(path: string)               => request<T>('DELETE', path),
};
