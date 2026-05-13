// MDM_Frontend\src\pages\source\SourceSystems.tsx
import { useState, useEffect, useCallback } from 'react';
import RegisterSourceModal from '../../components/modals/RegisterSourceModal';
import {
  sourceService,
  SOURCE_TYPES,
  type SourceRecord,
} from '../../services/sourceService';

/* Import both theme and page-specific styles */
import '../../styles/theme.css';
import '../../styles/SourceSystems.css';

function StatusBadge({ status }: { status: SourceRecord['status'] }) {
  const map: Record<SourceRecord['status'], { cls: string; label: string }> = {
    ACTIVE: { cls: 'badge--green', label: 'Active' },
    INACTIVE: { cls: 'badge--red', label: 'Inactive' },
    SUSPENDED: { cls: 'badge--amber', label: 'Suspended' },
    ARCHIVED: { cls: 'badge--amber', label: 'Archived' },
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
  const more = entities.length - 2;
  return (
    <div className="ss-entity-tags">
      {visible.map(e => <span key={e} className="ss-entity-tag">{e}</span>)}
      {more > 0 && <span className="ss-entity-tag ss-entity-tag--more">+{more}</span>}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function SourceSystems() {
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [viewSource, setViewSource] = useState<SourceRecord | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);

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

  /* ── After registration ──────────────────────────────────────────────── */
  const handleRegister = (newSource: SourceRecord) => {
    setSources(prev => [newSource, ...prev]);
    setShowModal(false);
  };

  /* ── Filtering ────────────────────────────────────────────────────────── */
  const filtered = sources.filter(s => {
    const q = search.toLowerCase();
    return (
      (s.sourceName.toLowerCase().includes(q) || s.sourceCode.toLowerCase().includes(q)) &&
      (filterType === 'ALL' || s.sourceType === filterType) &&
      (filterStatus === 'ALL' || s.status === filterStatus)
    );
  });

  const totalActive = sources.filter(s => s.status === 'ACTIVE').length;
  const totalInactive = sources.filter(s => s.status === 'INACTIVE').length;
  const totalOther = sources.filter(s => s.status === 'SUSPENDED' || s.status === 'ARCHIVED').length;

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