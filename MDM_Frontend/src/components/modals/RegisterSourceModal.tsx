import { useState, useEffect } from 'react';
import {
  sourceService,
  type SourceRecord,
  type SourceType,
  type ConnectionType,
} from '../../services/sourceService';

/* ─── Styles (CSS merged into this component file) ───────────── */
const CSS = `
.rsm-overlay{position:fixed;inset:0;background:rgba(6,12,30,.55);backdrop-filter:blur(3px);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;animation:rsm-fade-in .18s ease}
@keyframes rsm-fade-in{from{opacity:0}to{opacity:1}}
.rsm-modal{background:#fff;border-radius:var(--radius-xl);width:620px;max-width:100%;max-height:92vh;display:flex;flex-direction:column;box-shadow:var(--shadow-xl);overflow:hidden;animation:rsm-slide-up .22s ease}
@keyframes rsm-slide-up{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
.rsm-header{background:var(--navy-900);padding:22px 24px 18px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-shrink:0}
.rsm-header__title{font-size:17px;font-weight:700;color:#fff;margin:0 0 4px}
.rsm-header__sub{font-size:12px;color:rgba(255,255,255,.45)}
.rsm-close{background:rgba(255,255,255,.1);color:rgba(255,255,255,.6);border:none;width:30px;height:30px;border-radius:6px;font-size:13px;cursor:pointer;transition:background .13s,color .13s;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rsm-close:hover{background:rgba(255,255,255,.18);color:#fff}
.rsm-stepper{display:flex;align-items:center;padding:16px 24px;border-bottom:1px solid var(--border-light);background:var(--surface-1);gap:0;flex-shrink:0;overflow-x:auto}
.rsm-stepper::-webkit-scrollbar{height:0}
.rsm-step{display:flex;align-items:center;gap:8px;flex-shrink:0}
.rsm-step__dot{width:26px;height:26px;border-radius:50%;background:var(--surface-3);color:var(--text-muted);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;transition:background .18s,color .18s;flex-shrink:0}
.rsm-step--active .rsm-step__dot{background:var(--blue-600);color:#fff;box-shadow:0 0 0 3px rgba(21,87,255,.2)}
.rsm-step--done .rsm-step__dot{background:var(--green-500);color:#fff}
.rsm-step__label{font-size:12px;font-weight:500;color:var(--text-muted);white-space:nowrap}
.rsm-step--active .rsm-step__label{color:var(--blue-600);font-weight:600}
.rsm-step--done .rsm-step__label{color:var(--green-500)}
.rsm-step__line{width:36px;height:1px;background:var(--border-light);margin:0 8px;flex-shrink:0}
.rsm-body{flex:1;overflow-y:auto;padding:22px 24px}
.rsm-section{display:flex;flex-direction:column;gap:16px}
.rsm-section-desc{font-size:13px;color:var(--text-secondary);line-height:1.55}
.rsm-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.rsm-field{display:flex;flex-direction:column;gap:5px}
.rsm-field--full{grid-column:1/-1}
.rsm-label{font-size:12px;font-weight:600;color:var(--text-secondary);display:flex;align-items:center;gap:5px}
.rsm-required{color:var(--red-500);font-size:13px;line-height:1}
.rsm-hint{font-size:10.5px;font-weight:400;color:var(--text-muted);margin-left:auto}
.rsm-input,.rsm-select,.rsm-textarea{border:1px solid var(--border-muted);border-radius:var(--radius-sm);padding:9px 11px;font-size:13px;color:var(--text-primary);background:#fff;transition:border-color .15s,box-shadow .15s;width:100%;font-family:inherit}
.rsm-input:focus,.rsm-select:focus,.rsm-textarea:focus{border-color:var(--blue-400);box-shadow:0 0 0 3px rgba(59,130,246,.12);outline:none}
.rsm-input::placeholder,.rsm-textarea::placeholder{color:var(--text-muted)}
.rsm-input--mono{font-family:'Courier New',monospace;font-size:12.5px;letter-spacing:.5px}
.rsm-select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:30px}
.rsm-textarea{resize:vertical;min-height:80px}
.rsm-field--error .rsm-input,.rsm-field--error .rsm-select{border-color:var(--red-500)}
.rsm-error-msg{font-size:11.5px;color:var(--red-500);font-weight:500}
.rsm-alert{padding:10px 14px;border-radius:var(--radius-sm);font-size:13px;font-weight:500}
.rsm-alert--error{background:var(--red-100);color:#b91c1c;border-left:3px solid var(--red-500)}
.rsm-alert--info{background:var(--blue-100);color:var(--blue-500);border-left:3px solid var(--blue-400)}
.rsm-entity-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.rsm-entity-card{border:1.5px solid var(--border-light);border-radius:var(--radius-md);padding:14px 12px;background:var(--surface-1);display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;transition:border-color .15s,background .15s,transform .12s;position:relative;font-family:inherit;background:none;border-style:solid}
.rsm-entity-card:hover{border-color:var(--blue-400);background:var(--blue-100);transform:translateY(-1px)}
.rsm-entity-card--selected{border-color:var(--blue-500);background:var(--blue-100);box-shadow:0 0 0 2px rgba(37,99,235,.15)}
.rsm-entity-icon{font-size:22px}
.rsm-entity-name{font-size:11px;font-weight:700;letter-spacing:.5px;color:var(--text-secondary);text-transform:uppercase}
.rsm-entity-card--selected .rsm-entity-name{color:var(--blue-600)}
.rsm-entity-check{position:absolute;top:7px;right:8px;width:18px;height:18px;background:var(--blue-500);color:#fff;border-radius:50%;font-size:10px;display:flex;align-items:center;justify-content:center;font-weight:700}
.rsm-entity-count{font-size:12px;color:var(--text-muted);text-align:center}
.rsm-priority-block{border:1px solid var(--border-light);border-radius:var(--radius-md);overflow:hidden}
.rsm-priority-block__header{background:var(--navy-900);padding:10px 14px;display:flex;align-items:center;gap:8px}
.rsm-priority-block__entity{font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:rgba(255,255,255,.75)}
.rsm-priority-table{width:100%;border-collapse:collapse;font-size:13px}
.rsm-priority-table thead th{background:var(--surface-2);padding:8px 14px;text-align:left;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);border-bottom:1px solid var(--border-light)}
.rsm-priority-table tbody tr{border-bottom:1px solid var(--surface-2)}
.rsm-priority-table tbody tr:last-child{border-bottom:none}
.rsm-priority-table tbody td{padding:8px 14px}
.rsm-attr-code{font-family:'Courier New',monospace;font-size:12px;color:var(--text-secondary);background:var(--surface-2);padding:2px 7px;border-radius:4px}
.rsm-priority-input{width:70px;border:1px solid var(--border-muted);border-radius:var(--radius-sm);padding:5px 8px;font-size:13px;text-align:center;color:var(--text-primary);transition:border-color .14s;font-family:inherit}
.rsm-priority-input:focus{border-color:var(--blue-400);outline:none}
.rsm-conn-type-badge{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--text-secondary);background:var(--surface-2);padding:6px 12px;border-radius:var(--radius-sm);border:1px solid var(--border-light)}
.rsm-conn-type-badge strong{color:var(--blue-600);font-weight:700}
.rsm-note{font-size:12px;color:var(--amber-500);background:var(--amber-100);padding:9px 13px;border-radius:var(--radius-sm);border-left:3px solid var(--amber-500)}
.rsm-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 24px;border-top:1px solid var(--border-light);background:var(--surface-1);flex-shrink:0}
.rsm-footer__right{display:flex;align-items:center;gap:10px}
.rsm-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;transition:background .15s,transform .12s;cursor:pointer;white-space:nowrap;border:none;font-family:inherit}
.rsm-btn:active{transform:scale(.97)}
.rsm-btn--primary{background:var(--blue-600);color:#fff;box-shadow:0 2px 8px rgba(21,87,255,.28)}
.rsm-btn--primary:hover{background:#0f49e0}
.rsm-btn--submit{background:#16a34a;box-shadow:0 2px 8px rgba(22,163,74,.28)}
.rsm-btn--submit:hover{background:#15803d}
.rsm-btn--outline{background:transparent;color:var(--text-secondary);border:1px solid var(--border-muted)}
.rsm-btn--outline:hover{background:var(--surface-2);color:var(--text-primary)}
.rsm-btn--ghost{background:transparent;color:var(--text-muted);border:none}
.rsm-btn--ghost:hover{color:var(--text-primary)}
`;

if (typeof document !== 'undefined' && !document.getElementById('rsm-styles')) {
  const el = document.createElement('style');
  el.id = 'rsm-styles';
  el.textContent = CSS;
  document.head.appendChild(el);
}

/* ─── Types & constants ──────────────────────────────────────── */
type ConnectionType = 'API' | 'FILE_UPLOAD' | 'DATABASE' | 'SFTP' | 'STREAM' | 'MANUAL';
type SourceType = 'CRM' | 'ERP' | 'FINANCE' | 'HRMS' | 'SCM' | 'OTHER_CORE_SYSTEM';
type EntityType = 'CUSTOMER' | 'SUPPLIER' | 'PRODUCT' | 'ACCOUNT' | 'ASSET' | 'LOCATION';

interface PriorityRow { attribute: string; priority: number }
interface FormErrors { sourceName?: string; sourceCode?: string; sourceType?: string; connectionType?: string; supportedEntities?: string }

const DEFAULT_PRIORITY: Record<EntityType, PriorityRow[]> = {
  CUSTOMER: [{ attribute: 'customer_name', priority: 1 }, { attribute: 'email', priority: 1 }, { attribute: 'phone', priority: 2 }, { attribute: 'billing_address', priority: 3 }],
  SUPPLIER: [{ attribute: 'supplier_name', priority: 1 }, { attribute: 'tax_id', priority: 1 }, { attribute: 'contact_email', priority: 2 }],
  PRODUCT: [{ attribute: 'product_name', priority: 1 }, { attribute: 'sku', priority: 1 }, { attribute: 'category', priority: 2 }],
  ACCOUNT: [{ attribute: 'account_name', priority: 1 }, { attribute: 'account_number', priority: 1 }, { attribute: 'currency', priority: 2 }],
  ASSET: [{ attribute: 'asset_name', priority: 1 }, { attribute: 'asset_id', priority: 1 }, { attribute: 'location', priority: 2 }],
  LOCATION: [{ attribute: 'location_name', priority: 1 }, { attribute: 'address', priority: 1 }, { attribute: 'region', priority: 2 }],
};

// CONN_FIELDS keys match backend ConnectionTypeEnum: CSV | JSON | REST_API | JDBC | SFTP | S3 | OTHER
const CONN_FIELDS: Record<ConnectionType, { field: string; label: string; type?: string; placeholder?: string }[]> = {
  REST_API: [{ field: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://api.example.com' }, { field: 'authType', label: 'Auth Type', placeholder: 'Bearer / OAuth2 / Basic' }, { field: 'apiKey', label: 'API Key', type: 'password', placeholder: '••••••••••••••••' }, { field: 'timeout', label: 'Timeout (ms)', type: 'number', placeholder: '30000' }],
  CSV:      [{ field: 'fileFormat', label: 'File Format', placeholder: 'CSV' }, { field: 'delimiter', label: 'Delimiter', placeholder: ',' }, { field: 'encoding', label: 'Encoding', placeholder: 'UTF-8' }, { field: 'path', label: 'File Path / URL', placeholder: '/data/import.csv' }],
  JSON:     [{ field: 'fileFormat', label: 'File Format', placeholder: 'JSON' }, { field: 'encoding', label: 'Encoding', placeholder: 'UTF-8' }, { field: 'path', label: 'File Path / URL', placeholder: '/data/import.json' }],
  JDBC:     [{ field: 'host', label: 'Host', placeholder: 'db.example.com' }, { field: 'port', label: 'Port', type: 'number', placeholder: '5432' }, { field: 'database', label: 'Database', placeholder: 'mdm_source' }, { field: 'username', label: 'Username', placeholder: 'db_user' }, { field: 'password', label: 'Password', type: 'password', placeholder: '••••••••' }],
  SFTP:     [{ field: 'host', label: 'Host', placeholder: 'sftp.example.com' }, { field: 'port', label: 'Port', type: 'number', placeholder: '22' }, { field: 'remotePath', label: 'Remote Path', placeholder: '/data/incoming' }, { field: 'username', label: 'Username', placeholder: 'sftp_user' }, { field: 'privateKey', label: 'Private Key (path)', placeholder: '/keys/id_rsa' }],
  S3:       [{ field: 'bucket', label: 'Bucket Name', placeholder: 'my-mdm-bucket' }, { field: 'region', label: 'Region', placeholder: 'us-east-1' }, { field: 'prefix', label: 'Key Prefix', placeholder: 'data/imports/' }, { field: 'accessKey', label: 'Access Key ID', placeholder: 'AKIA…' }, { field: 'secretKey', label: 'Secret Access Key', type: 'password', placeholder: '••••••••' }],
  OTHER:    [{ field: 'notes', label: 'Notes / Description', placeholder: 'Describe the connection…' }],
};

const ALL_ENTITIES: EntityType[] = ['CUSTOMER', 'SUPPLIER', 'PRODUCT', 'ACCOUNT', 'ASSET', 'LOCATION'];
const ENTITY_ICONS: Record<EntityType, string> = { CUSTOMER: '👤', SUPPLIER: '🏭', PRODUCT: '📦', ACCOUNT: '💼', ASSET: '🖥', LOCATION: '📍' };
const STEP_LABELS = ['Basic Info', 'Entities', 'Priority', 'Connection'];

/* ─── Props ──────────────────────────────────────────────────── */
interface Props {
  onClose: () => void;
  onRegister: (record: SourceRecord) => void;
}

/* ─── Component ──────────────────────────────────────────────── */
export default function RegisterSourceModal({ onClose, onRegister }: Props) {
  const [step, setStep] = useState(1);
  const [sourceName, setSourceName] = useState('');
  const [sourceCode, setSourceCode] = useState('');
  const [sourceType, setSourceType] = useState<SourceType | ''>('');
  const [connectionType, setConnectionType] = useState<ConnectionType | ''>('');
  const [entities, setEntities] = useState<EntityType[]>([]);
  const [priorityConfig, setPriorityConfig] = useState<Record<string, PriorityRow[]>>({});
  const [connConfig, setConnConfig] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [codeEdited, setCodeEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-generate lowercase slug: backend requires ^[a-z0-9_\-]+$
  useEffect(() => {
    if (sourceName && !codeEdited) {
      setSourceCode(
        sourceName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '_'),
      );
    }
  }, [sourceName, codeEdited]);

  useEffect(() => {
    const next: Record<string, PriorityRow[]> = {};
    entities.forEach(e => { next[e] = priorityConfig[e] || DEFAULT_PRIORITY[e] || []; });
    setPriorityConfig(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities]);

  const toggleEntity = (e: EntityType) =>
    setEntities(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);

  const handleNext = () => {
    if (step === 1) {
      const errs: FormErrors = {};
      if (!sourceName.trim()) errs.sourceName = 'Source name is required';
      if (!sourceCode.trim()) errs.sourceCode = 'Source code is required';
      else if (!/^[a-z0-9_\-]+$/.test(sourceCode)) errs.sourceCode = 'Lowercase letters, digits, underscores or hyphens only';
      if (!sourceType) errs.sourceType = 'Source type is required';
      if (!connectionType) errs.connectionType = 'Connection type is required';
      if (Object.keys(errs).length) { setErrors(errs); return; }
    }
    if (step === 2 && entities.length === 0) { setErrors({ supportedEntities: 'Select at least one entity' }); return; }
    setErrors({});
    setStep(s => Math.min(s + 1, 4));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const record = await sourceService.registerSource({
        source_name:       sourceName,
        source_code:       sourceCode,
        source_type:       sourceType as SourceType,
        connection_type:   connectionType as ConnectionType,
        config_json: {
          supported_entities: entities,
          priority_config:    priorityConfig,
          connection_config:  connConfig,
        },
      });
      onRegister(record);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rsm-overlay" onClick={onClose}>
      <div className="rsm-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">

        {/* Header */}
        <div className="rsm-header">
          <div>
            <h2 className="rsm-header__title">Register Source System</h2>
            <p className="rsm-header__sub">Step {step} of 4 — {STEP_LABELS[step - 1]}</p>
          </div>
          <button className="rsm-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Stepper */}
        <div className="rsm-stepper">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className={`rsm-step${i + 1 === step ? ' rsm-step--active' : ''}${i + 1 < step ? ' rsm-step--done' : ''}`}>
              <div className="rsm-step__dot">{i + 1 < step ? '✓' : i + 1}</div>
              <span className="rsm-step__label">{label}</span>
              {i < 3 && <div className="rsm-step__line" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="rsm-body">

          {/* Step 1 — Basic Info */}
          {step === 1 && (
            <div className="rsm-section">
              <div className="rsm-field-grid">
                <div className={`rsm-field${errors.sourceName ? ' rsm-field--error' : ''}`}>
                  <label htmlFor="rsm-source-name" className="rsm-label">Source Name <span className="rsm-required">*</span></label>
                  <input id="rsm-source-name" className="rsm-input" placeholder="e.g. Salesforce CRM" value={sourceName} onChange={e => setSourceName(e.target.value)} />
                  {errors.sourceName && <span className="rsm-error-msg">{errors.sourceName}</span>}
                </div>
                <div className={`rsm-field${errors.sourceCode ? ' rsm-field--error' : ''}`}>
                  <label htmlFor="rsm-source-code" className="rsm-label">Source Code <span className="rsm-required">*</span><span className="rsm-hint">AUTO-GENERATED</span></label>
                  <input id="rsm-source-code" className="rsm-input rsm-input--mono" placeholder="salesforce_crm" value={sourceCode}
                    onChange={e => { setCodeEdited(true); setSourceCode(e.target.value.toLowerCase().replace(/[^a-z0-9_\-]/g, '')); }} />
                  {errors.sourceCode && <span className="rsm-error-msg">{errors.sourceCode}</span>}
                </div>
                <div className={`rsm-field${errors.sourceType ? ' rsm-field--error' : ''}`}>
                  <label htmlFor="rsm-source-type" className="rsm-label">Source Type <span className="rsm-required">*</span></label>
                  <select id="rsm-source-type" className="rsm-select" value={sourceType} onChange={e => setSourceType(e.target.value as SourceType)}>
                    <option value="">— Select type —</option>
                    {(['CRM', 'ERP', 'DATABASE', 'FILE', 'API', 'STREAMING', 'OTHER'] as const).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {errors.sourceType && <span className="rsm-error-msg">{errors.sourceType}</span>}
                </div>
                <div className={`rsm-field${errors.connectionType ? ' rsm-field--error' : ''}`}>
                  <label htmlFor="rsm-conn-type" className="rsm-label">Connection Type <span className="rsm-required">*</span></label>
                  <select id="rsm-conn-type" className="rsm-select" value={connectionType} onChange={e => setConnectionType(e.target.value as ConnectionType)}>
                    <option value="">— Select connection —</option>
                    {(['CSV', 'JSON', 'REST_API', 'JDBC', 'SFTP', 'S3', 'OTHER'] as const).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {errors.connectionType && <span className="rsm-error-msg">{errors.connectionType}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Entities */}
          {step === 2 && (
            <div className="rsm-section">
              <p className="rsm-section-desc">Select all entity types this source system provides data for.</p>
              {errors.supportedEntities && <div className="rsm-alert rsm-alert--error">{errors.supportedEntities}</div>}
              <div className="rsm-entity-grid">
                {ALL_ENTITIES.map(e => (
                  <button
                    key={e}
                    type="button"
                    className={`rsm-entity-card${entities.includes(e) ? ' rsm-entity-card--selected' : ''}`}
                    onClick={() => toggleEntity(e)}
                  >
                    <span className="rsm-entity-icon">{ENTITY_ICONS[e]}</span>
                    <span className="rsm-entity-name">{e}</span>
                    {entities.includes(e) && <span className="rsm-entity-check">✓</span>}
                  </button>
                ))}
              </div>
              <p className="rsm-entity-count">{entities.length} selected</p>
            </div>
          )}

          {/* Step 3 — Priority */}
          {step === 3 && (
            <div className="rsm-section">
              <p className="rsm-section-desc">Configure attribute priority per entity. Lower number = higher priority.</p>
              {entities.length === 0 && (
                <div className="rsm-alert rsm-alert--info">No entities selected. Go back to Step 2.</div>
              )}
              {entities.map(entity => (
                <div key={entity} className="rsm-priority-block">
                  <div className="rsm-priority-block__header">
                    <span className="rsm-priority-block__entity">{entity}</span>
                  </div>
                  <table className="rsm-priority-table">
                    <thead>
                      <tr><th>Attribute</th><th style={{ width: '120px' }}>Priority</th></tr>
                    </thead>
                    <tbody>
                      {(priorityConfig[entity] || []).map((row, idx) => (
                        <tr key={row.attribute}>
                          <td><code className="rsm-attr-code">{row.attribute}</code></td>
                          <td>
                            <input
                              type="number" min={1} max={10}
                              className="rsm-priority-input"
                              value={row.priority}
                              onChange={e => setPriorityConfig(prev => ({
                                ...prev,
                                [entity]: prev[entity].map((r, i) => i === idx ? { ...r, priority: Number(e.target.value) } : r),
                              }))}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Step 4 — Connection Config */}
          {step === 4 && (
            <div className="rsm-section">
              {!connectionType ? (
                <div className="rsm-alert rsm-alert--info">No connection type selected. Go back to Step 1.</div>
              ) : (
                <>
                  <div className="rsm-conn-type-badge">
                    <span>Connection: </span><strong>{connectionType}</strong>
                  </div>
                  <div className="rsm-field-grid">
                    {CONN_FIELDS[connectionType as ConnectionType]?.map(f => (
                      <div key={f.field} className="rsm-field">
                        <label htmlFor={`rsm-conn-${f.field}`} className="rsm-label">{f.label}</label>
                        {f.field === 'notes' ? (
                          <textarea
                            id={`rsm-conn-${f.field}`}
                            className="rsm-textarea"
                            placeholder={f.placeholder}
                            rows={4}
                            value={connConfig[f.field] || ''}
                            onChange={e => setConnConfig(c => ({ ...c, [f.field]: e.target.value }))}
                          />
                        ) : (
                          <input
                            id={`rsm-conn-${f.field}`}
                            className="rsm-input"
                            type={f.type || 'text'}
                            placeholder={f.placeholder}
                            value={connConfig[f.field] || ''}
                            onChange={e => setConnConfig(c => ({ ...c, [f.field]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="rsm-note">⚠ Connection credentials are stored encrypted. Never share your API keys.</p>
                </>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="rsm-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            {submitError && (
              <div className="rsm-alert rsm-alert--error" style={{ padding: '8px 12px', fontSize: '12px' }}>
                ⚠ {submitError}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <button className="rsm-btn rsm-btn--ghost" onClick={onClose} disabled={submitting}>Cancel</button>
              <div className="rsm-footer__right">
                {step > 1 && (
                  <button className="rsm-btn rsm-btn--outline" onClick={() => setStep(s => s - 1)} disabled={submitting}>← Back</button>
                )}
                {step < 4 ? (
                  <button id="rsm-next-btn" className="rsm-btn rsm-btn--primary" onClick={handleNext}>Next →</button>
                ) : (
                  <button
                    id="rsm-register-btn"
                    className="rsm-btn rsm-btn--primary rsm-btn--submit"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? '⏳ Registering…' : '✓ Register Source'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}