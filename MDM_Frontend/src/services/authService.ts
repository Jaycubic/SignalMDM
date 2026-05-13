/**
 * src/services/authService.ts
 * ----------------------------
 * Handles all authentication operations against the SignalMDM backend.
 *
 * Security design:
 *   - Uses FingerprintJS to generate a stable device ID on first call.
 *   - Device ID is cached in sessionStorage and sent on every request
 *     as `X-Device-ID` so the backend can validate the device fingerprint
 *     embedded in the JWT.
 *   - Tokens are stored exclusively in httpOnly cookies (set by backend).
 *     This service never reads or stores tokens itself.
 *   - Admin info (non-sensitive) is read from the `adminInfo` cookie which
 *     the backend sets as a readable (non-httpOnly) JSON cookie.
 */

import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { api, setDeviceId, ApiError } from './api';

// ─── Types ────────────────────────────────────────────────────────────────

export interface AdminProfile {
  admin_id:      string;
  email:         string;
  username:      string;
  role:          string;
  is_active:     boolean;
  last_login_at: string | null;
}

export interface LoginResult {
  /** 'verify' = OTP sent, continue to verifyOtp */
  message:  'verify';
  admin_id: string;
  email:    string;
}

export interface OtpResult {
  message:     '2fa_setup' | '2fa_required' | 'success';
  admin_id?:   string;
  totp_secret?: string;
  totp_uri?:   string;
  admin?:      AdminProfile;
  expires_at?: number;
}

export interface AuthSuccessResult {
  message:    'success';
  admin:      AdminProfile;
  expires_at: number;
}

// ─── FingerprintJS initialisation ─────────────────────────────────────────

let _fpPromise: ReturnType<typeof FingerprintJS.load> | null = null;

async function initFingerprint(): Promise<string> {
  if (!_fpPromise) {
    _fpPromise = FingerprintJS.load();
  }
  const fp     = await _fpPromise;
  const result = await fp.get();
  const id     = result.visitorId;
  setDeviceId(id);
  return id;
}

// ─── Cookie reader (non-httpOnly cookies only) ────────────────────────────

function getCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

// ─── Auth Service ─────────────────────────────────────────────────────────

export const authService = {
  /**
   * Call once on app mount (or Login component mount).
   * Generates and caches the stable device fingerprint.
   */
  async init(): Promise<void> {
    try {
      await initFingerprint();
    } catch {
      // FingerprintJS failed (privacy blocker?) — sessionStorage fallback
      // already set in getDeviceId(), so requests will still work.
    }
  },

  /**
   * Step 1 — Submit email + password.
   * Backend sends OTP to the admin's email and returns admin_id.
   */
  async login(email: string, password: string): Promise<LoginResult> {
    await this.init();
    const res = await api.post<LoginResult>('/auth/login', { email, password });
    if (!res.data) throw new ApiError(res.message, 400);
    return res.data;
  },

  /**
   * Step 2 — Submit the 6-digit email OTP.
   * Backend validates OTP and either:
   *   - Issues tokens (no 2FA) → { message: 'success' }
   *   - Returns 2FA step      → { message: '2fa_setup' | '2fa_required' }
   */
  async verifyOtp(adminId: string, code: string): Promise<OtpResult> {
    const res = await api.post<OtpResult>('/auth/verify-otp', {
      admin_id: adminId,
      code,
    });
    if (!res.data) throw new ApiError(res.message, 400);
    return res.data;
  },

  /**
   * Step 3 (only if 2FA enabled) — Submit TOTP code from authenticator app.
   * Backend validates TOTP and issues tokens.
   */
  async verify2FA(adminId: string, code: string): Promise<AuthSuccessResult> {
    const res = await api.post<AuthSuccessResult>('/auth/verify-2fa', {
      admin_id: adminId,
      code,
    });
    if (!res.data) throw new ApiError(res.message, 400);
    return res.data;
  },

  /**
   * Resend the OTP email. Call after OTP expires or user requests resend.
   */
  async resendOtp(adminId: string): Promise<void> {
    await api.post('/auth/resend-otp', { admin_id: adminId });
  },

  /**
   * Refresh the access token using the httpOnly refresh cookie.
   * Call when access token is near expiry or on 401.
   */
  async refresh(): Promise<AuthSuccessResult> {
    const res = await api.post<AuthSuccessResult>('/auth/refresh', {});
    if (!res.data) throw new ApiError(res.message, 401);
    return res.data;
  },

  /**
   * Logout — revokes the token server-side and clears all auth cookies.
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Even on error, the cookies will be cleared server-side on next request.
    }
  },

  /**
   * Return the current admin's profile from the backend.
   * Fails with 401 if not authenticated.
   */
  async getMe(): Promise<AdminProfile> {
    const res = await api.get<{ admin: AdminProfile; role: string }>('/auth/me');
    if (!res.data?.admin) throw new ApiError('Not authenticated', 401);
    return res.data.admin;
  },

  /**
   * Quick check — calls /auth/me and returns true if authenticated.
   * Used by AuthContext on app mount.
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.getMe();
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Read non-sensitive admin info from the readable `adminInfo` cookie.
   * Returns null if not logged in or cookie missing.
   */
  getAdminInfoFromCookie(): Partial<AdminProfile> | null {
    const raw = getCookie('adminInfo');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Partial<AdminProfile>;
    } catch {
      return null;
    }
  },
};
