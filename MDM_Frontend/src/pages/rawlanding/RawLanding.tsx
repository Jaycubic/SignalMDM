// MDM_Frontend/src/pages/rawlanding/RawLanding.tsx
import { useState } from "react";

/* Import Styles */
import '../../styles/theme.css';
import '../../styles/RawLanding.css';

/* ─── Types ─────────────────────────────────────────────────── */
type ProcStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "DUPLICATE";
type ModalTab = "payload" | "metadata";
type PayloadValue = string | number | boolean | null;

interface RawRecord {
    id: string;
    srcId: string;
    entity: string;
    source: string;
    run: string;
    status: ProcStatus;
    receivedAt: string;
    payload: Record<string, PayloadValue>;
    checksum?: string;
}

interface PayloadModalProps {
    record: RawRecord;
    onClose: () => void;
    initialTab?: ModalTab;
}

/* ─── Constants ──────────────────────────────────────────────── */
const PROC_STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "DUPLICATE"] as const;
const PROC_LABELS: Record<ProcStatus, string> = {
    PENDING: "Pending",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    FAILED: "Failed",
    DUPLICATE: "Duplicate",
};
const ENTITIES = ["CUSTOMER", "SUPPLIER", "PRODUCT", "ACCOUNT", "ASSET", "LOCATION"];
const SOURCES = ["Salesforce CRM", "SAP ERP Core", "Workday HRMS", "Oracle Finance", "Vendor Portal", "Legacy Master DB"];
const MOCK_RUNS = ["RUN-0042", "RUN-0041", "RUN-0040", "RUN-0039", "RUN-0038"];

function makeChecksum(seed: string): string {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    return "sha256:" + Math.abs(h).toString(16).padStart(8, "0") + "a3f9c1b2e5";
}

const MOCK_RECORDS: RawRecord[] = [
    {
        id: "RAW-10042",
        srcId: "SF-CRM-00142",
        entity: "CUSTOMER",
        source: "Salesforce CRM",
        run: "RUN-0042",
        status: "COMPLETED",
        receivedAt: "2026-05-11 10:01:03",
        payload: {
            customerName: "ABC Pharma Pvt. Ltd.",
            emailId: "contact@abc.com",
            phone: "+91-9900112233",
            billingAddress: "Andheri East, Mumbai 400069",
            tier: "PREMIUM",
            creditLimit: 500000,
        },
    },
    {
        id: "RAW-10041",
        srcId: "SF-CRM-00143",
        entity: "CUSTOMER",
        source: "Salesforce CRM",
        run: "RUN-0042",
        status: "COMPLETED",
        receivedAt: "2026-05-11 10:01:04",
        payload: {
            customerName: "Delta Logistics",
            emailId: "ops@delta.io",
            phone: "+91-9812345678",
            billingAddress: "Whitefield, Bengaluru 560066",
            tier: "STANDARD",
        },
    },
    {
        id: "RAW-10040",
        srcId: "SAP-PROD-7721",
        entity: "PRODUCT",
        source: "SAP ERP Core",
        run: "RUN-0041",
        status: "PROCESSING",
        receivedAt: "2026-05-11 09:46:22",
        payload: {
            productName: "Industrial Pump XR-900",
            sku: "PUMP-XR-900-IND",
            category: "MACHINERY",
            uom: "UNIT",
            basePrice: 74500,
            currency: "INR",
        },
    },
    {
        id: "RAW-10039",
        srcId: "ORA-ACC-9910",
        entity: "ACCOUNT",
        source: "Oracle Finance",
        run: "RUN-0040",
        status: "COMPLETED",
        receivedAt: "2026-05-11 08:30:45",
        payload: {
            accountName: "Corporate Main A/C",
            accountNumber: "ACC-9910-CORP",
            currency: "INR",
            accountType: "CURRENT",
            bankName: "HDFC Bank",
            ifscCode: "HDFC0001234",
        },
    },
    {
        id: "RAW-10038",
        srcId: "VP-SUP-00334",
        entity: "SUPPLIER",
        source: "Vendor Portal",
        run: "RUN-0039",
        status: "COMPLETED",
        receivedAt: "2026-05-11 08:01:12",
        payload: {
            supplierName: "Mehta Precision Parts",
            taxId: "GSTIN29AA2150P1ZQ",
            contactEmail: "supply@mehta.co.in",
            paymentTerms: "NET30",
            currency: "INR",
        },
    },
    {
        id: "RAW-10037",
        srcId: "WD-CUST-00881",
        entity: "CUSTOMER",
        source: "Workday HRMS",
        run: "RUN-0038",
        status: "FAILED",
        receivedAt: "2026-05-10 17:23:05",
        payload: {
            customerName: "",
            emailId: "noname@workday.com",
            phone: "+91-8866554433",
            billingAddress: "Connaught Place, New Delhi 110001",
        },
    },
    {
        id: "RAW-10036",
        srcId: "SAP-PROD-7689",
        entity: "PRODUCT",
        source: "SAP ERP Core",
        run: "RUN-0041",
        status: "DUPLICATE",
        receivedAt: "2026-05-11 09:46:35",
        payload: {
            productName: "Industrial Pump XR-900",
            sku: "PUMP-XR-900-IND",
            category: "MACHINERY",
            uom: "UNIT",
            basePrice: 74500,
        },
    },
    {
        id: "RAW-10035",
        srcId: "LG-CUST-01122",
        entity: "CUSTOMER",
        source: "Legacy Master DB",
        run: "RUN-0037",
        status: "COMPLETED",
        receivedAt: "2026-05-10 14:01:09",
        payload: {
            customerName: "Pinnacle Exports Ltd.",
            emailId: "ceo@pinnacle.in",
            phone: "+91-9911223344",
            billingAddress: "MIDC Andheri, Mumbai 400093",
            tier: "ENTERPRISE",
            creditLimit: 2000000,
        },
    },
    {
        id: "RAW-10034",
        srcId: "SF-CUST-00889",
        entity: "CUSTOMER",
        source: "Salesforce CRM",
        run: "RUN-0042",
        status: "PENDING",
        receivedAt: "2026-05-11 10:01:08",
        payload: {
            customerName: "BlueSky Technologies",
            emailId: "info@bluesky.io",
            phone: "+91-8877665544",
            billingAddress: "Hinjewadi, Pune 411057",
        },
    },
];

MOCK_RECORDS.forEach((r) => {
    r.checksum = makeChecksum(r.id + r.srcId);
});

/* ─── JSON Coloriser ─────────────────────────────────────────── */
function coloriseJSON(obj: Record<string, PayloadValue>): string {
    const str = JSON.stringify(obj, null, 2);
    return str.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
            let cls = "rl-json-num";
            if (/^"/.test(match)) {
                if (/:$/.test(match)) cls = "rl-json-key";
                else cls = "rl-json-str";
            } else if (/true|false/.test(match)) cls = "rl-json-bool";
            else if (/null/.test(match)) cls = "rl-json-null";
            return `<span class="${cls}">${match}</span>`;
        }
    );
}

/* ─── Payload Viewer Modal ───────────────────────────────────── */
function PayloadModal({ record, onClose, initialTab = "payload" }: PayloadModalProps) {
    const [tab, setTab] = useState<ModalTab>(initialTab);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(record.payload, null, 2)).catch(() => { });
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    const modalTabs: Array<[ModalTab, string]> = [
        ["payload", "Payload"],
        ["metadata", "Metadata"],
    ];

    return (
        <div className="rl-modal-overlay" onClick={onClose}>
            <div className="rl-modal" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="rl-modal__header">
                    <div>
                        <h2 className="rl-modal__title">
                            {record.srcId} — {record.entity}
                        </h2>
                        <div className="rl-modal__sub">
                            {record.id} · {record.source}
                        </div>
                    </div>
                    <button className="rl-modal__close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="rl-modal-tabs">
                    {modalTabs.map(([key, label]) => (
                        <button
                            key={key}
                            className={`rl-modal-tab${tab === key ? " rl-modal-tab--active" : ""}`}
                            onClick={() => setTab(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="rl-modal__body">
                    {tab === "payload" && (
                        <>
                            <div className="rl-json-toolbar">
                                <button className={`rl-copy-btn${copied ? " rl-copy-btn--copied" : ""}`} onClick={handleCopy}>
                                    {copied ? "✓ Copied!" : "⎘ Copy JSON"}
                                </button>
                            </div>
                            <div className="rl-json-viewer" dangerouslySetInnerHTML={{ __html: coloriseJSON(record.payload) }} />
                        </>
                    )}

                    {tab === "metadata" && (
                        <div className="rl-meta-grid">
                            <div className="rl-meta-field">
                                <span className="rl-meta-label">Raw Record ID</span>
                                <span className="rl-meta-value rl-meta-value--mono">{record.id}</span>
                            </div>
                            <div className="rl-meta-field">
                                <span className="rl-meta-label">Source Record ID</span>
                                <span className="rl-meta-value rl-meta-value--mono">{record.srcId}</span>
                            </div>
                            <div className="rl-meta-field">
                                <span className="rl-meta-label">Entity Type</span>
                                <span className="rl-meta-value">{record.entity}</span>
                            </div>
                            <div className="rl-meta-field">
                                <span className="rl-meta-label">Source System</span>
                                <span className="rl-meta-value">{record.source}</span>
                            </div>
                            <div className="rl-meta-field">
                                <span className="rl-meta-label">Ingestion Run</span>
                                <span className="rl-meta-value rl-meta-value--mono">{record.run}</span>
                            </div>
                            <div className="rl-meta-field">
                                <span className="rl-meta-label">Processing Status</span>
                                <span className="rl-meta-value">{record.status}</span>
                            </div>
                            <div className="rl-meta-field">
                                <span className="rl-meta-label">Received At</span>
                                <span className="rl-meta-value">{record.receivedAt}</span>
                            </div>
                            <div className="rl-meta-field">
                                <span className="rl-meta-label">Field Count</span>
                                <span className="rl-meta-value">{Object.keys(record.payload).length} fields</span>
                            </div>
                            <div className="rl-meta-field" style={{ gridColumn: "1/-1" }}>
                                <span className="rl-meta-label">Checksum</span>
                                <span className="rl-meta-value rl-meta-value--mono">{record.checksum}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Raw Landing Page ───────────────────────────────────────── */
export default function RawLanding() {
    const [records] = useState<RawRecord[]>(MOCK_RECORDS);
    const [search, setSearch] = useState<string>("");
    const [filterSource, setFilterSource] = useState<string>("ALL");
    const [filterEntity, setFilterEntity] = useState<string>("ALL");
    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [filterRun, setFilterRun] = useState<string>("ALL");
    const [viewRecord, setViewRecord] = useState<RawRecord | null>(null);
    const [viewTab, setViewTab] = useState<ModalTab>("payload");
    const [page, setPage] = useState<number>(1);
    const PAGE_SIZE = 7;

    const filtered = records.filter((r) => {
        const q = search.toLowerCase();
        return (
            (r.id.toLowerCase().includes(q) || r.srcId.toLowerCase().includes(q) || r.entity.toLowerCase().includes(q)) &&
            (filterSource === "ALL" || r.source === filterSource) &&
            (filterEntity === "ALL" || r.entity === filterEntity) &&
            (filterStatus === "ALL" || r.status === filterStatus) &&
            (filterRun === "ALL" || r.run === filterRun)
        );
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const openModal = (rec: RawRecord, tab: ModalTab = "payload") => {
        setViewRecord(rec);
        setViewTab(tab);
    };

    const completed = records.filter((r) => r.status === "COMPLETED").length;
    const processing = records.filter((r) => r.status === "PROCESSING").length;
    const failed = records.filter((r) => r.status === "FAILED").length;
    const duplicates = records.filter((r) => r.status === "DUPLICATE").length;

    return (
        <div className="rl-page">
            {/* Header */}
            <div className="rl-page-header">
                <div>
                    <h1 className="rl-page-title">Raw Landing</h1>
                    <p className="rl-page-subtitle">View raw records exactly as received from source systems</p>
                </div>
                <div className="rl-page-header__actions">
                    <button className="rl-btn rl-btn--ghost">⬇ Export</button>
                    <button className="rl-btn rl-btn--ghost">↻ Refresh</button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="rl-summary-row">
                <div className="rl-summary-card">
                    <span className="rl-summary-card__value">{records.length}</span>
                    <span className="rl-summary-card__label">Total Records</span>
                </div>
                <div className="rl-summary-card rl-summary-card--green">
                    <span className="rl-summary-card__value">{completed}</span>
                    <span className="rl-summary-card__label">Completed</span>
                </div>
                <div className="rl-summary-card" style={{ borderTopColor: "var(--blue-500)" }}>
                    <span className="rl-summary-card__value">{processing}</span>
                    <span className="rl-summary-card__label">Processing</span>
                </div>
                <div className="rl-summary-card rl-summary-card--red">
                    <span className="rl-summary-card__value">{failed}</span>
                    <span className="rl-summary-card__label">Failed</span>
                </div>
                <div className="rl-summary-card rl-summary-card--amber">
                    <span className="rl-summary-card__value">{duplicates}</span>
                    <span className="rl-summary-card__label">Duplicates</span>
                </div>
            </div>

            {/* Table */}
            <div className="rl-table-card">
                <div className="rl-table-toolbar">
                    <div className="rl-search-wrap">
                        <span className="rl-search-icon">🔍</span>
                        <input
                            className="rl-search-input"
                            placeholder="Search by raw ID, source ID, entity…"
                            value={search}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                    <div className="rl-filter-row">
                        <select
                            className="rl-select"
                            value={filterSource}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                setFilterSource(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="ALL">All Sources</option>
                            {SOURCES.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                        <select
                            className="rl-select"
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
                            className="rl-select"
                            value={filterStatus}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                setFilterStatus(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="ALL">All Statuses</option>
                            {PROC_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {PROC_LABELS[s]}
                                </option>
                            ))}
                        </select>
                        <select
                            className="rl-select"
                            value={filterRun}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                setFilterRun(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="ALL">All Runs</option>
                            {MOCK_RUNS.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                        <span className="rl-count-label">
                            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                <div className="rl-table-wrap">
                    <table className="rl-table">
                        <thead>
                            <tr>
                                <th>Raw Record ID</th>
                                <th>Source Record ID</th>
                                <th>Entity Type</th>
                                <th>Source System</th>
                                <th>Processing Status</th>
                                <th>Received At</th>
                                <th>Checksum</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="rl-table-empty">
                                        <span>🗄</span>
                                        <p>No raw records found</p>
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((rec) => (
                                    <tr key={rec.id} className="rl-table-row">
                                        <td>
                                            <code className="rl-raw-id">{rec.id}</code>
                                        </td>
                                        <td>
                                            <span className="rl-src-id">{rec.srcId}</span>
                                        </td>
                                        <td>
                                            <span className="rl-entity-chip">{rec.entity}</span>
                                        </td>
                                        <td style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
                                            {rec.source}
                                        </td>
                                        <td>
                                            <span className={`rl-proc-status rl-proc-status--${rec.status}`}>
                                                {PROC_LABELS[rec.status]}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="rl-ts">{rec.receivedAt}</span>
                                        </td>
                                        <td>
                                            <span className="rl-checksum" title={rec.checksum}>
                                                {rec.checksum}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="rl-action-row">
                                                <button className="rl-action-btn rl-action-btn--primary" onClick={() => openModal(rec, "payload")}>
                                                    View Payload
                                                </button>
                                                <button className="rl-action-btn" onClick={() => openModal(rec, "metadata")}>
                                                    Metadata
                                                </button>
                                                <button
                                                    className="rl-action-btn"
                                                    onClick={() => {
                                                        const blob = new Blob([JSON.stringify(rec.payload, null, 2)], {
                                                            type: "application/json",
                                                        });
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement("a");
                                                        a.href = url;
                                                        a.download = `${rec.id}.json`;
                                                        a.click();
                                                        URL.revokeObjectURL(url);
                                                    }}
                                                >
                                                    ⬇ JSON
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="rl-pagination">
                    <span className="rl-pagination__info">
                        Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
                        {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </span>
                    <div className="rl-pagination__btns">
                        <button className="rl-page-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                            ←
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                                key={p}
                                className={`rl-page-btn${p === page ? " rl-page-btn--active" : ""}`}
                                onClick={() => setPage(p)}
                            >
                                {p}
                            </button>
                        ))}
                        <button className="rl-page-btn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                            →
                        </button>
                    </div>
                </div>
            </div>

            {/* Payload Modal */}
            {viewRecord && <PayloadModal record={viewRecord} onClose={() => setViewRecord(null)} initialTab={viewTab} />}
        </div>
    );
}