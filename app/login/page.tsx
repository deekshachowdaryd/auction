'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/live/context/AuthContext';

type Role = 'buyer' | 'seller' | 'manager';
type Mode = 'signin' | 'signup';

const ROLES: { key: Role; label: string; desc: string; color: string }[] = [
  { key: 'buyer',   label: 'BUYER',   desc: 'Bid on live auctions',       color: 'var(--accent-green)' },
  { key: 'seller',  label: 'SELLER',  desc: 'List and manage auctions',   color: 'var(--accent-amber)' },
  { key: 'manager', label: 'MANAGER', desc: 'Platform administration',    color: 'var(--accent-red)'   },
];

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const [mode,     setMode]     = useState<Mode>('signin');
  const [role,     setRole]     = useState<Role>('buyer');
  const [handle,   setHandle]   = useState('');
  const [password, setPassword] = useState('');
  const [state,    setState]    = useState<'idle' | 'submitting' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function setErr(msg: string) {
    setErrorMsg(msg);
    setState('error');
  }

  async function handleSubmit() {
    const trimHandle   = handle.trim();
    const trimPassword = password.trim();

    if (!trimHandle) return setErr('Handle is required.');
    if (!trimPassword || trimPassword.length < 6)  return setErr('Password must be at least 6 characters.');

    setState('submitting');

    if (mode === 'signup') {
      const { error } = await signUp(trimHandle, '', trimPassword, role);
      if (error) return setErr(error);
      // After signup, sign straight in
      const { error: signInErr } = await signIn(trimHandle, trimPassword);
      if (signInErr) return setErr(signInErr);
    } else {
      const { error } = await signIn(trimHandle, trimPassword);
      if (error) return setErr(error);
    }

    router.push('/');
  }

  const activeRole = ROLES.find(r => r.key === role)!;

  return (
    <div style={{
      minHeight:       '100vh',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      backgroundColor: 'var(--bg-void)',
      padding:         '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width:           '36px',
            height:          '36px',
            backgroundColor: 'var(--accent-green)',
            borderRadius:    '6px',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            boxShadow:       'var(--glow-green)',
            margin:          '0 auto 16px',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   '18px',
              fontWeight: 700,
              color:      'var(--bg-void)',
              lineHeight: 1,
            }}>▶</span>
          </div>
          <h1 style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '14px',
            fontWeight:    700,
            color:         'var(--text-primary)',
            letterSpacing: '0.12em',
            marginBottom:  '6px',
          }}>
            AUCTION<span style={{ color: 'var(--accent-green)' }}>_</span>TERMINAL
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            Institutional-grade live auctions
          </p>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border:          'var(--border-default)',
          borderRadius:    '10px',
          overflow:        'hidden',
        }}>

          {/* Card header — signin / signup toggle */}
          <div style={{
            display:         'grid',
            gridTemplateColumns: '1fr 1fr',
            borderBottom:    'var(--border-subtle)',
          }}>
            {(['signin', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setState('idle'); setErrorMsg(''); }}
                style={{
                  padding:         '13px',
                  background:      m === mode ? 'var(--bg-elevated)' : 'transparent',
                  border:          'none',
                  borderBottom:    m === mode
                    ? `2px solid ${activeRole.color}`
                    : '2px solid transparent',
                  color:           m === mode ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontFamily:      'var(--font-mono)',
                  fontSize:        '10px',
                  letterSpacing:   '0.08em',
                  cursor:          'pointer',
                  transition:      'var(--transition-fast)',
                }}
              >
                {m === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </button>
            ))}
          </div>

          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Role picker — only shown on signup */}
            {mode === 'signup' && (
              <div>
                <p style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      '10px',
                  letterSpacing: '0.07em',
                  color:         'var(--text-tertiary)',
                  marginBottom:  '8px',
                }}>
                  ACCOUNT TYPE
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  {ROLES.map(r => (
                    <button
                      key={r.key}
                      onClick={() => setRole(r.key)}
                      style={{
                        padding:         '10px 6px',
                        borderRadius:    '6px',
                        border:          role === r.key
                          ? `1px solid ${r.color}`
                          : '1px solid var(--bg-border)',
                        backgroundColor: role === r.key
                          ? `color-mix(in srgb, ${r.color} 12%, transparent)`
                          : 'var(--bg-elevated)',
                        color:           role === r.key ? r.color : 'var(--text-tertiary)',
                        fontFamily:      'var(--font-mono)',
                        fontSize:        '10px',
                        letterSpacing:   '0.06em',
                        fontWeight:      700,
                        cursor:          'pointer',
                        textAlign:       'center',
                        transition:      'var(--transition-fast)',
                        boxShadow:       role === r.key
                          ? `0 0 8px color-mix(in srgb, ${r.color} 25%, transparent)`
                          : 'none',
                      }}
                    >
                      <div>{r.label}</div>
                      <div style={{
                        fontSize:      '9px',
                        fontWeight:    400,
                        color:         role === r.key ? r.color : 'var(--text-tertiary)',
                        marginTop:     '3px',
                        letterSpacing: '0.02em',
                        opacity:       0.8,
                      }}>
                        {r.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

              <Field
                label="HANDLE"
                type="text"
                placeholder="e.g. volt_rack"
                value={handle}
                onChange={v => { setHandle(v); setState('idle'); setErrorMsg(''); }}
                onEnter={handleSubmit}
                disabled={state === 'submitting'}
                hasError={state === 'error'}
              />

            {/* Password */}
            <Field
              label="PASSWORD"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={v => { setPassword(v); setState('idle'); setErrorMsg(''); }}
              onEnter={handleSubmit}
              disabled={state === 'submitting'}
              hasError={state === 'error'}
            />

            {/* Error */}
            {state === 'error' && (
              <p style={{
                fontSize:   '11px',
                color:      'var(--accent-red)',
                fontFamily: 'var(--font-mono)',
                marginTop:  '-6px',
              }}>
                ✕ {errorMsg}
              </p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={state === 'submitting'}
              style={{
                width:           '100%',
                padding:         '12px',
                backgroundColor: state === 'submitting'
                  ? 'var(--bg-elevated)'
                  : activeRole.color,
                border:          'none',
                borderRadius:    '6px',
                color:           state === 'submitting' ? activeRole.color : '#000',
                fontSize:        '13px',
                fontWeight:      700,
                fontFamily:      'var(--font-mono)',
                cursor:          state === 'submitting' ? 'not-allowed' : 'pointer',
                letterSpacing:   '0.04em',
                boxShadow:       state === 'submitting'
                  ? 'none'
                  : `0 0 16px color-mix(in srgb, ${activeRole.color} 40%, transparent)`,
                transition:      'var(--transition-fast)',
              }}
            >
              {state === 'submitting'
                ? 'AUTHENTICATING...'
                : mode === 'signin'
                  ? 'SIGN IN →'
                  : `CREATE ${activeRole.label} ACCOUNT →`}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p style={{
          textAlign:  'center',
          fontSize:   '11px',
          color:      'var(--text-tertiary)',
          marginTop:  '20px',
          fontFamily: 'var(--font-mono)',
        }}>
          {'>'} AUCTION_TERMINAL v3.0 · ENCRYPTED
        </p>
      </div>
    </div>
  );
}

// ── Reusable field component ──────────────────────
function Field({
  label, type, placeholder, value, onChange, onEnter, disabled, hasError,
}: {
  label:       string;
  type:        string;
  placeholder: string;
  value:       string;
  onChange:    (v: string) => void;
  onEnter:     () => void;
  disabled:    boolean;
  hasError:    boolean;
}) {
  return (
    <div>
      <p style={{
        fontFamily:    'var(--font-mono)',
        fontSize:      '10px',
        letterSpacing: '0.07em',
        color:         'var(--text-tertiary)',
        marginBottom:  '8px',
      }}>
        {label}
      </p>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onEnter(); }}
        disabled={disabled}
        style={{
          width:           '100%',
          padding:         '10px 14px',
          backgroundColor: 'var(--bg-elevated)',
          border:          hasError
            ? '1px solid var(--accent-red)'
            : '1px solid var(--bg-border)',
          borderRadius:    '6px',
          color:           'var(--text-primary)',
          fontSize:        '13px',
          fontFamily:      'var(--font-mono)',
          outline:         'none',
          transition:      'var(--transition-fast)',
          boxSizing:       'border-box',
        }}
      />
    </div>
  );
}