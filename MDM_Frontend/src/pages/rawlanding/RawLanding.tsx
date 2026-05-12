import { useState } from "react";

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

/* ─── Styles ─────────────────────────────────────────────────── */
const CSS = `
.rl-page{display:flex;flex-direction:column;gap:20px;max-width:1400px;padding:24px;font-family:'Geist','DM Sans',system-ui,sans-serif}
.rl-page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.rl-page-title{font-size:22px;font-weight:700;color:var(--text-primary);letter-spacing:-.3px;margin:0 0 3px}
.rl-page-subtitle{font-size:13px;color:var(--text-secondary)}
.rl-page-header__actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}

/* ── Buttons ── */
.rl-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--radius-sm);font-size:13px;font-weight:500;transition:background .15s,box-shadow .15s,transform .12s;white-space:nowrap;cursor:pointer;font-family:inherit;border:none}
.rl-btn:active{transform:scale(.97)}
.rl-btn--primary{background:var(--blue-600);color:#fff;box-shadow:0 2px 8px rgba(21,87,255,.28)}
.rl-btn--primary:hover{background:#0f49e0}
.rl-btn--ghost{background:#fff;color:var(--text-secondary);border:1px solid var(--border-light)}
.rl-btn--ghost:hover{background:var(--surface-2);color:var(--text-primary)}

/* ── Summary Cards ── */
.rl-summary-row{display:flex;gap:14px;flex-wrap:wrap}
.rl-summary-card{background:#fff;border:1px solid var(--border-light);border-radius:var(--radius-md);padding:16px 22px;display:flex;flex-direction:column;gap:3px;min-width:120px;box-shadow:var(--shadow-sm);border-top:3px solid var(--blue-400)}
.rl-summary-card--green{border-top-color:var(--green-500)}
.rl-summary-card--red{border-top-color:var(--red-500)}
.rl-summary-card--amber{border-top-color:var(--amber-500)}
.rl-summary-card--purple{border-top-color:var(--purple-500)}
.rl-summary-card__value{font-size:28px;font-weight:700;color:var(--text-primary);line-height:1}
.rl-summary-card__label{font-size:11.5px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}

/* ── Table Card ── */
.rl-table-card{background:#fff;border:1px solid var(--border-light);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);overflow:hidden}
.rl-table-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border-light);flex-wrap:wrap}
.rl-search-wrap{display:flex;align-items:center;gap:8px;background:var(--surface-1);border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:0 12px;min-width:220px}
.rl-search-icon{font-size:13px;color:var(--text-muted)}
.rl-search-input{border:none;background:transparent;font-size:13px;padding:8px 0;color:var(--text-primary);width:100%;font-family:inherit}
.rl-search-input::placeholder{color:var(--text-muted)}
.rl-search-input:focus{outline:none}
.rl-filter-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.rl-select{border:1px solid var(--border-light);border-radius:var(--radius-sm);background:var(--surface-1);padding:7px 10px;font-size:13px;color:var(--text-primary);cursor:pointer;font-family:inherit}
.rl-select:focus{border-color:var(--blue-400);outline:none}
.rl-count-label{font-size:12px;color:var(--text-muted);white-space:nowrap;padding-left:6px}
.rl-table-wrap{overflow-x:auto}
.rl-table{width:100%;border-collapse:collapse;font-size:13px}
.rl-table thead th{background:var(--surface-1);color:var(--text-muted);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;padding:11px 16px;text-align:left;border-bottom:1px solid var(--border-light);white-space:nowrap}
.rl-table-row{border-bottom:1px solid var(--surface-2);transition:background .12s}
.rl-table-row:last-child{border-bottom:none}
.rl-table-row:hover{background:var(--surface-1)}
.rl-table td{padding:12px 16px;vertical-align:middle;color:var(--text-primary)}
.rl-table-empty{text-align:center;padding:60px 16px !important;color:var(--text-muted)}
.rl-table-empty span{font-size:32px;display:block;margin-bottom:8px}
.rl-table-empty p{font-size:14px}

/* ── Cells ── */
.rl-raw-id{font-family:'Courier New',monospace;font-size:11.5px;background:var(--surface-2);color:var(--text-secondary);padding:3px 7px;border-radius:4px;border:1px solid var(--border-light);white-space:nowrap}
.rl-src-id{font-family:'Courier New',monospace;font-size:12px;color:var(--text-secondary)}
.rl-entity-chip{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:4px;background:var(--blue-100);color:var(--blue-500);border:1px solid rgba(37,99,235,.18);text-transform:uppercase;letter-spacing:.3px}
.rl-checksum{font-family:'Courier New',monospace;font-size:11px;color:var(--text-muted);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}
.rl-ts{font-size:12.5px;color:var(--text-secondary);white-space:nowrap}

/* ── Processing Status badges ── */
.rl-proc-status{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:99px;white-space:nowrap}
.rl-proc-status::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0}
.rl-proc-status--PENDING{background:#f1f5f9;color:#64748b}
.rl-proc-status--PROCESSING{background:var(--blue-100);color:var(--blue-500)}
.rl-proc-status--PROCESSING::before{animation:rl-pulse 1s ease-in-out infinite}
@keyframes rl-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
.rl-proc-status--COMPLETED{background:var(--green-100);color:#16a34a}
.rl-proc-status--FAILED{background:var(--red-100);color:#dc2626}
.rl-proc-status--DUPLICATE{background:var(--amber-100);color:#d97706}

/* ── Action buttons ── */
.rl-action-row{display:flex;gap:6px}
.rl-action-btn{padding:5px 11px;border-radius:var(--radius-sm);font-size:12px;font-weight:500;background:var(--surface-2);color:var(--text-secondary);border:1px solid var(--border-light);transition:background .13s,color .13s;white-space:nowrap;cursor:pointer;font-family:inherit}
.rl-action-btn:hover{background:var(--surface-3);color:var(--text-primary)}
.rl-action-btn--primary{background:var(--blue-100);color:var(--blue-500);border-color:rgba(37,99,235,.2)}
.rl-action-btn--primary:hover{background:rgba(37,99,235,.18)}

/* ══ PAYLOAD VIEWER MODAL ══════════════════════════════════ */
.rl-modal-overlay{position:fixed;inset:0;background:rgba(6,12,30,.55);backdrop-filter:blur(3px);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;animation:rl-fade-in .18s ease}
@keyframes rl-fade-in{from{opacity:0}to{opacity:1}}
.rl-modal{background:#fff;border-radius:var(--radius-xl);width:580px;max-width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:var(--shadow-xl);overflow:hidden;animation:rl-slide-up .22s ease}
@keyframes rl-slide-up{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
.rl-modal__header{background:var(--navy-900);padding:20px 24px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-shrink:0}
.rl-modal__title{font-size:15px;font-weight:700;color:#fff;margin:0 0 4px}
.rl-modal__sub{font-size:11px;color:rgba(255,255,255,.4);font-family:'Courier New',monospace}
.rl-modal__close{background:rgba(255,255,255,.1);color:rgba(255,255,255,.6);border:none;width:30px;height:30px;border-radius:6px;font-size:13px;cursor:pointer;transition:background .13s;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rl-modal__close:hover{background:rgba(255,255,255,.18);color:#fff}

/* Modal tabs */
.rl-modal-tabs{display:flex;border-bottom:1px solid var(--border-light);background:var(--surface-1);flex-shrink:0}
.rl-modal-tab{padding:10px 18px;font-size:12.5px;font-weight:500;color:var(--text-muted);cursor:pointer;border-bottom:2px solid transparent;transition:color .14s,border-color .14s;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit}
.rl-modal-tab:hover{color:var(--text-secondary)}
.rl-modal-tab--active{color:var(--blue-600);border-bottom-color:var(--blue-500);font-weight:600}

.rl-modal__body{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:14px}

/* JSON viewer */
.rl-json-toolbar{display:flex;justify-content:flex-end}
.rl-copy-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:var(--radius-sm);font-size:11.5px;font-weight:500;background:var(--surface-2);color:var(--text-secondary);border:1px solid var(--border-light);cursor:pointer;transition:background .13s;font-family:inherit}
.rl-copy-btn:hover{background:var(--surface-3)}
.rl-copy-btn--copied{background:var(--green-100);color:#16a34a;border-color:rgba(34,197,94,.25)}
.rl-json-viewer{background:var(--navy-900);border-radius:var(--radius-md);padding:16px 18px;font-family:'Courier New',monospace;font-size:12.5px;line-height:1.7;color:rgba(255,255,255,.85);overflow-x:auto;white-space:pre;border:1px solid rgba(255,255,255,.05)}
.rl-json-key{color:#79c0ff}
.rl-json-str{color:#a5d6ff}
.rl-json-num{color:#ffa657}
.rl-json-bool{color:#ff7b72}
.rl-json-null{color:#8b949e}

/* Metadata grid */
.rl-meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.rl-meta-field{display:flex;flex-direction:column;gap:4px}
.rl-meta-label{font-size:10.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px}
.rl-meta-value{font-size:13px;color:var(--text-primary)}
.rl-meta-value--mono{font-family:'Courier New',monospace;font-size:12px;color:var(--text-secondary);word-break:break-all}

/* Pagination */
.rl-pagination{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-top:1px solid var(--border-light);flex-wrap:wrap;gap:10px}
.rl-pagination__info{font-size:12.5px;color:var(--text-muted)}
.rl-pagination__btns{display:flex;gap:4px}
.rl-page-btn{padding:5px 10px;border-radius:var(--radius-sm);font-size:12.5px;font-weight:500;background:var(--surface-1);color:var(--text-secondary);border:1px solid var(--border-light);cursor:pointer;transition:background .13s;font-family:inherit}
.rl-page-btn:hover{background:var(--surface-2)}
.rl-page-btn--active{background:var(--blue-600);color:#fff;border-color:var(--blue-600)}
.rl-page-btn:disabled{opacity:.4;cursor:not-allowed}
`;

if (typeof document !== "undefined" && !document.getElementById("rl-styles")) {
    const el = document.createElement("style");
    el.id = "rl-styles";
    el.textContent = CSS;
    document.head.appendChild(el);
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