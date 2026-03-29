'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/live/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface Transaction {
  id:         string;
  type:       'deposit' | 'withdrawal' | 'bid';
  amount:     number;
  created_at: string;
  note:       string;
}

function formatPrice(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(s: string) {
  return new Date(s).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

export default function WalletPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();

  const [tab,       setTab]       = useState<'deposit' | 'withdraw'>('deposit');
  const [amount,    setAmount]    = useState('');
  const [txState,   setTxState]   = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg,  setErrorMsg]  = useState('');
  const [txHistory, setTxHistory] = useState<Transaction[]>([]);
  const [fetching,  setFetching]  = useState(true);

  // ── Redirect if not logged in ─────────────────
  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user]);

  // ── Fetch transaction history from bids table ─
  async function fetchHistory() {
    if (!user) return;
    setFetching(true);

    const { data } = await supabase
      .from('bids')
      .select('id, amount, placed_at, auction_id')
      .eq('user_id', user.id)
      .order('placed_at', { ascending: false })
      .limit(20);

    if (data) {
      setTxHistory(data.map(b => ({
        id:         b.id,
        type:       'bid',
        amount:     b.amount,
        created_at: b.placed_at,
        note:       `Bid on ${b.auction_id}`,
      })));
    }

    setFetching(false);
  }

  useEffect(() => { fetchHistory(); }, [user]);

  if (loading || !user) return null;

  // ── Submit deposit / withdrawal ───────────────
  async function handleSubmit() {
    const parsed = parseFloat(amount);

    if (!amount || isNaN(parsed) || parsed <= 0) {
      setErrorMsg('Enter a valid amount greater than 0.');
      setTxState('error');
      return;
    }

    if (tab === 'withdraw') {
      const balance = profile?.balance ?? 0;
      if (parsed > balance) {
        setErrorMsg(`Insufficient balance. Available: $${formatPrice(balance)}`);
        setTxState('error');
        return;
      }
    }

    setTxState('submitting');

    const delta = tab === 'deposit' ? parsed : -parsed;

    const { error } = await supabase
      .from('users')
      .update({ balance: (profile?.balance ?? 0) + delta })
      .eq('id', user!.id);

    if (error) {
      setErrorMsg('Transaction failed. Please try again.');
      setTxState('error');
      return;
    }

    await refreshProfile();
    setTxState('success');
    setAmount('');
    setTimeout(() => setTxState('idle'), 2000);
  }

  const balanceColor = (profile?.balance ?? 0) < 500
    ? 'var(--accent-red)'
    : (profile?.balance ?? 0) < 2000
      ? 'var(--accent-amber)'
      : 'var(--accent-green)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 className="mono" style={{
            fontSize: '18px', fontWeight: 700,
            letterSpacing: '0.04em', color: 'var(--text-primary)',
          }}>
            WALLET
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {profile?.handle} · manage your balance
          </p>
        </div>
        <span className="mono" style={{ fontSize: '11px', color: 'var(--accent-green)', letterSpacing: '0.06em' }}>
          ● LIVE BALANCE
        </span>
      </div>

      {/* ── Two column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', alignItems: 'start' }}>

        {/* ══ LEFT — transaction form ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Balance card */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border:          'var(--border-subtle)',
            borderRadius:    '8px',
            overflow:        'hidden',
          }}>
            <div style={{
              padding: '14px 20px', borderBottom: 'var(--border-subtle)',
              fontSize: '11px', letterSpacing: '0.06em',
              color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
            }}>
              AVAILABLE BALANCE
            </div>
            <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span className="mono" style={{
                fontSize: '42px', fontWeight: 700,
                color: balanceColor, letterSpacing: '-0.02em', lineHeight: 1,
              }}>
                ${formatPrice(profile?.balance ?? 0)}
              </span>
              {(profile?.balance ?? 0) < 500 && (
                <span className="mono" style={{
                  fontSize: '10px', color: 'var(--accent-red)',
                  backgroundColor: 'color-mix(in srgb, var(--accent-red) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent-red) 25%, transparent)',
                  padding: '3px 8px', borderRadius: '3px', letterSpacing: '0.08em',
                }}>
                  LOW BALANCE
                </span>
              )}
            </div>
          </div>

          {/* Deposit / Withdraw form */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border:          'var(--border-subtle)',
            borderRadius:    '8px',
            overflow:        'hidden',
          }}>
            {/* Tab toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: 'var(--border-subtle)' }}>
              {(['deposit', 'withdraw'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setTxState('idle'); setErrorMsg(''); setAmount(''); }}
                  style={{
                    padding:      '13px',
                    background:   'none',
                    border:       'none',
                    borderBottom: tab === t
                      ? `2px solid ${t === 'deposit' ? 'var(--accent-green)' : 'var(--accent-red)'}`
                      : '2px solid transparent',
                    color:           tab === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontFamily:      'var(--font-mono)',
                    fontSize:        '11px',
                    letterSpacing:   '0.08em',
                    cursor:          'pointer',
                    transition:      'var(--transition-fast)',
                    backgroundColor: tab === t ? 'var(--bg-elevated)' : 'transparent',
                  }}
                >
                  {t === 'deposit' ? '↓ DEPOSIT' : '↑ WITHDRAW'}
                </button>
              ))}
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Quick amounts */}
              <div>
                <p style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px',
                  letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: '8px',
                }}>
                  QUICK SELECT
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {QUICK_AMOUNTS.map(q => (
                    <button
                      key={q}
                      onClick={() => { setAmount(String(q)); setTxState('idle'); setErrorMsg(''); }}
                      style={{
                        flex:            1,
                        padding:         '8px 4px',
                        borderRadius:    '4px',
                        border:          amount === String(q)
                          ? `1px solid ${tab === 'deposit' ? 'var(--accent-green)' : 'var(--accent-red)'}`
                          : 'var(--border-subtle)',
                        backgroundColor: amount === String(q)
                          ? `color-mix(in srgb, ${tab === 'deposit' ? 'var(--accent-green)' : 'var(--accent-red)'} 10%, transparent)`
                          : 'var(--bg-elevated)',
                        color:           amount === String(q)
                          ? tab === 'deposit' ? 'var(--accent-green)' : 'var(--accent-red)'
                          : 'var(--text-tertiary)',
                        fontFamily:      'var(--font-mono)',
                        fontSize:        '11px',
                        cursor:          'pointer',
                        transition:      'var(--transition-fast)',
                      }}
                    >
                      ${q.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount input */}
              <div>
                <p style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px',
                  letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: '8px',
                }}>
                  CUSTOM AMOUNT
                </p>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '12px', top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)', fontSize: '14px', fontFamily: 'var(--font-mono)',
                  }}>$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => {
                      setAmount(e.target.value.replace(/[^0-9.]/g, ''));
                      setTxState('idle');
                      setErrorMsg('');
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                    style={{
                      width:           '100%',
                      padding:         '12px 12px 12px 26px',
                      backgroundColor: 'var(--bg-elevated)',
                      border:          txState === 'error'
                        ? '1px solid var(--accent-red)'
                        : '1px solid var(--bg-border)',
                      borderRadius:    '6px',
                      color:           'var(--text-primary)',
                      fontSize:        '18px',
                      fontFamily:      'var(--font-mono)',
                      outline:         'none',
                      transition:      'var(--transition-fast)',
                      boxSizing:       'border-box',
                    }}
                  />
                </div>
                {txState === 'error' && (
                  <p style={{
                    fontSize: '11px', color: 'var(--accent-red)',
                    fontFamily: 'var(--font-mono)', marginTop: '6px',
                  }}>
                    ✕ {errorMsg}
                  </p>
                )}
              </div>

              {/* Submit button */}
              {txState === 'success' ? (
                <div style={{
                  padding:         '13px',
                  backgroundColor: 'color-mix(in srgb, var(--accent-green) 10%, transparent)',
                  border:          '1px solid color-mix(in srgb, var(--accent-green) 30%, transparent)',
                  borderRadius:    '6px',
                  color:           'var(--accent-green)',
                  fontFamily:      'var(--font-mono)',
                  fontSize:        '12px',
                  textAlign:       'center',
                  letterSpacing:   '0.06em',
                }}>
                  ✓ {tab === 'deposit' ? 'DEPOSIT' : 'WITHDRAWAL'} SUCCESSFUL
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={txState === 'submitting'}
                  style={{
                    width:           '100%',
                    padding:         '13px',
                    backgroundColor: txState === 'submitting'
                      ? 'var(--bg-elevated)'
                      : tab === 'deposit'
                        ? 'var(--accent-green)'
                        : 'var(--accent-red)',
                    border:          'none',
                    borderRadius:    '6px',
                    color:           txState === 'submitting'
                      ? tab === 'deposit' ? 'var(--accent-green)' : 'var(--accent-red)'
                      : '#000',
                    fontSize:        '13px',
                    fontWeight:      700,
                    fontFamily:      'var(--font-mono)',
                    cursor:          txState === 'submitting' ? 'not-allowed' : 'pointer',
                    letterSpacing:   '0.04em',
                    boxShadow:       txState === 'submitting' ? 'none'
                      : tab === 'deposit'
                        ? 'var(--glow-green)'
                        : '0 0 16px color-mix(in srgb, var(--accent-red) 40%, transparent)',
                    transition:      'var(--transition-fast)',
                  }}
                >
                  {txState === 'submitting'
                    ? 'PROCESSING...'
                    : tab === 'deposit'
                      ? `DEPOSIT $${amount ? parseFloat(amount).toLocaleString() : '0'} →`
                      : `WITHDRAW $${amount ? parseFloat(amount).toLocaleString() : '0'} →`}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ══ RIGHT — bid history ══ */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border:          'var(--border-subtle)',
          borderRadius:    '8px',
          overflow:        'hidden',
          position:        'sticky',
          top:             '100px',
        }}>
          <div style={{
            padding:         '14px 20px',
            borderBottom:    'var(--border-subtle)',
            backgroundColor: 'var(--bg-elevated)',
            fontSize:        '11px',
            letterSpacing:   '0.07em',
            color:           'var(--text-tertiary)',
            fontFamily:      'var(--font-mono)',
          }}>
            RECENT BID HISTORY
          </div>

          <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
            {fetching ? (
              <p className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '24px 20px', letterSpacing: '0.06em' }}>
                LOADING...
              </p>
            ) : txHistory.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '32px 20px', textAlign: 'center' }}>
                No bids placed yet.
              </p>
            ) : txHistory.map((tx, i) => (
              <div
                key={tx.id}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'space-between',
                  padding:      '12px 20px',
                  borderBottom: i < txHistory.length - 1 ? 'var(--border-subtle)' : 'none',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="mono" style={{
                    fontSize: '10px', color: 'var(--accent-red)',
                    letterSpacing: '0.06em',
                  }}>
                    ↑ BID PLACED
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {tx.note}
                  </span>
                  <span className="mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                    {formatDate(tx.created_at)}
                  </span>
                </div>
                <span className="mono" style={{
                  fontSize: '13px', fontWeight: 600, color: 'var(--accent-red)',
                }}>
                  −${formatPrice(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}