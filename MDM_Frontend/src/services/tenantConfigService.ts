/**
 * src/services/tenantConfigService.ts
 * ---------------------------------------
 * Reads and writes the per-admin active tenant scope from Redis via the backend.
 *
 * Modes:
 *   ALL      – platform admin sees data across all tenants
 *   SPECIFIC – data is scoped to a single tenant UUID
 */

import { api } from './api';

export type TenantConfigMode = 'ALL' | 'SPECIFIC';

export interface TenantConfig {
  mode:        TenantConfigMode;
  tenant_id:   string | null;
  tenant_name: string | null;
}

const CACHE_KEY = 'tcfg';   // sessionStorage cache key

function cacheRead(): TenantConfig | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as TenantConfig) : null;
  } catch {
    return null;
  }
}

function cacheWrite(cfg: TenantConfig): void {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(cfg)); } catch { /* quota exceeded – ignore */ }
}

function cacheEvict(): void {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

export const tenantConfigService = {
  /**
   * Get active scope. Reads from sessionStorage cache first for speed,
   * falls back to backend on cache miss (e.g. first load or new tab).
   */
  async get(forceRefresh = false): Promise<TenantConfig> {
    if (!forceRefresh) {
      const cached = cacheRead();
      if (cached) return cached;
    }
    try {
      const res = await api.get<TenantConfig>('/admin/tenant-config');
      const cfg = res.data ?? { mode: 'ALL', tenant_id: null, tenant_name: null };
      cacheWrite(cfg);
      return cfg;
    } catch {
      return { mode: 'ALL', tenant_id: null, tenant_name: null };
    }
  },

  /** Set scope to ALL (no filter). */
  async setAll(): Promise<TenantConfig> {
    const res = await api.put<TenantConfig>('/admin/tenant-config', { mode: 'ALL' });
    const cfg = res.data ?? { mode: 'ALL', tenant_id: null, tenant_name: null };
    cacheWrite(cfg);
    return cfg;
  },

  /** Scope to a specific tenant. */
  async setSpecific(tenantId: string, tenantName: string): Promise<TenantConfig> {
    const res = await api.put<TenantConfig>('/admin/tenant-config', {
      mode: 'SPECIFIC',
      tenant_id: tenantId,
    });
    // Backend validates tenant — use backend response as source of truth
    const cfg = res.data ?? { mode: 'SPECIFIC', tenant_id: tenantId, tenant_name: tenantName };
    cacheWrite(cfg);
    return cfg;
  },

  /** Reset to ALL and clear cache. */
  async reset(): Promise<void> {
    try { await api.delete('/admin/tenant-config'); } catch { /* ignore */ }
    cacheEvict();
  },

  /** Expose cache eviction so AuthContext can call on logout. */
  clearCache: cacheEvict,
};
