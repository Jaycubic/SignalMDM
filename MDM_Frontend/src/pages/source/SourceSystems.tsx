//Source Systems
import { useState } from 'react';
import RegisterSourceModal from '../../components/modals/RegisterSourceModal';

/* ─── Styles (CSS merged into this page file) ────────────────── */
const CSS = `
.ss-page{display:flex;flex-direction:column;gap:20px;max-width:1400px}
.ss-page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.ss-page-title{font-size:22px;font-weight:700;color:var(--text-primary);letter-spacing:-.3px;margin:0 0 3px}
.ss-page-subtitle{font-size:13px;color:var(--text-secondary)}
.ss-page-header__actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ss-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--radius-sm);font-size:13px;font-weight:500;transition:background .15s,box-shadow .15s,transform .12s;white-space:nowrap;cursor:pointer;font-family:inherit}
.ss-btn:active{transform:scale(.97)}
.ss-btn--primary{background:var(--blue-600);color:#fff;border:none;box-shadow:0 2px 8px rgba(21,87,255,.28)}
.ss-btn--primary:hover{background:#0f49e0;box-shadow:0 4px 14px rgba(21,87,255,.38)}
.ss-btn--ghost{background:#fff;color:var(--text-secondary);border:1px solid var(--border-light)}
.ss-btn--ghost:hover{background:var(--surface-2);color:var(--text-primary)}
.ss-summary-row{display:flex;gap:14px;flex-wrap:wrap}
.ss-summary-card{background:#fff;border:1px solid var(--border-light);border-radius:var(--radius-md);padding:16px 22px;display:flex;flex-direction:column;gap:3px;min-width:120px;box-shadow:var(--shadow-sm);border-top:3px solid var(--blue-400)}
.ss-summary-card--green{border-top-color:var(--green-500)}
.ss-summary-card--red{border-top-color:var(--red-500)}
.ss-summary-card--amber{border-top-color:var(--amber-500)}
.ss-summary-card__value{font-size:28px;font-weight:700;color:var(--text-primary);line-height:1}
.ss-summary-card__label{font-size:11.5px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}
.ss-table-card{background:#fff;border:1px solid var(--border-light);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);overflow:hidden}
.ss-table-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border-light);flex-wrap:wrap}
.ss-search-wrap{display:flex;align-items:center;gap:8px;background:var(--surface-1);border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:0 12px;min-width:240px}
.ss-search-icon{font-size:13px;color:var(--text-muted)}
.ss-search-input{border:none;background:transparent;font-size:13px;padding:8px 0;color:var(--text-primary);width:100%;font-family:inherit}
.ss-search-input::placeholder{color:var(--text-muted)}
.ss-search-input:focus{outline:none}
.ss-filter-row{display:flex;align-items:center;gap:10px}
.ss-select{border:1px solid var(--border-light);border-radius:var(--radius-sm);background:var(--surface-1);padding:7px 10px;font-size:13px;color:var(--text-primary);cursor:pointer;font-family:inherit}
.ss-select:focus{border-color:var(--blue-400);outline:none}
.ss-count-label{font-size:12px;color:var(--text-muted);white-space:nowrap;padding-left:6px}
.ss-table-wrap{overflow-x:auto}
.ss-table{width:100%;border-collapse:collapse;font-size:13.5px}
.ss-table thead th{background:var(--surface-1);color:var(--text-muted);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;padding:11px 16px;text-align:left;border-bottom:1px solid var(--border-light);white-space:nowrap}
.ss-table-row{border-bottom:1px solid var(--surface-2);transition:background .12s}
.ss-table-row:last-child{border-bottom:none}
.ss-table-row:hover{background:var(--surface-1)}
.ss-table td{padding:13px 16px;vertical-align:middle;color:var(--text-primary)}
.ss-table-empty{text-align:center;padding:60px 16px !important;color:var(--text-muted)}
.ss-table-empty span{font-size:32px;display:block;margin-bottom:8px}
.ss-table-empty p{font-size:14px}
.ss-source-name{display:flex;align-items:center;gap:10px}
.ss-source-avatar{width:30px;height:30px;border-radius:7px;background:var(--blue-100);color:var(--blue-500);font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(37,99,235,.15)}
.ss-source-name__text{font-weight:500}
.ss-code{font-family:'Courier New',monospace;font-size:11.5px;background:var(--surface-2);color:var(--text-secondary);padding:3px 7px;border-radius:4px;border:1px solid var(--border-light);white-space:nowrap}
.ss-type-chip{font-size:11px;font-weight:600;padding:3px 8px;border-radius:5px;background:var(--navy-800);color:rgba(255,255,255,.75);text-transform:uppercase;letter-spacing:.4px;white-space:nowrap}
.ss-conn-type{font-size:12.5px;color:var(--text-secondary);font-weight:500}
.ss-entity-tags{display:flex;flex-wrap:wrap;gap:4px}
.ss-entity-tag{font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:4px;background:var(--blue-100);color:var(--blue-500);border:1px solid rgba(37,99,235,.18);text-transform:uppercase;letter-spacing:.3px;white-space:nowrap}
.ss-entity-tag--more{background:var(--surface-2);color:var(--text-muted);border-color:var(--border-light)}
.ss-badge{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:99px;white-space:nowrap;letter-spacing:.2px}
.ss-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0}
.badge--green{background:var(--green-100);color:#16a34a}
.badge--red{background:var(--red-100);color:#dc2626}
.badge--amber{background:var(--amber-100);color:#d97706}
.ss-date{color:var(--text-secondary);font-size:13px;white-space:nowrap}
.ss-action-row{display:flex;gap:6px}
.ss-action-btn{padding:5px 11px;border-radius:var(--radius-sm);font-size:12px;font-weight:500;background:var(--surface-2);color:var(--text-secondary);border:1px solid var(--border-light);transition:background .13s,color .13s;white-space:nowrap;cursor:pointer;font-family:inherit}
.ss-action-btn:hover{background:var(--surface-3);color:var(--text-primary)}
.ss-action-btn--primary{background:var(--blue-100);color:var(--blue-500);border-color:rgba(37,99,235,.2)}
.ss-action-btn--primary:hover{background:rgba(37,99,235,.18)}
.ss-drawer-overlay{position:fixed;inset:0;background:rgba(6,12,25,.45);z-index:200;display:flex;justify-content:flex-end;backdrop-filter:blur(2px);animation:fadeInOverlay .18s ease}
@keyframes fadeInOverlay{from{opacity:0}to{opacity:1}}
.ss-drawer{width:400px;max-width:95vw;background:#fff;height:100%;display:flex;flex-direction:column;box-shadow:var(--shadow-xl);animation:slideInDrawer .22s ease}
@keyframes slideInDrawer{from{transform:translateX(60px);opacity:0}to{transform:translateX(0);opacity:1}}
.ss-drawer__header{display:flex;align-items:flex-start;justify-content:space-between;padding:22px 24px 18px;border-bottom:1px solid var(--border-light);background:var(--navy-900);gap:12px}
.ss-drawer__title{font-size:16px;font-weight:700;color:#fff;margin:0 0 4px}
.ss-drawer__code{font-family:'Courier New',monospace;font-size:11px;color:rgba(255,255,255,.45);background:rgba(255,255,255,.07);padding:2px 7px;border-radius:4px}
.ss-drawer__close{background:rgba(255,255,255,.1);color:rgba(255,255,255,.65);border:none;width:30px;height:30px;border-radius:6px;font-size:13px;cursor:pointer;transition:background .13s;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.ss-drawer__close:hover{background:rgba(255,255,255,.18);color:#fff}
.ss-drawer__body{padding:22px 24px;flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:20px}
.ss-drawer__grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ss-drawer__field{display:flex;flex-direction:column;gap:5px}
.ss-drawer__field-label{font-size:10.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px}
.ss-drawer__section{display:flex;flex-direction:column;gap:8px}
.ss-drawer__section-title{font-size:10.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px}
`;

if (typeof document !== 'undefined' && !document.getElementById('ss-styles')) {
  const el = document.createElement('style');
  el.id = 'ss-styles';
  el.textContent = CSS;
  document.head.appendChild(el);
}

/* ─── Types ──────────────────────────────────────────────────── */
export interface SourceRecord {
  id: string;
  sourceName: string;
  sourceCode: string;
  sourceType: string;
  connectionType: string;
  supportedEntities: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  createdDate: string;
}

/* ─── Mock Data ──────────────────────────────────────────────── */
const MOCK_SOURCES: SourceRecord[] = [
  { id: '1', sourceName: 'Salesforce CRM', sourceCode: 'CRM_SALESFORCE', sourceType: 'CRM', connectionType: 'API', supportedEntities: ['CUSTOMER', 'ACCOUNT'], status: 'ACTIVE', createdDate: '2026-05-06' },
  { id: '2', sourceName: 'SAP ERP Core', sourceCode: 'ERP_SAP_CORE', sourceType: 'ERP', connectionType: 'DATABASE', supportedEntities: ['SUPPLIER', 'PRODUCT', 'ASSET'], status: 'ACTIVE', createdDate: '2026-05-04' },
  { id: '3', sourceName: 'Workday HRMS', sourceCode: 'HRMS_WORKDAY', sourceType: 'HRMS', connectionType: 'API', supportedEntities: ['CUSTOMER'], status: 'ACTIVE', createdDate: '2026-05-01' },
  { id: '4', sourceName: 'Oracle Finance', sourceCode: 'FIN_ORACLE', sourceType: 'FINANCE', connectionType: 'SFTP', supportedEntities: ['ACCOUNT', 'SUPPLIER'], status: 'INACTIVE', createdDate: '2026-04-28' },
  { id: '5', sourceName: 'Vendor Portal', sourceCode: 'SCM_VENDOR_PORTAL', sourceType: 'SCM', connectionType: 'FILE_UPLOAD', supportedEntities: ['SUPPLIER', 'PRODUCT', 'LOCATION'], status: 'DRAFT', createdDate: '2026-04-20' },
  { id: '6', sourceName: 'Legacy Master DB', sourceCode: 'OTHER_LEGACY_MASTER', sourceType: 'OTHER_CORE_SYSTEM', connectionType: 'DATABASE', supportedEntities: ['CUSTOMER', 'ACCOUNT', 'PRODUCT'], status: 'ACTIVE', createdDate: '2026-04-15' },
];

/* ─── Sub-components ─────────────────────────────────────────── */
function StatusBadge({ status }: { status: SourceRecord['status'] }) {
  const map = {
    ACTIVE: { cls: 'badge--green', label: 'Active' },
    INACTIVE: { cls: 'badge--red', label: 'Inactive' },
    DRAFT: { cls: 'badge--amber', label: 'Draft' },
  };
  const { cls, label } = map[status];
  return <span className={`ss-badge ${cls}`}>{label}</span>;
}

function TypeChip({ type }: { type: string }) {
  return <span className="ss-type-chip">{type}</span>;
}

function EntityTags({ entities }: { entities: string[] }) {
  const visible = entities.slice(0, 2);
  const more = entities.length - 2;
  return (
    <div className="ss-entity-tags">
      {visible.map(e => <span key={e} className="ss-entity-tag">{e}</span>)}
      {more > 0 && <span className="ss-entity-tag ss-entity-tag--more">+{more}</span>}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function SourceSystems() {
  const [sources, setSources] = useState<SourceRecord[]>(MOCK_SOURCES);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [viewSource, setViewSource] = useState<SourceRecord | null>(null);

  const filtered = sources.filter(s => {
    const q = search.toLowerCase();
    return (
      (s.sourceName.toLowerCase().includes(q) || s.sourceCode.toLowerCase().includes(q)) &&
      (filterType === 'ALL' || s.sourceType === filterType) &&
      (filterStatus === 'ALL' || s.status === filterStatus)
    );
  });

  const handleRegister = (data: Omit<SourceRecord, 'id' | 'createdDate'>) => {
    setSources(prev => [
      { ...data, id: String(Date.now()), createdDate: new Date().toISOString().slice(0, 10) },
      ...prev,
    ]);
    setShowModal(false);
  };

  const active = sources.filter(s => s.status === 'ACTIVE').length;
  const inactive = sources.filter(s => s.status === 'INACTIVE').length;
  const draft = sources.filter(s => s.status === 'DRAFT').length;

  return (
    <div className="ss-page">

      {/* Header */}
      <div className="ss-page-header">
        <div className="ss-page-header__text">
          <h1 className="ss-page-title">Source Systems</h1>
          <p className="ss-page-subtitle">Register and manage core MDM source systems</p>
        </div>
        <div className="ss-page-header__actions">
          <button className="ss-btn ss-btn--ghost" onClick={() => setSources([...MOCK_SOURCES])}>↻ Refresh</button>
          <button className="ss-btn ss-btn--ghost">⬇ Export</button>
          <button className="ss-btn ss-btn--primary" onClick={() => setShowModal(true)}>+ Register Source</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="ss-summary-row">
        <div className="ss-summary-card">
          <span className="ss-summary-card__value">{sources.length}</span>
          <span className="ss-summary-card__label">Total Sources</span>
        </div>
        <div className="ss-summary-card ss-summary-card--green">
          <span className="ss-summary-card__value">{active}</span>
          <span className="ss-summary-card__label">Active</span>
        </div>
        <div className="ss-summary-card ss-summary-card--red">
          <span className="ss-summary-card__value">{inactive}</span>
          <span className="ss-summary-card__label">Inactive</span>
        </div>
        <div className="ss-summary-card ss-summary-card--amber">
          <span className="ss-summary-card__value">{draft}</span>
          <span className="ss-summary-card__label">Draft</span>
        </div>
      </div>

      {/* Table */}
      <div className="ss-table-card">
        <div className="ss-table-toolbar">
          <div className="ss-search-wrap">
            <span className="ss-search-icon">🔍</span>
            <input
              id="ss-search"
              className="ss-search-input"
              placeholder="Search by name or code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="ss-filter-row">
            <select id="ss-filter-type" className="ss-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="ALL">All Types</option>
              {['CRM', 'ERP', 'FINANCE', 'HRMS', 'SCM', 'OTHER_CORE_SYSTEM'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select id="ss-filter-status" className="ss-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="DRAFT">Draft</option>
            </select>
            <span className="ss-count-label">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="ss-table-wrap">
          <table className="ss-table">
            <thead>
              <tr>
                <th>Source Name</th>
                <th>Source Code</th>
                <th>Source Type</th>
                <th>Connection Type</th>
                <th>Supported Entities</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="ss-table-empty">
                    <span>🗄</span>
                    <p>No source systems found</p>
                  </td>
                </tr>
              ) : filtered.map(src => (
                <tr key={src.id} className="ss-table-row">
                  <td>
                    <div className="ss-source-name">
                      <div className="ss-source-avatar">{src.sourceName.slice(0, 2).toUpperCase()}</div>
                      <span className="ss-source-name__text">{src.sourceName}</span>
                    </div>
                  </td>
                  <td><code className="ss-code">{src.sourceCode}</code></td>
                  <td><TypeChip type={src.sourceType} /></td>
                  <td><span className="ss-conn-type">{src.connectionType}</span></td>
                  <td><EntityTags entities={src.supportedEntities} /></td>
                  <td><StatusBadge status={src.status} /></td>
                  <td className="ss-date">{src.createdDate}</td>
                  <td>
                    <div className="ss-action-row">
                      <button className="ss-action-btn" onClick={() => setViewSource(src)}>View</button>
                      <button className="ss-action-btn ss-action-btn--primary">Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Drawer */}
      {viewSource && (
        <div className="ss-drawer-overlay" onClick={() => setViewSource(null)}>
          <div className="ss-drawer" onClick={e => e.stopPropagation()}>
            <div className="ss-drawer__header">
              <div>
                <h2 className="ss-drawer__title">{viewSource.sourceName}</h2>
                <code className="ss-drawer__code">{viewSource.sourceCode}</code>
              </div>
              <button className="ss-drawer__close" onClick={() => setViewSource(null)}>✕</button>
            </div>
            <div className="ss-drawer__body">
              <div className="ss-drawer__grid">
                <div className="ss-drawer__field">
                  <span className="ss-drawer__field-label">Status</span>
                  <StatusBadge status={viewSource.status} />
                </div>
                <div className="ss-drawer__field">
                  <span className="ss-drawer__field-label">Source Type</span>
                  <TypeChip type={viewSource.sourceType} />
                </div>
                <div className="ss-drawer__field">
                  <span className="ss-drawer__field-label">Connection Type</span>
                  <span className="ss-conn-type">{viewSource.connectionType}</span>
                </div>
                <div className="ss-drawer__field">
                  <span className="ss-drawer__field-label">Created Date</span>
                  <span>{viewSource.createdDate}</span>
                </div>
              </div>
              <div className="ss-drawer__section">
                <span className="ss-drawer__section-title">Supported Entities</span>
                <div className="ss-entity-tags">
                  {viewSource.supportedEntities.map(e => (
                    <span key={e} className="ss-entity-tag">{e}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showModal && (
        <RegisterSourceModal
          onClose={() => setShowModal(false)}
          onRegister={handleRegister}
        />
      )}

    </div>
  );
}