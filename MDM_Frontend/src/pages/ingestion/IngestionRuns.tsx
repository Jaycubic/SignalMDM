// MDM_Frontend/src/pages/ingestion/IngestionRuns.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import '../../styles/theme.css';
import '../../styles/IngestionRuns.css';
import { ingestionRunService, type IngestionRunRecord, type RunStatus } from '../../services/ingestionRunService';
import { uploadService } from '../../services/uploadService';
import { sourceService, type SourceRecord } from '../../services/sourceService';
import { authService } from '../../services/authService';
import { useTenantConfig } from '../../context/TenantConfigContext';

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */
interface TimelineItem {
    label: string;
    ts: string;
    done?: boolean;
    active?: boolean;
    fail?: boolean;
}

type EntityType = "CUSTOMER" | "SUPPLIER" | "PRODUCT" | "ACCOUNT" | "ASSET" | "LOCATION";
type RunType = "INITIAL_LOAD" | "DELTA_LOAD" | "REPROCESS" | "TEST_LOAD";
type TriggerType = "MANUAL" | "SCHEDULED" | "API" | "EVENT";

interface RunError {
    code: string;
    msg: string;
}

interface StartIngestionData {
    tenantId: string;
    sourceId: string;
    entity: string;
    runType: string;
    triggerType: string;
    file?: File;
}

interface ModalErrors {
    tenant?: string;
    source?: string;
    entity?: string;
    runType?: string;
    triggerType?: string;
}

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const STATUSES: RunStatus[] = ["CREATED", "RUNNING", "RAW_LOADED", "STAGING_CREATED", "FAILED", "COMPLETED"];

const STATUS_LABEL: Record<RunStatus, string> = {
    CREATED: "Created", RUNNING: "Running", RAW_LOADED: "Raw Loaded",
    STAGING_CREATED: "Staging Created", FAILED: "Failed", COMPLETED: "Completed",
};

const RUN_TIMELINES: Record<RunStatus, TimelineItem[]> = {
    COMPLETED: [{ label: "Run Created", ts: "Done", done: true }, { label: "Processing Completed", ts: "Done", done: true }],
    RUNNING: [{ label: "Run Created", ts: "Done", done: true }, { label: "Processing Records…", ts: "In progress", active: true }],
    FAILED: [{ label: "Run Created", ts: "Done", done: true }, { label: "Process Stopped", ts: "Failed", fail: true }],
    CREATED: [{ label: "Run Queued", ts: "Pending", done: false }],
    RAW_LOADED: [{ label: "Run Created", ts: "Done", done: true }, { label: "Raw Loaded", ts: "Done", done: true }],
    STAGING_CREATED: [{ label: "Run Created", ts: "Done", done: true }, { label: "Staging Created", ts: "Done", done: true }],
};

const RUN_ERRORS: Partial<Record<RunStatus, RunError[]>> = {};

/* ─── Sub-components ────────────────────────────────────────── */
function StatusBadge({ status }: { status: RunStatus }): React.ReactElement {
    return (
        <span className={`ir-status ir-status--${status}`}>
            {STATUS_LABEL[status] || status}
        </span>
    );
}

/* ═══════════════════════════════════════════════════════════════
   START INGESTION MODAL
═══════════════════════════════════════════════════════════════ */
interface StartIngestionModalProps {
    onClose: () => void;
    onStart: (data: StartIngestionData) => void;
    sources: SourceRecord[];
    tenants: { id: string; tenantName: string }[];
    isSuperAdmin: boolean;
}

function StartIngestionModal({ onClose, onStart, sources, tenants, isSuperAdmin }: StartIngestionModalProps): React.ReactElement {
    const [tenantId, setTenantId] = useState<string>((window as any).activeTenantId || "");
    const [sourceId, setSourceId] = useState<string>("");
    const [entity, setEntity] = useState<string>("");
    const [runType, setRunType] = useState<string>("");
    const [triggerType, setTriggerType] = useState<string>("MANUAL");
    const [file, setFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<ModalErrors>({});

    // If activeTenantId changes in parent (e.g. via global filter), sync it
    useEffect(() => {
        if ((window as any).activeTenantId) {
            setTenantId((window as any).activeTenantId);
        }
    }, []);

    // Show selector if we have tenants (implies SuperAdmin or equivalent)
    const showTenantSelector = isSuperAdmin || tenants.length > 0;

    // Filter sources by selected tenant if we are showing the selector
    const filteredSources = showTenantSelector && tenantId 
        ? sources.filter(s => s.tenantId === tenantId)
        : (showTenantSelector ? [] : sources);

    const handleSubmit = (): void => {
        const errs: ModalErrors = {};
        if (showTenantSelector && !tenantId) errs.tenant = "Target tenant is required";
        if (!sourceId) errs.source = "Source system is required";
        if (!triggerType) errs.triggerType = "Trigger type is required";
        if (!file) errs.source = "Please select a file to upload";
        
        if (Object.keys(errs).length) { setErrors(errs); return; }
        onStart({
            tenantId: showTenantSelector ? tenantId : "",
            sourceId,
            entity,
            runType,
            triggerType,
            file: file || undefined
        });
    };

    return (
        <div className="sim-overlay" onClick={onClose}>
            <div className="sim-modal" onClick={(e: React.MouseEvent) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="sim-header">
                    <div>
                        <h2 className="sim-header__title">Start Ingestion Run</h2>
                        <p className="sim-header__sub">Configure and launch a new ingestion job</p>
                    </div>
                    <button className="sim-close" onClick={onClose}>✕</button>
                </div>

                <div className="sim-body">
                    <div className="sim-section">
                        <div className="sim-field-grid">
                            {showTenantSelector && (
                                <div className={`sim-field sim-field--full${errors.tenant ? " sim-field--error" : ""}`}>
                                    <label className="sim-label">Target Tenant <span className="sim-required">*</span></label>
                                    <select 
                                        className="sim-select" 
                                        value={tenantId} 
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                            setTenantId(e.target.value);
                                            setSourceId(""); // Reset source when tenant changes
                                        }}
                                    >
                                        <option value="">— Select tenant —</option>
                                        {tenants.map(t => <option key={t.id} value={t.id}>{t.tenantName}</option>)}
                                    </select>
                                    {errors.tenant && <span className="sim-error-msg">{errors.tenant}</span>}
                                </div>
                            )}

                            <div className={`sim-field sim-field--full${errors.source ? " sim-field--error" : ""}`}>
                                <label className="sim-label">Source System <span className="sim-required">*</span></label>
                                <select 
                                    className="sim-select" 
                                    value={sourceId} 
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSourceId(e.target.value)}
                                    disabled={showTenantSelector && !tenantId}
                                >
                                    <option value="">{showTenantSelector && !tenantId ? "— Select tenant first —" : "— Select source —"}</option>
                                    {filteredSources.map(s => <option key={s.id} value={s.id}>{s.sourceName}</option>)}
                                </select>
                                {errors.source && <span className="sim-error-msg">{errors.source}</span>}
                            </div>

                            <div className="sim-field sim-field--full">
                                <label className="sim-label">Data File (CSV/JSON) <span className="sim-required">*</span></label>
                                <input 
                                    type="file" 
                                    className="sim-select" 
                                    accept=".csv,.json"
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
                                />
                            </div>

                            <div className={`sim-field${errors.entity ? " sim-field--error" : ""}`}>
                                <label className="sim-label">Entity Type <span className="sim-required">*</span></label>
                                <select className="sim-select" value={entity} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEntity(e.target.value)}>
                                    <option value="">— Select entity —</option>
                                    {(["CUSTOMER", "SUPPLIER", "PRODUCT", "ACCOUNT", "ASSET", "LOCATION"] as EntityType[]).map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                                {errors.entity && <span className="sim-error-msg">{errors.entity}</span>}
                            </div>

                            <div className={`sim-field${errors.runType ? " sim-field--error" : ""}`}>
                                <label className="sim-label">Run Type <span className="sim-required">*</span></label>
                                <select className="sim-select" value={runType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRunType(e.target.value)}>
                                    <option value="">— Select run type —</option>
                                    {(["INITIAL_LOAD", "DELTA_LOAD", "REPROCESS", "TEST_LOAD"] as RunType[]).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                {errors.runType && <span className="sim-error-msg">{errors.runType}</span>}
                            </div>

                            <div className={`sim-field${errors.triggerType ? " sim-field--error" : ""}`}>
                                <label className="sim-label">Trigger Type <span className="sim-required">*</span></label>
                                <select className="sim-select" value={triggerType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTriggerType(e.target.value)}>
                                    {(["MANUAL", "SCHEDULED", "API", "EVENT"] as TriggerType[]).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                {errors.triggerType && <span className="sim-error-msg">{errors.triggerType}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="sim-footer">
                    <button className="sim-btn sim-btn--ghost" onClick={onClose}>Cancel</button>
                    <div className="sim-footer__right">
                        <button className="sim-btn sim-btn--primary" onClick={handleSubmit}>▶ Start Ingestion</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   RUN DETAILS DRAWER
═══════════════════════════════════════════════════════════════ */
type DrawerTab = "overview" | "timeline" | "errors";

interface RunDetailsDrawerProps {
    run: IngestionRunRecord;
    onClose: () => void;
}

function RunDetailsDrawer({ run, onClose }: RunDetailsDrawerProps): React.ReactElement {
    const [tab, setTab] = useState<DrawerTab>("overview");
    const [isCancelling, setIsCancelling] = useState(false);
    const timeline: TimelineItem[] = RUN_TIMELINES[run.state] || RUN_TIMELINES["CREATED"];
    const errors: RunError[] = RUN_ERRORS[run.state] || [];

    const handleCancel = async () => {
        if (!window.confirm("Are you sure you want to stop this ingestion run?")) return;
        setIsCancelling(true);
        try {
            const adminInfo = authService.getAdminInfoFromCookie();
            const tId = adminInfo?.tenant_id === 'platform' ? (window as any).activeTenantId : undefined;
            await ingestionRunService.cancelRun(run.id, tId);
            onClose();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to cancel run");
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <div className="ir-drawer-overlay" onClick={onClose}>
            <div className="ir-drawer" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <div className="ir-drawer__header">
                    <div>
                        <h2 className="ir-drawer__title">{run.sourceName}</h2>
                        <div className="ir-drawer__sub">{run.id}</div>
                    </div>
                    <button className="ir-drawer__close" onClick={onClose}>✕</button>
                </div>

                <div className="ir-drawer-tabs">
                    {([["overview", "Overview"], ["timeline", "Timeline"], ["errors", "Errors"]] as [DrawerTab, string][]).map(([key, label]) => (
                        <button key={key} className={`ir-drawer-tab${tab === key ? " ir-drawer-tab--active" : ""}`} onClick={() => setTab(key)}>
                            {label}{key === "errors" && errors.length > 0 && <span style={{ marginLeft: 4, background: "var(--red-500)", color: "#fff", borderRadius: 99, fontSize: 10, padding: "1px 5px", fontWeight: 700 }}>{errors.length}</span>}
                        </button>
                    ))}
                </div>

                <div className="ir-drawer__body">
                    {/* Overview tab */}
                    {tab === "overview" && (
                        <div className="ir-drawer__content">
                            <div className="ir-drawer__grid">
                                <div className="ir-drawer__field">
                                    <span className="ir-drawer__field-label">Status</span>
                                    <StatusBadge status={run.state} />
                                </div>
                                <div className="ir-drawer__field">
                                    <span className="ir-drawer__field-label">Triggered By</span>
                                    <span className="ir-drawer__field-value">{run.triggeredBy}</span>
                                </div>
                                <div className="ir-drawer__field">
                                    <span className="ir-drawer__field-label">Started At</span>
                                    <span className="ir-drawer__field-value" style={{ fontSize: 12.5 }}>{run.startedAt || "—"}</span>
                                </div>
                                <div className="ir-drawer__field">
                                    <span className="ir-drawer__field-label">Completed At</span>
                                    <span className="ir-drawer__field-value" style={{ fontSize: 12.5 }}>{run.completedAt || "—"}</span>
                                </div>
                            </div>

                             <div>
                                <span className="ir-drawer__field-label" style={{ display: "block", marginBottom: 10 }}>Record Counts</span>
                                <div className="ir-drawer__counts">
                                    <div className="ir-drawer__count-card">
                                        <span className="ir-drawer__count-val">{run.recordCount.toLocaleString()}</span>
                                        <span className="ir-drawer__count-lbl">Total Raw Records</span>
                                    </div>
                                    <div className="ir-drawer__count-card">
                                        <span className="ir-drawer__count-val ir-drawer__count-val--loaded">{run.fileCount}</span>
                                        <span className="ir-drawer__count-lbl">Files Uploaded</span>
                                    </div>
                                </div>
                            </div>

                            {run.errorMessage && (
                                <div style={{ marginTop: 20, padding: 12, background: "var(--red-500-10)", borderRadius: 8, border: "1px solid var(--red-500-20)" }}>
                                    <span className="ir-drawer__field-label" style={{ color: "var(--red-500)", display: "block", marginBottom: 4 }}>Error Message</span>
                                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)" }}>{run.errorMessage}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Timeline tab */}
                    {tab === "timeline" && (
                        <div className="ir-drawer__content">
                            <div className="ir-timeline">
                                {timeline.map((item, i) => (
                                    <div key={i} className="ir-timeline__item">
                                        <div className={`ir-timeline__dot${item.done ? " ir-timeline__dot--done" : ""}${item.active ? " ir-timeline__dot--active" : ""}${item.fail ? " ir-timeline__dot--fail" : ""}`}>
                                            {item.done ? "✓" : item.fail ? "✕" : i + 1}
                                        </div>
                                        <div className="ir-timeline__body">
                                            <div className="ir-timeline__label">{item.label}</div>
                                            <div className="ir-timeline__ts">{item.ts}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Errors tab */}
                    {tab === "errors" && (
                        <div className="ir-drawer__content">
                            {errors.length === 0
                                ? <div className="ir-no-errors">✓ No errors recorded for this run</div>
                                : <div className="ir-error-list">
                                    {errors.map((err, i) => (
                                        <div key={i} className="ir-error-item">
                                            <div className="ir-error-item__code">{err.code}</div>
                                            {err.msg}
                                        </div>
                                    ))}
                                </div>
                            }
                        </div>
                    )}
                </div>
                <div className="ir-drawer-footer" style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12, background: "var(--bg-primary)" }}>
                    {(run.state === "RUNNING" || run.state === "CREATED" || run.state === "RAW_LOADED") && (
                        <button 
                            className="ird-action-btn ird-action-btn--danger" 
                            onClick={handleCancel}
                            disabled={isCancelling}
                            style={{ marginRight: "auto", background: "var(--red-500-10)", color: "var(--red-500)", border: "1px solid var(--red-500-20)", padding: "8px 16px", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}
                        >
                            {isCancelling ? "Stopping…" : "Stop Ingestion"}
                        </button>
                    )}
                    <button className="ird-action-btn" onClick={onClose} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontWeight: 600, cursor: "pointer" }}>Close</button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   INGESTION RUNS PAGE
═══════════════════════════════════════════════════════════════ */
function IngestionRuns(): React.ReactElement {
    const { activeTenantId, activeTenantName, mode: tenantMode } = useTenantConfig();
    const [runs, setRuns] = useState<IngestionRunRecord[]>([]);
    const [sources, setSources] = useState<SourceRecord[]>([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [viewRun, setViewRun] = useState<IngestionRunRecord | null>(null);
    const [search, setSearch] = useState<string>("");
    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [filterSource, setFilterSource] = useState<string>("ALL");
    const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const adminInfo = authService.getAdminInfoFromCookie();
            const superAdmin = adminInfo?.tenant_id === 'platform';
            setIsSuperAdmin(superAdmin);

            const tId = activeTenantId ?? undefined;

            const srcData = await sourceService.listSources(0, 100, tId);
            setSources(srcData);

            const nameMap: Record<string, string> = {};
            srcData.forEach(s => { nameMap[s.id] = s.sourceName; });

            const runData = await ingestionRunService.listRuns(0, 50, nameMap, tId);
            setRuns(runData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load ingestion data");
        } finally {
            setLoading(false);
        }
    }, [activeTenantId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    /* Auto-refresh every 10s for running jobs */
    useEffect(() => {
        refreshRef.current = setInterval(() => {
            const hasRunning = runs.some(r => r.state === "RUNNING" || r.state === "CREATED");
            if (hasRunning) {
                loadData();
            }
        }, 10000);
        return () => {
            if (refreshRef.current) clearInterval(refreshRef.current);
        };
    }, [runs, loadData]);

    const filtered = runs.filter(r => {
        const q = search.toLowerCase();
        return (
            (r.id.toLowerCase().includes(q) || r.sourceName.toLowerCase().includes(q)) &&
            (filterStatus === "ALL" || r.state === filterStatus) &&
            (filterSource === "ALL" || r.sourceId === filterSource)
        );
    });

    const handleStart = async (data: StartIngestionData): Promise<void> => {
        setLoading(true);
        try {
            const newRun = await ingestionRunService.startRun(
                data.sourceId, 
                "user", 
                isSuperAdmin ? data.tenantId : undefined
            );
            
            if (data.file) {
                await uploadService.uploadToIngestionRun(
                    newRun.id,
                    data.file,
                    isSuperAdmin ? data.tenantId : undefined,
                );
            }
            
            await loadData();
            setShowModal(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("SuperAdmin must provide a specific tenant_id")) {
                setIsSuperAdmin(true);
                alert("Platform Admin detected. Please select a 'Target Tenant' in the form and try again.");
                return;
            }
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    /* Summary counts */
    const total = runs.length;
    const running = runs.filter(r => r.state === "RUNNING").length;
    const completed = runs.filter(r => r.state === "COMPLETED").length;
    const failed = runs.filter(r => r.state === "FAILED").length;
    const stagingCreated = runs.filter(r => r.state === "STAGING_CREATED").length;
    const rawLoaded = runs.filter(r => r.state === "RAW_LOADED").length;

    return (
        <div className="ir-page">
            {/* Header */}
            <div className="ir-page-header">
                <div>
                    <h1 className="ir-page-title">
                        Ingestion Runs 
                        {isSuperAdmin && <span style={{ marginLeft: 12, fontSize: 11, background: "var(--blue-500)", color: "#fff", padding: "2px 8px", borderRadius: 4, verticalAlign: "middle", letterSpacing: 0.5 }}>PLATFORM VIEW</span>}
                    </h1>
                    <p className="ir-page-subtitle">Monitor ingestion execution and processing status</p>
                </div>
                <div className="ir-page-header__actions">
                    <div className="ir-refresh-badge">
                        <span className="ir-refresh-dot" />
                        Auto-refresh: 10s
                    </div>
                    <button className="ir-btn ir-btn--ghost" onClick={loadData} disabled={loading}>
                        {loading ? "…" : "↻"} Refresh
                    </button>
                    <button className="ir-btn ir-btn--primary" onClick={() => setShowModal(true)}>▶ Start Ingestion</button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div style={{ background: "var(--red-500-10)", color: "var(--red-500)", padding: "12px 16px", borderRadius: 8, marginBottom: 20, border: "1px solid var(--red-500-20)", display: "flex", alignItems: "center", gap: 10 }}>
                    <span>⚠</span>
                    <span>{error}</span>
                </div>
            )}

            {/* Summary Cards */}
            <div className="ir-summary-row">
                <div className="ir-summary-card"><span className="ir-summary-card__value">{total}</span><span className="ir-summary-card__label">Total Runs</span></div>
                <div className="ir-summary-card ir-summary-card--blue"><span className="ir-summary-card__value">{running}</span><span className="ir-summary-card__label">Running</span></div>
                <div className="ir-summary-card ir-summary-card--green"><span className="ir-summary-card__value">{completed}</span><span className="ir-summary-card__label">Completed</span></div>
                <div className="ir-summary-card ir-summary-card--red"><span className="ir-summary-card__value">{failed}</span><span className="ir-summary-card__label">Failed</span></div>
                <div className="ir-summary-card ir-summary-card--cyan"><span className="ir-summary-card__value">{rawLoaded}</span><span className="ir-summary-card__label">Raw Loaded</span></div>
                <div className="ir-summary-card ir-summary-card--purple"><span className="ir-summary-card__value">{stagingCreated}</span><span className="ir-summary-card__label">Staging Created</span></div>
            </div>

            {/* Table */}
            <div className="ir-table-card">
                <div className="ir-table-toolbar">
                    <div className="ir-search-wrap">
                        <span className="ir-search-icon">🔍</span>
                        <input className="ir-search-input" placeholder="Search by run ID, source, entity…" value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
                    </div>
                    <div className="ir-filter-row">
                        {isSuperAdmin && tenantMode === 'SPECIFIC' && activeTenantName && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue-600)', background: 'var(--blue-100)', padding: '4px 10px', borderRadius: 99, border: '1px solid var(--blue-200)' }}>
                                🏢 {activeTenantName}
                            </span>
                        )}
                        <select className="ir-select" value={filterSource} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterSource(e.target.value)}>
                            <option value="ALL">All Sources</option>
                            {sources.map(s => <option key={s.id} value={s.id}>{s.sourceName}</option>)}
                        </select>
                        <select className="ir-select" value={filterStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)}>
                            <option value="ALL">All Statuses</option>
                            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                        </select>
                        <span className="ir-count-label">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
                    </div>
                </div>

                <div className="ir-table-wrap">
                    <table className="ir-table">
                        <thead>
                            <tr>
                                <th>Run ID</th>
                                <th>Source System</th>
                                <th>Status</th>
                                <th>Files</th>
                                <th>Records</th>
                                <th>Started At</th>
                                <th>Completed At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={8} className="ir-table-empty"><span>📋</span><p>No ingestion runs found</p></td></tr>
                            ) : filtered.map(run => (
                                <tr key={run.id} className="ir-table-row" onClick={() => setViewRun(run)}>
                                    <td><code className="ir-run-id">{run.id.slice(0, 8)}…</code></td>
                                    <td>
                                        <div className="ir-source-cell">
                                            <div className="ir-source-avatar">{run.sourceName.slice(0, 2).toUpperCase()}</div>
                                            <span className="ir-source-name">{run.sourceName}</span>
                                        </div>
                                    </td>
                                    <td><StatusBadge status={run.state} /></td>
                                    <td><span className="ir-count-cell">{run.fileCount}</span></td>
                                    <td><span className="ir-count-cell">{run.recordCount > 0 ? run.recordCount.toLocaleString() : <span className="ir-count-cell--muted">—</span>}</span></td>
                                    <td><span className="ir-ts">{run.startedAt || "—"}</span></td>
                                    <td><span className={run.completedAt ? "ir-ts" : "ir-ts-na"}>{run.completedAt || "—"}</span></td>
                                    <td onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                        <div className="ir-action-row">
                                            <button className="ir-action-btn ir-action-btn--primary" onClick={() => setViewRun(run)}>Details</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Run Details Drawer */}
            {viewRun && <RunDetailsDrawer run={viewRun} onClose={() => setViewRun(null)} />}

            {/* Start Ingestion Modal */}
            {showModal && (
                <StartIngestionModal
                    onClose={() => setShowModal(false)}
                    onStart={handleStart}
                    sources={sources}
                    tenants={[]}
                    isSuperAdmin={isSuperAdmin}
                />
            )}
        </div>
    );
}

export default IngestionRuns;