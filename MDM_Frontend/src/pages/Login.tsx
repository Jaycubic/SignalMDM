/**
 * src/pages/Login.tsx
 * --------------------
 * SignalMDM SuperAdmin Login — multi-step authentication:
 *   Step 1: Email + Password
 *   Step 2: Email OTP verification
 *   Step 3a: 2FA setup (QR code scan + first TOTP)
 *   Step 3b: 2FA verify (subsequent logins)
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import '../styles/theme.css';

/* ─── tiny inline styles object for the animated background ─ */
const BG_STYLE: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'linear-gradient(135deg, #060c1e 0%, #0d1b35 45%, #0a1628 70%, #060c1e 100%)',
  overflow: 'hidden',
};

/* ─── SVG particle canvas drawn once ────────────────────────── */
function Background() {
  return (
    <div style={BG_STYLE}>
      {/* floating orbs */}
      {[
        { w: 500, h: 500, x: '-10%', y: '-15%', c: 'rgba(21,87,255,0.07)' },
        { w: 400, h: 400, x: '65%',  y: '55%',  c: 'rgba(21,87,255,0.05)' },
        { w: 300, h: 300, x: '80%',  y: '-5%',  c: 'rgba(37,99,235,0.06)' },
      ].map((o, i) => (
        <div key={i} style={{
          position: 'absolute', left: o.x, top: o.y,
          width: o.w, height: o.h, borderRadius: '50%',
          background: o.c, filter: 'blur(80px)',
          animation: `float${i} ${12 + i * 3}s ease-in-out infinite alternate`,
        }} />
      ))}
      {/* grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(21,87,255,.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(21,87,255,.04) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />
      <style>{`
        @keyframes float0{from{transform:translate(0,0) scale(1)}to{transform:translate(30px,20px) scale(1.05)}}
        @keyframes float1{from{transform:translate(0,0)}to{transform:translate(-25px,30px)}}
        @keyframes float2{from{transform:translate(0,0)}to{transform:translate(20px,-20px)}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}

/* ─── OTP digit input ────────────────────────────────────────── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      id="otp-input"
      type="text"
      inputMode="numeric"
      maxLength={6}
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="••••••"
      style={{
        width: '100%', textAlign: 'center', fontSize: 28, fontWeight: 700,
        letterSpacing: 12, padding: '14px 12px',
        background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.15)',
        borderRadius: 10, color: '#fff', outline: 'none',
        fontFamily: 'var(--font-mono)',
        transition: 'border-color .15s, box-shadow .15s',
      }}
      onFocus={e => { e.target.style.borderColor = 'rgba(21,87,255,.7)'; e.target.style.boxShadow = '0 0 0 3px rgba(21,87,255,.18)'; }}
      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.15)'; e.target.style.boxShadow = 'none'; }}
      autoFocus
    />
  );
}

/* ─── Shared field ───────────────────────────────────────────── */
interface FieldProps {
  id: string; label: string; type?: string;
  value: string; onChange: (v: string) => void;
  placeholder?: string; error?: string;
  right?: React.ReactNode;
}
function Field({ id, label, type = 'text', value, onChange, placeholder, error, right }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.4px', textTransform: 'uppercase' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id} type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: right ? '12px 44px 12px 14px' : '12px 14px',
            background: 'rgba(255,255,255,.06)',
            border: `1px solid ${error ? '#ef4444' : focused ? 'rgba(21,87,255,.7)' : 'rgba(255,255,255,.12)'}`,
            borderRadius: 10, color: '#fff', fontSize: 14,
            fontFamily: 'var(--font-sans)', outline: 'none',
            boxShadow: focused && !error ? '0 0 0 3px rgba(21,87,255,.15)' : 'none',
            transition: 'border-color .15s, box-shadow .15s',
          }}
        />
        {right && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
            {right}
          </div>
        )}
      </div>
      {error && <span style={{ fontSize: 12, color: '#f87171', fontWeight: 500 }}>{error}</span>}
    </div>
  );
}

/* ─── Countdown timer hook ───────────────────────────────────── */
function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    setRemaining(seconds);
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [seconds]);
  return remaining;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN LOGIN COMPONENT
═══════════════════════════════════════════════════════════════ */
type Step = 'credentials' | 'otp' | '2fa_setup' | '2fa_verify';

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, refreshProfile } = useAuth();

  // Redirect if already authenticated
  useEffect(() => { if (isAuthenticated) navigate('/', { replace: true }); }, [isAuthenticated, navigate]);

  const [step,        setStep]        = useState<Step>('credentials');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [otp,         setOtp]         = useState('');
  const [totpCode,    setTotpCode]    = useState('');
  const [adminId,     setAdminId]     = useState('');
  const [totpUri,     setTotpUri]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [,           setResendKey]   = useState(0); // bump to reset countdown
  const countdown = useCountdown(60);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw QR code when 2FA setup step is reached
  useEffect(() => {
    if (step === '2fa_setup' && totpUri && canvasRef.current) {
      import('qrcode').then(QRCode => {
        QRCode.toCanvas(canvasRef.current!, totpUri, { width: 180, margin: 2 });
      }).catch(() => {});
    }
  }, [step, totpUri]);

  const clearError = () => setError('');

  /* ── Step 1: Login ─────────────────────────────────────────── */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    if (!email || !password) { setError('Email and password are required.'); return; }
    setLoading(true);
    try {
      const res = await authService.login(email, password);
      setAdminId(res.admin_id);
      setResendKey(k => k + 1);
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally { setLoading(false); }
  }

  /* ── Step 2: Verify OTP ────────────────────────────────────── */
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    if (otp.length < 6) { setError('Enter the 6-digit code.'); return; }
    setLoading(true);
    try {
      const res = await authService.verifyOtp(adminId, otp);
      if (res.message === 'success') {
        await refreshProfile();
        navigate('/', { replace: true });
      } else if (res.message === '2fa_setup') {
        setTotpUri(res.totp_uri ?? '');
        setStep('2fa_setup');
      } else {
        setStep('2fa_verify');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code.');
    } finally { setLoading(false); }
  }

  /* ── Resend OTP ────────────────────────────────────────────── */
  async function handleResend() {
    if (countdown > 0) return;
    clearError();
    setLoading(true);
    try {
      await authService.resendOtp(adminId);
      setOtp('');
      setResendKey(k => k + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend.');
    } finally { setLoading(false); }
  }

  /* ── Step 3: Verify 2FA ────────────────────────────────────── */
  async function handleVerify2FA(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    if (totpCode.length < 6) { setError('Enter the 6-digit TOTP code.'); return; }
    setLoading(true);
    try {
      await authService.verify2FA(adminId, totpCode);
      await refreshProfile();
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid 2FA code.');
    } finally { setLoading(false); }
  }

  /* ── Shared card style ─────────────────────────────────────── */
  const card: React.CSSProperties = {
    position: 'relative', zIndex: 10,
    width: '100%', maxWidth: 420,
    background: 'rgba(13,27,53,0.85)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 20,
    padding: '36px 36px 32px',
    boxShadow: '0 24px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(21,87,255,.08)',
    animation: 'fadeSlide .35s ease both',
  };

  const stepLabel: Record<Step, string> = {
    credentials: 'Sign in to your account',
    otp:         'Verify your identity',
    '2fa_setup': 'Set up two-factor authentication',
    '2fa_verify':'Enter authenticator code',
  };

  /* ── Step dots ─────────────────────────────────────────────── */
  const steps: Step[] = ['credentials', 'otp', '2fa_verify'];
  const stepIdx = step === '2fa_setup' ? 2 : steps.indexOf(step);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20, fontFamily: 'var(--font-sans)' }}>
      <Background />

      <div style={card}>
        {/* ── Logo ── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#1557ff,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(21,87,255,.4)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9h12M9 3v12" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-.4px' }}>
              Signal<span style={{ color: '#3b82f6' }}>MDM</span>
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginBottom: 0 }}>
            {stepLabel[step]}
          </p>

          {/* step dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                width: i === stepIdx ? 20 : 7, height: 7,
                borderRadius: 99,
                background: i === stepIdx ? '#1557ff' : i < stepIdx ? 'rgba(21,87,255,.5)' : 'rgba(255,255,255,.15)',
                transition: 'all .3s ease',
              }} />
            ))}
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#f87171', display: 'flex', gap: 8, alignItems: 'flex-start', animation: 'shake .35s ease' }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
            <span>{error}</span>
            <button onClick={clearError} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(248,113,113,.6)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0 }}>✕</button>
          </div>
        )}

        {/* ════ STEP 1: CREDENTIALS ════ */}
        {step === 'credentials' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field id="email" label="Email Address" type="email" value={email}
              onChange={setEmail} placeholder="admin@signalmdm.com" />
            <Field id="password" label="Password" type={showPw ? 'text' : 'password'}
              value={password} onChange={setPassword} placeholder="••••••••••"
              right={
                <button type="button" onClick={() => setShowPw(p => !p)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', fontSize: 13, padding: 0, lineHeight: 1 }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              }
            />
            <PrimaryButton loading={loading} label="Continue" />
          </form>
        )}

        {/* ════ STEP 2: OTP ════ */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', textAlign: 'center', lineHeight: 1.6 }}>
              A 6-digit code was sent to<br />
              <strong style={{ color: 'rgba(255,255,255,.8)' }}>{email}</strong>
            </p>
            <OtpInput value={otp} onChange={setOtp} />
            <PrimaryButton loading={loading} label="Verify Code" />
            <div style={{ textAlign: 'center' }}>
              <button type="button" onClick={handleResend} disabled={countdown > 0 || loading}
                style={{ background: 'none', border: 'none', cursor: countdown > 0 ? 'default' : 'pointer', fontSize: 12, color: countdown > 0 ? 'rgba(255,255,255,.25)' : 'rgba(59,130,246,.8)', fontFamily: 'var(--font-sans)', padding: 0 }}>
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
              </button>
            </div>
            <BackButton onClick={() => { setStep('credentials'); setOtp(''); clearError(); }} />
          </form>
        )}

        {/* ════ STEP 3a: 2FA SETUP ════ */}
        {step === '2fa_setup' && (
          <form onSubmit={handleVerify2FA} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', textAlign: 'center', lineHeight: 1.6 }}>
              Scan this QR code with <strong style={{ color: 'rgba(255,255,255,.7)' }}>Google Authenticator</strong> or Authy, then enter the code.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', background: '#fff', borderRadius: 12, padding: 12, margin: '0 auto' }}>
              <canvas ref={canvasRef} />
            </div>
            <Field id="totp-setup" label="Authenticator Code" type="text"
              value={totpCode} onChange={v => setTotpCode(v.replace(/\D/g,'').slice(0,6))} placeholder="000000" />
            <PrimaryButton loading={loading} label="Verify & Enable 2FA" />
          </form>
        )}

        {/* ════ STEP 3b: 2FA VERIFY ════ */}
        {step === '2fa_verify' && (
          <form onSubmit={handleVerify2FA} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', textAlign: 'center' }}>
              Open your authenticator app and enter the current 6-digit code.
            </p>
            <OtpInput value={totpCode} onChange={v => setTotpCode(v.replace(/\D/g,'').slice(0,6))} />
            <PrimaryButton loading={loading} label="Verify 2FA" />
            <BackButton onClick={() => { setStep('otp'); setTotpCode(''); clearError(); }} />
          </form>
        )}

        {/* ── Footer ── */}
        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.2)', letterSpacing: '.3px' }}>
          PHASE 1 · FOUNDATION · SIGNALMDM
        </p>
      </div>
    </div>
  );
}

/* ─── Small reusable sub-components ─────────────────────────── */
function PrimaryButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading} style={{
      width: '100%', padding: '13px 20px',
      background: loading ? 'rgba(21,87,255,.5)' : 'linear-gradient(135deg, #1557ff, #2563eb)',
      border: 'none', borderRadius: 10, color: '#fff',
      fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-sans)',
      cursor: loading ? 'not-allowed' : 'pointer',
      boxShadow: loading ? 'none' : '0 4px 16px rgba(21,87,255,.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transition: 'all .15s', marginTop: 4,
    }}>
      {loading && (
        <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
      )}
      {loading ? 'Please wait…' : label}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: 'rgba(255,255,255,.35)', fontSize: 12,
      fontFamily: 'var(--font-sans)', textAlign: 'center', width: '100%',
      padding: 4,
    }}>
      ← Back
    </button>
  );
}
