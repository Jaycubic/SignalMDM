import { useState } from "react";

const CSS = `
.sr-page{display:flex;flex-direction:column;gap:20px;max-width:1400px;padding:24px;font-family:'Geist','DM Sans',system-ui,sans-serif}
.sr-page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.sr-page-title{font-size:22px;font-weight:700;color:var(--text-primary);letter-spacing:-.3px;margin:0 0 3px}
.sr-page-subtitle{font-size:13px;color:var(--text-secondary)}
.sr-page-header__actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}

/* ── Buttons ── */
.sr-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--radius-sm);font-size:13px;font-weight:500;transition:background .15s,box-shadow .15s,transform .12s;white-space:nowrap;cursor:pointer;font-family:inherit;border:none}
.sr-btn:active{transform:scale(.97)}
.sr-btn--primary{background:var(--blue-600);color:#fff;box-shadow:0 2px 8px rgba(21,87,255,.28)}
.sr-btn--primary:hover{background:#0f49e0}
.sr-btn--ghost{background:#fff;color:var(--text-secondary);border:1px solid var(--border-light)}
.sr-btn--ghost:hover{background:var(--surface-2);color:var(--text-primary)}

/* ── Summary Cards ── */
.sr-summary-row{display:flex;gap:14px;flex-wrap:wrap}
.sr-summary-card{background:#fff;border:1px solid var(--border-light);border-radius:var(--radius-md);padding:16px 22px;display:flex;flex-direction:column;gap:3px;min-width:120px;box-shadow:var(--shadow-sm);border-top:3px solid var(--blue-400)}
.sr-summary-card--green{border-top-color:var(--green-500)}
.sr-summary-card--red{border-top-color:var(--red-500)}
.sr-summary-card--amber{border-top-color:var(--amber-500)}
.sr-summary-card--purple{border-top-color:var(--purple-500)}
.sr-summary-card__value{font-size:28px;font-weight:700;color:var(--text-primary);line-height:1}
.sr-summary-card__label{font-size:11.5px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}

/* ── Table Card ── */
.sr-table-card{background:#fff;border:1px solid var(--border-light);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);overflow:hidden}
.sr-table-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border-light);flex-wrap:wrap}
.sr-search-wrap{display:flex;align-items:center;gap:8px;background:var(--surface-1);border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:0 12px;min-width:220px}
.sr-search-icon{font-size:13px;color:var(--text-muted)}
.sr-search-input{border:none;background:transparent;font-size:13px;padding:8px 0;color:var(--text-primary);width:100%;font-family:inherit}
.sr-search-input::placeholder{color:var(--text-muted)}
.sr-search-input:focus{outline:none}
.sr-filter-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.sr-select{border:1px solid var(--border-light);border-radius:var(--radius-sm);background:var(--surface-1);padding:7px 10px;font-size:13px;color:var(--text-primary);cursor:pointer;font-family:inherit}
.sr-select:focus{border-color:var(--blue-400);outline:none}
.sr-count-label{font-size:12px;color:var(--text-muted);white-space:nowrap;padding-left:6px}
.sr-table-wrap{overflow-x:auto}
.sr-table{width:100%;border-collapse:collapse;font-size:13px}
.sr-table thead th{background:var(--surface-1);color:var(--text-muted);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;padding:11px 16px;text-align:left;border-bottom:1px solid var(--border-light);white-space:nowrap}
.sr-table-row{border-bottom:1px solid var(--surface-2);transition:background .12s;cursor:pointer}
.sr-table-row:last-child{border-bottom:none}
.sr-table-row:hover{background:var(--surface-1)}
.sr-table td{padding:12px 16px;vertical-align:middle;color:var(--text-primary)}
.sr-table-empty{text-align:center;padding:60px 16px !important;color:var(--text-muted)}
.sr-table-empty span{font-size:32px;display:block;margin-bottom:8px}
.sr-table-empty p{font-size:14px}

/* ── Cells ── */
.sr-stg-id{font-family:'Courier New',monospace;font-size:11.5px;background:var(--purple-100);color:var(--purple-500);padding:3px 7px;border-radius:4px;border:1px solid rgba(139,92,246,.2);white-space:nowrap}
.sr-raw-id{font-family:'Courier New',monospace;font-size:11.5px;background:var(--surface-2);color:var(--text-secondary);padding:3px 7px;border-radius:4px;border:1px solid var(--border-light);white-space:nowrap}
.sr-entity-chip{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:4px;background:var(--blue-100);color:var(--blue-500);border:1px solid rgba(37,99,235,.18);text-transform:uppercase;letter-spacing:.3px}
.sr-ts{font-size:12.5px;color:var(--text-secondary);white-space:nowrap}

/* ── Staging Status ── */
.sr-stg-badge{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:99px;white-space:nowrap}
.sr-stg-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0}
.sr-stg-badge--CREATED{background:var(--purple-100);color:var(--purple-500)}
.sr-stg-badge--VALIDATED{background:var(--blue-100);color:var(--blue-500)}
.sr-stg-badge--READY{background:var(--green-100);color:#16a34a}
.sr-stg-badge--FAILED{background:var(--red-100);color:#dc2626}
.sr-stg-badge--SKIPPED{background:#f1f5f9;color:#64748b}

/* ── Validation Status ── */
.sr-val-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px}
.sr-val-badge--PASSED{background:var(--green-100);color:#16a34a}
.sr-val-badge--FAILED{background:var(--red-100);color:#dc2626}
.sr-val-badge--PARTIAL{background:var(--amber-100);color:#d97706}
.sr-val-badge--PENDING{background:var(--surface-2);color:var(--text-muted)}

/* ── DQ Score ── */
.sr-dq-wrap{display:flex;align-items:center;gap:8px}
.sr-dq-score{font-size:13px;font-weight:700;min-width:36px}
.sr-dq-score--high{color:#16a34a}
.sr-dq-score--mid{color:#d97706}
.sr-dq-score--low{color:#dc2626}
.sr-dq-bar{flex:1;height:5px;background:var(--surface-3);border-radius:99px;overflow:hidden;min-width:60px}
.sr-dq-fill{height:100%;border-radius:99px;transition:width .4s ease}
.sr-dq-fill--high{background:var(--green-500)}
.sr-dq-fill--mid{background:var(--amber-500)}
.sr-dq-fill--low{background:var(--red-500)}

/* ── Action buttons ── */
.sr-action-row{display:flex;gap:6px}
.sr-action-btn{padding:5px 11px;border-radius:var(--radius-sm);font-size:12px;font-weight:500;background:var(--surface-2);color:var(--text-secondary);border:1px solid var(--border-light);transition:background .13s,color .13s;white-space:nowrap;cursor:pointer;font-family:inherit}
.sr-action-btn:hover{background:var(--surface-3);color:var(--text-primary)}
.sr-action-btn--primary{background:var(--blue-100);color:var(--blue-500);border-color:rgba(37,99,235,.2)}
.sr-action-btn--primary:hover{background:rgba(37,99,235,.18)}

/* ══ RECORD DETAILS DRAWER ═════════════════════════════════ */
.sr-drawer-overlay{position:fixed;inset:0;background:rgba(6,12,25,.45);z-index:200;display:flex;justify-content:flex-end;backdrop-filter:blur(2px);animation:srFadeOverlay .18s ease}
@keyframes srFadeOverlay{from{opacity:0}to{opacity:1}}
.sr-drawer{width:500px;max-width:95vw;background:#fff;height:100%;display:flex;flex-direction:column;box-shadow:var(--shadow-xl);animation:srSlideDrawer .22s ease}
@keyframes srSlideDrawer{from{transform:translateX(60px);opacity:0}to{transform:translateX(0);opacity:1}}
.sr-drawer__header{display:flex;align-items:flex-start;justify-content:space-between;padding:20px 24px 16px;border-bottom:1px solid var(--border-light);background:var(--navy-900);gap:12px}
.sr-drawer__title{font-size:15px;font-weight:700;color:#fff;margin:0 0 4px}
.sr-drawer__sub{font-size:11px;color:rgba(255,255,255,.4);font-family:'Courier New',monospace}
.sr-drawer__close{background:rgba(255,255,255,.1);color:rgba(255,255,255,.65);border:none;width:30px;height:30px;border-radius:6px;font-size:13px;cursor:pointer;transition:background .13s;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.sr-drawer__close:hover{background:rgba(255,255,255,.18);color:#fff}

/* Drawer tabs */
.sr-drawer-tabs{display:flex;border-bottom:1px solid var(--border-light);background:var(--surface-1);flex-shrink:0;overflow-x:auto}
.sr-drawer-tab{padding:10px 16px;font-size:12.5px;font-weight:500;color:var(--text-muted);cursor:pointer;border-bottom:2px solid transparent;transition:color .14s,border-color .14s;white-space:nowrap;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit;flex-shrink:0}
.sr-drawer-tab:hover{color:var(--text-secondary)}
.sr-drawer-tab--active{color:var(--blue-600);border-bottom-color:var(--blue-500);font-weight:600}

.sr-drawer__body{flex:1;overflow-y:auto}
.sr-drawer__content{padding:20px 24px;display:flex;flex-direction:column;gap:18px}

/* Drawer grid */
.sr-drawer__grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.sr-drawer__field{display:flex;flex-direction:column;gap:5px}
.sr-drawer__field-label{font-size:10.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px}
.sr-drawer__field-value{font-size:13px;color:var(--text-primary)}
.sr-drawer__field-value--mono{font-family:'Courier New',monospace;font-size:12px;color:var(--text-secondary);word-break:break-all}

/* DQ score card in drawer */
.sr-dq-card{background:var(--surface-1);border:1px solid var(--border-light);border-radius:var(--radius-md);padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.sr-dq-card__score-row{display:flex;align-items:baseline;gap:6px}
.sr-dq-card__score-val{font-size:36px;font-weight:800;line-height:1}
.sr-dq-card__score-val--high{color:#16a34a}
.sr-dq-card__score-val--mid{color:#d97706}
.sr-dq-card__score-val--low{color:#dc2626}
.sr-dq-card__score-lbl{font-size:13px;color:var(--text-muted)}
.sr-dq-card__bar{height:8px;background:var(--surface-3);border-radius:99px;overflow:hidden}
.sr-dq-card__fill{height:100%;border-radius:99px;transition:width .6s ease}
.sr-dq-card__fill--high{background:var(--green-500)}
.sr-dq-card__fill--mid{background:var(--amber-500)}
.sr-dq-card__fill--low{background:var(--red-500)}
.sr-dq-rules{display:flex;flex-direction:column;gap:6px}
.sr-dq-rule{display:flex;align-items:center;justify-content:space-between;font-size:12.5px;padding:6px 10px;border-radius:var(--radius-sm);background:#fff;border:1px solid var(--border-light)}
.sr-dq-rule__name{color:var(--text-secondary);font-weight:500}
.sr-dq-rule__result{font-size:11px;font-weight:700}
.sr-dq-rule__result--pass{color:#16a34a}
.sr-dq-rule__result--fail{color:#dc2626}
.sr-dq-rule__result--warn{color:#d97706}

/* JSON viewer (same as raw landing) */
.sr-json-toolbar{display:flex;justify-content:flex-end;margin-bottom:6px}
.sr-copy-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:var(--radius-sm);font-size:11.5px;font-weight:500;background:var(--surface-2);color:var(--text-secondary);border:1px solid var(--border-light);cursor:pointer;transition:background .13s;font-family:inherit}
.sr-copy-btn:hover{background:var(--surface-3)}
.sr-copy-btn--copied{background:var(--green-100);color:#16a34a;border-color:rgba(34,197,94,.25)}
.sr-json-viewer{background:var(--navy-900);border-radius:var(--radius-md);padding:14px 16px;font-family:'Courier New',monospace;font-size:12px;line-height:1.7;color:rgba(255,255,255,.85);overflow:auto;white-space:pre;border:1px solid rgba(255,255,255,.05);max-height:300px}
.sr-json-key{color:#79c0ff}
.sr-json-str{color:#a5d6ff}
.sr-json-num{color:#ffa657}
.sr-json-bool{color:#ff7b72}
.sr-json-null{color:#8b949e}

/* diff view */
.sr-diff-header{display:flex;gap:10px;margin-bottom:8px}
.sr-diff-label{flex:1;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted);text-align:center;padding:4px 8px;background:var(--surface-2);border-radius:var(--radius-sm)}
.sr-diff-panels{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* Pagination */
.sr-pagination{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-top:1px solid var(--border-light);flex-wrap:wrap;gap:10px}
.sr-pagination__info{font-size:12.5px;color:var(--text-muted)}
.sr-pagination__btns{display:flex;gap:4px}
.sr-page-btn{padding:5px 10px;border-radius:var(--radius-sm);font-size:12.5px;font-weight:500;background:var(--surface-1);color:var(--text-secondary);border:1px solid var(--border-light);cursor:pointer;transition:background .13s;font-family:inherit}
.sr-page-btn:hover{background:var(--surface-2)}
.sr-page-btn--active{background:var(--blue-600);color:#fff;border-color:var(--blue-600)}
.sr-page-btn:disabled{opacity:.4;cursor:not-allowed}
`;

if (typeof document !== "undefined" && !document.getElementById("sr-styles")) {
    const el = document.createElement("style");
    el.id = "sr-styles";
    el.textContent = CSS;
    document.head.appendChild(el);
}

/* ─── Constants ──────────────────────────────────────────────── */
const STG_STATUSES = ["CREATED", "VALIDATED", "READY", "FAILED", "SKIPPED"];
const STG_LABELS = { CREATED: "Created", VALIDATED: "Validated", READY: "Ready", FAILED: "Failed", SKIPPED: "Skipped" };
const VAL_STATUSES = ["PASSED", "FAILED", "PARTIAL", "PENDING"];
const ENTITIES = ["CUSTOMER", "SUPPLIER", "PRODUCT", "ACCOUNT", "ASSET", "LOCATION"];

/* ─── Mock Data ──────────────────────────────────────────────── */
const MOCK_STAGING = [
    {
        id: "STG-20091", rawId: "RAW-10042", srcId: "SF-CRM-00142", entity: "CUSTOMER", stgStatus: "READY", valStatus: "PASSED", dqScore: 97,
        createdAt: "2026-05-11 10:03:12", source: "Salesforce CRM", run: "RUN-0042",
        rawPayload: { customerName: "ABC Pharma Pvt. Ltd.", emailId: "contact@abc.com", phone: "+91-9900112233", billingAddress: "Andheri East, Mumbai 400069", tier: "PREMIUM", creditLimit: 500000 },
        canonicalPayload: { entityType: "CUSTOMER", canonicalName: "ABC PHARMA PVT LTD", primaryEmail: "contact@abc.com", primaryPhone: "+919900112233", normalizedAddress: { street: "Andheri East", city: "Mumbai", pincode: "400069", country: "IN" }, segment: "PREMIUM", attributes: { creditLimit: 500000, currency: "INR" } },
        validationRules: [{ rule: "Name Not Null", result: "PASS" }, { rule: "Email Format Valid", result: "PASS" }, { rule: "Phone Normalised", result: "PASS" }, { rule: "Address Completeness", result: "PASS" }, { rule: "Duplicate Check", result: "PASS" }],
    },
    {
        id: "STG-20090", rawId: "RAW-10041", srcId: "SF-CRM-00143", entity: "CUSTOMER", stgStatus: "READY", valStatus: "PARTIAL", dqScore: 82,
        createdAt: "2026-05-11 10:03:14", source: "Salesforce CRM", run: "RUN-0042",
        rawPayload: { customerName: "Delta Logistics", emailId: "ops@delta.io", phone: "+91-9812345678", billingAddress: "Whitefield, Bengaluru 560066" },
        canonicalPayload: { entityType: "CUSTOMER", canonicalName: "DELTA LOGISTICS", primaryEmail: "ops@delta.io", primaryPhone: "+919812345678", normalizedAddress: { street: "Whitefield", city: "Bengaluru", pincode: "560066", country: "IN" }, segment: "STANDARD" },
        validationRules: [{ rule: "Name Not Null", result: "PASS" }, { rule: "Email Format Valid", result: "PASS" }, { rule: "Phone Normalised", result: "PASS" }, { rule: "Address Completeness", result: "WARN" }, { rule: "Duplicate Check", result: "PASS" }],
    },
    {
        id: "STG-20089", rawId: "RAW-10040", srcId: "SAP-PROD-7721", entity: "PRODUCT", stgStatus: "VALIDATED", valStatus: "PASSED", dqScore: 100,
        createdAt: "2026-05-11 09:48:10", source: "SAP ERP Core", run: "RUN-0041",
        rawPayload: { productName: "Industrial Pump XR-900", sku: "PUMP-XR-900-IND", category: "MACHINERY", uom: "UNIT", basePrice: 74500, currency: "INR" },
        canonicalPayload: { entityType: "PRODUCT", canonicalName: "INDUSTRIAL PUMP XR-900", sku: "PUMP-XR-900-IND", categoryCode: "MACH", uom: "UNIT", pricing: { basePrice: 74500, currency: "INR", effectiveDate: "2026-05-11" } },
        validationRules: [{ rule: "Name Not Null", result: "PASS" }, { rule: "SKU Format Valid", result: "PASS" }, { rule: "Price > 0", result: "PASS" }, { rule: "Category Mapped", result: "PASS" }, { rule: "Duplicate Check", result: "PASS" }],
    },
    {
        id: "STG-20088", rawId: "RAW-10039", srcId: "ORA-ACC-9910", entity: "ACCOUNT", stgStatus: "READY", valStatus: "PASSED", dqScore: 95,
        createdAt: "2026-05-11 08:33:22", source: "Oracle Finance", run: "RUN-0040",
        rawPayload: { accountName: "Corporate Main A/C", accountNumber: "ACC-9910-CORP", currency: "INR", accountType: "CURRENT", bankName: "HDFC Bank", ifscCode: "HDFC0001234" },
        canonicalPayload: { entityType: "ACCOUNT", canonicalName: "CORPORATE MAIN AC", accountNumber: "ACC-9910-CORP", currency: "INR", accountType: "CURRENT", bankDetails: { bankName: "HDFC Bank", ifscCode: "HDFC0001234" } },
        validationRules: [{ rule: "Account Name Not Null", result: "PASS" }, { rule: "Account Number Format", result: "PASS" }, { rule: "Currency Code Valid", result: "PASS" }, { rule: "IFSC Code Valid", result: "PASS" }],
    },
    {
        id: "STG-20087", rawId: "RAW-10038", srcId: "VP-SUP-00334", entity: "SUPPLIER", stgStatus: "CREATED", valStatus: "PENDING", dqScore: 74,
        createdAt: "2026-05-11 08:05:41", source: "Vendor Portal", run: "RUN-0039",
        rawPayload: { supplierName: "Mehta Precision Parts", taxId: "GSTIN29AA2150P1ZQ", contactEmail: "supply@mehta.co.in", paymentTerms: "NET30", currency: "INR" },
        canonicalPayload: { entityType: "SUPPLIER", canonicalName: "MEHTA PRECISION PARTS", taxId: "GSTIN29AA2150P1ZQ", primaryEmail: "supply@mehta.co.in", paymentTerms: "NET30", currency: "INR" },
        validationRules: [{ rule: "Name Not Null", result: "PASS" }, { rule: "GSTIN Format Valid", result: "PASS" }, { rule: "Email Format Valid", result: "PASS" }, { rule: "Payment Terms Valid", result: "PENDING" }],
    },
    {
        id: "STG-20086", rawId: "RAW-10037", srcId: "WD-CUST-00881", entity: "CUSTOMER", stgStatus: "FAILED", valStatus: "FAILED", dqScore: 31,
        createdAt: "2026-05-10 17:25:09", source: "Workday HRMS", run: "RUN-0038",
        rawPayload: { customerName: "", emailId: "noname@workday.com", phone: "+91-8866554433", billingAddress: "Connaught Place, New Delhi 110001" },
        canonicalPayload: {},
        validationRules: [{ rule: "Name Not Null", result: "FAIL" }, { rule: "Email Format Valid", result: "PASS" }, { rule: "Phone Normalised", result: "PASS" }, { rule: "Address Completeness", result: "FAIL" }, { rule: "Duplicate Check", result: "FAIL" }],
    },
    {
        id: "STG-20085", rawId: "RAW-10035", srcId: "LG-CUST-01122", entity: "CUSTOMER", stgStatus: "READY", valStatus: "PASSED", dqScore: 99,
        createdAt: "2026-05-10 14:05:17", source: "Legacy Master DB", run: "RUN-0037",
        rawPayload: { customerName: "Pinnacle Exports Ltd.", emailId: "ceo@pinnacle.in", phone: "+91-9911223344", billingAddress: "MIDC Andheri, Mumbai 400093", tier: "ENTERPRISE", creditLimit: 2000000 },
        canonicalPayload: { entityType: "CUSTOMER", canonicalName: "PINNACLE EXPORTS LTD", primaryEmail: "ceo@pinnacle.in", primaryPhone: "+919911223344", normalizedAddress: { street: "MIDC Andheri", city: "Mumbai", pincode: "400093", country: "IN" }, segment: "ENTERPRISE", attributes: { creditLimit: 2000000, currency: "INR" } },
        validationRules: [{ rule: "Name Not Null", result: "PASS" }, { rule: "Email Format Valid", result: "PASS" }, { rule: "Phone Normalised", result: "PASS" }, { rule: "Address Completeness", result: "PASS" }, { rule: "Duplicate Check", result: "PASS" }],
    },
];

/* ─── Helpers ────────────────────────────────────────────────── */
function getDQClass(score) {
    if (score >= 90) return "high";
    if (score >= 65) return "mid";
    return "low";
}

function coloriseJSON(obj) {
    if (!obj || Object.keys(obj).length === 0) return '<span style="color:#8b949e">// No data available</span>';
    const str = JSON.stringify(obj, null, 2);
    return str.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
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

/* ─── Record Details Drawer ──────────────────────────────────── */
function RecordDrawer({ record, onClose }) {
    const [tab, setTab] = useState("overview");
    const [rawCopied, setRawCopied] = useState(false);
    const [canCopied, setCanCopied] = useState(false);

    const dqClass = getDQClass(record.dqScore);

    const copyJSON = (obj, setCopied) => {
        navigator.clipboard.writeText(JSON.stringify(obj, null, 2)).catch(() => { });
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    const tabs = [
        ["overview", "Overview"],
        ["raw", "Raw Payload"],
        ["canonical", "Canonical Payload"],
        ["validation", "Validation"],
    ];

    return (
        <div className="sr-drawer-overlay" onClick={onClose}>
            <div className="sr-drawer" onClick={e => e.stopPropagation()}>
                <div className="sr-drawer__header">
                    <div>
                        <h2 className="sr-drawer__title">{record.srcId} — {record.entity}</h2>
                        <div className="sr-drawer__sub">{record.id} · {record.source}</div>
                    </div>
                    <button className="sr-drawer__close" onClick={onClose}>✕</button>
                </div>

                <div className="sr-drawer-tabs">
                    {tabs.map(([key, label]) => (
                        <button key={key} className={`sr-drawer-tab${tab === key ? " sr-drawer-tab--active" : ""}`} onClick={() => setTab(key)}>
                            {label}
                        </button>
                    ))}
                </div>

                <div className="sr-drawer__body">
                    {/* Overview */}
                    {tab === "overview" && (
                        <div className="sr-drawer__content">
                            <div className="sr-drawer__grid">
                                <div className="sr-drawer__field">
                                    <span className="sr-drawer__field-label">Staging ID</span>
                                    <span className="sr-stg-id" style={{ alignSelf: "flex-start" }}>{record.id}</span>
                                </div>
                                <div className="sr-drawer__field">
                                    <span className="sr-drawer__field-label">Raw Record ID</span>
                                    <span className="sr-raw-id" style={{ alignSelf: "flex-start" }}>{record.rawId}</span>
                                </div>
                                <div className="sr-drawer__field">
                                    <span className="sr-drawer__field-label">Staging Status</span>
                                    <span className={`sr-stg-badge sr-stg-badge--${record.stgStatus}`}>{STG_LABELS[record.stgStatus]}</span>
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
                                    <span className="sr-drawer__field-value" style={{ fontSize: 12.5 }}>{record.createdAt}</span>
                                </div>
                                <div className="sr-drawer__field">
                                    <span className="sr-drawer__field-label">Ingestion Run</span>
                                    <span className="sr-drawer__field-value sr-drawer__field-value--mono">{record.run}</span>
                                </div>
                                <div className="sr-drawer__field">
                                    <span className="sr-drawer__field-label">Entity Type</span>
                                    <span className="sr-entity-chip" style={{ alignSelf: "flex-start" }}>{record.entity}</span>
                                </div>
                            </div>

                            {/* DQ Score */}
                            <div>
                                <span className="sr-drawer__field-label" style={{ display: "block", marginBottom: 10 }}>Data Quality Score</span>
                                <div className="sr-dq-card">
                                    <div className="sr-dq-card__score-row">
                                        <span className={`sr-dq-card__score-val sr-dq-card__score-val--${dqClass}`}>{record.dqScore}</span>
                                        <span className="sr-dq-card__score-lbl">/ 100</span>
                                    </div>
                                    <div className="sr-dq-card__bar">
                                        <div className={`sr-dq-card__fill sr-dq-card__fill--${dqClass}`} style={{ width: `${record.dqScore}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Raw Payload */}
                    {tab === "raw" && (
                        <div className="sr-drawer__content">
                            <div className="sr-json-toolbar">
                                <button className={`sr-copy-btn${rawCopied ? " sr-copy-btn--copied" : ""}`} onClick={() => copyJSON(record.rawPayload, setRawCopied)}>
                                    {rawCopied ? "✓ Copied!" : "⎘ Copy JSON"}
                                </button>
                            </div>
                            <div className="sr-json-viewer" dangerouslySetInnerHTML={{ __html: coloriseJSON(record.rawPayload) }} />
                            <div className="sr-drawer__field">
                                <span className="sr-drawer__field-label">Field Count</span>
                                <span className="sr-drawer__field-value">{Object.keys(record.rawPayload).length} fields</span>
                            </div>
                        </div>
                    )}

                    {/* Canonical Payload */}
                    {tab === "canonical" && (
                        <div className="sr-drawer__content">
                            <div className="sr-diff-header">
                                <span className="sr-diff-label">Raw Input</span>
                                <span className="sr-diff-label" style={{ background: "var(--purple-100)", color: "var(--purple-500)" }}>Canonical Output</span>
                            </div>
                            <div className="sr-diff-panels">
                                <div className="sr-json-viewer" style={{ fontSize: 11 }} dangerouslySetInnerHTML={{ __html: coloriseJSON(record.rawPayload) }} />
                                <div className="sr-json-viewer" style={{ fontSize: 11, borderColor: "rgba(139,92,246,.25)" }} dangerouslySetInnerHTML={{ __html: coloriseJSON(record.canonicalPayload) }} />
                            </div>
                            <div className="sr-json-toolbar">
                                <button className={`sr-copy-btn${canCopied ? " sr-copy-btn--copied" : ""}`} onClick={() => copyJSON(record.canonicalPayload, setCanCopied)}>
                                    {canCopied ? "✓ Copied!" : "⎘ Copy Canonical JSON"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Validation */}
                    {tab === "validation" && (
                        <div className="sr-drawer__content">
                            <div>
                                <span className="sr-drawer__field-label" style={{ display: "block", marginBottom: 10 }}>DQ Rules</span>
                                <div className="sr-dq-rules">
                                    {record.validationRules.map((r, i) => (
                                        <div key={i} className="sr-dq-rule">
                                            <span className="sr-dq-rule__name">{r.rule}</span>
                                            <span className={`sr-dq-rule__result sr-dq-rule__result--${r.result === "PASS" ? "pass" : r.result === "FAIL" ? "fail" : "warn"}`}>
                                                {r.result === "PASS" ? "✓ PASS" : r.result === "FAIL" ? "✕ FAIL" : r.result === "WARN" ? "⚠ WARN" : "⏳ PENDING"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="sr-drawer__field-label" style={{ display: "block", marginBottom: 10 }}>DQ Score Breakdown</span>
                                <div className="sr-dq-card">
                                    <div className="sr-dq-card__score-row">
                                        <span className={`sr-dq-card__score-val sr-dq-card__score-val--${getDQClass(record.dqScore)}`}>{record.dqScore}</span>
                                        <span className="sr-dq-card__score-lbl">/ 100</span>
                                    </div>
                                    <div className="sr-dq-card__bar">
                                        <div className={`sr-dq-card__fill sr-dq-card__fill--${getDQClass(record.dqScore)}`} style={{ width: `${record.dqScore}%` }} />
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
    const [records] = useState(MOCK_STAGING);
    const [search, setSearch] = useState("");
    const [filterEntity, setFilterEntity] = useState("ALL");
    const [filterStgStatus, setFilterStgStatus] = useState("ALL");
    const [filterValStatus, setFilterValStatus] = useState("ALL");
    const [viewRecord, setViewRecord] = useState(null);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 7;

    const filtered = records.filter(r => {
        const q = search.toLowerCase();
        return (
            (r.id.toLowerCase().includes(q) || r.srcId.toLowerCase().includes(q) || r.rawId.toLowerCase().includes(q) || r.entity.toLowerCase().includes(q)) &&
            (filterEntity === "ALL" || r.entity === filterEntity) &&
            (filterStgStatus === "ALL" || r.stgStatus === filterStgStatus) &&
            (filterValStatus === "ALL" || r.valStatus === filterValStatus)
        );
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const ready = records.filter(r => r.stgStatus === "READY").length;
    const validated = records.filter(r => r.stgStatus === "VALIDATED").length;
    const failed = records.filter(r => r.stgStatus === "FAILED").length;
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
                <div className="sr-summary-card"><span className="sr-summary-card__value">{records.length}</span><span className="sr-summary-card__label">Total Records</span></div>
                <div className="sr-summary-card sr-summary-card--green"><span className="sr-summary-card__value">{ready}</span><span className="sr-summary-card__label">Ready</span></div>
                <div className="sr-summary-card sr-summary-card--purple"><span className="sr-summary-card__value">{validated}</span><span className="sr-summary-card__label">Validated</span></div>
                <div className="sr-summary-card sr-summary-card--red"><span className="sr-summary-card__value">{failed}</span><span className="sr-summary-card__label">Failed</span></div>
                <div className="sr-summary-card sr-summary-card--amber">
                    <span className="sr-summary-card__value" style={{ color: getDQClass(avgDQ) === "high" ? "#16a34a" : getDQClass(avgDQ) === "mid" ? "#d97706" : "#dc2626" }}>{avgDQ}</span>
                    <span className="sr-summary-card__label">Avg DQ Score</span>
                </div>
            </div>

            {/* Table */}
            <div className="sr-table-card">
                <div className="sr-table-toolbar">
                    <div className="sr-search-wrap">
                        <span className="sr-search-icon">🔍</span>
                        <input className="sr-search-input" placeholder="Search by staging ID, source ID, entity…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <div className="sr-filter-row">
                        <select className="sr-select" value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setPage(1); }}>
                            <option value="ALL">All Entities</option>
                            {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                        <select className="sr-select" value={filterStgStatus} onChange={e => { setFilterStgStatus(e.target.value); setPage(1); }}>
                            <option value="ALL">All Staging Status</option>
                            {STG_STATUSES.map(s => <option key={s} value={s}>{STG_LABELS[s]}</option>)}
                        </select>
                        <select className="sr-select" value={filterValStatus} onChange={e => { setFilterValStatus(e.target.value); setPage(1); }}>
                            <option value="ALL">All Validation</option>
                            {VAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <span className="sr-count-label">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
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
                                <tr><td colSpan={8} className="sr-table-empty"><span>📋</span><p>No staging records found</p></td></tr>
                            ) : paginated.map(rec => {
                                const dqCls = getDQClass(rec.dqScore);
                                return (
                                    <tr key={rec.id} className="sr-table-row" onClick={() => setViewRecord(rec)}>
                                        <td><code className="sr-stg-id">{rec.id}</code></td>
                                        <td><span style={{ fontFamily: "'Courier New',monospace", fontSize: 12, color: "var(--text-secondary)" }}>{rec.srcId}</span></td>
                                        <td><span className="sr-entity-chip">{rec.entity}</span></td>
                                        <td><span className={`sr-stg-badge sr-stg-badge--${rec.stgStatus}`}>{STG_LABELS[rec.stgStatus]}</span></td>
                                        <td><span className={`sr-val-badge sr-val-badge--${rec.valStatus}`}>{rec.valStatus}</span></td>
                                        <td>
                                            <div className="sr-dq-wrap">
                                                <span className={`sr-dq-score sr-dq-score--${dqCls}`}>{rec.dqScore}</span>
                                                <div className="sr-dq-bar">
                                                    <div className={`sr-dq-fill sr-dq-fill--${dqCls}`} style={{ width: `${rec.dqScore}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className="sr-ts">{rec.createdAt}</span></td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className="sr-action-row">
                                                <button className="sr-action-btn sr-action-btn--primary" onClick={() => setViewRecord(rec)}>Details</button>
                                                <button className="sr-action-btn" onClick={() => { setViewRecord(rec); }}>Canonical</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="sr-pagination">
                    <span className="sr-pagination__info">
                        Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </span>
                    <div className="sr-pagination__btns">
                        <button className="sr-page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>←</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button key={p} className={`sr-page-btn${p === page ? " sr-page-btn--active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                        ))}
                        <button className="sr-page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>→</button>
                    </div>
                </div>
            </div>

            {/* Record Details Drawer */}
            {viewRecord && <RecordDrawer record={viewRecord} onClose={() => setViewRecord(null)} />}
        </div>
    );
}