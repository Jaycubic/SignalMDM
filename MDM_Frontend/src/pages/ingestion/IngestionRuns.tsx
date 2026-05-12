//Ingestion runs
import { useState, useEffect, useRef } from "react";

const CSS = `
:root {
  --navy-900:#0d1b35;
  --navy-800:#1a2d4f;
  --blue-600:#1557ff;
  --blue-500:#2563eb;
  --blue-400:#3b82f6;
  --blue-100:#eff6ff;
  --green-500:#22c55e;
  --green-100:#dcfce7;
  --red-500:#ef4444;
  --red-100:#fee2e2;
  --amber-500:#f59e0b;
  --amber-100:#fef3c7;
  --purple-500:#8b5cf6;
  --purple-100:#f5f3ff;
  --cyan-500:#06b6d4;
  --cyan-100:#ecfeff;
  --gray-400:#94a3b8;
  --gray-100:#f1f5f9;
  --text-primary:#0f172a;
  --text-secondary:#475569;
  --text-muted:#94a3b8;
  --border-light:#e2e8f0;
  --border-muted:#cbd5e1;
  --surface-1:#f8fafc;
  --surface-2:#f1f5f9;
  --surface-3:#e2e8f0;
  --shadow-sm:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
  --shadow-xl:0 20px 60px rgba(0,0,0,.18),0 8px 24px rgba(0,0,0,.12);
  --radius-sm:6px;
  --radius-md:10px;
  --radius-lg:14px;
  --radius-xl:18px;
}

/* ── Page layout ──────────────────────────────────────────── */
.ir-page{display:flex;flex-direction:column;gap:20px;max-width:1400px;padding:24px;font-family:'Geist','DM Sans',system-ui,sans-serif}
.ir-page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.ir-page-title{font-size:22px;font-weight:700;color:var(--text-primary);letter-spacing:-.3px;margin:0 0 3px}
.ir-page-subtitle{font-size:13px;color:var(--text-secondary)}
.ir-page-header__actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}

/* ── Buttons ──────────────────────────────────────────────── */
.ir-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--radius-sm);font-size:13px;font-weight:500;transition:background .15s,box-shadow .15s,transform .12s;white-space:nowrap;cursor:pointer;font-family:inherit;border:none}
.ir-btn:active{transform:scale(.97)}
.ir-btn--primary{background:var(--blue-600);color:#fff;box-shadow:0 2px 8px rgba(21,87,255,.28)}
.ir-btn--primary:hover{background:#0f49e0;box-shadow:0 4px 14px rgba(21,87,255,.38)}
.ir-btn--ghost{background:#fff;color:var(--text-secondary);border:1px solid var(--border-light)}
.ir-btn--ghost:hover{background:var(--surface-2);color:var(--text-primary)}

/* ── Auto-refresh badge ───────────────────────────────────── */
.ir-refresh-badge{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary);background:var(--surface-1);border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:6px 12px}
.ir-refresh-dot{width:7px;height:7px;border-radius:50%;background:var(--green-500);animation:ir-pulse 1.6s ease-in-out infinite}
@keyframes ir-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}

/* ── Summary Cards ────────────────────────────────────────── */
.ir-summary-row{display:flex;gap:14px;flex-wrap:wrap}
.ir-summary-card{background:#fff;border:1px solid var(--border-light);border-radius:var(--radius-md);padding:16px 22px;display:flex;flex-direction:column;gap:3px;min-width:130px;box-shadow:var(--shadow-sm);border-top:3px solid var(--blue-400)}
.ir-summary-card--blue{border-top-color:var(--blue-500)}
.ir-summary-card--green{border-top-color:var(--green-500)}
.ir-summary-card--red{border-top-color:var(--red-500)}
.ir-summary-card--amber{border-top-color:var(--amber-500)}
.ir-summary-card--purple{border-top-color:var(--purple-500)}
.ir-summary-card--cyan{border-top-color:var(--cyan-500)}
.ir-summary-card__value{font-size:28px;font-weight:700;color:var(--text-primary);line-height:1}
.ir-summary-card__label{font-size:11.5px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}

/* ── Table Card ───────────────────────────────────────────── */
.ir-table-card{background:#fff;border:1px solid var(--border-light);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);overflow:hidden}
.ir-table-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border-light);flex-wrap:wrap}
.ir-search-wrap{display:flex;align-items:center;gap:8px;background:var(--surface-1);border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:0 12px;min-width:220px}
.ir-search-icon{font-size:13px;color:var(--text-muted)}
.ir-search-input{border:none;background:transparent;font-size:13px;padding:8px 0;color:var(--text-primary);width:100%;font-family:inherit}
.ir-search-input::placeholder{color:var(--text-muted)}
.ir-search-input:focus{outline:none}
.ir-filter-row{display:flex;align-items:center;gap:10px}
.ir-select{border:1px solid var(--border-light);border-radius:var(--radius-sm);background:var(--surface-1);padding:7px 10px;font-size:13px;color:var(--text-primary);cursor:pointer;font-family:inherit}
.ir-select:focus{border-color:var(--blue-400);outline:none}
.ir-count-label{font-size:12px;color:var(--text-muted);white-space:nowrap;padding-left:6px}
.ir-table-wrap{overflow-x:auto}
.ir-table{width:100%;border-collapse:collapse;font-size:13px}
.ir-table thead th{background:var(--surface-1);color:var(--text-muted);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;padding:11px 16px;text-align:left;border-bottom:1px solid var(--border-light);white-space:nowrap}
.ir-table-row{border-bottom:1px solid var(--surface-2);transition:background .12s;cursor:pointer}
.ir-table-row:last-child{border-bottom:none}
.ir-table-row:hover{background:var(--surface-1)}
.ir-table td{padding:12px 16px;vertical-align:middle;color:var(--text-primary)}
.ir-table-empty{text-align:center;padding:60px 16px !important;color:var(--text-muted)}
.ir-table-empty span{font-size:32px;display:block;margin-bottom:8px}
.ir-table-empty p{font-size:14px}

/* ── Run ID cell ──────────────────────────────────────────── */
.ir-run-id{font-family:'Courier New',monospace;font-size:11.5px;background:var(--surface-2);color:var(--text-secondary);padding:3px 7px;border-radius:4px;border:1px solid var(--border-light);white-space:nowrap}

/* ── Source cell ──────────────────────────────────────────── */
.ir-source-cell{display:flex;align-items:center;gap:8px}
.ir-source-avatar{width:28px;height:28px;border-radius:6px;background:var(--blue-100);color:var(--blue-500);font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(37,99,235,.15)}
.ir-source-name{font-weight:500;font-size:13px}

/* ── Entity chip ──────────────────────────────────────────── */
.ir-entity-chip{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:4px;background:var(--blue-100);color:var(--blue-500);border:1px solid rgba(37,99,235,.18);text-transform:uppercase;letter-spacing:.3px;white-space:nowrap}

/* ── Type chips ───────────────────────────────────────────── */
.ir-run-type{font-size:11px;font-weight:600;padding:3px 8px;border-radius:5px;background:var(--navy-800);color:rgba(255,255,255,.75);text-transform:uppercase;letter-spacing:.4px;white-space:nowrap}

/* ── Status badges ────────────────────────────────────────── */
.ir-status{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:99px;white-space:nowrap;letter-spacing:.2px}
.ir-status::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0}
.ir-status--CREATED{background:#f1f5f9;color:#64748b}
.ir-status--RUNNING{background:var(--blue-100);color:var(--blue-500)}
.ir-status--RUNNING::before{animation:ir-pulse 1s ease-in-out infinite}
.ir-status--RAW_LOADED{background:var(--cyan-100);color:var(--cyan-500)}
.ir-status--STAGING_CREATED{background:var(--purple-100);color:var(--purple-500)}
.ir-status--FAILED{background:var(--red-100);color:#dc2626}
.ir-status--COMPLETED{background:var(--green-100);color:#16a34a}

/* ── Record count cells ───────────────────────────────────── */
.ir-count-cell{font-size:13px;font-weight:600;color:var(--text-primary)}
.ir-count-cell--failed{color:#dc2626}
.ir-count-cell--muted{color:var(--text-muted)}

/* ── Timestamp ────────────────────────────────────────────── */
.ir-ts{color:var(--text-secondary);font-size:12.5px;white-space:nowrap}
.ir-ts-na{color:var(--text-muted);font-size:12px}

/* ── Action buttons ───────────────────────────────────────── */
.ir-action-row{display:flex;gap:6px}
.ir-action-btn{padding:5px 11px;border-radius:var(--radius-sm);font-size:12px;font-weight:500;background:var(--surface-2);color:var(--text-secondary);border:1px solid var(--border-light);transition:background .13s,color .13s;white-space:nowrap;cursor:pointer;font-family:inherit}
.ir-action-btn:hover{background:var(--surface-3);color:var(--text-primary)}
.ir-action-btn--primary{background:var(--blue-100);color:var(--blue-500);border-color:rgba(37,99,235,.2)}
.ir-action-btn--primary:hover{background:rgba(37,99,235,.18)}
.ir-action-btn--danger{background:var(--red-100);color:#dc2626;border-color:rgba(239,68,68,.2)}
.ir-action-btn--danger:hover{background:rgba(239,68,68,.12)}

/* ══ START INGESTION MODAL ══════════════════════════════════ */
.sim-overlay{position:fixed;inset:0;background:rgba(6,12,30,.55);backdrop-filter:blur(3px);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;animation:sim-fade-in .18s ease}
@keyframes sim-fade-in{from{opacity:0}to{opacity:1}}
.sim-modal{background:#fff;border-radius:var(--radius-xl);width:520px;max-width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:var(--shadow-xl);overflow:hidden;animation:sim-slide-up .22s ease}
@keyframes sim-slide-up{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
.sim-header{background:var(--navy-900);padding:22px 24px 18px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-shrink:0}
.sim-header__title{font-size:17px;font-weight:700;color:#fff;margin:0 0 4px}
.sim-header__sub{font-size:12px;color:rgba(255,255,255,.45)}
.sim-close{background:rgba(255,255,255,.1);color:rgba(255,255,255,.6);border:none;width:30px;height:30px;border-radius:6px;font-size:13px;cursor:pointer;transition:background .13s;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sim-close:hover{background:rgba(255,255,255,.18);color:#fff}
.sim-body{flex:1;overflow-y:auto;padding:22px 24px}
.sim-section{display:flex;flex-direction:column;gap:16px}
.sim-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.sim-field{display:flex;flex-direction:column;gap:5px}
.sim-field--full{grid-column:1/-1}
.sim-label{font-size:12px;font-weight:600;color:var(--text-secondary);display:flex;align-items:center;gap:5px}
.sim-required{color:var(--red-500);font-size:13px;line-height:1}
.sim-input,.sim-select{border:1px solid var(--border-muted);border-radius:var(--radius-sm);padding:9px 11px;font-size:13px;color:var(--text-primary);background:#fff;transition:border-color .15s,box-shadow .15s;width:100%;font-family:inherit}
.sim-input:focus,.sim-select:focus{border-color:var(--blue-400);box-shadow:0 0 0 3px rgba(59,130,246,.12);outline:none}
.sim-select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:30px}
.sim-field--error .sim-input,.sim-field--error .sim-select{border-color:var(--red-500)}
.sim-error-msg{font-size:11.5px;color:var(--red-500);font-weight:500}
.sim-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 24px;border-top:1px solid var(--border-light);background:var(--surface-1);flex-shrink:0}
.sim-footer__right{display:flex;align-items:center;gap:10px}
.sim-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;transition:background .15s,transform .12s;cursor:pointer;white-space:nowrap;border:none;font-family:inherit}
.sim-btn:active{transform:scale(.97)}
.sim-btn--primary{background:var(--blue-600);color:#fff;box-shadow:0 2px 8px rgba(21,87,255,.28)}
.sim-btn--primary:hover{background:#0f49e0}
.sim-btn--ghost{background:transparent;color:var(--text-muted)}
.sim-btn--ghost:hover{color:var(--text-primary)}

/* ══ RUN DETAILS DRAWER ════════════════════════════════════ */
.ir-drawer-overlay{position:fixed;inset:0;background:rgba(6,12,25,.45);z-index:200;display:flex;justify-content:flex-end;backdrop-filter:blur(2px);animation:irFadeOverlay .18s ease}
@keyframes irFadeOverlay{from{opacity:0}to{opacity:1}}
.ir-drawer{width:440px;max-width:95vw;background:#fff;height:100%;display:flex;flex-direction:column;box-shadow:var(--shadow-xl);animation:irSlideDrawer .22s ease}
@keyframes irSlideDrawer{from{transform:translateX(60px);opacity:0}to{transform:translateX(0);opacity:1}}
.ir-drawer__header{display:flex;align-items:flex-start;justify-content:space-between;padding:20px 24px 16px;border-bottom:1px solid var(--border-light);background:var(--navy-900);gap:12px}
.ir-drawer__title{font-size:15px;font-weight:700;color:#fff;margin:0 0 4px}
.ir-drawer__sub{font-size:11px;color:rgba(255,255,255,.4);font-family:'Courier New',monospace}
.ir-drawer__close{background:rgba(255,255,255,.1);color:rgba(255,255,255,.65);border:none;width:30px;height:30px;border-radius:6px;font-size:13px;cursor:pointer;transition:background .13s;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.ir-drawer__close:hover{background:rgba(255,255,255,.18);color:#fff}
.ir-drawer__body{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:0}

/* drawer tabs */
.ir-drawer-tabs{display:flex;border-bottom:1px solid var(--border-light);background:var(--surface-1);flex-shrink:0}
.ir-drawer-tab{padding:10px 18px;font-size:12.5px;font-weight:500;color:var(--text-muted);cursor:pointer;border-bottom:2px solid transparent;transition:color .14s,border-color .14s;white-space:nowrap;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit}
.ir-drawer-tab:hover{color:var(--text-secondary)}
.ir-drawer-tab--active{color:var(--blue-600);border-bottom-color:var(--blue-500);font-weight:600}

.ir-drawer__content{padding:20px 24px;display:flex;flex-direction:column;gap:18px}

/* drawer grid */
.ir-drawer__grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ir-drawer__field{display:flex;flex-direction:column;gap:5px}
.ir-drawer__field-label{font-size:10.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px}
.ir-drawer__field-value{font-size:13px;color:var(--text-primary)}

/* record count row */
.ir-drawer__counts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.ir-drawer__count-card{background:var(--surface-1);border:1px solid var(--border-light);border-radius:var(--radius-md);padding:12px 14px;display:flex;flex-direction:column;gap:3px}
.ir-drawer__count-val{font-size:22px;font-weight:700;color:var(--text-primary);line-height:1}
.ir-drawer__count-val--failed{color:#dc2626}
.ir-drawer__count-val--loaded{color:#16a34a}
.ir-drawer__count-lbl{font-size:10.5px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}

/* timeline */
.ir-timeline{display:flex;flex-direction:column;gap:0}
.ir-timeline__item{display:flex;gap:12px;position:relative}
.ir-timeline__item::before{content:'';position:absolute;left:9px;top:26px;bottom:-4px;width:1px;background:var(--border-light)}
.ir-timeline__item:last-child::before{display:none}
.ir-timeline__dot{width:20px;height:20px;border-radius:50%;background:var(--blue-100);border:2px solid var(--blue-400);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:3px;font-size:9px;color:var(--blue-500);font-weight:700;z-index:1}
.ir-timeline__dot--done{background:var(--green-100);border-color:var(--green-500);color:#16a34a}
.ir-timeline__dot--fail{background:var(--red-100);border-color:var(--red-500);color:#dc2626}
.ir-timeline__dot--active{background:var(--blue-100);border-color:var(--blue-500);animation:ir-pulse 1.4s ease-in-out infinite}
.ir-timeline__body{padding-bottom:16px;flex:1}
.ir-timeline__label{font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:2px}
.ir-timeline__ts{font-size:11.5px;color:var(--text-muted)}

/* error summary */
.ir-error-list{display:flex;flex-direction:column;gap:8px}
.ir-error-item{background:var(--red-100);border:1px solid rgba(239,68,68,.2);border-radius:var(--radius-sm);padding:10px 13px;font-size:12.5px;color:#b91c1c;border-left:3px solid var(--red-500)}
.ir-error-item__code{font-family:'Courier New',monospace;font-size:11px;font-weight:700;margin-bottom:2px;color:#991b1b}
.ir-no-errors{font-size:13px;color:var(--text-muted);text-align:center;padding:20px 0}
`;

if (typeof document !== "undefined" && !document.getElementById("ir-styles")) {
    const el = document.createElement("style");
    el.id = "ir-styles";
    el.textContent = CSS;
    document.head.appendChild(el);
}

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
function StatusBadge({ status }: { status: RunStatus }): JSX.Element {
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

function ProgressBar({ loaded, total }: ProgressBarProps): JSX.Element {
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

function StartIngestionModal({ onClose, onStart }: StartIngestionModalProps): JSX.Element {
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

function RunDetailsDrawer({ run, onClose }: RunDetailsDrawerProps): JSX.Element {
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
export default function IngestionRuns(): JSX.Element {
    const [runs, setRuns] = useState<IngestionRun[]>(MOCK_RUNS);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [viewRun, setViewRun] = useState<IngestionRun | null>(null);
    const [search, setSearch] = useState<string>("");
    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [filterSource, setFilterSource] = useState<string>("ALL");
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
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