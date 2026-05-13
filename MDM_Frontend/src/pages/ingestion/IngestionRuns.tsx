// MDM_Frontend/src/pages/ingestion/IngestionRuns.tsx
import React, { useState, useEffect, useRef } from "react";
import '../../styles/theme.css';
import '../../styles/IngestionRuns.css';

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */
type RunStatus = "CREATED" | "RUNNING" | "RAW_LOADED" | "STAGING_CREATED" | "FAILED" | "COMPLETED";
type TriggerType = "MANUAL" | "SCHEDULED" | "API" | "EVENT";
type RunType = "INITIAL_LOAD" | "DELTA_LOAD" | "REPROCESS" | "TEST_LOAD";
type EntityType = "CUSTOMER" | "SUPPLIER" | "PRODUCT" | "ACCOUNT" | "ASSET" | "LOCATION";

interface IngestionRun {
    id: string;
    source: string;
    entity: EntityType;
    runType: RunType;
    triggerType: TriggerType;
    status: RunStatus;
    totalRecords: number;
    loadedRecords: number;
    failedRecords: number;
    startedAt: string;
    completedAt: string | null;
}

interface TimelineItem {
    label: string;
    ts: string;
    done?: boolean;
    active?: boolean;
    fail?: boolean;
}

interface RunError {
    code: string;
    msg: string;
}

interface StartIngestionData {
    source: string;
    entity: EntityType;
    runType: RunType;
    triggerType: TriggerType;
}

interface ModalErrors {
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

const MOCK_SOURCES: string[] = [
    "Salesforce CRM", "SAP ERP Core", "Workday HRMS", "Oracle Finance", "Vendor Portal", "Legacy Master DB",
];

const MOCK_RUNS: IngestionRun[] = [
    { id: "RUN-0042", source: "Salesforce CRM", entity: "CUSTOMER", runType: "DELTA_LOAD", triggerType: "SCHEDULED", status: "COMPLETED", totalRecords: 12400, loadedRecords: 12388, failedRecords: 12, startedAt: "2026-05-11 10:00", completedAt: "2026-05-11 10:14" },
    { id: "RUN-0041", source: "SAP ERP Core", entity: "PRODUCT", runType: "INITIAL_LOAD", triggerType: "MANUAL", status: "RUNNING", totalRecords: 88200, loadedRecords: 43100, failedRecords: 0, startedAt: "2026-05-11 09:45", completedAt: null },
    { id: "RUN-0040", source: "Oracle Finance", entity: "ACCOUNT", runType: "DELTA_LOAD", triggerType: "API", status: "STAGING_CREATED", totalRecords: 3100, loadedRecords: 3100, failedRecords: 0, startedAt: "2026-05-11 08:30", completedAt: "2026-05-11 08:47" },
    { id: "RUN-0039", source: "Vendor Portal", entity: "SUPPLIER", runType: "DELTA_LOAD", triggerType: "EVENT", status: "RAW_LOADED", totalRecords: 540, loadedRecords: 540, failedRecords: 0, startedAt: "2026-05-11 08:00", completedAt: null },
    { id: "RUN-0038", source: "Workday HRMS", entity: "CUSTOMER", runType: "REPROCESS", triggerType: "MANUAL", status: "FAILED", totalRecords: 920, loadedRecords: 310, failedRecords: 610, startedAt: "2026-05-10 17:22", completedAt: "2026-05-10 17:29" },
    { id: "RUN-0037", source: "Legacy Master DB", entity: "PRODUCT", runType: "INITIAL_LOAD", triggerType: "MANUAL", status: "COMPLETED", totalRecords: 55000, loadedRecords: 55000, failedRecords: 0, startedAt: "2026-05-10 14:00", completedAt: "2026-05-10 15:38" },
    { id: "RUN-0036", source: "Salesforce CRM", entity: "ACCOUNT", runType: "TEST_LOAD", triggerType: "MANUAL", status: "COMPLETED", totalRecords: 100, loadedRecords: 100, failedRecords: 0, startedAt: "2026-05-10 11:00", completedAt: "2026-05-10 11:02" },
    { id: "RUN-0035", source: "SAP ERP Core", entity: "ASSET", runType: "DELTA_LOAD", triggerType: "SCHEDULED", status: "CREATED", totalRecords: 0, loadedRecords: 0, failedRecords: 0, startedAt: "2026-05-10 08:00", completedAt: null },
];

const RUN_TIMELINES: Record<RunStatus, TimelineItem[]> = {
    COMPLETED: [{ label: "Run Created", ts: "10:00 AM", done: true }, { label: "Raw Upload Started", ts: "10:01 AM", done: true }, { label: "Raw Upload Completed", ts: "10:03 AM", done: true }, { label: "Staging Creation Started", ts: "10:05 AM", done: true }, { label: "Staging Creation Completed", ts: "10:12 AM", done: true }, { label: "Run Completed", ts: "10:14 AM", done: true }],
    RUNNING: [{ label: "Run Created", ts: "09:45 AM", done: true }, { label: "Raw Upload Started", ts: "09:46 AM", done: true }, { label: "Processing Records…", ts: "In progress", active: true }],
    RAW_LOADED: [{ label: "Run Created", ts: "08:00 AM", done: true }, { label: "Raw Upload Started", ts: "08:01 AM", done: true }, { label: "Raw Upload Completed", ts: "08:05 AM", done: true }, { label: "Awaiting Staging", ts: "Pending", active: false }],
    STAGING_CREATED: [{ label: "Run Created", ts: "08:30 AM", done: true }, { label: "Raw Upload Completed", ts: "08:33 AM", done: true }, { label: "Staging Created", ts: "08:47 AM", done: true }],
    FAILED: [{ label: "Run Created", ts: "05:22 PM", done: true }, { label: "Raw Upload Started", ts: "05:23 PM", done: true }, { label: "Processing Error", ts: "05:29 PM", fail: true }],
    CREATED: [{ label: "Run Queued", ts: "08:00 AM", done: false }],
};

const RUN_ERRORS: Partial<Record<RunStatus, RunError[]>> = {
    FAILED: [
        { code: "ERR_FIELD_MISSING", msg: "Required field 'email' missing in 610 records" },
        { code: "ERR_ENCODING", msg: "Unsupported character encoding in 3 records" },
    ],
};

/* ─── Sub-components ────────────────────────────────────────── */
function StatusBadge({ status }: { status: RunStatus }): React.ReactElement {
    return (
        <span className={`ir-status ir-status--${status}`}>
            {STATUS_LABEL[status] || status}
        </span>
    );
}

interface ProgressBarProps {
    loaded: number;
    total: number;
}

function ProgressBar({ loaded, total }: ProgressBarProps): React.ReactElement {
    const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 100 }}>
            <div style={{ flex: 1, height: 5, background: "var(--surface-3)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "var(--blue-500)", borderRadius: 99, transition: "width .4s ease" }} />
            </div>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)", minWidth: 30 }}>{pct}%</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   START INGESTION MODAL
═══════════════════════════════════════════════════════════════ */
interface StartIngestionModalProps {
    onClose: () => void;
    onStart: (data: StartIngestionData) => void;
}

function StartIngestionModal({ onClose, onStart }: StartIngestionModalProps): React.ReactElement {
    const [source, setSource] = useState<string>("");
    const [entity, setEntity] = useState<string>("");
    const [runType, setRunType] = useState<string>("");
    const [triggerType, setTriggerType] = useState<string>("MANUAL");
    const [errors, setErrors] = useState<ModalErrors>({});

    const handleSubmit = (): void => {
        const errs: ModalErrors = {};
        if (!source) errs.source = "Source system is required";
        if (!entity) errs.entity = "Entity type is required";
        if (!runType) errs.runType = "Run type is required";
        if (!triggerType) errs.triggerType = "Trigger type is required";
        if (Object.keys(errs).length) { setErrors(errs); return; }
        onStart({
            source,
            entity: entity as EntityType,
            runType: runType as RunType,
            triggerType: triggerType as TriggerType,
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
                            <div className={`sim-field sim-field--full${errors.source ? " sim-field--error" : ""}`}>
                                <label className="sim-label">Source System <span className="sim-required">*</span></label>
                                <select className="sim-select" value={source} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSource(e.target.value)}>
                                    <option value="">— Select source —</option>
                                    {MOCK_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                {errors.source && <span className="sim-error-msg">{errors.source}</span>}
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
    run: IngestionRun;
    onClose: () => void;
}

function RunDetailsDrawer({ run, onClose }: RunDetailsDrawerProps): React.ReactElement {
    const [tab, setTab] = useState<DrawerTab>("overview");
    const timeline: TimelineItem[] = RUN_TIMELINES[run.status] || RUN_TIMELINES["CREATED"];
    const errors: RunError[] = RUN_ERRORS[run.status] || [];

    return (
        <div className="ir-drawer-overlay" onClick={onClose}>
            <div className="ir-drawer" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <div className="ir-drawer__header">
                    <div>
                        <h2 className="ir-drawer__title">{run.source}</h2>
                        <div className="ir-drawer__sub">{run.id} · {run.entity} · {run.runType}</div>
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
                                    <StatusBadge status={run.status} />
                                </div>
                                <div className="ir-drawer__field">
                                    <span className="ir-drawer__field-label">Trigger Type</span>
                                    <span className="ir-drawer__field-value">{run.triggerType}</span>
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
                                        <span className="ir-drawer__count-val">{run.totalRecords.toLocaleString()}</span>
                                        <span className="ir-drawer__count-lbl">Total</span>
                                    </div>
                                    <div className="ir-drawer__count-card">
                                        <span className="ir-drawer__count-val ir-drawer__count-val--loaded">{run.loadedRecords.toLocaleString()}</span>
                                        <span className="ir-drawer__count-lbl">Loaded</span>
                                    </div>
                                    <div className="ir-drawer__count-card">
                                        <span className={`ir-drawer__count-val${run.failedRecords > 0 ? " ir-drawer__count-val--failed" : ""}`}>{run.failedRecords.toLocaleString()}</span>
                                        <span className="ir-drawer__count-lbl">Failed</span>
                                    </div>
                                </div>
                            </div>

                            {run.totalRecords > 0 && (
                                <div>
                                    <span className="ir-drawer__field-label" style={{ display: "block", marginBottom: 8 }}>Progress</span>
                                    <ProgressBar loaded={run.loadedRecords} total={run.totalRecords} />
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
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   INGESTION RUNS PAGE
═══════════════════════════════════════════════════════════════ */
function IngestionRuns(): React.ReactElement {
    const [runs, setRuns] = useState<IngestionRun[]>(MOCK_RUNS);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [viewRun, setViewRun] = useState<IngestionRun | null>(null);
    const [search, setSearch] = useState<string>("");
    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [filterSource, setFilterSource] = useState<string>("ALL");
    const [_lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /* Auto-refresh every 10s for running jobs */
    useEffect(() => {
        refreshRef.current = setInterval(() => {
            const hasRunning = runs.some(r => r.status === "RUNNING");
            if (hasRunning) {
                setLastRefresh(new Date());
                setRuns(prev => prev.map(r =>
                    r.status === "RUNNING"
                        ? { ...r, loadedRecords: Math.min(r.totalRecords, r.loadedRecords + Math.floor(Math.random() * 800 + 200)) }
                        : r
                ));
            }
        }, 10000);
        return () => {
            if (refreshRef.current) clearInterval(refreshRef.current);
        };
    }, [runs]);

    const filtered = runs.filter(r => {
        const q = search.toLowerCase();
        return (
            (r.id.toLowerCase().includes(q) || r.source.toLowerCase().includes(q) || r.entity.toLowerCase().includes(q)) &&
            (filterStatus === "ALL" || r.status === filterStatus) &&
            (filterSource === "ALL" || r.source === filterSource)
        );
    });

    const handleStart = (data: StartIngestionData): void => {
        const newRun: IngestionRun = {
            id: `RUN-${String(Math.floor(Math.random() * 9000) + 1000)}`,
            source: data.source,
            entity: data.entity,
            runType: data.runType,
            triggerType: data.triggerType,
            status: "CREATED",
            totalRecords: 0,
            loadedRecords: 0,
            failedRecords: 0,
            startedAt: new Date().toLocaleString("sv-SE").slice(0, 16).replace("T", " "),
            completedAt: null,
        };
        setRuns(prev => [newRun, ...prev]);
        setShowModal(false);
    };

    /* Summary counts */
    const total = runs.length;
    const running = runs.filter(r => r.status === "RUNNING").length;
    const completed = runs.filter(r => r.status === "COMPLETED").length;
    const failed = runs.filter(r => r.status === "FAILED").length;
    const stagingCreated = runs.filter(r => r.status === "STAGING_CREATED").length;
    const rawLoaded = runs.filter(r => r.status === "RAW_LOADED").length;

    return (
        <div className="ir-page">
            {/* Header */}
            <div className="ir-page-header">
                <div>
                    <h1 className="ir-page-title">Ingestion Runs</h1>
                    <p className="ir-page-subtitle">Monitor ingestion execution and processing status</p>
                </div>
                <div className="ir-page-header__actions">
                    <div className="ir-refresh-badge">
                        <span className="ir-refresh-dot" />
                        Auto-refresh: 10s
                    </div>
                    <button className="ir-btn ir-btn--ghost" onClick={() => { setRuns([...MOCK_RUNS]); setLastRefresh(new Date()); }}>↻ Refresh</button>
                    <button className="ir-btn ir-btn--primary" onClick={() => setShowModal(true)}>▶ Start Ingestion</button>
                </div>
            </div>

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
                        <select className="ir-select" value={filterSource} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterSource(e.target.value)}>
                            <option value="ALL">All Sources</option>
                            {MOCK_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
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
                                <th>Entity Type</th>
                                <th>Run Type</th>
                                <th>Status</th>
                                <th>Total</th>
                                <th>Loaded</th>
                                <th>Failed</th>
                                <th>Progress</th>
                                <th>Started At</th>
                                <th>Completed At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={12} className="ir-table-empty"><span>📋</span><p>No ingestion runs found</p></td></tr>
                            ) : filtered.map(run => (
                                <tr key={run.id} className="ir-table-row" onClick={() => setViewRun(run)}>
                                    <td><code className="ir-run-id">{run.id}</code></td>
                                    <td>
                                        <div className="ir-source-cell">
                                            <div className="ir-source-avatar">{run.source.slice(0, 2).toUpperCase()}</div>
                                            <span className="ir-source-name">{run.source}</span>
                                        </div>
                                    </td>
                                    <td><span className="ir-entity-chip">{run.entity}</span></td>
                                    <td><span className="ir-run-type">{run.runType}</span></td>
                                    <td><StatusBadge status={run.status} /></td>
                                    <td><span className="ir-count-cell">{run.totalRecords > 0 ? run.totalRecords.toLocaleString() : <span className="ir-count-cell--muted">—</span>}</span></td>
                                    <td><span className="ir-count-cell">{run.loadedRecords > 0 ? run.loadedRecords.toLocaleString() : <span className="ir-count-cell--muted">—</span>}</span></td>
                                    <td><span className={run.failedRecords > 0 ? "ir-count-cell ir-count-cell--failed" : "ir-count-cell"}>{run.failedRecords > 0 ? run.failedRecords.toLocaleString() : <span className="ir-count-cell--muted">0</span>}</span></td>
                                    <td onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{ minWidth: 120 }}>
                                        {run.totalRecords > 0 ? <ProgressBar loaded={run.loadedRecords} total={run.totalRecords} /> : <span className="ir-ts-na">—</span>}
                                    </td>
                                    <td><span className="ir-ts">{run.startedAt}</span></td>
                                    <td><span className={run.completedAt ? "ir-ts" : "ir-ts-na"}>{run.completedAt || "—"}</span></td>
                                    <td onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                        <div className="ir-action-row">
                                            <button className="ir-action-btn ir-action-btn--primary" onClick={() => setViewRun(run)}>Details</button>
                                            {run.status === "FAILED" && <button className="ir-action-btn ir-action-btn--danger">Retry</button>}
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
            {showModal && <StartIngestionModal onClose={() => setShowModal(false)} onStart={handleStart} />}
        </div>
    );
}

export default IngestionRuns;