import { useState, useRef, useCallback } from "react";

const CSS = `
.ud-page{display:flex;flex-direction:column;gap:20px;max-width:1400px;padding:24px;font-family:'Geist','DM Sans',system-ui,sans-serif}
.ud-page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.ud-page-title{font-size:22px;font-weight:700;color:var(--text-primary);letter-spacing:-.3px;margin:0 0 3px}
.ud-page-subtitle{font-size:13px;color:var(--text-secondary)}

/* ── Buttons ── */
.ud-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--radius-sm);font-size:13px;font-weight:500;transition:background .15s,box-shadow .15s,transform .12s;white-space:nowrap;cursor:pointer;font-family:inherit;border:none}
.ud-btn:active{transform:scale(.97)}
.ud-btn--primary{background:var(--blue-600);color:#fff;box-shadow:0 2px 8px rgba(21,87,255,.28)}
.ud-btn--primary:hover{background:#0f49e0;box-shadow:0 4px 14px rgba(21,87,255,.38)}
.ud-btn--ghost{background:#fff;color:var(--text-secondary);border:1px solid var(--border-light)}
.ud-btn--ghost:hover{background:var(--surface-2);color:var(--text-primary)}
.ud-btn--danger{background:var(--red-100);color:#dc2626;border:1px solid rgba(239,68,68,.2)}
.ud-btn--danger:hover{background:rgba(239,68,68,.12)}

/* ── Layout ── */
.ud-layout{display:grid;grid-template-columns:380px 1fr;gap:20px;align-items:start}
@media(max-width:900px){.ud-layout{grid-template-columns:1fr}}

/* ── Upload Card ── */
.ud-upload-card{background:#fff;border:1px solid var(--border-light);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);overflow:hidden}
.ud-card-header{padding:16px 20px;border-bottom:1px solid var(--border-light);background:var(--navy-900)}
.ud-card-title{font-size:14px;font-weight:700;color:#fff;margin:0 0 2px}
.ud-card-subtitle{font-size:11px;color:rgba(255,255,255,.4)}
.ud-card-body{padding:20px;display:flex;flex-direction:column;gap:16px}

/* ── Form fields ── */
.ud-field{display:flex;flex-direction:column;gap:5px}
.ud-label{font-size:12px;font-weight:600;color:var(--text-secondary);display:flex;align-items:center;gap:5px}
.ud-required{color:var(--red-500);font-size:13px;line-height:1}
.ud-select{border:1px solid var(--border-muted);border-radius:var(--radius-sm);padding:9px 11px;font-size:13px;color:var(--text-primary);background:#fff;transition:border-color .15s,box-shadow .15s;width:100%;font-family:inherit;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:30px}
.ud-select:focus{border-color:var(--blue-400);box-shadow:0 0 0 3px rgba(59,130,246,.12);outline:none}
.ud-field--error .ud-select{border-color:var(--red-500)}
.ud-error-msg{font-size:11.5px;color:var(--red-500);font-weight:500}

/* ── Input method toggle ── */
.ud-mode-tabs{display:flex;border:1px solid var(--border-light);border-radius:var(--radius-sm);overflow:hidden;background:var(--surface-1)}
.ud-mode-tab{flex:1;padding:8px 12px;font-size:12.5px;font-weight:500;color:var(--text-muted);cursor:pointer;background:none;border:none;transition:background .13s,color .13s;font-family:inherit}
.ud-mode-tab--active{background:#fff;color:var(--blue-600);font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.08)}

/* ── Drop zone ── */
.ud-dropzone{border:2px dashed var(--border-muted);border-radius:var(--radius-md);padding:32px 20px;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;transition:border-color .15s,background .15s;background:var(--surface-1);text-align:center}
.ud-dropzone:hover,.ud-dropzone--active{border-color:var(--blue-400);background:var(--blue-100)}
.ud-dropzone__icon{font-size:32px;line-height:1}
.ud-dropzone__label{font-size:13px;font-weight:600;color:var(--text-primary)}
.ud-dropzone__sub{font-size:11.5px;color:var(--text-muted)}
.ud-dropzone__formats{display:flex;gap:6px;margin-top:4px}
.ud-format-chip{font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:4px;background:var(--surface-3);color:var(--text-secondary);text-transform:uppercase;letter-spacing:.4px}

/* ── Selected file ── */
.ud-file-selected{background:var(--green-100);border:1px solid rgba(34,197,94,.25);border-radius:var(--radius-sm);padding:10px 14px;display:flex;align-items:center;gap:10px}
.ud-file-icon{font-size:20px;flex-shrink:0}
.ud-file-info{flex:1;min-width:0}
.ud-file-name{font-size:13px;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ud-file-size{font-size:11.5px;color:var(--text-muted)}
.ud-file-remove{background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:14px;padding:2px 4px;line-height:1;transition:color .13s}
.ud-file-remove:hover{color:var(--red-500)}

/* ── JSON textarea ── */
.ud-json-textarea{border:1px solid var(--border-muted);border-radius:var(--radius-sm);padding:10px 12px;font-size:12px;font-family:'Courier New',monospace;color:var(--text-primary);background:var(--surface-1);width:100%;resize:vertical;min-height:160px;transition:border-color .15s;line-height:1.6}
.ud-json-textarea:focus{border-color:var(--blue-400);box-shadow:0 0 0 3px rgba(59,130,246,.12);outline:none}
.ud-json-textarea::placeholder{color:var(--text-muted);font-family:inherit}

/* ── Upload progress ── */
.ud-progress-wrap{background:var(--blue-100);border:1px solid rgba(37,99,235,.2);border-radius:var(--radius-md);padding:14px 16px;display:flex;flex-direction:column;gap:8px}
.ud-progress-label{display:flex;justify-content:space-between;font-size:12.5px;font-weight:500;color:var(--blue-600)}
.ud-progress-bar{height:6px;background:rgba(37,99,235,.15);border-radius:99px;overflow:hidden}
.ud-progress-fill{height:100%;background:var(--blue-500);border-radius:99px;transition:width .3s ease}

/* ── Alert ── */
.ud-alert{padding:10px 14px;border-radius:var(--radius-sm);font-size:13px;font-weight:500;display:flex;align-items:flex-start;gap:8px}
.ud-alert--error{background:var(--red-100);color:#b91c1c;border-left:3px solid var(--red-500)}
.ud-alert--success{background:var(--green-100);color:#15803d;border-left:3px solid var(--green-500)}
.ud-alert--info{background:var(--blue-100);color:var(--blue-500);border-left:3px solid var(--blue-400)}
.ud-alert--warning{background:var(--amber-100);color:#92400e;border-left:3px solid var(--amber-500)}

/* ── Card footer ── */
.ud-card-footer{padding:14px 20px;border-top:1px solid var(--border-light);background:var(--surface-1);display:flex;justify-content:flex-end;gap:8px}

/* ── Preview Panel ── */
.ud-preview-card{background:#fff;border:1px solid var(--border-light);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);overflow:hidden;display:flex;flex-direction:column}
.ud-preview-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border-light)}
.ud-preview-toolbar__left{display:flex;align-items:center;gap:10px}
.ud-preview-title{font-size:14px;font-weight:700;color:var(--text-primary)}
.ud-preview-badge{font-size:11px;font-weight:600;padding:3px 8px;border-radius:99px;background:var(--blue-100);color:var(--blue-500)}
.ud-preview-badge--valid{background:var(--green-100);color:#16a34a}
.ud-preview-badge--error{background:var(--red-100);color:#dc2626}
.ud-preview-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:10px;color:var(--text-muted)}
.ud-preview-empty__icon{font-size:36px}
.ud-preview-empty__title{font-size:14px;font-weight:600;color:var(--text-secondary)}
.ud-preview-empty__sub{font-size:13px;text-align:center;max-width:280px}

/* ── Preview table ── */
.ud-preview-table-wrap{overflow-x:auto}
.ud-preview-table{width:100%;border-collapse:collapse;font-size:12.5px}
.ud-preview-table thead th{background:var(--surface-1);color:var(--text-muted);font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;padding:10px 14px;text-align:left;border-bottom:1px solid var(--border-light);white-space:nowrap}
.ud-preview-table tbody tr{border-bottom:1px solid var(--surface-2);transition:background .12s}
.ud-preview-table tbody tr:last-child{border-bottom:none}
.ud-preview-table tbody tr:hover{background:var(--surface-1)}
.ud-preview-table td{padding:10px 14px;vertical-align:middle;color:var(--text-primary)}
.ud-row-num{font-family:'Courier New',monospace;font-size:11px;color:var(--text-muted);background:var(--surface-2);padding:2px 7px;border-radius:4px;border:1px solid var(--border-light)}
.ud-src-id{font-family:'Courier New',monospace;font-size:11.5px;color:var(--text-secondary)}
.ud-payload-preview{font-family:'Courier New',monospace;font-size:11px;color:var(--text-secondary);background:var(--surface-1);padding:3px 8px;border-radius:4px;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;border:1px solid var(--border-light)}
.ud-val-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px}
.ud-val-badge--valid{background:var(--green-100);color:#16a34a}
.ud-val-badge--error{background:var(--red-100);color:#dc2626}
.ud-val-badge--warning{background:var(--amber-100);color:#d97706}

/* ── Preview footer ── */
.ud-preview-footer{padding:12px 18px;border-top:1px solid var(--border-light);background:var(--surface-1);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.ud-preview-stats{display:flex;gap:16px}
.ud-preview-stat{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-secondary)}
.ud-preview-stat__dot{width:7px;height:7px;border-radius:50%}
.ud-preview-stat__dot--valid{background:var(--green-500)}
.ud-preview-stat__dot--error{background:var(--red-500)}
.ud-preview-stat__dot--total{background:var(--blue-400)}
`;

if (typeof document !== "undefined" && !document.getElementById("ud-styles")) {
    const el = document.createElement("style");
    el.id = "ud-styles";
    el.textContent = CSS;
    document.head.appendChild(el);
}

/* ─── Constants ──────────────────────────────────────────────── */
const MOCK_RUNS = [
    { id: "RUN-0042", label: "RUN-0042 — Salesforce CRM / CUSTOMER" },
    { id: "RUN-0041", label: "RUN-0041 — SAP ERP Core / PRODUCT" },
    { id: "RUN-0040", label: "RUN-0040 — Oracle Finance / ACCOUNT" },
    { id: "RUN-0039", label: "RUN-0039 — Vendor Portal / SUPPLIER" },
];

const ENTITIES = ["CUSTOMER", "SUPPLIER", "PRODUCT", "ACCOUNT", "ASSET", "LOCATION"];

const FORMAT_ICONS = { csv: "📄", xlsx: "📊", json: "📋", default: "📁" };

const MOCK_PREVIEW_ROWS = [
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

function getFileExt(name) {
    return name.split(".").pop().toLowerCase();
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/* ─── Upload Data Page ───────────────────────────────────────── */
export default function UploadData() {
    const [runId, setRunId] = useState("");
    const [entityType, setEntityType] = useState("");
    const [inputMode, setInputMode] = useState("file"); // "file" | "json"
    const [file, setFile] = useState(null);
    const [jsonPayload, setJsonPayload] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [errors, setErrors] = useState({});
    const [uploadProgress, setUploadProgress] = useState(null); // null | 0-100
    const [uploadStatus, setUploadStatus] = useState(null); // null | "uploading" | "success" | "error"
    const [previewRows, setPreviewRows] = useState(null);
    const [jsonError, setJsonError] = useState("");
    const fileInputRef = useRef(null);

    /* Drag-and-drop handlers */
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) handleFileSelect(dropped);
    }, []);

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);

    const handleFileSelect = (f) => {
        const ext = getFileExt(f.name);
        if (!["csv", "xlsx", "xls", "json"].includes(ext)) {
            setErrors(prev => ({ ...prev, file: "Unsupported format. Use CSV, Excel, or JSON." }));
            return;
        }
        if (f.size === 0) {
            setErrors(prev => ({ ...prev, file: "File is empty." }));
            return;
        }
        setErrors(prev => ({ ...prev, file: null }));
        setFile(f);
        setUploadStatus(null);
        setUploadProgress(null);
        // Generate preview after a short delay
        setTimeout(() => setPreviewRows(MOCK_PREVIEW_ROWS), 400);
    };

    const handleJsonChange = (val) => {
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
        const errs = {};
        if (!runId) errs.runId = "Ingestion run is required";
        if (!entityType) errs.entityType = "Entity type is required";
        if (inputMode === "file" && !file) errs.file = "Please select a file to upload";
        if (inputMode === "json" && !jsonPayload.trim()) errs.json = "Paste a valid JSON payload";
        if (inputMode === "json" && jsonPayload.trim()) {
            try { JSON.parse(jsonPayload); } catch { errs.json = "Invalid JSON format"; }
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

    const valid = previewRows ? previewRows.filter(r => r.status === "VALID").length : 0;
    const errCount = previewRows ? previewRows.filter(r => r.status === "ERROR").length : 0;
    const warnCount = previewRows ? previewRows.filter(r => r.status === "WARNING").length : 0;

    return (
        <div className="ud-page">
            {/* Header */}
            <div className="ud-page-header">
                <div>
                    <h1 className="ud-page-title">Upload Data</h1>
                    <p className="ud-page-subtitle">Upload raw source data into the ingestion pipeline</p>
                </div>
                {uploadStatus === "success" && (
                    <button className="ud-btn ud-btn--ghost" onClick={handleReset}>↻ Upload Another</button>
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
                            <label className="ud-label">Ingestion Run <span className="ud-required">*</span></label>
                            <select className="ud-select" value={runId} onChange={e => setRunId(e.target.value)}>
                                <option value="">— Select ingestion run —</option>
                                {MOCK_RUNS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                            </select>
                            {errors.runId && <span className="ud-error-msg">{errors.runId}</span>}
                        </div>

                        {/* Entity select */}
                        <div className={`ud-field${errors.entityType ? " ud-field--error" : ""}`}>
                            <label className="ud-label">Entity Type <span className="ud-required">*</span></label>
                            <select className="ud-select" value={entityType} onChange={e => setEntityType(e.target.value)}>
                                <option value="">— Select entity type —</option>
                                {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                            {errors.entityType && <span className="ud-error-msg">{errors.entityType}</span>}
                        </div>

                        {/* Mode tabs */}
                        <div className="ud-field">
                            <label className="ud-label">Input Method</label>
                            <div className="ud-mode-tabs">
                                <button className={`ud-mode-tab${inputMode === "file" ? " ud-mode-tab--active" : ""}`} onClick={() => { setInputMode("file"); setPreviewRows(null); }}>
                                    📁 File Upload
                                </button>
                                <button className={`ud-mode-tab${inputMode === "json" ? " ud-mode-tab--active" : ""}`} onClick={() => { setInputMode("json"); setFile(null); setPreviewRows(null); }}>
                                    { } Paste JSON
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
                                            onChange={e => { if (e.target.files[0]) handleFileSelect(e.target.files[0]); }}
                                        />
                                    </div>
                                ) : (
                                    <div className="ud-file-selected">
                                        <span className="ud-file-icon">{FORMAT_ICONS[getFileExt(file.name)] || FORMAT_ICONS.default}</span>
                                        <div className="ud-file-info">
                                            <div className="ud-file-name">{file.name}</div>
                                            <div className="ud-file-size">{formatBytes(file.size)}</div>
                                        </div>
                                        <button className="ud-file-remove" onClick={() => { setFile(null); setPreviewRows(null); setUploadStatus(null); }}>✕</button>
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
                                    onChange={e => handleJsonChange(e.target.value)}
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
                        <button className="ud-btn ud-btn--ghost" onClick={handleReset}>Reset</button>
                        <button
                            className="ud-btn ud-btn--primary"
                            onClick={handleUpload}
                            disabled={uploadStatus === "uploading" || uploadStatus === "success"}
                            style={{ opacity: (uploadStatus === "uploading" || uploadStatus === "success") ? .55 : 1 }}
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
                            <button className="ud-btn ud-btn--ghost" style={{ fontSize: 12, padding: "6px 12px" }}>
                                ⬇ Download Errors ({errCount})
                            </button>
                        )}
                    </div>

                    {!previewRows ? (
                        <div className="ud-preview-empty">
                            <span className="ud-preview-empty__icon">🗃</span>
                            <span className="ud-preview-empty__title">No preview available</span>
                            <span className="ud-preview-empty__sub">Select a file or paste JSON to see a preview of your data before uploading.</span>
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
                                        {previewRows.map(row => (
                                            <tr key={row.rowNum}>
                                                <td><span className="ud-row-num">#{row.rowNum}</span></td>
                                                <td><span className="ud-src-id">{row.srcId}</span></td>
                                                <td><code className="ud-payload-preview">{row.payload}</code></td>
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