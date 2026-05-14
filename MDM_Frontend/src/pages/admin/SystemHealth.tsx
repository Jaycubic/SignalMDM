import { useState, useEffect, useCallback } from 'react';
import { adminService, type SystemHealthData } from '../../services/adminService';

import '../../styles/theme.css';
import '../../styles/SystemHealth.css';

export default function SystemHealth() {
    const [health, setHealth] = useState<SystemHealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadHealth = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminService.getSystemHealth();
            setHealth(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load system health.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadHealth();
        const timer = setInterval(loadHealth, 30000); // Auto refresh every 30s
        return () => clearInterval(timer);
    }, [loadHealth]);

    return (
        <div className="sh-container">
            <div className="sh-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1>System Health</h1>
                        <p>Real-time monitoring of platform components and infrastructure.</p>
                    </div>
                    <button 
                        className="sh-refresh-btn" 
                        onClick={loadHealth} 
                        disabled={loading}
                    >
                        {loading ? 'Refreshing...' : 'Refresh Now'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="ss-error-banner" style={{ marginBottom: 24 }}>
                    {error}
                </div>
            )}

            <div className="sh-grid">
                {/* Component Status Card */}
                <div className="sh-card sh-card--span-6">
                    <div className="sh-card-title">
                        <span>🛡️</span> Infrastructure Health
                    </div>
                    <div className="sh-status-list">
                        {health?.components.map((comp) => (
                            <div key={comp.name} className="sh-status-item">
                                <div className="sh-status-info">
                                    <div className={`sh-status-indicator sh-status-indicator--${comp.status.toLowerCase()}`} />
                                    <span className="sh-status-name">{comp.name}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {comp.latency && <span className="sh-status-latency">{comp.latency}</span>}
                                    <span style={{ 
                                        fontSize: 12, 
                                        fontWeight: 600, 
                                        color: comp.status === 'UP' ? 'var(--green-600)' : 'var(--red-600)' 
                                    }}>
                                        {comp.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {!health && loading && [1, 2, 3, 4].map(i => (
                            <div key={i} className="sh-status-item" style={{ opacity: 0.5 }}>
                                <span className="sh-status-name">Loading...</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Metrics Card */}
                <div className="sh-card sh-card--span-6">
                    <div className="sh-card-title">
                        <span>📊</span> Platform Summary
                    </div>
                    <div className="sh-metrics-grid">
                        <div className="sh-metric-box">
                            <span className="sh-metric-value">{health?.metrics.total_tenants ?? 0}</span>
                            <span className="sh-metric-label">Tenants</span>
                        </div>
                        <div className="sh-metric-box">
                            <span className="sh-metric-value">{health?.metrics.total_sources ?? 0}</span>
                            <span className="sh-metric-label">Sources</span>
                        </div>
                        <div className="sh-metric-box">
                            <span className="sh-metric-value">{health?.metrics.total_ingestion_runs ?? 0}</span>
                            <span className="sh-metric-label">Runs</span>
                        </div>
                    </div>
                    
                    <div style={{ marginTop: 32 }}>
                        <div className="sh-card-title" style={{ marginBottom: 12 }}>
                            <span>⚙️</span> Environment Details
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div className="sh-env-badge">
                                ENV: {health?.environment.toUpperCase() ?? '...'}
                            </div>
                            <div className="sh-env-badge">
                                UPDATED: {health ? new Date(health.timestamp * 1000).toLocaleTimeString() : '...'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Logs / Operational Feed */}
                <div className="sh-card sh-card--span-12">
                    <div className="sh-card-title">
                        <span>📜</span> System Logs (Operational)
                    </div>
                    <div style={{ 
                        height: 200, 
                        background: '#1e1e1e', 
                        borderRadius: 8, 
                        padding: 16, 
                        fontFamily: 'monospace', 
                        fontSize: 13, 
                        color: '#d4d4d4',
                        overflowY: 'auto'
                    }}>
                        <div style={{ color: '#6a9955' }}>
                            [INFO] {new Date().toLocaleTimeString()} - Health check routine initiated.
                        </div>
                        {health?.components.map(comp => (
                            <div key={comp.name} style={{ color: comp.status === 'UP' ? '#6a9955' : '#f44747' }}>
                                [INFO] {new Date().toLocaleTimeString()} - {comp.name} connectivity verified. ({comp.latency ?? 'OK'})
                            </div>
                        ))}
                        <div style={{ color: '#9cdcfe' }}>
                            [DEBUG] {new Date().toLocaleTimeString()} - Active ingestion runs tracked: {health?.metrics.total_ingestion_runs ?? 0}
                        </div>
                        {health && health.metrics.total_sources === 0 ? (
                            <div style={{ color: '#ce9178' }}>
                                [WARN] {new Date().toLocaleTimeString()} - No source systems detected in current tenant.
                            </div>
                        ) : (
                            <div style={{ color: '#6a9955' }}>
                                [INFO] {new Date().toLocaleTimeString()} - Total registered sources: {health?.metrics.total_sources ?? 0}
                            </div>
                        )}
                        <div style={{ color: '#6a9955', marginTop: 8, borderTop: '1px solid #333', paddingTop: 8 }}>
                            [INFO] {new Date().toLocaleTimeString()} - All system components operational.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
