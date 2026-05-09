# SignalMDM — Frontend Security Alignment Guide (TypeScript)

This document tells the frontend team exactly what to implement to work with the Python security middleware.

---

## 1. npm Packages Required

```bash
npm install crypto-js axios
npm install --save-dev @types/crypto-js
```

---

## 2. Environment Variables (`.env.local`)

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_TOKEN_ENCRYPTION_KEY=a3f1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2
```

> [!IMPORTANT]
> `VITE_TOKEN_ENCRYPTION_KEY` must be the **exact same 64-char hex string** as `TOKEN_ENCRYPTION_KEY` in the backend `.env`. This is the shared AES-256 secret.

---

## 3. Device Fingerprint Utility

The fingerprint **binds the JWT to the device that logged in**. Any request from a different device is rejected by the backend.

```typescript
// src/utils/fingerprint.ts
import CryptoJS from 'crypto-js';

/**
 * Generate a stable device fingerprint string.
 * For production, use a library like @fingerprintjs/fingerprintjs for
 * a richer, more stable device ID. For development, a UUID stored in
 * localStorage is sufficient.
 */
export function getDeviceId(): string {
  const KEY = 'signal_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();           // Web Crypto API — built into browsers
    localStorage.setItem(KEY, id);
  }
  return id;
}

/**
 * Compute SHA-256(deviceId|userAgent|userId).
 * Must match Python exactly:
 *   hashlib.sha256(f"{device_id}|{user_agent}|{user_id}".encode()).hexdigest()
 */
export function buildFingerprint(deviceId: string, userAgent: string, userId: string): string {
  const raw = `${deviceId}|${userAgent}|${userId}`;
  return CryptoJS.SHA256(raw).toString(); // lowercase hex
}
```

---

## 4. AES-256-CBC Token Encryption

The JWT must be encrypted **before** being sent in the `Authorization` header.

```typescript
// src/utils/tokenCrypto.ts
import CryptoJS from 'crypto-js';

const KEY_HEX = import.meta.env.VITE_TOKEN_ENCRYPTION_KEY as string;

/**
 * Encrypt a raw JWT string with AES-256-CBC.
 * Output format: base64( IV[16 bytes] + CIPHERTEXT )
 * Must match Python aes_decrypt() in signalmdm/middleware/token_utils.py
 */
export function encryptToken(rawJwt: string): string {
  const key = CryptoJS.enc.Hex.parse(KEY_HEX);      // 32-byte key from hex
  const iv  = CryptoJS.lib.WordArray.random(16);     // random 16-byte IV

  const encrypted = CryptoJS.AES.encrypt(rawJwt, key, {
    iv,
    mode:    CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // Combine IV + ciphertext, then base64-encode the whole thing
  const combined = iv.concat(encrypted.ciphertext);
  return CryptoJS.enc.Base64.stringify(combined);
}

/**
 * Decrypt a token received from the backend (e.g. for token refresh flows).
 */
export function decryptToken(encryptedB64: string): string {
  const key = CryptoJS.enc.Hex.parse(KEY_HEX);
  const raw = CryptoJS.enc.Base64.parse(encryptedB64);

  // Split: first 16 words = IV, rest = ciphertext
  const iv         = CryptoJS.lib.WordArray.create(raw.words.slice(0, 4), 16);
  const ciphertext = CryptoJS.lib.WordArray.create(raw.words.slice(4), raw.sigBytes - 16);

  const decrypted = CryptoJS.AES.decrypt({ ciphertext } as CryptoJS.lib.CipherParams, key, {
    iv,
    mode:    CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}
```

---

## 5. Auth Store (Login Flow)

On successful login, the backend returns an **encrypted JWT** (already AES-encrypted server-side) and the raw `userId`. Store both securely.

```typescript
// src/store/authStore.ts  (Zustand example — adapt to Redux/Context as needed)
import { create } from 'zustand';
import { buildFingerprint, getDeviceId } from '../utils/fingerprint';

interface AuthState {
  encryptedToken: string | null;
  userId: string | null;
  tenantId: string | null;
  role: string | null;
  login: (token: string, userId: string, tenantId: string, role: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  encryptedToken: sessionStorage.getItem('signal_token'),
  userId:   sessionStorage.getItem('signal_user_id'),
  tenantId: sessionStorage.getItem('signal_tenant_id'),
  role:     sessionStorage.getItem('signal_role'),

  login: (token, userId, tenantId, role) => {
    sessionStorage.setItem('signal_token',     token);
    sessionStorage.setItem('signal_user_id',   userId);
    sessionStorage.setItem('signal_tenant_id', tenantId);
    sessionStorage.setItem('signal_role',      role);
    set({ encryptedToken: token, userId, tenantId, role });
  },

  logout: () => {
    sessionStorage.clear();
    set({ encryptedToken: null, userId: null, tenantId: null, role: null });
  },
}));
```

> [!TIP]
> Use `sessionStorage` (cleared on tab close) instead of `localStorage` for tokens. Never store tokens in cookies without `HttpOnly` + `Secure` flags.

---

## 6. Axios API Client (Reusable)

This client automatically attaches all required security headers to every request.

```typescript
// src/api/apiClient.ts
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { getDeviceId } from '../utils/fingerprint';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

// Request interceptor — attach security headers on every call
apiClient.interceptors.request.use((config) => {
  const { encryptedToken } = useAuthStore.getState();

  if (encryptedToken) {
    // AES-encrypted JWT in Authorization header
    config.headers['Authorization'] = `Bearer ${encryptedToken}`;
  }

  // Stable device fingerprint — used by backend to validate fpHash in JWT
  config.headers['X-Device-ID'] = getDeviceId();

  return config;
});

// Response interceptor — handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 7. Required HTTP Headers Summary

Every authenticated API call **must** include these headers:

| Header | Value | Description |
|--------|-------|-------------|
| `Authorization` | `Bearer <encrypted_token>` | AES-256-CBC encrypted JWT |
| `X-Device-ID` | `<stable device UUID>` | From `localStorage`, used for fingerprint check |
| `User-Agent` | *(browser sets automatically)* | Combined with Device-ID for fingerprint |
| `Content-Type` | `application/json` | For JSON bodies |

> [!IMPORTANT]
> `X-Tenant-ID` is **no longer required** as a separate header. The tenant is now extracted from the verified JWT payload on the backend.

---

## 8. JWT Payload Structure

When the backend creates a JWT (at login), it includes these claims. The frontend does **not** create JWTs — it only stores and sends the one received from the server.

```json
{
  "sub":       "user-uuid-here",
  "tenant_id": "tenant-uuid-here",
  "role":      "admin",
  "fpHash":    "sha256-hex-of-deviceId|userAgent|userId",
  "exp":       1715000000
}
```

---

## 9. Login API Call Example

```typescript
// src/api/authApi.ts
import apiClient from './apiClient';
import { getDeviceId, buildFingerprint } from '../utils/fingerprint';
import { useAuthStore } from '../store/authStore';

interface LoginResponse {
  success: boolean;
  data: {
    encrypted_token: string;   // AES-encrypted JWT — ready to store & send
    user_id: string;
    tenant_id: string;
    role: string;
  };
}

export async function login(username: string, password: string): Promise<void> {
  const deviceId  = getDeviceId();
  const userAgent = navigator.userAgent;

  const response = await apiClient.post<LoginResponse>('/auth/login', {
    username,
    password,
    deviceId,    // backend uses this to embed fpHash in JWT at login time
    userAgent,
  });

  const { encrypted_token, user_id, tenant_id, role } = response.data.data;

  // Store the encrypted token — it is sent as-is in Authorization header
  useAuthStore.getState().login(encrypted_token, user_id, tenant_id, role);
}

export async function logout(): Promise<void> {
  // Backend adds token to Redis blacklist
  await apiClient.post('/auth/logout');
  useAuthStore.getState().logout();
}
```

---

## 10. Example API Calls

```typescript
// src/api/sourcesApi.ts
import apiClient from './apiClient';

export const sourcesApi = {
  register: (data: { source_name: string; source_code: string; source_type: string; connection_type: string }) =>
    apiClient.post('/sources/register', data),

  list: (skip = 0, limit = 50) =>
    apiClient.get('/sources/', { params: { skip, limit } }),

  get: (sourceId: string) =>
    apiClient.get(`/sources/${sourceId}`),
};

// src/api/ingestionApi.ts
import apiClient from './apiClient';

export const ingestionApi = {
  startRun: (sourceSystemId: string, triggeredBy?: string) =>
    apiClient.post('/ingestion/start', { source_system_id: sourceSystemId, triggered_by: triggeredBy }),

  uploadFile: (runId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post(`/ingestion/${runId}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getStatus: (runId: string) =>
    apiClient.get(`/ingestion/${runId}/status`),

  listRuns: (skip = 0, limit = 20) =>
    apiClient.get('/ingestion/', { params: { skip, limit } }),
};
```

---

## 11. Security Checklist for Frontend

- `[x]` Never store raw (unencrypted) JWT in localStorage
- `[x]` Always use `sessionStorage` for token storage
- `[x]` Generate a stable `deviceId` per browser via localStorage
- `[x]` Send `X-Device-ID` on every authenticated request
- `[x]` Use the AES encrypt utility before storing or sending the token
- `[x]` Handle 401 globally → redirect to `/login` + clear auth store
- `[x]` Handle 403 → show "Access Denied" screen (role mismatch)
- `[x]` Never log tokens to the console in production
- `[x]` Validate `VITE_TOKEN_ENCRYPTION_KEY` is set before making API calls
