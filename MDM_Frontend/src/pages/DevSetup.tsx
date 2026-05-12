/**
 * src/pages/DevSetup.tsx
 * -----------------------
 * Development-only helper page for setting up authentication.
 *
 * Flow:
 *   1. User runs the Python script:  python scripts/generate_dev_token.py
 *   2. Script outputs 4 localStorage.setItem() commands
 *   3. User pastes them into the "Quick Paste" box here and clicks Apply
 *      — OR —
 *   3. User copies their User-Agent from this page, pastes into the script,
 *      then pastes the generated token into the "Manual Entry" fields.
 *
 * This page is only reachable at /dev-setup and should be removed in production.
 */
import { useState } from 'react';

const DEVICE_ID = 'signalmdm-dev-web';

export default function DevSetup() {
  const [pasteBlock, setPasteBlock]     = useState('');
  const [manualToken, setManualToken]   = useState('');
  const [manualDevice, setManualDevice] = useState(DEVICE_ID);
  const [applied, setApplied]           = useState(false);
  const [error, setError]               = useState('');

  const userAgent = navigator.userAgent;

  /* ── Apply a pasted block of localStorage.setItem() commands ─────────── */
  const applyPasteBlock = () => {
    setError('');
    const lines = pasteBlock.split('\n').map(l => l.trim()).filter(Boolean);
    let count = 0;
    for (const line of lines) {
      const match = line.match(/localStorage\.setItem\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/);
      if (match) {
        localStorage.setItem(match[1], match[2]);
        count++;
      }
    }
    if (count === 0) {
      setError('No valid localStorage.setItem() commands found. Check the pasted text.');
      return;
    }
    setApplied(true);
  };

  /* ── Apply manually entered token ────────────────────────────────────── */
  const applyManual = () => {
    setError('');
    if (!manualToken.trim()) {
      setError('Token cannot be empty.');
      return;
    }
    localStorage.setItem('auth_token', manualToken.trim());
    localStorage.setItem('device_id',  manualDevice.trim() || DEVICE_ID);
    setApplied(true);
  };

  /* ── Clear auth ──────────────────────────────────────────────────────── */
  const clearAuth = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('device_id');
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('user_id');
    setApplied(false);
    setPasteBlock('');
    setManualToken('');
  };

  const currentToken = localStorage.getItem('auth_token');

  return (
    <div style={{ maxWidth: 720, padding: '0 8px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'inline-block', background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, letterSpacing: '.5px', marginBottom: 8 }}>
          DEV ONLY
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          Dev Auth Setup
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          The backend requires an encrypted JWT. Use this page to configure your dev session token.
        </p>
      </div>

      {/* Current state banner */}
      {currentToken ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600, color: '#15803d', fontSize: 13 }}>✓ Auth token is set</div>
            <div style={{ fontSize: 12, color: '#166534', marginTop: 2, wordBreak: 'break-all' }}>
              {currentToken.slice(0, 60)}…
            </div>
          </div>
          <button onClick={clearAuth} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Clear
          </button>
        </div>
      ) : (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ fontWeight: 600, color: '#dc2626', fontSize: 13 }}>✗ No auth token set — API calls will return 401</div>
        </div>
      )}

      {applied && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontWeight: 600, color: '#15803d', fontSize: 13 }}>
          ✓ Token applied! <a href="/sources" style={{ color: '#15803d', marginLeft: 8 }}>Go to Source Systems →</a>
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Step 1 — User Agent */}
      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Step 1 — Your Browser User-Agent</h2>
        <p style={sectionDesc}>Copy this and paste it when the Python script asks for your User-Agent.</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <code style={{ flex: 1, fontSize: 11.5, background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: 6, padding: '10px 12px', wordBreak: 'break-all', color: 'var(--text-secondary)', display: 'block', lineHeight: 1.6 }}>
            {userAgent}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(userAgent)}
            style={copyBtnStyle}
          >
            Copy
          </button>
        </div>
      </section>

      {/* Step 2 — Run script */}
      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Step 2 — Run the Token Generator Script</h2>
        <p style={sectionDesc}>Open a terminal in the <code style={inlineCode}>MDM_Backend</code> folder (with venv active) and run:</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <code style={{ flex: 1, fontSize: 13, background: '#1e293b', color: '#7dd3fc', padding: '12px 16px', borderRadius: 6, display: 'block' }}>
            python scripts/generate_dev_token.py
          </code>
          <button
            onClick={() => navigator.clipboard.writeText('python scripts/generate_dev_token.py')}
            style={copyBtnStyle}
          >
            Copy
          </button>
        </div>
        <p style={{ ...sectionDesc, marginTop: 10 }}>
          The script will create a test tenant, ask for your User-Agent and role, then output 4 <code style={inlineCode}>localStorage.setItem()</code> commands.
        </p>
      </section>

      {/* Step 3 — Paste output */}
      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Step 3 — Paste the Script Output Here</h2>
        <p style={sectionDesc}>Copy all 4 <code style={inlineCode}>localStorage.setItem(…)</code> lines from the script output and paste below:</p>
        <textarea
          placeholder={`localStorage.setItem("auth_token", "…");\nlocalStorage.setItem("device_id",  "…");\nlocalStorage.setItem("tenant_id",  "…");\nlocalStorage.setItem("user_id",    "…");`}
          value={pasteBlock}
          onChange={e => setPasteBlock(e.target.value)}
          style={{ width: '100%', minHeight: 120, fontFamily: 'Courier New, monospace', fontSize: 12, padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-muted)', background: '#fff', color: 'var(--text-primary)', boxSizing: 'border-box', resize: 'vertical' }}
        />
        <button
          onClick={applyPasteBlock}
          style={{ marginTop: 10, padding: '9px 20px', background: 'var(--blue-600)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Apply Token
        </button>
      </section>

      {/* Alternative — Manual entry */}
      <section style={{ ...sectionStyle, background: 'var(--surface-1)', borderColor: 'var(--border-light)' }}>
        <h2 style={{ ...sectionTitle, color: 'var(--text-muted)' }}>Alternative — Manual Entry</h2>
        <p style={sectionDesc}>If you already have an encrypted token string:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Encrypted Token (auth_token)</label>
            <input
              value={manualToken}
              onChange={e => setManualToken(e.target.value)}
              placeholder="Base64 encoded AES-encrypted JWT…"
              style={{ width: '100%', padding: '9px 11px', borderRadius: 6, border: '1px solid var(--border-muted)', fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Device ID</label>
            <input
              value={manualDevice}
              onChange={e => setManualDevice(e.target.value)}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 6, border: '1px solid var(--border-muted)', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={applyManual}
            style={{ alignSelf: 'flex-start', padding: '9px 20px', background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1px solid var(--border-muted)', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Apply Manually
          </button>
        </div>
      </section>

    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--border-light)',
  borderRadius: 10,
  padding: '20px 22px',
  marginBottom: 16,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: 'var(--text-primary)',
  margin: '0 0 6px',
};

const sectionDesc: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-secondary)',
  margin: '0 0 12px',
  lineHeight: 1.55,
};

const inlineCode: React.CSSProperties = {
  fontFamily: 'Courier New, monospace',
  fontSize: 12,
  background: 'var(--surface-2)',
  padding: '1px 5px',
  borderRadius: 4,
};

const copyBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid var(--border-muted)',
  background: 'var(--surface-2)',
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  flexShrink: 0,
};
