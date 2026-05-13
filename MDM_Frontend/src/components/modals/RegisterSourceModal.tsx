import { useState, useEffect } from 'react';
import {
  sourceService,
  type SourceRecord,
  type SourceType,
  type ConnectionType,
  type EntityType,
  SOURCE_TYPES,
  CONNECTION_TYPES,
  ENTITY_TYPES,
} from '../../services/sourceService';

/* Import Styles */
import '../../styles/theme.css';
import '../../styles/RegisterSourceModal.css';

/* ─── Types & constants ──────────────────────────────────────── */
interface PriorityRow { attribute: string; priority: number }
interface FormErrors { sourceName?: string; sourceCode?: string; sourceType?: string; connectionType?: string; supportedEntities?: string }

const DEFAULT_PRIORITY: Partial<Record<EntityType, PriorityRow[]>> = {
  CUSTOMER: [{ attribute: 'customer_name', priority: 1 }, { attribute: 'email', priority: 1 }, { attribute: 'phone', priority: 2 }, { attribute: 'billing_address', priority: 3 }],
  SUPPLIER: [{ attribute: 'supplier_name', priority: 1 }, { attribute: 'tax_id', priority: 1 }, { attribute: 'contact_email', priority: 2 }],
  PRODUCT: [{ attribute: 'product_name', priority: 1 }, { attribute: 'sku', priority: 1 }, { attribute: 'category', priority: 2 }],
  ACCOUNT: [{ attribute: 'account_name', priority: 1 }, { attribute: 'account_number', priority: 1 }, { attribute: 'currency', priority: 2 }],
  ASSET: [{ attribute: 'asset_name', priority: 1 }, { attribute: 'asset_id', priority: 1 }, { attribute: 'location', priority: 2 }],
  LOCATION: [{ attribute: 'location_name', priority: 1 }, { attribute: 'address', priority: 1 }, { attribute: 'region', priority: 2 }],
  EMPLOYEE: [{ attribute: 'name', priority: 1 }, { attribute: 'employee_id', priority: 1 }, { attribute: 'department', priority: 2 }],
  OTHER: [{ attribute: 'name', priority: 1 }, { attribute: 'description', priority: 2 }],
};

const CONN_FIELDS: Record<ConnectionType, { field: string; label: string; type?: string; placeholder?: string }[]> = {
  REST_API: [{ field: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://api.example.com' }, { field: 'authType', label: 'Auth Type', placeholder: 'Bearer / OAuth2 / Basic' }, { field: 'apiKey', label: 'API Key', type: 'password', placeholder: '••••••••••••••••' }, { field: 'timeout', label: 'Timeout (ms)', type: 'number', placeholder: '30000' }],
  CSV: [{ field: 'fileFormat', label: 'File Format', placeholder: 'CSV' }, { field: 'delimiter', label: 'Delimiter', placeholder: ',' }, { field: 'encoding', label: 'Encoding', placeholder: 'UTF-8' }, { field: 'path', label: 'File Path / URL', placeholder: '/data/import.csv' }],
  JSON: [{ field: 'fileFormat', label: 'File Format', placeholder: 'JSON' }, { field: 'encoding', label: 'Encoding', placeholder: 'UTF-8' }, { field: 'path', label: 'File Path / URL', placeholder: '/data/import.json' }],
  JDBC: [{ field: 'host', label: 'Host', placeholder: 'db.example.com' }, { field: 'port', label: 'Port', type: 'number', placeholder: '5432' }, { field: 'database', label: 'Database', placeholder: 'mdm_source' }, { field: 'username', label: 'Username', placeholder: 'db_user' }, { field: 'password', label: 'Password', type: 'password', placeholder: '••••••••' }],
  SFTP: [{ field: 'host', label: 'Host', placeholder: 'sftp.example.com' }, { field: 'port', label: 'Port', type: 'number', placeholder: '22' }, { field: 'remotePath', label: 'Remote Path', placeholder: '/data/incoming' }, { field: 'username', label: 'Username', placeholder: 'sftp_user' }, { field: 'privateKey', label: 'Private Key (path)', placeholder: '/keys/id_rsa' }],
  S3: [{ field: 'bucket', label: 'Bucket Name', placeholder: 'my-mdm-bucket' }, { field: 'region', label: 'Region', placeholder: 'us-east-1' }, { field: 'prefix', label: 'Key Prefix', placeholder: 'data/imports/' }, { field: 'accessKey', label: 'Access Key ID', placeholder: 'AKIA…' }, { field: 'secretKey', label: 'Secret Access Key', type: 'password', placeholder: '••••••••' }],
  OTHER: [{ field: 'notes', label: 'Notes / Description', placeholder: 'Describe the connection…' }],
};

const ALL_ENTITIES = ENTITY_TYPES;
const ENTITY_ICONS: Record<EntityType, string> = {
  CUSTOMER: '👤',
  SUPPLIER: '🏭',
  PRODUCT: '📦',
  ACCOUNT: '💼',
  ASSET: '🖥',
  LOCATION: '📍',
  EMPLOYEE: '👥',
  OTHER: '⚙️'
};
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

  // Auto-generate lowercase slug
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
        source_name: sourceName,
        source_code: sourceCode,
        source_type: sourceType as SourceType,
        connection_type: connectionType as ConnectionType,
        config_json: {
          supported_entities: entities,
          priority_config: priorityConfig,
          connection_config: connConfig,
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
                    {SOURCE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {errors.sourceType && <span className="rsm-error-msg">{errors.sourceType}</span>}
                </div>
                <div className={`rsm-field${errors.connectionType ? ' rsm-field--error' : ''}`}>
                  <label htmlFor="rsm-conn-type" className="rsm-label">Connection Type <span className="rsm-required">*</span></label>
                  <select id="rsm-conn-type" className="rsm-select" value={connectionType} onChange={e => setConnectionType(e.target.value as ConnectionType)}>
                    <option value="">— Select connection —</option>
                    {CONNECTION_TYPES.map(t => (
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