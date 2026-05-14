/**
 * src/services/uploadService.ts
 * -------------------------------
 * File upload API aligned with the ingestion pipeline backend.
 *
 * Backend flow (see MDM_Backend/signalmdm/routers/ingestion_router.py):
 *   - Files are written under storage/uploads/{run_id}/ with a UUID prefix.
 *   - Metadata (original filename, stored path, checksum, size) is persisted
 *     in `file_uploads` via raw_service.save_file_upload.
 *   - POST /api/v1/ingestion/{run_id}/upload — multipart field name: `file`
 *
 * Mirrors patterns in sourceService.ts / ingestionRunService.ts (StandardResponse, headers).
 */

import { api, ApiError } from './api';

/** `data` payload from POST /ingestion/{run_id}/upload */
export interface IngestionUploadResultData {
  run_id: string;
  file_id: string;
  filename: string | null;
  size_bytes: number;
  async_processing: boolean;
  /** Present when sync path reports configured pacing (seconds between states). */
  stage_delay_seconds?: number;
}

export const uploadService = {
  /**
   * Upload a CSV or JSON file to an existing ingestion run.
   * POST /api/v1/ingestion/{run_id}/upload
   *
   * @param tenantId Required when calling as platform super-admin (X-Tenant-ID).
   */
  async uploadToIngestionRun(
    runId: string,
    file: File,
    tenantId?: string,
  ): Promise<IngestionUploadResultData> {
    const formData = new FormData();
    formData.append('file', file);
    const headers = tenantId ? { 'X-Tenant-ID': tenantId } : undefined;
    const res = await api.postForm<IngestionUploadResultData>(
      `/ingestion/${runId}/upload`,
      formData,
      headers,
    );
    if (!res.success || res.data == null) {
      throw new ApiError(res.message || 'Upload failed', 400, res.errors ?? []);
    }
    return res.data;
  },

  /**
   * Upload pasted JSON as a .json file (same endpoint as file upload).
   */
  async uploadJsonPayloadToRun(
    runId: string,
    jsonText: string,
    tenantId?: string,
    filename = 'pasted_payload.json',
  ): Promise<IngestionUploadResultData> {
    const name = filename.toLowerCase().endsWith('.json') ? filename : `${filename}.json`;
    const blob = new Blob([jsonText], { type: 'application/json' });
    const file = new File([blob], name, { type: 'application/json' });
    return uploadService.uploadToIngestionRun(runId, file, tenantId);
  },
};

export { ApiError };
