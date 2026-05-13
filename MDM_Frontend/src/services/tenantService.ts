/**
 * src/services/tenantService.ts
 * ------------------------------
 * Service layer for Tenant Management API endpoints.
 * Restricted to Platform Admins (SuperAdmins).
 */

import { api } from './api';

// ─── Tenant model (TenantRead) ──────────────────────────────────────────────

export interface TenantRecord {
  id: string;          // ← tenant_id
  tenantName: string;  // ← tenant_name
  tenantCode: string;  // ← tenant_code
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  createdDate: string; // YYYY-MM-DD
}

function toTenantRecord(raw: any): TenantRecord {
  return {
    id: raw.tenant_id,
    tenantName: raw.tenant_name,
    tenantCode: raw.tenant_code,
    status: raw.status,
    createdDate: raw.created_at.slice(0, 10),
  };
}

// ─── Services ─────────────────────────────────────────────────────────────

export const tenantService = {
  /**
   * Fetch all tenants (Platform Admin only).
   * GET /api/v1/tenants/?skip=<skip>&limit=<limit>
   */
  async listTenants(skip = 0, limit = 100): Promise<TenantRecord[]> {
    const res = await api.get<any[]>(`/tenants/?skip=${skip}&limit=${limit}`);
    return (res.data ?? []).map(toTenantRecord);
  },

  /**
   * Fetch a single tenant by UUID.
   * GET /api/v1/tenants/{tenant_id}
   */
  async getTenant(tenantId: string): Promise<TenantRecord> {
    const res = await api.get<any>(`/tenants/${tenantId}`);
    if (!res.data) throw new Error('Tenant not found.');
    return toTenantRecord(res.data);
  },

  /**
   * Create a new root tenant (Platform Admin only).
   * POST /api/v1/tenants/
   */
  async createTenant(data: { tenant_name: string; tenant_code: string }): Promise<TenantRecord> {
    const res = await api.post<any>('/tenants/', data);
    if (!res.data) throw new Error('No data returned from server after tenant creation.');
    return toTenantRecord(res.data);
  },

  /**
   * Update tenant status or name.
   * PATCH /api/v1/tenants/{tenant_id}
   */
  async updateTenant(tenantId: string, data: { tenant_name?: string; status?: string }): Promise<TenantRecord> {
    const res = await api.patch<any>(`/tenants/${tenantId}`, data);
    if (!res.data) throw new Error('Failed to update tenant.');
    return toTenantRecord(res.data);
  },
};
