import { useState, useEffect } from 'react';
import { tenantService, type TenantRecord } from '../../services/tenantService';
import '../../styles/Tenants.css';

export default function Tenants() {
    const [tenants, setTenants] = useState<TenantRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [tenantName, setTenantName] = useState('');
    const [tenantCode, setTenantCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    const fetchTenants = async () => {
        setLoading(true);
        try {
            const data = await tenantService.listTenants();
            setTenants(data);
            setError(null);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to load tenants list.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setModalError(null);
        try {
            await tenantService.createTenant({
                tenant_name: tenantName,
                tenant_code: tenantCode.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
            });
            setShowModal(false);
            setTenantName('');
            setTenantCode('');
            fetchTenants();
        } catch (err) {
            setModalError(err instanceof Error ? err.message : 'Failed to register tenant');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="tn-page">
            {/* Header */}
            <header className="tn-header">
                <div>
                    <h1 className="tn-header__title">Tenant Management</h1>
                    <p className="tn-header__sub">Platform-level control of registered organizations and data isolation.</p>
                </div>
                <button className="ss-btn ss-btn--primary" onClick={() => setShowModal(true)}>
                    <span>+</span> Register Tenant
                </button>
            </header>

            {/* Summary */}
            <div className="tn-summary-row">
                <div className="tn-summary-card">
                    <div className="tn-summary-card__header">
                        <span className="tn-summary-card__label">Total Tenants</span>
                        <span className="tn-summary-card__icon">🏢</span>
                    </div>
                    <span className="tn-summary-card__value">{tenants.length}</span>
                </div>
                <div className="tn-summary-card">
                    <div className="tn-summary-card__header">
                        <span className="tn-summary-card__label">Active</span>
                        <span className="tn-summary-card__icon">✓</span>
                    </div>
                    <span className="tn-summary-card__value">
                        {tenants.filter(t => t.status === 'ACTIVE').length}
                    </span>
                </div>
                <div className="tn-summary-card">
                    <div className="tn-summary-card__header">
                        <span className="tn-summary-card__label">Suspended</span>
                        <span className="tn-summary-card__icon">⚠</span>
                    </div>
                    <span className="tn-summary-card__value">
                        {tenants.filter(t => t.status === 'SUSPENDED').length}
                    </span>
                </div>
            </div>

            {/* Main Table */}
            <div className="tn-table-container">
                <div className="tn-table-header">
                    <span className="tn-table-title">Registered Organizations</span>
                </div>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading tenant database...
                    </div>
                ) : error ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
                        {error}
                    </div>
                ) : (
                    <table className="tn-table">
                        <thead>
                            <tr>
                                <th>Organization Name</th>
                                <th>Access Code</th>
                                <th>Status</th>
                                <th>Registered Date</th>
                                <th>ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.map(t => (
                                <tr key={t.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.tenantName}</td>
                                    <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{t.tenantCode}</code></td>
                                    <td>
                                        <span className={`tn-badge tn-badge--${t.status.toLowerCase()}`}>
                                            <span className="tn-badge__dot" />
                                            {t.status}
                                        </span>
                                    </td>
                                    <td>{t.createdDate}</td>
                                    <td style={{ fontSize: '11px', opacity: 0.5, fontFamily: 'monospace' }}>{t.id}</td>
                                </tr>
                            ))}
                            {tenants.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        No tenants found. Register your first tenant to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Register Modal */}
            {showModal && (
                <div className="tn-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="tn-modal" onClick={e => e.stopPropagation()}>
                        <div className="tn-modal-header">
                            <h2 className="tn-modal-title">Register New Tenant</h2>
                            <button className="rsm-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleRegister}>
                            <div className="tn-modal-body">
                                {modalError && (
                                    <div className="rsm-alert rsm-alert--error" style={{ marginBottom: '16px' }}>
                                        {modalError}
                                    </div>
                                )}
                                <div className="tn-field">
                                    <label className="tn-label">Organization Name</label>
                                    <input 
                                        className="tn-input" 
                                        placeholder="e.g. Acme Corp" 
                                        value={tenantName}
                                        onChange={e => setTenantName(e.target.value)}
                                        required 
                                    />
                                </div>
                                <div className="tn-field">
                                    <label className="tn-label">Tenant Code (Slug)</label>
                                    <input 
                                        className="tn-input" 
                                        placeholder="e.g. acme_corp" 
                                        value={tenantCode}
                                        onChange={e => setTenantCode(e.target.value)}
                                        required 
                                    />
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                                        Used for routing and API headers. Unique, lowercase, no spaces.
                                    </p>
                                </div>
                            </div>
                            <div className="tn-modal-footer">
                                <button type="button" className="ss-btn ss-btn--ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="ss-btn ss-btn--primary" disabled={submitting}>
                                    {submitting ? 'Registering...' : 'Register Tenant'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
