// UploadData
import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";

/* Import Styles */
import '../../styles/theme.css';
import '../../styles/UploadData.css';

type InputMode = "file" | "json";
type UploadStatus = "uploading" | "success" | "error" | null;
type ValidationStatus = "VALID" | "WARNING" | "ERROR";

interface RunOption {
    id: string;
    label: string;
}

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
}

/* ─── Constants ──────────────────────────────────────────────── */
const MOCK_RUNS: RunOption[] = [
    { id: "RUN-0042", label: "RUN-0042 — Salesforce CRM / CUSTOMER" },
    { id: "RUN-0041", label: "RUN-0041 — SAP ERP Core / PRODUCT" },
    { id: "RUN-0040", label: "RUN-0040 — Oracle Finance / ACCOUNT" },
    { id: "RUN-0039", label: "RUN-0039 — Vendor Portal / SUPPLIER" },
];

const ENTITIES = ["CUSTOMER", "SUPPLIER", "PRODUCT", "ACCOUNT", "ASSET", "LOCATION"];

const FORMAT_ICONS: Record<string, string> = { csv: "📄", xlsx: "📊", json: "📋", default: "📁" };

const MOCK_PREVIEW_ROWS: PreviewRow[] = [
    { rowNum: 1, srcId: "SF-CRM-00142", payload: '{"customerName":"ABC Pharma Pvt. Ltd.","emailId":"contact@abc.com","phone":"+91-9900112233"}', status: "VALID" },
    { rowNum: 2, srcId: "SF-CRM-00143", payload: '{"customerName":"Delta Logistics","emailId":"ops@delta.io","phone":"+91-9812345678"}', status: "VALID" },
    { rowNum: 3, srcId: "SF-CRM-00144", payload: '{"customerName":"NexGen Solutions","emailId":"","phone":"+91-8877665544"}', status: "WARNING" },
    { rowNum: 4, srcId: "SF-CRM-00145", payload: '{"customerName":"","emailId":"info@pinnacle.com","phone":""}', status: "ERROR" },
    { rowNum: 5, srcId: "SF-CRM-00146", payload: '{"customerName":"Horizon Tech","emailId":"hello@horizon.io","phone":"+91-7766554433"}', status: "VALID" },
    { rowNum: 6, srcId: "SF-CRM-00147", payload: '{"customerName":"Apex Systems","emailId":"admin@apex.com","phone":"+91-9988776655"}', status: "VALID" },
];

const JSON_PLACEHOLDER = `[  
  {
    "customerName": "ABC Pharma Pvt. Ltd.",
    "emailId": "contact@abc.com",
    "phone": "+91-9900112233",
    "billingAddress": "Mumbai, India"
  },
  {
    "customerName": "Delta Logistics",
    "emailId": "ops@delta.io",
    "phone": "+91-9812345678"
  }
]`;

function getFileExt(name: string): string {
    const parts = name.split(".");
    return (parts[parts.length - 1] || "").toLowerCase();
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/* ─── Upload Data Page ───────────────────────────────────────── */
export default function UploadData() {
    const [runId, setRunId] = useState<string>("");
    const [entityType, setEntityType] = useState<string>("");
    const [inputMode, setInputMode] = useState<InputMode>("file");
    const [file, setFile] = useState<File | null>(null);
    const [jsonPayload, setJsonPayload] = useState<string>("");
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [errors, setErrors] = useState<ErrorState>({});
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>(null);
    const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);
    const [jsonError, setJsonError] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    /* Drag-and-drop handlers */
    const handleFileSelect = useCallback((f: File) => {
        const ext = getFileExt(f.name);
        if (!["csv", "xlsx", "xls", "json"].includes(ext)) {
            setErrors((prev) => ({ ...prev, file: "Unsupported format. Use CSV, Excel, or JSON." }));
            return;
        }
        if (f.size === 0) {
            setErrors((prev) => ({ ...prev, file: "File is empty." }));
            return;
        }
        setErrors((prev) => ({ ...prev, file: null }));
        setFile(f);
        setUploadStatus(null);
        setUploadProgress(null);
        setTimeout(() => setPreviewRows(MOCK_PREVIEW_ROWS), 400);
    }, []);

    const handleDrop = useCallback(
        (e: DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);
            const dropped = e.dataTransfer.files[0];
            if (dropped) handleFileSelect(dropped);
        },
        [handleFileSelect]
    );

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleJsonChange = (val: string) => {
        setJsonPayload(val);
        setJsonError("");
        if (val.trim()) {
            try {
                JSON.parse(val);
                setPreviewRows(MOCK_PREVIEW_ROWS.slice(0, 4));
            } catch {
                setJsonError("Invalid JSON format");
                setPreviewRows(null);
            }
        } else {
            setPreviewRows(null);
        }
    };

    const validate = () => {
        const errs: ErrorState = {};
        if (!runId) errs.runId = "Ingestion run is required";
        if (!entityType) errs.entityType = "Entity type is required";
        if (inputMode === "file" && !file) errs.file = "Please select a file to upload";
        if (inputMode === "json" && !jsonPayload.trim()) errs.json = "Paste a valid JSON payload";
        if (inputMode === "json" && jsonPayload.trim()) {
            try {
                JSON.parse(jsonPayload);
            } catch {
                errs.json = "Invalid JSON format";
            }
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleUpload = () => {
        if (!validate()) return;
        setUploadStatus("uploading");
        setUploadProgress(0);
        const steps = [10, 25, 40, 60, 75, 88, 95, 100];
        let i = 0;
        const interval = setInterval(() => {
            if (i < steps.length) {
                setUploadProgress(steps[i]);
                i++;
            } else {
                clearInterval(interval);
                setUploadStatus("success");
            }
        }, 280);
    };

    const handleReset = () => {
        setFile(null);
        setJsonPayload("");
        setPreviewRows(null);
        setUploadStatus(null);
        setUploadProgress(null);
        setErrors({});
        setJsonError("");
    };

    const valid = previewRows ? previewRows.filter((r) => r.status === "VALID").length : 0;
    const errCount = previewRows ? previewRows.filter((r) => r.status === "ERROR").length : 0;
    const warnCount = previewRows ? previewRows.filter((r) => r.status === "WARNING").length : 0;

    return (
        <div className="ud-page">
            {/* Header */}
            <div className="ud-page-header">
                <div>
                    <h1 className="ud-page-title">Upload Data</h1>
                    <p className="ud-page-subtitle">Upload raw source data into the ingestion pipeline</p>
                </div>
                {uploadStatus === "success" && (
                    <button className="ud-btn ud-btn--ghost" onClick={handleReset}>
                        ↻ Upload Another
                    </button>
                )}
            </div>

            <div className="ud-layout">
                {/* Left: Upload Config Card */}
                <div className="ud-upload-card">
                    <div className="ud-card-header">
                        <h2 className="ud-card-title">Upload Configuration</h2>
                        <p className="ud-card-subtitle">Select run, entity and provide data</p>
                    </div>

                    <div className="ud-card-body">
                        {/* Run select */}
                        <div className={`ud-field${errors.runId ? " ud-field--error" : ""}`}>
                            <label className="ud-label">
                                Ingestion Run <span className="ud-required">*</span>
                            </label>
                            <select className="ud-select" value={runId} onChange={(e: ChangeEvent<HTMLSelectElement>) => setRunId(e.target.value)}>
                                <option value="">— Select ingestion run —</option>
                                {MOCK_RUNS.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                            {errors.runId && <span className="ud-error-msg">{errors.runId}</span>}
                        </div>

                        {/* Entity select */}
                        <div className={`ud-field${errors.entityType ? " ud-field--error" : ""}`}>
                            <label className="ud-label">
                                Entity Type <span className="ud-required">*</span>
                            </label>
                            <select className="ud-select" value={entityType} onChange={(e: ChangeEvent<HTMLSelectElement>) => setEntityType(e.target.value)}>
                                <option value="">— Select entity type —</option>
                                {ENTITIES.map((e) => (
                                    <option key={e} value={e}>
                                        {e}
                                    </option>
                                ))}
                            </select>
                            {errors.entityType && <span className="ud-error-msg">{errors.entityType}</span>}
                        </div>

                        {/* Mode tabs */}
                        <div className="ud-field">
                            <label className="ud-label">Input Method</label>
                            <div className="ud-mode-tabs">
                                <button
                                    className={`ud-mode-tab${inputMode === "file" ? " ud-mode-tab--active" : ""}`}
                                    onClick={() => {
                                        setInputMode("file");
                                        setPreviewRows(null);
                                    }}
                                    type="button"
                                >
                                    📁 File Upload
                                </button>
                                <button
                                    className={`ud-mode-tab${inputMode === "json" ? " ud-mode-tab--active" : ""}`}
                                    onClick={() => {
                                        setInputMode("json");
                                        setFile(null);
                                        setPreviewRows(null);
                                    }}
                                    type="button"
                                >
                                    📋 Paste JSON
                                </button>
                            </div>
                        </div>

                        {/* File upload */}
                        {inputMode === "file" && (
                            <div className="ud-field">
                                {!file ? (
                                    <div
                                        className={`ud-dropzone${isDragging ? " ud-dropzone--active" : ""}`}
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <span className="ud-dropzone__icon">☁️</span>
                                        <span className="ud-dropzone__label">Drag & drop a file here</span>
                                        <span className="ud-dropzone__sub">or click to browse</span>
                                        <div className="ud-dropzone__formats">
                                            <span className="ud-format-chip">CSV</span>
                                            <span className="ud-format-chip">XLSX</span>
                                            <span className="ud-format-chip">JSON</span>
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv,.xlsx,.xls,.json"
                                            style={{ display: "none" }}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                const selected = e.target.files?.[0];
                                                if (selected) handleFileSelect(selected);
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="ud-file-selected">
                                        <span className="ud-file-icon">{FORMAT_ICONS[getFileExt(file.name)] || FORMAT_ICONS.default}</span>
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
                                {errors.file && <span className="ud-error-msg">{errors.file}</span>}
                            </div>
                        )}

                        {/* JSON paste */}
                        {inputMode === "json" && (
                            <div className={`ud-field${errors.json ? " ud-field--error" : ""}`}>
                                <label className="ud-label">JSON Payload</label>
                                <textarea
                                    className="ud-json-textarea"
                                    placeholder={JSON_PLACEHOLDER}
                                    value={jsonPayload}
                                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleJsonChange(e.target.value)}
                                />
                                {jsonError && <span className="ud-error-msg">{jsonError}</span>}
                                {errors.json && <span className="ud-error-msg">{errors.json}</span>}
                            </div>
                        )}

                        {/* Upload progress */}
                        {uploadStatus === "uploading" && (
                            <div className="ud-progress-wrap">
                                <div className="ud-progress-label">
                                    <span>Uploading…</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="ud-progress-bar">
                                    <div className="ud-progress-fill" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            </div>
                        )}

                        {/* Status alerts */}
                        {uploadStatus === "success" && (
                            <div className="ud-alert ud-alert--success">
                                <span>✓</span>
                                <span>Upload successful! {previewRows?.length || 0} records sent to raw landing.</span>
                            </div>
                        )}
                        {uploadStatus === "error" && (
                            <div className="ud-alert ud-alert--error">
                                <span>✕</span>
                                <span>Upload failed. Please check your file and try again.</span>
                            </div>
                        )}
                        {inputMode === "file" && !file && !uploadStatus && (
                            <div className="ud-alert ud-alert--info">
                                <span>ℹ</span>
                                <span>Max file size is configurable. Error rows can be downloaded after upload.</span>
                            </div>
                        )}
                    </div>

                    <div className="ud-card-footer">
                        <button className="ud-btn ud-btn--ghost" onClick={handleReset} type="button">
                            Reset
                        </button>
                        <button
                            className="ud-btn ud-btn--primary"
                            onClick={handleUpload}
                            disabled={uploadStatus === "uploading" || uploadStatus === "success"}
                            style={{ opacity: uploadStatus === "uploading" || uploadStatus === "success" ? 0.55 : 1 }}
                            type="button"
                        >
                            {uploadStatus === "uploading" ? "⏳ Uploading…" : "⬆ Confirm Upload"}
                        </button>
                    </div>
                </div>

                {/* Right: Preview Panel */}
                <div className="ud-preview-card">
                    <div className="ud-preview-toolbar">
                        <div className="ud-preview-toolbar__left">
                            <span className="ud-preview-title">Data Preview</span>
                            {previewRows && (
                                <span className={`ud-preview-badge${errCount > 0 ? " ud-preview-badge--error" : " ud-preview-badge--valid"}`}>
                                    {previewRows.length} rows
                                </span>
                            )}
                        </div>
                        {previewRows && errCount > 0 && (
                            <button className="ud-btn ud-btn--ghost" style={{ fontSize: 12, padding: "6px 12px" }} type="button">
                                ⬇ Download Errors ({errCount})
                            </button>
                        )}
                    </div>

                    {!previewRows ? (
                        <div className="ud-preview-empty">
                            <span className="ud-preview-empty__icon">🗃</span>
                            <span className="ud-preview-empty__title">No preview available</span>
                            <span className="ud-preview-empty__sub">
                                Select a file or paste JSON to see a preview of your data before uploading.
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
                                            <th>Validation Status</th>
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
                                                    <code className="ud-payload-preview">{row.payload}</code>
                                                </td>
                                                <td>
                                                    <span className={`ud-val-badge ud-val-badge--${row.status.toLowerCase()}`}>
                                                        {row.status === "VALID" ? "✓" : row.status === "ERROR" ? "✕" : "⚠"} {row.status}
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
                                        {valid} Valid
                                    </span>
                                    {warnCount > 0 && (
                                        <span className="ud-preview-stat">
                                            <span className="ud-preview-stat__dot" style={{ background: "var(--amber-500)" }} />
                                            {warnCount} Warning
                                        </span>
                                    )}
                                    {errCount > 0 && (
                                        <span className="ud-preview-stat">
                                            <span className="ud-preview-stat__dot ud-preview-stat__dot--error" />
                                            {errCount} Error
                                        </span>
                                    )}
                                </div>
                                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                                    Showing {previewRows.length} of {previewRows.length} rows
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}