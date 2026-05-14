// UploadData — integrated with ingestion upload API (same patterns as IngestionRuns / SourceSystems)
import {
    useState,
    useRef,
    useCallback,
    useEffect,
    useMemo,
    type DragEvent,
    type ChangeEvent,
} from 'react';

import '../../styles/theme.css';
import '../../styles/UploadData.css';

import { authService } from '../../services/authService';
import { sourceService, type SourceRecord } from '../../services/sourceService';
import { tenantService, type TenantRecord } from '../../services/tenantService';
import {
    ingestionRunService,
    type IngestionRunRecord,
    type RunStatus,
} from '../../services/ingestionRunService';
import { uploadService, type IngestionUploadResultData } from '../../services/uploadService';
import { ApiError } from '../../services/api';

type InputMode = 'file' | 'json';
type UploadStatus = 'uploading' | 'success' | 'error' | null;
type ValidationStatus = 'VALID' | 'WARNING' | 'ERROR';

interface PreviewRow {
    rowNum: number;
    srcId: string;
    payload: string;
    status: ValidationStatus;
}

interface ErrorState {
    runId?: string | null;
    entityType?: string | null;
    file?: string | null;
    json?: string | null;
    general?: string | null;
}

const MAX_FILE_MB = 50;
const MAX_PREVIEW_ROWS = 40;
const UPLOADABLE_STATES: RunStatus[] = ['CREATED', 'RUNNING', 'RAW_LOADED'];

const FORMAT_ICONS: Record<string, string> = { csv: '📄', json: '📋', default: '📁' };

const JSON_PLACEHOLDER = `[
  { "customerName": "Example Co", "emailId": "a@example.com" }
]`;

function getFileExt(name: string): string {
    const parts = name.split('.');
    return (parts[parts.length - 1] || '').toLowerCase();
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Naive CSV row split with quoted-field support (good enough for preview). */
function splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            inQ = !inQ;
            continue;
        }
        if (c === ',' && !inQ) {
            out.push(cur.trim());
            cur = '';
            continue;
        }
        cur += c;
    }
    out.push(cur.trim());
    return out;
}

function buildPreviewFromCsv(text: string, maxRows: number): PreviewRow[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];
    const headers = splitCsvLine(lines[0]);
    if (!headers.length) return [];
    const rows: PreviewRow[] = [];
    for (let i = 1; i < lines.length && rows.length < maxRows; i++) {
        const cells = splitCsvLine(lines[i]);
        const obj: Record<string, string> = {};
        headers.forEach((h, j) => {
            obj[h] = cells[j] ?? '';
        });
        const idKey =
            headers.find((h) => /^(id|external[_-]?id|source[_-]?id|record[_-]?id)$/i.test(h)) ||
            headers[0];
        const srcId = String(obj[idKey] ?? `row-${i}`);
        const payload = JSON.stringify(obj);
        const vals = Object.values(obj);
        let status: ValidationStatus = 'VALID';
        if (vals.every((v) => !v || String(v).trim() === '')) status = 'ERROR';
        else if (vals.some((v) => !v || String(v).trim() === '')) status = 'WARNING';
        rows.push({ rowNum: i, srcId, payload, status });
    }
    return rows;
}

function buildPreviewFromJson(text: string, maxRows: number): PreviewRow[] {
    const data = JSON.parse(text) as unknown;
    const arr = Array.isArray(data) ? data : [data];
    return arr.slice(0, maxRows).map((row, idx) => {
        const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
        const idVal = o.id ?? o.externalId ?? o.sourceId;
        const srcId =
            idVal != null && String(idVal).trim() !== '' ? String(idVal) : `row-${idx + 1}`;
        const payload = JSON.stringify(row);
        const vals = Object.values(o).map((v) => (v == null ? '' : String(v)));
        let status: ValidationStatus = 'VALID';
        if (vals.every((v) => v.trim() === '')) status = 'ERROR';
        else if (vals.some((v) => v.trim() === '')) status = 'WARNING';
        return { rowNum: idx + 1, srcId, payload, status };
    });
}

function runLabel(run: IngestionRunRecord): string {
    const short = run.id.slice(0, 8);
    return `${short}… — ${run.sourceName} (${run.state})`;
}

export default function UploadData() {
    const [runs, setRuns] = useState<IngestionRunRecord[]>([]);
    const [sources, setSources] = useState<SourceRecord[]>([]);
    const [tenants, setTenants] = useState<TenantRecord[]>([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');
    const [pageLoading, setPageLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);

    const [runId, setRunId] = useState<string>('');
    const [entityType, setEntityType] = useState<string>('');
    const [inputMode, setInputMode] = useState<InputMode>('file');
    const [file, setFile] = useState<File | null>(null);
    const [jsonPayload, setJsonPayload] = useState<string>('');
    const [isDragging, setIsDragging] = useState(false);
    const [errors, setErrors] = useState<ErrorState>({});
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>(null);
    const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);
    const [jsonError, setJsonError] = useState('');
    const [lastResult, setLastResult] = useState<IngestionUploadResultData | null>(null);
    const [pipelineState, setPipelineState] = useState<string | null>(null);
    const [recordCountAfter, setRecordCountAfter] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const loadData = useCallback(async () => {
        setPageLoading(true);
        setPageError(null);
        try {
            await authService.init();
            const adminInfo = authService.getAdminInfoFromCookie();
            const superAdmin =
                adminInfo?.tenant_id === 'platform' || adminInfo?.role === 'admin';
            setIsSuperAdmin(superAdmin);

            try {
                const tenantData = await tenantService.listTenants();
                setTenants(tenantData);
                if (tenantData.length > 0) setIsSuperAdmin(true);
            } catch {
                /* tenant list may fail for non–platform users */
            }

            const tId = selectedTenantId === 'ALL' ? undefined : selectedTenantId;
            (window as unknown as { activeTenantId?: string }).activeTenantId = tId;

            const srcData = await sourceService.listSources(0, 100, tId);
            setSources(srcData);
            const nameMap: Record<string, string> = {};
            srcData.forEach((s) => {
                nameMap[s.id] = s.sourceName;
            });
            const runData = await ingestionRunService.listRuns(0, 50, nameMap, tId);
            setRuns(runData);
        } catch (err) {
            setPageError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setPageLoading(false);
        }
    }, [selectedTenantId]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const entityOptions = useMemo(() => {
        const set = new Set<string>();
        sources.forEach((s) => s.supportedEntities.forEach((e) => set.add(e)));
        return Array.from(set).sort();
    }, [sources]);

    /** Same scope as Ingestion Runs table; optional entity filter only (not state — completed runs still appear). */
    const runsForSelect = useMemo(() => {
        if (!entityType) return runs;
        return runs.filter((r) => {
            const src = sources.find((s) => s.id === r.sourceId);
            if (!src) return true;
            if (!src.supportedEntities.length) return true;
            return src.supportedEntities.includes(entityType);
        });
    }, [runs, sources, entityType]);

    const buildPreviewFromFile = useCallback(async (f: File) => {
        const ext = getFileExt(f.name);
        const text = await f.text();
        if (ext === 'json') {
            setPreviewRows(buildPreviewFromJson(text, MAX_PREVIEW_ROWS));
        } else {
            setPreviewRows(buildPreviewFromCsv(text, MAX_PREVIEW_ROWS));
        }
    }, []);

    const handleFileSelect = useCallback(
        (f: File) => {
            const ext = getFileExt(f.name);
            if (!['csv', 'json'].includes(ext)) {
                setErrors((prev) => ({
                    ...prev,
                    file: 'Use CSV or JSON (backend pipeline matches IngestionRuns).',
                }));
                return;
            }
            const mb = f.size / (1024 * 1024);
            if (mb > MAX_FILE_MB) {
                setErrors((prev) => ({
                    ...prev,
                    file: `File exceeds ${MAX_FILE_MB} MB limit.`,
                }));
                return;
            }
            if (f.size === 0) {
                setErrors((prev) => ({ ...prev, file: 'File is empty.' }));
                return;
            }
            setErrors((prev) => ({ ...prev, file: null, general: null }));
            setFile(f);
            setUploadStatus(null);
            setUploadProgress(null);
            setLastResult(null);
            setPipelineState(null);
            setRecordCountAfter(null);
            void buildPreviewFromFile(f).catch(() => {
                setPreviewRows(null);
                setErrors((prev) => ({
                    ...prev,
                    file: 'Could not read file for preview.',
                }));
            });
        },
        [buildPreviewFromFile],
    );

    const handleDrop = useCallback(
        (e: DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);
            const dropped = e.dataTransfer.files[0];
            if (dropped) handleFileSelect(dropped);
        },
        [handleFileSelect],
    );

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleJsonChange = (val: string) => {
        setJsonPayload(val);
        setJsonError('');
        setLastResult(null);
        setPipelineState(null);
        setRecordCountAfter(null);
        if (!val.trim()) {
            setPreviewRows(null);
            return;
        }
        try {
            setPreviewRows(buildPreviewFromJson(val, MAX_PREVIEW_ROWS));
        } catch {
            setJsonError('Invalid JSON format');
            setPreviewRows(null);
        }
    };

    const validate = () => {
        const errs: ErrorState = {};
        if (!runId) errs.runId = 'Select an ingestion run';
        if (inputMode === 'file' && !file) errs.file = 'Select a CSV or JSON file';
        if (inputMode === 'json' && !jsonPayload.trim()) errs.json = 'Paste a JSON array or object';
        if (inputMode === 'json' && jsonPayload.trim()) {
            try {
                JSON.parse(jsonPayload);
            } catch {
                errs.json = 'Invalid JSON format';
            }
        }
        if (!pageLoading && runs.length === 0) {
            errs.general =
                'No ingestion runs loaded. Start a run from Ingestion Runs, or adjust tenant filter.';
        } else if (!pageLoading && runsForSelect.length === 0 && runs.length > 0) {
            errs.general = 'No runs match the entity filter; clear the filter or pick another entity.';
        }
        if (runId) {
            const run = runs.find((r) => r.id === runId);
            if (run && !UPLOADABLE_STATES.includes(run.state)) {
                errs.runId = `This run is ${run.state}; uploads only work for Created or Running.`;
            }
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleUpload = async () => {
        if (!validate()) return;
        const run = runs.find((r) => r.id === runId);
        if (!run) {
            setErrors((e) => ({ ...e, runId: 'Run not found. Refresh the list.' }));
            return;
        }
        if (!UPLOADABLE_STATES.includes(run.state)) {
            setErrors((e) => ({
                ...e,
                runId: `Run is ${run.state}; uploads are only allowed for Created or Running.`,
            }));
            return;
        }

        const tenantHeader = isSuperAdmin ? run.tenantId : undefined;

        setUploadStatus('uploading');
        setUploadProgress(5);
        setErrors({});
        setLastResult(null);
        setPipelineState(null);
        setRecordCountAfter(null);

        const progressTimer = window.setInterval(() => {
            setUploadProgress((p) => (p == null || p >= 90 ? 90 : p + 8));
        }, 220);

        try {
            let result: IngestionUploadResultData;
            if (inputMode === 'file' && file) {
                result = await uploadService.uploadToIngestionRun(runId, file, tenantHeader);
            } else {
                result = await uploadService.uploadJsonPayloadToRun(
                    runId,
                    jsonPayload,
                    tenantHeader,
                );
            }
            setUploadProgress(100);
            setLastResult(result);
            setUploadStatus('success');

            /* Light poll — backend may process async (Celery) or sync */
            let finalState = '';
            let recCount: number | null = null;
            for (let i = 0; i < 14; i++) {
                await new Promise((r) => setTimeout(r, 1200));
                const st = await ingestionRunService.getRunStatus(runId, tenantHeader);
                finalState = st.state;
                recCount = st.record_count;
                if (['COMPLETED', 'FAILED'].includes(st.state)) break;
            }
            setPipelineState(finalState || null);
            setRecordCountAfter(recCount);
            void loadData();
        } catch (err) {
            setUploadStatus('error');
            const msg =
                err instanceof ApiError
                    ? err.message
                    : err instanceof Error
                      ? err.message
                      : 'Upload failed';
            setErrors((e) => ({ ...e, general: msg }));
        } finally {
            window.clearInterval(progressTimer);
            setUploadProgress(null);
        }
    };

    const handleReset = () => {
        setFile(null);
        setJsonPayload('');
        setPreviewRows(null);
        setUploadStatus(null);
        setUploadProgress(null);
        setErrors({});
        setJsonError('');
        setRunId('');
        setLastResult(null);
        setPipelineState(null);
        setRecordCountAfter(null);
    };

    const valid = previewRows ? previewRows.filter((r) => r.status === 'VALID').length : 0;
    const errCount = previewRows ? previewRows.filter((r) => r.status === 'ERROR').length : 0;
    const warnCount = previewRows ? previewRows.filter((r) => r.status === 'WARNING').length : 0;

    return (
        <div className="ud-page">
            <div className="ud-page-header">
                <div>
                    <h1 className="ud-page-title">Upload Data</h1>
                    <p className="ud-page-subtitle">
                        Upload CSV or JSON into an ingestion run (stored on disk; DB tracks file name
                        and metadata via file_uploads)
                    </p>
                </div>
                {uploadStatus === 'success' && (
                    <button className="ud-btn ud-btn--ghost" onClick={handleReset} type="button">
                        ↻ Upload Another
                    </button>
                )}
            </div>

            {pageError && (
                <div
                    className="ud-alert ud-alert--error"
                    style={{ marginBottom: 16 }}
                >
                    <span>✕</span>
                    <span>{pageError}</span>
                </div>
            )}

            {errors.general && (
                <div
                    className="ud-alert ud-alert--error"
                    style={{ marginBottom: 16 }}
                >
                    <span>✕</span>
                    <span>{errors.general}</span>
                </div>
            )}

            <div className="ud-layout">
                <div className="ud-upload-card">
                    <div className="ud-card-header">
                        <h2 className="ud-card-title">Upload Configuration</h2>
                        <p className="ud-card-subtitle">
                            Choose tenant (if platform), an open run, then upload — same API as
                            Ingestion Runs
                        </p>
                    </div>

                    <div className="ud-card-body">
                        {isSuperAdmin && tenants.length > 0 && (
                            <div className="ud-field">
                                <label className="ud-label">Tenant filter</label>
                                <select
                                    className="ud-select"
                                    value={selectedTenantId}
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                        setSelectedTenantId(e.target.value);
                                        setRunId('');
                                    }}
                                >
                                    <option value="ALL">All tenants</option>
                                    {tenants.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.tenantName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className={`ud-field${errors.runId ? ' ud-field--error' : ''}`}>
                            <label className="ud-label">
                                Ingestion Run <span className="ud-required">*</span>
                            </label>
                            <select
                                className="ud-select"
                                value={runId}
                                disabled={pageLoading}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                    setRunId(e.target.value)
                                }
                            >
                                <option value="">
                                    {pageLoading ? 'Loading runs…' : '— Select ingestion run —'}
                                </option>
                                {runsForSelect.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {runLabel(r)}
                                    </option>
                                ))}
                            </select>
                            {errors.runId && (
                                <span className="ud-error-msg">{errors.runId}</span>
                            )}
                        </div>

                        <div className="ud-field">
                            <label className="ud-label">Entity filter (optional)</label>
                            <select
                                className="ud-select"
                                value={entityType}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                    setEntityType(e.target.value);
                                    setRunId('');
                                }}
                            >
                                <option value="">— All entities —</option>
                                {entityOptions.map((e) => (
                                    <option key={e} value={e}>
                                        {e}
                                    </option>
                                ))}
                            </select>
                            <span
                                style={{
                                    fontSize: 12,
                                    color: 'var(--text-muted)',
                                    marginTop: 6,
                                    display: 'block',
                                }}
                            >
                                Narrows the run list to sources that declare this entity.
                            </span>
                        </div>

                        <div className="ud-field">
                            <label className="ud-label">Input Method</label>
                            <div className="ud-mode-tabs">
                                <button
                                    className={`ud-mode-tab${inputMode === 'file' ? ' ud-mode-tab--active' : ''}`}
                                    onClick={() => {
                                        setInputMode('file');
                                        setJsonPayload('');
                                        setJsonError('');
                                    }}
                                    type="button"
                                >
                                    📁 File Upload
                                </button>
                                <button
                                    className={`ud-mode-tab${inputMode === 'json' ? ' ud-mode-tab--active' : ''}`}
                                    onClick={() => {
                                        setInputMode('json');
                                        setFile(null);
                                        setPreviewRows(null);
                                    }}
                                    type="button"
                                >
                                    📋 Paste JSON
                                </button>
                            </div>
                        </div>

                        {inputMode === 'file' && (
                            <div className="ud-field">
                                {!file ? (
                                    <div
                                        className={`ud-dropzone${isDragging ? ' ud-dropzone--active' : ''}`}
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onClick={() => fileInputRef.current?.click()}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ')
                                                fileInputRef.current?.click();
                                        }}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <span className="ud-dropzone__icon">☁️</span>
                                        <span className="ud-dropzone__label">
                                            Drag & drop CSV or JSON here
                                        </span>
                                        <span className="ud-dropzone__sub">or click to browse</span>
                                        <div className="ud-dropzone__formats">
                                            <span className="ud-format-chip">CSV</span>
                                            <span className="ud-format-chip">JSON</span>
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv,.json"
                                            style={{ display: 'none' }}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                const selected = e.target.files?.[0];
                                                if (selected) handleFileSelect(selected);
                                                e.target.value = '';
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="ud-file-selected">
                                        <span className="ud-file-icon">
                                            {FORMAT_ICONS[getFileExt(file.name)] || FORMAT_ICONS.default}
                                        </span>
                                        <div className="ud-file-info">
                                            <div className="ud-file-name">{file.name}</div>
                                            <div className="ud-file-size">{formatBytes(file.size)}</div>
                                        </div>
                                        <button
                                            className="ud-file-remove"
                                            onClick={() => {
                                                setFile(null);
                                                setPreviewRows(null);
                                                setUploadStatus(null);
                                            }}
                                            type="button"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                                {errors.file && (
                                    <span className="ud-error-msg">{errors.file}</span>
                                )}
                            </div>
                        )}

                        {inputMode === 'json' && (
                            <div className={`ud-field${errors.json ? ' ud-field--error' : ''}`}>
                                <label className="ud-label">JSON Payload</label>
                                <textarea
                                    className="ud-json-textarea"
                                    placeholder={JSON_PLACEHOLDER}
                                    value={jsonPayload}
                                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                                        handleJsonChange(e.target.value)
                                    }
                                />
                                {jsonError && (
                                    <span className="ud-error-msg">{jsonError}</span>
                                )}
                                {errors.json && (
                                    <span className="ud-error-msg">{errors.json}</span>
                                )}
                            </div>
                        )}

                        {uploadStatus === 'uploading' && (
                            <div className="ud-progress-wrap">
                                <div className="ud-progress-label">
                                    <span>Uploading…</span>
                                    <span>{uploadProgress ?? 0}%</span>
                                </div>
                                <div className="ud-progress-bar">
                                    <div
                                        className="ud-progress-fill"
                                        style={{ width: `${uploadProgress ?? 0}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {uploadStatus === 'success' && lastResult && (
                            <div className="ud-alert ud-alert--success">
                                <span>✓</span>
                                <span>
                                    Stored as <strong>{lastResult.filename ?? 'upload'}</strong> (
                                    {formatBytes(lastResult.size_bytes)}
                                    {lastResult.async_processing ? ', async processing' : ', processed inline'}
                                    ).
                                    {pipelineState && ` Run state: ${pipelineState}.`}
                                    {recordCountAfter != null &&
                                        ` Records in run: ${recordCountAfter}.`}
                                </span>
                            </div>
                        )}
                        {uploadStatus === 'error' && (
                            <div className="ud-alert ud-alert--error">
                                <span>✕</span>
                                <span>Upload failed. See message above.</span>
                            </div>
                        )}
                        {inputMode === 'file' && !file && !uploadStatus && (
                            <div className="ud-alert ud-alert--info">
                                <span>ℹ</span>
                                <span>
                                    Max {MAX_FILE_MB} MB per file (server limit). Original file name
                                    is kept in the database; disk path uses a UUID prefix under
                                    storage/uploads/&lt;run_id&gt;/.
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="ud-card-footer">
                        <button
                            className="ud-btn ud-btn--ghost"
                            onClick={handleReset}
                            type="button"
                            disabled={uploadStatus === 'uploading'}
                        >
                            Reset
                        </button>
                        <button
                            className="ud-btn ud-btn--primary"
                            onClick={() => void handleUpload()}
                            disabled={
                                uploadStatus === 'uploading' ||
                                uploadStatus === 'success' ||
                                pageLoading
                            }
                            style={{
                                opacity:
                                    uploadStatus === 'uploading' || uploadStatus === 'success'
                                        ? 0.55
                                        : 1,
                            }}
                            type="button"
                        >
                            {uploadStatus === 'uploading' ? '⏳ Uploading…' : '⬆ Confirm Upload'}
                        </button>
                    </div>
                </div>

                <div className="ud-preview-card">
                    <div className="ud-preview-toolbar">
                        <div className="ud-preview-toolbar__left">
                            <span className="ud-preview-title">Data Preview</span>
                            {previewRows && (
                                <span
                                    className={`ud-preview-badge${errCount > 0 ? ' ud-preview-badge--error' : ' ud-preview-badge--valid'}`}
                                >
                                    {previewRows.length} rows (sample)
                                </span>
                            )}
                        </div>
                    </div>

                    {!previewRows ? (
                        <div className="ud-preview-empty">
                            <span className="ud-preview-empty__icon">🗃</span>
                            <span className="ud-preview-empty__title">No preview available</span>
                            <span className="ud-preview-empty__sub">
                                Select a CSV/JSON file or paste JSON — preview is parsed in the browser
                                only.
                            </span>
                        </div>
                    ) : (
                        <>
                            <div className="ud-preview-table-wrap">
                                <table className="ud-preview-table">
                                    <thead>
                                        <tr>
                                            <th>Row #</th>
                                            <th>Source Record ID</th>
                                            <th>Payload Preview</th>
                                            <th>Heuristic</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewRows.map((row) => (
                                            <tr key={row.rowNum}>
                                                <td>
                                                    <span className="ud-row-num">#{row.rowNum}</span>
                                                </td>
                                                <td>
                                                    <span className="ud-src-id">{row.srcId}</span>
                                                </td>
                                                <td>
                                                    <code className="ud-payload-preview">
                                                        {row.payload.length > 160
                                                            ? `${row.payload.slice(0, 160)}…`
                                                            : row.payload}
                                                    </code>
                                                </td>
                                                <td>
                                                    <span
                                                        className={`ud-val-badge ud-val-badge--${row.status.toLowerCase()}`}
                                                    >
                                                        {row.status === 'VALID'
                                                            ? '✓'
                                                            : row.status === 'ERROR'
                                                              ? '✕'
                                                              : '⚠'}{' '}
                                                        {row.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="ud-preview-footer">
                                <div className="ud-preview-stats">
                                    <span className="ud-preview-stat">
                                        <span className="ud-preview-stat__dot ud-preview-stat__dot--total" />
                                        {previewRows.length} Total
                                    </span>
                                    <span className="ud-preview-stat">
                                        <span className="ud-preview-stat__dot ud-preview-stat__dot--valid" />
                                        {valid} OK
                                    </span>
                                    {warnCount > 0 && (
                                        <span className="ud-preview-stat">
                                            <span
                                                className="ud-preview-stat__dot"
                                                style={{ background: 'var(--amber-500)' }}
                                            />
                                            {warnCount} Warning
                                        </span>
                                    )}
                                    {errCount > 0 && (
                                        <span className="ud-preview-stat">
                                            <span className="ud-preview-stat__dot ud-preview-stat__dot--error" />
                                            {errCount} Empty
                                        </span>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
