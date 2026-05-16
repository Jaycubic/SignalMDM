/**
 * src/components/TenantScopeBar.tsx
 * ------------------------------------
 * Global tenant scope selector displayed in the MainLayout topbar.
 * Only rendered for platform admin users (tenant_id === 'platform').
 *
 * Shows a pill with the active scope (ALL / Tenant Name).
 * Clicking opens a dropdown to switch scope or search/select a tenant.
 * All screens react through useTenantConfig().
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import '../styles/TenantScopeBar.css';
import { useTenantConfig } from '../context/TenantConfigContext';
import { tenantService, type TenantRecord } from '../services/tenantService';

export default function TenantScopeBar(): React.ReactElement | null {
  const { mode, activeTenantId, activeTenantName, isLoading, setAll, setSpecific } = useTenantConfig();

  const [open, setOpen]         = useState(false);
  const [tenants, setTenants]   = useState<TenantRecord[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node) && !pillRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Load tenant list when dropdown opens
  useEffect(() => {
    if (!open || tenants.length > 0) return;
    setLoading(true);
    tenantService.listTenants().then(list => setTenants(list)).catch(() => {}).finally(() => setLoading(false));
  }, [open, tenants.length]);

  const handleSetAll = useCallback(async () => {
    setSaving(true);
    try { await setAll(); setOpen(false); }
    finally { setSaving(false); }
  }, [setAll]);

  const handleSetSpecific = useCallback(async (t: TenantRecord) => {
    setSaving(true);
    try { await setSpecific(t.id, t.tenantName); setOpen(false); }
    finally { setSaving(false); }
  }, [setSpecific]);

  const filtered = tenants.filter(t => {
    const q = search.toLowerCase();
    return !q || t.tenantName.toLowerCase().includes(q) || t.tenantCode.toLowerCase().includes(q);
  });

  // Compute dropdown position below the pill
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 });
  const openDropdown = () => {
    if (pillRef.current) {
      const r = pillRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen(v => !v);
  };

  const pillLabel = isLoading
    ? '…'
    : mode === 'SPECIFIC' && activeTenantName
    ? activeTenantName
    : 'All Tenants';

  return (
    <>
      <button
        ref={pillRef}
        className="tsb-pill"
        onClick={openDropdown}
        title="Click to change tenant scope"
        disabled={isLoading || saving}
      >
        <span className={`tsb-pill__dot tsb-pill__dot--${mode === 'ALL' ? 'all' : 'specific'}`} />
        <span className="tsb-pill__label">{saving ? 'Saving…' : pillLabel}</span>
        <span className="tsb-pill__caret">▼</span>
      </button>

      {open && (
        <div
          ref={dropRef}
          className="tsb-dropdown"
          style={{ top: dropPos.top, right: dropPos.right }}
        >
          <div className="tsb-dropdown__hdr">
            <div className="tsb-dropdown__title">🎯 Tenant Scope</div>
            <div className="tsb-dropdown__sub">Data across all screens will filter by this selection</div>
          </div>

          <div className="tsb-dropdown__body">
            {/* ALL mode */}
            <button
              className={`tsb-mode-btn${mode === 'ALL' ? ' tsb-mode-btn--active' : ''}`}
              onClick={handleSetAll}
            >
              <span className="tsb-mode-btn__icon">🌐</span>
              <div>
                <div className="tsb-mode-btn__label">All Tenants</div>
                <div className="tsb-mode-btn__sub">See data across every tenant</div>
              </div>
              {mode === 'ALL' && <span style={{ marginLeft: 'auto', color: 'var(--green-500)', fontWeight: 700 }}>✓</span>}
            </button>

            {/* SPECIFIC mode */}
            <button className={`tsb-mode-btn${mode === 'SPECIFIC' ? ' tsb-mode-btn--active' : ''}`}
              style={{ cursor: 'default', background: 'transparent', border: '1.5px dashed var(--border-muted)' }}
              onClick={() => { /* no-op — user picks from list below */ }}
            >
              <span className="tsb-mode-btn__icon">🏢</span>
              <div>
                <div className="tsb-mode-btn__label">Specific Tenant</div>
                <div className="tsb-mode-btn__sub">Search and select a tenant below</div>
              </div>
            </button>
          </div>

          {/* Tenant search */}
          <div className="tsb-search-wrap">
            <input
              className="tsb-search"
              placeholder="Search tenant name or code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="tsb-tenant-list">
            {loading ? (
              <div className="tsb-empty">Loading tenants…</div>
            ) : filtered.length === 0 ? (
              <div className="tsb-empty">No tenants found.</div>
            ) : filtered.map(t => (
              <div
                key={t.id}
                className={`tsb-tenant-row${activeTenantId === t.id ? ' tsb-tenant-row--active' : ''}`}
                onClick={() => handleSetSpecific(t)}
              >
                <span className="tsb-tenant-row__name">{t.tenantName}</span>
                <span className="tsb-tenant-row__code">{t.tenantCode}</span>
                {activeTenantId === t.id && <span className="tsb-tenant-row__check">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
