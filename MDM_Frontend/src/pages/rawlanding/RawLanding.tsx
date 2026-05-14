// Raw Landing — integrated with GET /api/v1/raw-records/ (same patterns as UploadData / IngestionRuns)
import {
    useState,
    useEffect,
    useCallback,
    useMemo,
    type ChangeEvent,
    type MouseEvent,
} from 'react';

import '../../styles/theme.css';
import '../../styles/RawLanding.css';

import { authService } from '../../services/authService';
import { sourceService, ENTITY_TYPES, type SourceRecord } from '../../services/sourceService';
import { tenantService, type TenantRecord } from '../../services/tenantService';
import { ingestionRunService, type IngestionRunRecord } from '../../services/ingestionRunService';
import {
    rawLandingService,
    toRawLandingRecord,
    type RawLandingRecord,
    type RawProcessingStatus,
} from '../../services/rawLandingService';
import { ApiError } from '../../services/api';

type ModalTab = 'payload' | 'metadata';
type PayloadValue = string | number | boolean | null;

const PROC_STATUSES: RawProcessingStatus[] = [
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'DUPLICATE',
];

const PROC_LABELS: Record<RawProcessingStatus, string> = {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
    DUPLICATE: 'Duplicate',
};

const PAGE_SIZE = 25;

interface PayloadModalProps {
    record: RawLandingRecord;
    onClose: () => void;
    initialTab?: ModalTab;
}

function coloriseJSON(obj: Record<string, PayloadValue>): string {
    const str = JSON.stringify(obj, null, 2);
    return str.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
            let cls = 'rl-json-num';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) cls = 'rl-json-key';
                else cls = 'rl-json-str';
            } else if (/true|false/.test(match)) cls = 'rl-json-bool';
            else if (/null/.test(match)) cls = 'rl-json-null';
            return `<span class="${cls}">${match}</span>`;
        },
    );
}

function PayloadModal({ record, onClose, initialTab = 'payload' }: PayloadModalProps) {
    const [tab, setTab] = useState<ModalTab>(initialTab);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        void navigator.clipboard.writeText(JSON.stringify(record.payload, null, 2)).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    const modalTabs: Array<[ModalTab, string]> = [
        ['payload', 'Payload'],
        ['metadata', 'Metadata'],
    ];

    return (
        <div className="rl-modal-overlay" onClick={onClose}>
            <div
                className="rl-modal"
                onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="rl-modal__header">
                    <div>
                        <h2 className="rl-modal__title">
                            {record.srcId} — {record.entity}
                        </h2>
                        <div className="rl-modal__sub">
                            {record.id} · {record.source}
                        </div>
                    </div>
                    <button type="button" className="rl-modal__close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="rl-modal-tabs">
                    {modalTabs.map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            className={`rl-modal-tab${tab === key ? ' rl-modal-tab--active' : ''}`}
                            onClick={() => setTab(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="rl-modal__body">
                    {tab === 'payload' && (
                        <>
                            <div className="rl-json-toolbar">
                                <button
                                    type="button"
                                    className={`rl-copy-btn${copied ? ' rl-copy-btn--copied' : ''}`}
                                    onClick={handleCopy}
                                >
                                    {copied ? '✓ Copied!' : '⎘ Copy JSON'}
                                </button>
                            </div>
                            <div
                                className="rl-json-viewer"
                                dangerouslySetInnerHTML={{ __html: coloriseJSON(record.payload) }}
                            />
                        </>
                    )}

                    {tab === 'metadata' && (
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
                                <span className="rl-meta-label">Entity (hint)</span>
                                <span className="rl-meta-value">{record.entity}</span>
                            </div>
                            <div className="rl-meta-field">
                                <span className="rl-meta-label">Source System</span>
                                <span className="rl-meta-value">{record.source}</span>
                            </div>
                            <div className="rl-meta-field">
                                <span className="rl-meta-label">Ingestion Run</span>
                                <span className="rl-meta-value rl-meta-value--mono">{record.runId}</span>
                            </div>
                            <div className="rl-meta-field">
                                <span className="rl-meta-label">Run pipeline state</span>
                                <span className="rl-meta-value">{record.ingestionRunState}</span>
                            </div>
                            <div className="rl-meta-field">
                                <span className="rl-meta-label">Processing status</span>
                                <span className="rl-meta-value">{PROC_LABELS[record.status]}</span>
                            </div>
                            <div className="rl-meta-field">
                                <span className="rl-meta-label">Received At</span>
                                <span className="rl-meta-value">{record.receivedAt}</span>
                            </div>
                            <div className="rl-meta-field">
                                <span className="rl-meta-label">Field Count</span>
                                <span className="rl-meta-value">{Object.keys(record.payload).length} fields</span>
                            </div>
                            <div className="rl-meta-field" style={{ gridColumn: '1/-1' }}>
                                <span className="rl-meta-label">Checksum (MD5)</span>
                                <span className="rl-meta-value rl-meta-value--mono">{record.checksum}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function RawLanding() {
    const [records, setRecords] = useState<RawLandingRecord[]>([]);
    const [totalApi, setTotalApi] = useState(0);
    const [sources, setSources] = useState<SourceRecord[]>([]);
    const [runs, setRuns] = useState<IngestionRunRecord[]>([]);
    const [tenants, setTenants] = useState<TenantRecord[]>([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterSource, setFilterSource] = useState<string>('ALL');
    const [filterEntity, setFilterEntity] = useState<string>('ALL');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterRun, setFilterRun] = useState<string>('ALL');
    const [viewRecord, setViewRecord] = useState<RawLandingRecord | null>(null);
    const [viewTab, setViewTab] = useState<ModalTab>('payload');
    const [page, setPage] = useState(1);

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(searchInput), 400);
        return () => window.clearTimeout(t);
    }, [searchInput]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await authService.init();
            const adminInfo = authService.getAdminInfoFromCookie();
            const superAdmin =
                adminInfo?.tenant_id === 'platform' || adminInfo?.role === 'admin';
            setIsSuperAdmin(superAdmin);
            try {
                const tenantData = await tenantService.listTenants();
                setTenants(tenantData);
                if (tenantData.length > 0) setIsSuperAdmin(true);
            } catch {
                /* ignore */
            }

            const tId = selectedTenantId === 'ALL' ? undefined : selectedTenantId;
            (window as unknown as { activeTenantId?: string }).activeTenantId = tId;

            const srcData = await sourceService.listSources(0, 100, tId);
            setSources(srcData);
            const nameMap: Record<string, string> = {};
            srcData.forEach((s) => {
                nameMap[s.id] = s.sourceName;
            });
            const runData = await ingestionRunService.listRuns(0, 80, nameMap, tId);
            setRuns(runData);

            const res = await rawLandingService.listRecords({
                skip: 0,
                limit: 500,
                tenantId: tId,
                runId: filterRun === 'ALL' ? undefined : filterRun,
                sourceSystemId: filterSource === 'ALL' ? undefined : filterSource,
                search: debouncedSearch.trim() || undefined,
            });
            setRecords(res.items.map(toRawLandingRecord));
            setTotalApi(res.total);
        } catch (err) {
            const msg =
                err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Load failed';
            setError(msg);
            setRecords([]);
        } finally {
            setLoading(false);
        }
    }, [selectedTenantId, filterRun, filterSource, debouncedSearch]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const filtered = useMemo(() => {
        return records.filter((r) => {
            const q = searchInput.toLowerCase();
            const textMatch =
                !q ||
                r.id.toLowerCase().includes(q) ||
                r.srcId.toLowerCase().includes(q) ||
                r.entity.toLowerCase().includes(q) ||
                r.source.toLowerCase().includes(q);
            return (
                textMatch &&
                (filterEntity === 'ALL' || r.entity === filterEntity) &&
                (filterStatus === 'ALL' || r.status === filterStatus)
            );
        });
    }, [records, searchInput, filterEntity, filterStatus]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => {
        setPage((p) => Math.min(p, totalPages));
    }, [totalPages]);

    const openModal = (rec: RawLandingRecord, tab: ModalTab = 'payload') => {
        setViewRecord(rec);
        setViewTab(tab);
    };

    const completed = records.filter((r) => r.status === 'COMPLETED').length;
    const processing = records.filter((r) => r.status === 'PROCESSING').length;
    const failed = records.filter((r) => r.status === 'FAILED').length;
    const duplicates = records.filter((r) => r.status === 'DUPLICATE').length;

    return (
        <div className="rl-page">
            <div className="rl-page-header">
                <div>
                    <h1 className="rl-page-title">Raw Landing</h1>
                    <p className="rl-page-subtitle">
                        Raw records as stored after ingestion (up to 500 loaded; filters refine this set)
                    </p>
                </div>
                <div className="rl-page-header__actions">
                    <button type="button" className="rl-btn rl-btn--ghost" disabled title="Export not wired yet">
                        ⬇ Export
                    </button>
                    <button
                        type="button"
                        className="rl-btn rl-btn--ghost"
                        onClick={() => void loadData()}
                        disabled={loading}
                    >
                        {loading ? '…' : '↻'} Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div
                    style={{
                        background: 'var(--red-500-10)',
                        color: 'var(--red-500)',
                        padding: '12px 16px',
                        borderRadius: 8,
                        marginBottom: 16,
                    }}
                >
                    ✕ {error}
                </div>
            )}

            <div className="rl-summary-row">
                <div className="rl-summary-card">
                    <span className="rl-summary-card__value">{totalApi}</span>
                    <span className="rl-summary-card__label">Total (server match)</span>
                </div>
                <div className="rl-summary-card">
                    <span className="rl-summary-card__value">{records.length}</span>
                    <span className="rl-summary-card__label">Loaded</span>
                </div>
                <div className="rl-summary-card rl-summary-card--green">
                    <span className="rl-summary-card__value">{completed}</span>
                    <span className="rl-summary-card__label">Completed</span>
                </div>
                <div className="rl-summary-card" style={{ borderTopColor: 'var(--blue-500)' }}>
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

            <div className="rl-table-card">
                <div className="rl-table-toolbar">
                    <div className="rl-search-wrap">
                        <span className="rl-search-icon">🔍</span>
                        <input
                            className="rl-search-input"
                            placeholder="Search (also sent to API after typing pauses)…"
                            value={searchInput}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                setSearchInput(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                    <div className="rl-filter-row">
                        {isSuperAdmin && tenants.length > 0 && (
                            <select
                                className="rl-select"
                                value={selectedTenantId}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                    setSelectedTenantId(e.target.value);
                                    setFilterRun('ALL');
                                    setFilterSource('ALL');
                                    setPage(1);
                                }}
                                style={{ borderColor: 'var(--blue-500)', background: 'var(--blue-500-10)' }}
                            >
                                <option value="ALL">All tenants</option>
                                {tenants.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.tenantName}
                                    </option>
                                ))}
                            </select>
                        )}
                        <select
                            className="rl-select"
                            value={filterSource}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                setFilterSource(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="ALL">All Sources</option>
                            {sources.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.sourceName}
                                </option>
                            ))}
                        </select>
                        <select
                            className="rl-select"
                            value={filterEntity}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                setFilterEntity(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="ALL">All Entities</option>
                            {ENTITY_TYPES.map((e) => (
                                <option key={e} value={e}>
                                    {e}
                                </option>
                            ))}
                        </select>
                        <select
                            className="rl-select"
                            value={filterStatus}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
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
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                setFilterRun(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="ALL">All Runs</option>
                            {runs.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.id.slice(0, 8)}… — {r.sourceName}
                                </option>
                            ))}
                        </select>
                        <span className="rl-count-label">
                            {filtered.length} shown (client filters) · {paginated.length} on page
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
                            {loading && records.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="rl-table-empty">
                                        <span>⏳</span>
                                        <p>Loading raw records…</p>
                                    </td>
                                </tr>
                            ) : paginated.length === 0 ? (
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
                                            <code className="rl-raw-id">{rec.id.slice(0, 13)}…</code>
                                        </td>
                                        <td>
                                            <span className="rl-src-id">{rec.srcId}</span>
                                        </td>
                                        <td>
                                            <span className="rl-entity-chip">{rec.entity}</span>
                                        </td>
                                        <td
                                            style={{
                                                fontSize: 13,
                                                color: 'var(--text-secondary)',
                                                fontWeight: 500,
                                            }}
                                        >
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
                                                {rec.checksum.slice(0, 12)}…
                                            </span>
                                        </td>
                                        <td>
                                            <div className="rl-action-row">
                                                <button
                                                    type="button"
                                                    className="rl-action-btn rl-action-btn--primary"
                                                    onClick={() => openModal(rec, 'payload')}
                                                >
                                                    View Payload
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rl-action-btn"
                                                    onClick={() => openModal(rec, 'metadata')}
                                                >
                                                    Metadata
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rl-action-btn"
                                                    onClick={() => {
                                                        const blob = new Blob([JSON.stringify(rec.payload, null, 2)], {
                                                            type: 'application/json',
                                                        });
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
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

                <div className="rl-pagination">
                    <span className="rl-pagination__info">
                        Showing{' '}
                        {filtered.length === 0
                            ? 0
                            : Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}
                        –
                        {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </span>
                    <div className="rl-pagination__btns">
                        <button
                            type="button"
                            className="rl-page-btn"
                            onClick={() => setPage((p) => p - 1)}
                            disabled={page === 1}
                        >
                            ←
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                                key={p}
                                type="button"
                                className={`rl-page-btn${p === page ? ' rl-page-btn--active' : ''}`}
                                onClick={() => setPage(p)}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="rl-page-btn"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page === totalPages}
                        >
                            →
                        </button>
                    </div>
                </div>
            </div>

            {viewRecord && (
                <PayloadModal record={viewRecord} onClose={() => setViewRecord(null)} initialTab={viewTab} />
            )}
        </div>
    );
}
