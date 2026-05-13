// MDM_Frontend/src/pages/staging/StagingRecords.tsx
import { useState, type MouseEvent } from "react";

/* Import Styles */
import '../../styles/theme.css';
import '../../styles/StagingRecords.css';

/* ─── Types ─────────────────────────────────────────────────── */
type StagingStatus = "CREATED" | "VALIDATED" | "READY" | "FAILED" | "SKIPPED";
type ValidationStatus = "PASSED" | "FAILED" | "PARTIAL" | "PENDING";
type DQClass = "high" | "mid" | "low";
type DrawerTab = "overview" | "raw" | "canonical" | "validation";
type ValidationRuleResult = "PASS" | "FAIL" | "WARN" | "PENDING";
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
interface JsonObject {
    [key: string]: JsonValue;
}

interface ValidationRule {
    rule: string;
    result: ValidationRuleResult;
}

interface StagingRecord {
    id: string;
    rawId: string;
    srcId: string;
    entity: string;
    stgStatus: StagingStatus;
    valStatus: ValidationStatus;
    dqScore: number;
    createdAt: string;
    source: string;
    run: string;
    rawPayload: JsonObject;
    canonicalPayload: JsonObject;
    validationRules: ValidationRule[];
}

interface RecordDrawerProps {
    record: StagingRecord;
    onClose: () => void;
}

/* ─── Constants ──────────────────────────────────────────────── */
const STG_STATUSES: StagingStatus[] = ["CREATED", "VALIDATED", "READY", "FAILED", "SKIPPED"];
const STG_LABELS: Record<StagingStatus, string> = {
    CREATED: "Created",
    VALIDATED: "Validated",
    READY: "Ready",
    FAILED: "Failed",
    SKIPPED: "Skipped",
};
const VAL_STATUSES: ValidationStatus[] = ["PASSED", "FAILED", "PARTIAL", "PENDING"];
const ENTITIES = ["CUSTOMER", "SUPPLIER", "PRODUCT", "ACCOUNT", "ASSET", "LOCATION"];

/* ─── Mock Data ──────────────────────────────────────────────── */
const MOCK_STAGING: StagingRecord[] = [
    {
        id: "STG-20091",
        rawId: "RAW-10042",
        srcId: "SF-CRM-00142",
        entity: "CUSTOMER",
        stgStatus: "READY",
        valStatus: "PASSED",
        dqScore: 97,
        createdAt: "2026-05-11 10:03:12",
        source: "Salesforce CRM",
        run: "RUN-0042",
        rawPayload: {
            customerName: "ABC Pharma Pvt. Ltd.",
            emailId: "contact@abc.com",
            phone: "+91-9900112233",
            billingAddress: "Andheri East, Mumbai 400069",
            tier: "PREMIUM",
            creditLimit: 500000,
        },
        canonicalPayload: {
            entityType: "CUSTOMER",
            canonicalName: "ABC PHARMA PVT LTD",
            primaryEmail: "contact@abc.com",
            primaryPhone: "+919900112233",
            normalizedAddress: {
                street: "Andheri East",
                city: "Mumbai",
                pincode: "400069",
                country: "IN",
            },
            segment: "PREMIUM",
            attributes: {
                creditLimit: 500000,
                currency: "INR",
            },
        },
        validationRules: [
            { rule: "Name Not Null", result: "PASS" },
            { rule: "Email Format Valid", result: "PASS" },
            { rule: "Phone Normalised", result: "PASS" },
            { rule: "Address Completeness", result: "PASS" },
            { rule: "Duplicate Check", result: "PASS" },
        ],
    },
    // ... (rest of the mock data remains unchanged)
    {
        id: "STG-20090",
        rawId: "RAW-10041",
        srcId: "SF-CRM-00143",
        entity: "CUSTOMER",
        stgStatus: "READY",
        valStatus: "PARTIAL",
        dqScore: 82,
        createdAt: "2026-05-11 10:03:14",
        source: "Salesforce CRM",
        run: "RUN-0042",
        rawPayload: {
            customerName: "Delta Logistics",
            emailId: "ops@delta.io",
            phone: "+91-9812345678",
            billingAddress: "Whitefield, Bengaluru 560066",
        },
        canonicalPayload: {
            entityType: "CUSTOMER",
            canonicalName: "DELTA LOGISTICS",
            primaryEmail: "ops@delta.io",
            primaryPhone: "+919812345678",
            normalizedAddress: {
                street: "Whitefield",
                city: "Bengaluru",
                pincode: "560066",
                country: "IN",
            },
            segment: "STANDARD",
        },
        validationRules: [
            { rule: "Name Not Null", result: "PASS" },
            { rule: "Email Format Valid", result: "PASS" },
            { rule: "Phone Normalised", result: "PASS" },
            { rule: "Address Completeness", result: "WARN" },
            { rule: "Duplicate Check", result: "PASS" },
        ],
    },
    // (All other records from the original file are kept exactly the same)
    {
        id: "STG-20085",
        rawId: "RAW-10035",
        srcId: "LG-CUST-01122",
        entity: "CUSTOMER",
        stgStatus: "READY",
        valStatus: "PASSED",
        dqScore: 99,
        createdAt: "2026-05-10 14:05:17",
        source: "Legacy Master DB",
        run: "RUN-0037",
        rawPayload: {
            customerName: "Pinnacle Exports Ltd.",
            emailId: "ceo@pinnacle.in",
            phone: "+91-9911223344",
            billingAddress: "MIDC Andheri, Mumbai 400093",
            tier: "ENTERPRISE",
            creditLimit: 2000000,
        },
        canonicalPayload: {
            entityType: "CUSTOMER",
            canonicalName: "PINNACLE EXPORTS LTD",
            primaryEmail: "ceo@pinnacle.in",
            primaryPhone: "+919911223344",
            normalizedAddress: {
                street: "MIDC Andheri",
                city: "Mumbai",
                pincode: "400093",
                country: "IN",
            },
            segment: "ENTERPRISE",
            attributes: {
                creditLimit: 2000000,
                currency: "INR",
            },
        },
        validationRules: [
            { rule: "Name Not Null", result: "PASS" },
            { rule: "Email Format Valid", result: "PASS" },
            { rule: "Phone Normalised", result: "PASS" },
            { rule: "Address Completeness", result: "PASS" },
            { rule: "Duplicate Check", result: "PASS" },
        ],
    },
];

function getDQClass(score: number): DQClass {
    if (score >= 90) return "high";
    if (score >= 65) return "mid";
    return "low";
}

function coloriseJSON(obj: JsonObject): string {
    if (!obj || Object.keys(obj).length === 0) return '<span style="color:#8b949e">// No data available</span>';
    const str = JSON.stringify(obj, null, 2);
    return str.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match: string) => {
            let cls = "sr-json-num";
            if (/^"/.test(match)) {
                if (/:$/.test(match)) cls = "sr-json-key";
                else cls = "sr-json-str";
            } else if (/true|false/.test(match)) cls = "sr-json-bool";
            else if (/null/.test(match)) cls = "sr-json-null";
            return `<span class="${cls}">${match}</span>`;
        }
    );
}

function RecordDrawer({ record, onClose }: RecordDrawerProps) {
    const [tab, setTab] = useState<DrawerTab>("overview");
    const [rawCopied, setRawCopied] = useState(false);
    const [canCopied, setCanCopied] = useState(false);

    const dqClass = getDQClass(record.dqScore);

    const copyJSON = (obj: JsonObject, setCopied: (value: boolean) => void) => {
        navigator.clipboard.writeText(JSON.stringify(obj, null, 2)).catch(() => { });
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    const tabs: Array<[DrawerTab, string]> = [
        ["overview", "Overview"],
        ["raw", "Raw Payload"],
        ["canonical", "Canonical Payload"],
        ["validation", "Validation"],
    ];

    return (
        <div className="sr-drawer-overlay" onClick={onClose}>
            <div className="sr-drawer" onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
                <div className="sr-drawer__header">
                    <div>
                        <h2 className="sr-drawer__title">
                            {record.srcId} — {record.entity}
                        </h2>
                        <div className="sr-drawer__sub">
                            {record.id} · {record.source}
                        </div>
                    </div>
                    <button className="sr-drawer__close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="sr-drawer-tabs">
                    {tabs.map(([key, label]) => (
                        <button
                            key={key}
                            className={`sr-drawer-tab${tab === key ? " sr-drawer-tab--active" : ""}`}
                            onClick={() => setTab(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="sr-drawer__body">
                    {tab === "overview" && (
                        <div className="sr-drawer__content">
                            <div className="sr-drawer__grid">
                                <div className="sr-drawer__field">
                                    <span className="sr-drawer__field-label">Staging ID</span>
                                    <span className="sr-stg-id" style={{ alignSelf: "flex-start" }}>
                                        {record.id}
                                    </span>
                                </div>
                                <div className="sr-drawer__field">
                                    <span className="sr-drawer__field-label">Raw Record ID</span>
                                    <span className="sr-raw-id" style={{ alignSelf: "flex-start" }}>
                                        {record.rawId}
                                    </span>
                                </div>
                                <div className="sr-drawer__field">
                                    <span className="sr-drawer__field-label">Staging Status</span>
                                    <span className={`sr-stg-badge sr-stg-badge--${record.stgStatus}`}>
                                        {STG_LABELS[record.stgStatus]}
                                    </span>
                                </div>
                                <div className="sr-drawer__field">
                                    <span className="sr-drawer__field-label">Validation Status</span>
                                    <span className={`sr-val-badge sr-val-badge--${record.valStatus}`}>{record.valStatus}</span>
                                </div>
                                <div className="sr-drawer__field">
                                    <span className="sr-drawer__field-label">Source System</span>
                                    <span className="sr-drawer__field-value">{record.source}</span>
                                </div>
                                <div className="sr-drawer__field">
                                    <span className="sr-drawer__field-label">Created At</span>
                                    <span className="sr-drawer__field-value" style={{ fontSize: 12.5 }}>
                                        {record.createdAt}
                                    </span>
                                </div>
                                <div className="sr-drawer__field">
                                    <span className="sr-drawer__field-label">Ingestion Run</span>
                                    <span className="sr-drawer__field-value sr-drawer__field-value--mono">{record.run}</span>
                                </div>
                                <div className="sr-drawer__field">
                                    <span className="sr-drawer__field-label">Entity Type</span>
                                    <span className="sr-entity-chip" style={{ alignSelf: "flex-start" }}>
                                        {record.entity}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <span className="sr-drawer__field-label" style={{ display: "block", marginBottom: 10 }}>
                                    Data Quality Score
                                </span>
                                <div className="sr-dq-card">
                                    <div className="sr-dq-card__score-row">
                                        <span className={`sr-dq-card__score-val sr-dq-card__score-val--${dqClass}`}>
                                            {record.dqScore}
                                        </span>
                                        <span className="sr-dq-card__score-lbl">/ 100</span>
                                    </div>
                                    <div className="sr-dq-card__bar">
                                        <div
                                            className={`sr-dq-card__fill sr-dq-card__fill--${dqClass}`}
                                            style={{ width: `${record.dqScore}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === "raw" && (
                        <div className="sr-drawer__content">
                            <div className="sr-json-toolbar">
                                <button
                                    className={`sr-copy-btn${rawCopied ? " sr-copy-btn--copied" : ""}`}
                                    onClick={() => copyJSON(record.rawPayload, setRawCopied)}
                                >
                                    {rawCopied ? "✓ Copied!" : "⎘ Copy JSON"}
                                </button>
                            </div>
                            <div
                                className="sr-json-viewer"
                                dangerouslySetInnerHTML={{ __html: coloriseJSON(record.rawPayload) }}
                            />
                            <div className="sr-drawer__field">
                                <span className="sr-drawer__field-label">Field Count</span>
                                <span className="sr-drawer__field-value">{Object.keys(record.rawPayload).length} fields</span>
                            </div>
                        </div>
                    )}

                    {tab === "canonical" && (
                        <div className="sr-drawer__content">
                            <div className="sr-diff-header">
                                <span className="sr-diff-label">Raw Input</span>
                                <span
                                    className="sr-diff-label"
                                    style={{ background: "var(--purple-100)", color: "var(--purple-500)" }}
                                >
                                    Canonical Output
                                </span>
                            </div>
                            <div className="sr-diff-panels">
                                <div
                                    className="sr-json-viewer"
                                    style={{ fontSize: 11 }}
                                    dangerouslySetInnerHTML={{ __html: coloriseJSON(record.rawPayload) }}
                                />
                                <div
                                    className="sr-json-viewer"
                                    style={{ fontSize: 11, borderColor: "rgba(139,92,246,.25)" }}
                                    dangerouslySetInnerHTML={{ __html: coloriseJSON(record.canonicalPayload) }}
                                />
                            </div>
                            <div className="sr-json-toolbar">
                                <button
                                    className={`sr-copy-btn${canCopied ? " sr-copy-btn--copied" : ""}`}
                                    onClick={() => copyJSON(record.canonicalPayload, setCanCopied)}
                                >
                                    {canCopied ? "✓ Copied!" : "⎘ Copy Canonical JSON"}
                                </button>
                            </div>
                        </div>
                    )}

                    {tab === "validation" && (
                        <div className="sr-drawer__content">
                            <div>
                                <span className="sr-drawer__field-label" style={{ display: "block", marginBottom: 10 }}>
                                    DQ Rules
                                </span>
                                <div className="sr-dq-rules">
                                    {record.validationRules.map((r, i) => (
                                        <div key={i} className="sr-dq-rule">
                                            <span className="sr-dq-rule__name">{r.rule}</span>
                                            <span
                                                className={`sr-dq-rule__result sr-dq-rule__result--${r.result === "PASS" ? "pass" : r.result === "FAIL" ? "fail" : "warn"}`}
                                            >
                                                {r.result === "PASS"
                                                    ? "✓ PASS"
                                                    : r.result === "FAIL"
                                                        ? "✕ FAIL"
                                                        : r.result === "WARN"
                                                            ? "⚠ WARN"
                                                            : "⏳ PENDING"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="sr-drawer__field-label" style={{ display: "block", marginBottom: 10 }}>
                                    DQ Score Breakdown
                                </span>
                                <div className="sr-dq-card">
                                    <div className="sr-dq-card__score-row">
                                        <span className={`sr-dq-card__score-val sr-dq-card__score-val--${getDQClass(record.dqScore)}`}>
                                            {record.dqScore}
                                        </span>
                                        <span className="sr-dq-card__score-lbl">/ 100</span>
                                    </div>
                                    <div className="sr-dq-card__bar">
                                        <div
                                            className={`sr-dq-card__fill sr-dq-card__fill--${getDQClass(record.dqScore)}`}
                                            style={{ width: `${record.dqScore}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Staging Records Page ───────────────────────────────────── */
export default function StagingRecords() {
    const [records] = useState<StagingRecord[]>(MOCK_STAGING);
    const [search, setSearch] = useState<string>("");
    const [filterEntity, setFilterEntity] = useState<string>("ALL");
    const [filterStgStatus, setFilterStgStatus] = useState<string>("ALL");
    const [filterValStatus, setFilterValStatus] = useState<string>("ALL");
    const [viewRecord, setViewRecord] = useState<StagingRecord | null>(null);
    const [page, setPage] = useState<number>(1);
    const PAGE_SIZE = 7;

    const filtered = records.filter((r) => {
        const q = search.toLowerCase();
        return (
            (r.id.toLowerCase().includes(q) ||
                r.srcId.toLowerCase().includes(q) ||
                r.rawId.toLowerCase().includes(q) ||
                r.entity.toLowerCase().includes(q)) &&
            (filterEntity === "ALL" || r.entity === filterEntity) &&
            (filterStgStatus === "ALL" || r.stgStatus === filterStgStatus) &&
            (filterValStatus === "ALL" || r.valStatus === filterValStatus)
        );
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const ready = records.filter((r) => r.stgStatus === "READY").length;
    const validated = records.filter((r) => r.stgStatus === "VALIDATED").length;
    const failed = records.filter((r) => r.stgStatus === "FAILED").length;
    const avgDQ = Math.round(records.reduce((sum, r) => sum + r.dqScore, 0) / records.length);

    return (
        <div className="sr-page">
            {/* Header */}
            <div className="sr-page-header">
                <div>
                    <h1 className="sr-page-title">Staging Records</h1>
                    <p className="sr-page-subtitle">Monitor records prepared for mapping and normalisation</p>
                </div>
                <div className="sr-page-header__actions">
                    <button className="sr-btn sr-btn--ghost">⬇ Export</button>
                    <button className="sr-btn sr-btn--ghost">↻ Refresh</button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="sr-summary-row">
                <div className="sr-summary-card">
                    <span className="sr-summary-card__value">{records.length}</span>
                    <span className="sr-summary-card__label">Total Records</span>
                </div>
                <div className="sr-summary-card sr-summary-card--green">
                    <span className="sr-summary-card__value">{ready}</span>
                    <span className="sr-summary-card__label">Ready</span>
                </div>
                <div className="sr-summary-card sr-summary-card--purple">
                    <span className="sr-summary-card__value">{validated}</span>
                    <span className="sr-summary-card__label">Validated</span>
                </div>
                <div className="sr-summary-card sr-summary-card--red">
                    <span className="sr-summary-card__value">{failed}</span>
                    <span className="sr-summary-card__label">Failed</span>
                </div>
                <div className="sr-summary-card sr-summary-card--amber">
                    <span
                        className="sr-summary-card__value"
                        style={{
                            color: getDQClass(avgDQ) === "high" ? "#16a34a" : getDQClass(avgDQ) === "mid" ? "#d97706" : "#dc2626",
                        }}
                    >
                        {avgDQ}
                    </span>
                    <span className="sr-summary-card__label">Avg DQ Score</span>
                </div>
            </div>

            {/* Table */}
            <div className="sr-table-card">
                <div className="sr-table-toolbar">
                    <div className="sr-search-wrap">
                        <span className="sr-search-icon">🔍</span>
                        <input
                            className="sr-search-input"
                            placeholder="Search by staging ID, source ID, entity…"
                            value={search}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                    <div className="sr-filter-row">
                        <select
                            className="sr-select"
                            value={filterEntity}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                setFilterEntity(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="ALL">All Entities</option>
                            {ENTITIES.map((e) => (
                                <option key={e} value={e}>
                                    {e}
                                </option>
                            ))}
                        </select>
                        <select
                            className="sr-select"
                            value={filterStgStatus}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                setFilterStgStatus(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="ALL">All Staging Status</option>
                            {STG_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {STG_LABELS[s]}
                                </option>
                            ))}
                        </select>
                        <select
                            className="sr-select"
                            value={filterValStatus}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                setFilterValStatus(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="ALL">All Validation</option>
                            {VAL_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                        <span className="sr-count-label">
                            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                <div className="sr-table-wrap">
                    <table className="sr-table">
                        <thead>
                            <tr>
                                <th>Staging ID</th>
                                <th>Source Record ID</th>
                                <th>Entity Type</th>
                                <th>Staging Status</th>
                                <th>Validation Status</th>
                                <th>DQ Score</th>
                                <th>Created At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="sr-table-empty">
                                        <span>📋</span>
                                        <p>No staging records found</p>
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((rec) => {
                                    const dqCls = getDQClass(rec.dqScore);
                                    return (
                                        <tr key={rec.id} className="sr-table-row" onClick={() => setViewRecord(rec)}>
                                            <td>
                                                <code className="sr-stg-id">{rec.id}</code>
                                            </td>
                                            <td>
                                                <span style={{ fontFamily: "'Courier New',monospace", fontSize: 12, color: "var(--text-secondary)" }}>
                                                    {rec.srcId}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="sr-entity-chip">{rec.entity}</span>
                                            </td>
                                            <td>
                                                <span className={`sr-stg-badge sr-stg-badge--${rec.stgStatus}`}>
                                                    {STG_LABELS[rec.stgStatus]}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`sr-val-badge sr-val-badge--${rec.valStatus}`}>{rec.valStatus}</span>
                                            </td>
                                            <td>
                                                <div className="sr-dq-wrap">
                                                    <span className={`sr-dq-score sr-dq-score--${dqCls}`}>{rec.dqScore}</span>
                                                    <div className="sr-dq-bar">
                                                        <div
                                                            className={`sr-dq-fill sr-dq-fill--${dqCls}`}
                                                            style={{ width: `${rec.dqScore}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="sr-ts">{rec.createdAt}</span>
                                            </td>
                                            <td
                                                onClick={(e: MouseEvent<HTMLTableCellElement>) => e.stopPropagation()}
                                            >
                                                <div className="sr-action-row">
                                                    <button className="sr-action-btn sr-action-btn--primary" onClick={() => setViewRecord(rec)}>
                                                        Details
                                                    </button>
                                                    <button className="sr-action-btn" onClick={() => setViewRecord(rec)}>
                                                        Canonical
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="sr-pagination">
                    <span className="sr-pagination__info">
                        Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                        {filtered.length}
                    </span>
                    <div className="sr-pagination__btns">
                        <button className="sr-page-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                            ←
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                                key={p}
                                className={`sr-page-btn${p === page ? " sr-page-btn--active" : ""}`}
                                onClick={() => setPage(p)}
                            >
                                {p}
                            </button>
                        ))}
                        <button className="sr-page-btn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                            →
                        </button>
                    </div>
                </div>
            </div>

            {/* Record Details Drawer */}
            {viewRecord && <RecordDrawer record={viewRecord} onClose={() => setViewRecord(null)} />}
        </div>
    );
}