/**
 * src/services/ingestionRunService.ts
 * -----------------------------------
 * Service layer for Ingestion Run API endpoints.
 * 
 * Follows the pattern established in sourceService.ts.
 */

import { api, ApiError, getDeviceId } from './api';

// ─── Backend response shape (IngestionRunRead) ─────────────────────────────
export interface IngestionRunRead {
  run_id: string;
  tenant_id: string;
  source_system_id: string;
  state: string;
  triggered_by: string | null;
  file_count: number;
  record_count: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ─── Frontend display model ────────────────────────────────────────────────
export type RunStatus = "CREATED" | "RUNNING" | "RAW_LOADED" | "STAGING_CREATED" | "FAILED" | "COMPLETED";

export interface IngestionRunRecord {
  id: string;
  sourceId: string;
  sourceName: string;
  state: RunStatus;
  triggeredBy: string;
  fileCount: number;
  recordCount: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

// ─── Mapping helper ────────────────────────────────────────────────────────
function toIngestionRunRecord(raw: IngestionRunRead, sourceNameMap: Record<string, string> = {}): IngestionRunRecord {
  return {
    id: raw.run_id,
    sourceId: raw.source_system_id,
    sourceName: sourceNameMap[raw.source_system_id] || raw.source_system_id,
    state: raw.state as RunStatus,
    triggeredBy: raw.triggered_by || 'system',
    fileCount: raw.file_count,
    recordCount: raw.record_count,
    errorMessage: raw.error_message,
    startedAt: raw.started_at ? raw.started_at.replace('T', ' ').slice(0, 16) : null,
    completedAt: raw.completed_at ? raw.completed_at.replace('T', ' ').slice(0, 16) : null,
    createdAt: raw.created_at.replace('T', ' ').slice(0, 16),
  };
}

// ─── Service ───────────────────────────────────────────────────────────────
export const ingestionRunService = {
  /**
   * Fetch all ingestion runs for the authenticated tenant.
   * GET /api/v1/ingestion/
   */
  async listRuns(skip = 0, limit = 50, sourceNameMap: Record<string, string> = {}, tenantId?: string): Promise<IngestionRunRecord[]> {
    const headers = tenantId ? { 'X-Tenant-ID': tenantId } : undefined;
    const res = await api.get<IngestionRunRead[]>(`/ingestion/?skip=${skip}&limit=${limit}`, headers);
    return (res.data ?? []).map(raw => toIngestionRunRecord(raw, sourceNameMap));
  },

  /**
   * Fetch a single ingestion run status.
   * GET /api/v1/ingestion/{run_id}/status
   */
  async getRunStatus(runId: string): Promise<IngestionRunRead> {
    const res = await api.get<IngestionRunRead>(`/ingestion/${runId}/status`);
    if (!res.data) throw new Error('Ingestion run status not found.');
    return res.data;
  },

  /**
   * Start a new ingestion run.
   * POST /api/v1/ingestion/start
   */
  async startRun(sourceSystemId: string, triggeredBy?: string, tenantId?: string): Promise<IngestionRunRecord> {
    const headers = tenantId ? { 'X-Tenant-ID': tenantId } : undefined;
    const res = await api.post<IngestionRunRead>('/ingestion/start', {
      source_system_id: sourceSystemId,
      triggered_by: triggeredBy || 'user',
    }, headers);
    if (!res.data) throw new Error('No data returned after starting ingestion run.');
    return toIngestionRunRecord(res.data);
  },

  /**
   * Upload a file to an ingestion run.
   * POST /api/v1/ingestion/{run_id}/upload
   */
  async uploadFile(runId: string, file: File, tenantId?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {
        'X-Device-ID': getDeviceId()
    };
    if (tenantId) headers['X-Tenant-ID'] = tenantId;

    const res = await fetch(`${(import.meta.env.VITE_API_URL as string) || 'http://localhost:8000/api/v1'}/ingestion/${runId}/upload`, {
      method: 'POST',
      body: formData,
      headers: headers,
      credentials: 'include',
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'File upload failed');
    }
    return res.json();
  },

  /**
   * Cancel an ingestion run.
   * POST /api/v1/ingestion/{run_id}/cancel
   */
  async cancelRun(runId: string, tenantId?: string): Promise<void> {
    const headers = tenantId ? { 'X-Tenant-ID': tenantId } : undefined;
    await api.post(`/ingestion/${runId}/cancel`, {}, headers);
  }
};

// Re-export ApiError for convenience
export { ApiError };
