// Source Systems — integrated with backend via sourceService
import { useState, useEffect, useCallback } from 'react';
import RegisterSourceModal from '../../components/modals/RegisterSourceModal';
import {
  sourceService,
  SOURCE_TYPES,
  type SourceRecord,
} from '../../services/sourceService';

/* ─── Styles ─────────────────────────────────────────────────────────────── */
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
.ss-btn:disabled{opacity:.55;cursor:not-allowed;transform:none}
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
.ss-action-btn--danger{background:var(--red-100);color:#dc2626;border-color:rgba(220,38,38,.2)}
.ss-action-btn--danger:hover{background:rgba(220,38,38,.18)}
.ss-action-btn:disabled{opacity:.5;cursor:not-allowed}
.ss-drawer-overlay{position:fixed;inset:0;background:rgba(6,12,25,.45);z-index:200;display:flex;justify-content:flex-end;backdrop-filter:blur(2px);animation:fadeInOverlay .18s ease}
@keyframes fadeInOverlay{from{opacity:0}to{opacity:1}}
.ss-drawer{width:420px;max-width:95vw;background:#fff;height:100%;display:flex;flex-direction:column;box-shadow:var(--shadow-xl);animation:slideInDrawer .22s ease}
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
.ss-drawer__field-value{font-size:13.5px;color:var(--text-primary)}
.ss-loading{display:flex;align-items:center;justify-content:center;padding:60px 16px;gap:10px;color:var(--text-muted);font-size:14px}
.ss-spinner{width:22px;height:22px;border:2px solid var(--border-light);border-top-color:var(--blue-500);border-radius:50%;animation:ss-spin .7s linear infinite;flex-shrink:0}
@keyframes ss-spin{to{transform:rotate(360deg)}}
.ss-error-banner{background:var(--red-100);color:#b91c1c;border:1px solid rgba(220,38,38,.2);border-radius:var(--radius-md);padding:12px 16px;font-size:13px;display:flex;align-items:flex-start;gap:10px}
.ss-error-banner__icon{font-size:16px;flex-shrink:0;margin-top:1px}
`;

if (typeof document !== 'undefined' && !document.getElementById('ss-styles')) {
  const el = document.createElement('style');
  el.id = 'ss-styles';
  el.textContent = CSS;
  document.head.appendChild(el);
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: SourceRecord['status'] }) {
  const map: Record<SourceRecord['status'], { cls: string; label: string }> = {
    ACTIVE:    { cls: 'badge--green', label: 'Active' },
    INACTIVE:  { cls: 'badge--red',   label: 'Inactive' },
    SUSPENDED: { cls: 'badge--amber', label: 'Suspended' },
    ARCHIVED:  { cls: 'badge--amber', label: 'Archived' },
  };
  const { cls, label } = map[status] ?? map.INACTIVE;
  return <span className={`ss-badge ${cls}`}>{label}</span>;
}

function TypeChip({ type }: { type: string }) {
  return <span className="ss-type-chip">{type}</span>;
}

function EntityTags({ entities }: { entities: string[] }) {
  if (!entities.length) return <span className="ss-conn-type">—</span>;
  const visible = entities.slice(0, 2);
  const more    = entities.length - 2;
  return (
    <div className="ss-entity-tags">
      {visible.map(e => <span key={e} className="ss-entity-tag">{e}</span>)}
      {more > 0 && <span className="ss-entity-tag ss-entity-tag--more">+{more}</span>}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function SourceSystems() {
  const [sources,       setSources]      = useState<SourceRecord[]>([]);
  const [loading,       setLoading]      = useState(true);
  const [error,         setError]        = useState<string | null>(null);
  const [showModal,     setShowModal]    = useState(false);
  const [search,        setSearch]       = useState('');
  const [filterType,    setFilterType]   = useState('ALL');
  const [filterStatus,  setFilterStatus] = useState('ALL');
  const [viewSource,    setViewSource]   = useState<SourceRecord | null>(null);
  const [deactivating,  setDeactivating] = useState<string | null>(null);

  /* ── Load sources from API ────────────────────────────────────────────── */
  const loadSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sourceService.listSources();
      setSources(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load source systems.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSources(); }, [loadSources]);

  /* ── Deactivate ───────────────────────────────────────────────────────── */
  const handleDeactivate = async (src: SourceRecord) => {
    if (!window.confirm(`Deactivate "${src.sourceName}"? This action cannot be undone.`)) return;
    setDeactivating(src.id);
    try {
      const updated = await sourceService.deactivateSource(src.id);
      setSources(prev => prev.map(s => s.id === updated.id ? updated : s));
      if (viewSource?.id === updated.id) setViewSource(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate source.';
      alert(msg);
    } finally {
      setDeactivating(null);
    }
  };

  /* ── After registration: prepend the new record (already from API) ────── */
  const handleRegister = (newSource: SourceRecord) => {
    setSources(prev => [newSource, ...prev]);
    setShowModal(false);
  };

  /* ── Filtering ────────────────────────────────────────────────────────── */
  const filtered = sources.filter(s => {
    const q = search.toLowerCase();
    return (
      (s.sourceName.toLowerCase().includes(q) || s.sourceCode.toLowerCase().includes(q)) &&
      (filterType   === 'ALL' || s.sourceType   === filterType)  &&
      (filterStatus === 'ALL' || s.status        === filterStatus)
    );
  });

  const totalActive   = sources.filter(s => s.status === 'ACTIVE').length;
  const totalInactive = sources.filter(s => s.status === 'INACTIVE').length;
  const totalOther    = sources.filter(s => s.status === 'SUSPENDED' || s.status === 'ARCHIVED').length;

  return (
    <div className="ss-page">

      {/* Header */}
      <div className="ss-page-header">
        <div className="ss-page-header__text">
          <h1 className="ss-page-title">Source Systems</h1>
          <p className="ss-page-subtitle">Register and manage core MDM source systems</p>
        </div>
        <div className="ss-page-header__actions">
          <button
            className="ss-btn ss-btn--ghost"
            onClick={loadSources}
            disabled={loading}
          >
            {loading ? '…' : '↻'} Refresh
          </button>
          <button className="ss-btn ss-btn--primary" onClick={() => setShowModal(true)}>
            + Register Source
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="ss-error-banner">
          <span className="ss-error-banner__icon">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="ss-summary-row">
        <div className="ss-summary-card">
          <span className="ss-summary-card__value">{sources.length}</span>
          <span className="ss-summary-card__label">Total Sources</span>
        </div>
        <div className="ss-summary-card ss-summary-card--green">
          <span className="ss-summary-card__value">{totalActive}</span>
          <span className="ss-summary-card__label">Active</span>
        </div>
        <div className="ss-summary-card ss-summary-card--red">
          <span className="ss-summary-card__value">{totalInactive}</span>
          <span className="ss-summary-card__label">Inactive</span>
        </div>
        <div className="ss-summary-card ss-summary-card--amber">
          <span className="ss-summary-card__value">{totalOther}</span>
          <span className="ss-summary-card__label">Suspended/Archived</span>
        </div>
      </div>

      {/* Table Card */}
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
            <select
              id="ss-filter-type"
              className="ss-select"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="ALL">All Types</option>
              {SOURCE_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              id="ss-filter-status"
              className="ss-select"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <span className="ss-count-label">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="ss-table-wrap">
          {loading ? (
            <div className="ss-loading">
              <div className="ss-spinner" />
              Loading source systems…
            </div>
          ) : (
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
                        <div className="ss-source-avatar">
                          {src.sourceName.slice(0, 2).toUpperCase()}
                        </div>
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
                        <button
                          className="ss-action-btn"
                          onClick={() => setViewSource(src)}
                        >
                          View
                        </button>
                        {src.isActive && (
                          <button
                            className="ss-action-btn ss-action-btn--danger"
                            onClick={() => handleDeactivate(src)}
                            disabled={deactivating === src.id}
                          >
                            {deactivating === src.id ? '…' : 'Deactivate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
                  <span className="ss-drawer__field-value">{viewSource.createdDate}</span>
                </div>
                <div className="ss-drawer__field">
                  <span className="ss-drawer__field-label">Last Updated</span>
                  <span className="ss-drawer__field-value">{viewSource.updatedDate}</span>
                </div>
                <div className="ss-drawer__field">
                  <span className="ss-drawer__field-label">Active</span>
                  <span className="ss-drawer__field-value">{viewSource.isActive ? 'Yes' : 'No'}</span>
                </div>
              </div>
              <div className="ss-drawer__section">
                <span className="ss-drawer__section-title">Supported Entities</span>
                <div className="ss-entity-tags">
                  {viewSource.supportedEntities.length === 0
                    ? <span className="ss-conn-type">None configured</span>
                    : viewSource.supportedEntities.map(e => (
                        <span key={e} className="ss-entity-tag">{e}</span>
                      ))
                  }
                </div>
              </div>
              {viewSource.configJson && Object.keys(viewSource.configJson).length > 0 && (
                <div className="ss-drawer__section">
                  <span className="ss-drawer__section-title">Connection Config</span>
                  <pre style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--surface-2)', padding: '10px', borderRadius: '6px', overflowX: 'auto', margin: 0 }}>
                    {JSON.stringify(viewSource.configJson, null, 2)}
                  </pre>
                </div>
              )}
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