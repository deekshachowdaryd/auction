'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/live/context/AuthContext';
import { useAuctions } from '@/app/live/context/AuctionContext';
import { supabase } from '@/lib/supabase';
import type { AuctionCategory, Auction } from '@/lib/types';

// ── Types ─────────────────────────────────────────
interface SellerListing {
  id:          string;
  title:       string;
  category:    string;
  current_bid: number;
  bid_count:   number;
  status:      string;
  ends_at:     number;
}

type Tab = 'listings' | 'create';

const CATEGORIES: AuctionCategory[] = [
  'Electronics', 'Digital Art', 'Rare Sneakers', 'Watches', 'Keyboards',
];

const STATUS_COLORS: Record<string, string> = {
  LIVE:     'var(--accent-green)',
  ENDING:   'var(--accent-amber)',
  UPCOMING: 'var(--accent-blue)',
  SOLD:     'var(--text-tertiary)',
  RESERVED: 'var(--accent-red)',
};

function formatPrice(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── ACCESS DENIED screen ──────────────────────────
function AccessDenied({ role }: { role: string }) {
  const router = useRouter();
  return (
    <div style={{
      minHeight:       '60vh',
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      justifyContent:  'center',
      gap:             '16px',
      textAlign:       'center',
    }}>
      <div style={{
        fontFamily:      'var(--font-mono)',
        fontSize:        '48px',
        color:           'var(--accent-red)',
        lineHeight:      1,
        marginBottom:    '8px',
      }}>✕</div>
      <p className="mono" style={{
        fontSize:        '18px',
        letterSpacing:   '0.12em',
        color:           'var(--accent-red)',
        fontWeight:      700,
      }}>
        ACCESS DENIED
      </p>
      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
        Seller dashboard requires a seller account.
      </p>
      <span className="mono" style={{
        fontSize:        '11px',
        color:           'var(--accent-red)',
        backgroundColor: 'color-mix(in srgb, var(--accent-red) 8%, transparent)',
        border:          '1px solid color-mix(in srgb, var(--accent-red) 25%, transparent)',
        padding:         '4px 14px',
        borderRadius:    '4px',
        letterSpacing:   '0.1em',
      }}>
        YOUR ROLE: {role.toUpperCase()}
      </span>
      <button
        onClick={() => router.push('/')}
        style={{
          marginTop:       '8px',
          padding:         '10px 24px',
          backgroundColor: 'var(--bg-elevated)',
          border:          'var(--border-default)',
          borderRadius:    '6px',
          color:           'var(--text-secondary)',
          fontFamily:      'var(--font-mono)',
          fontSize:        '11px',
          letterSpacing:   '0.06em',
          cursor:          'pointer',
        }}
      >
        ← BACK TO MARKET
      </button>
    </div>
  );
}

// ── Empty form state ──────────────────────────────
const EMPTY_FORM = {
  title:         '',
  subtitle:      '',
  category:      'Electronics' as AuctionCategory,
  startingPrice: '',
  reservePrice:  '',
  buyNowPrice:   '',
  endsInHours:   '24',
};

// ══════════════════════════════════════════════════
//  SELLER PAGE
// ══════════════════════════════════════════════════
export default function SellerPage() {
  const { user, profile, loading } = useAuth();
  const { dispatch }               = useAuctions();
  const router                     = useRouter();

  const [tab,       setTab]       = useState<Tab>('listings');
  const [listings,  setListings]  = useState<SellerListing[]>([]);
  const [fetching,  setFetching]  = useState(true);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formError, setFormError] = useState('');

  // ── Fetch seller's own listings ───────────────
  async function fetchListings() {
    if (!user) return;
    setFetching(true);
    const { data, error } = await supabase
      .from('auctions')
      .select('id, title, category, current_bid, bid_count, status, ends_at')
      .eq('seller_id', user.id)
      .order('ends_at', { ascending: true });

    if (!error && data) setListings(data);
    setFetching(false);
  }

  useEffect(() => { fetchListings(); }, [user]);

  // ── Loading / unauthed states ─────────────────
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <h2 className="mono" style={{ fontSize: '14px', letterSpacing: '0.08em' }}>AUTHENTICATING...</h2>
      </div>
    );
  }

  if (profile?.role && profile.role !== 'seller') {
    return <AccessDenied role={profile.role} />;
  }

  // ── Form helpers ──────────────────────────────
  function setField(key: keyof typeof EMPTY_FORM, val: string) {
    setForm(f => ({ ...f, [key]: val }));
    setFormState('idle');
    setFormError('');
  }

  function validateForm() {
    if (!form.title.trim())                    return 'Title is required.';
    if (!form.startingPrice || isNaN(Number(form.startingPrice)) || Number(form.startingPrice) <= 0)
      return 'Enter a valid starting price.';
    if (!form.reservePrice  || isNaN(Number(form.reservePrice))  || Number(form.reservePrice) <= 0)
      return 'Enter a valid reserve price.';
    if (Number(form.reservePrice) < Number(form.startingPrice))
      return 'Reserve price must be ≥ starting price.';
    if (!form.endsInHours   || isNaN(Number(form.endsInHours))  || Number(form.endsInHours) < 1)
      return 'Duration must be at least 1 hour.';
    return null;
  }

  // ── Create listing ────────────────────────────
  async function handleCreate() {
    const err = validateForm();
    if (err) { setFormError(err); setFormState('error'); return; }

    setFormState('submitting');
    const endsAt = Date.now() + Number(form.endsInHours) * 3_600_000;
    const id     = `auc_${Date.now().toString(36)}`;

    const { error } = await supabase.from('auctions').insert({
      id,
      title:         form.title.trim(),
      category:      form.category,
      current_bid:   Number(form.startingPrice),
      bid_count:     0,
      status:        'LIVE',
      ends_at:       endsAt,
      updated_at:    new Date().toISOString(),
      seller_id:     user!.id,
    });

    if (error) { setFormError(error.message); setFormState('error'); return; }

    // Locally dispatch exact mock so it's instantly available on the global Market feed
    const newAuction: Auction = {
      id,
      title:         form.title.trim(),
      subtitle:      'New Listing',
      category:      form.category,
      status:        'LIVE',
      currentBid:    Number(form.startingPrice),
      reservePrice:  Number(form.reservePrice),
      startingPrice: Number(form.startingPrice),
      buyNowPrice:   form.buyNowPrice ? Number(form.buyNowPrice) : null,
      bidCount:      0,
      watcherCount:  0,
      endsAt:        endsAt,
      startedAt:     Date.now(),
      imageUrl:      null,
      seller: {
        handle:     profile?.handle || 'me',
        reputation: 100,
        totalSales: 0,
      },
      specs:         {},
      recentBids:    [],
      priceHistory:  [{ t: Date.now(), price: Number(form.startingPrice) }],
      tags:          ['NEW LISTING'],
    };
    dispatch({ type: 'NEW_AUCTION', payload: newAuction });

    setFormState('success');
    setForm(EMPTY_FORM);
    await fetchListings();
    setTimeout(() => { setTab('listings'); setFormState('idle'); }, 1200);
  }

  // ── Edit listing ──────────────────────────────
  async function handleEdit(listing: SellerListing) {
    const err = validateForm();
    if (err) { setFormError(err); setFormState('error'); return; }

    setFormState('submitting');

    const { error } = await supabase.from('auctions').update({
      title:      form.title.trim(),
      category:   form.category,
      updated_at: new Date().toISOString(),
    }).eq('id', listing.id).eq('seller_id', user!.id);

    if (error) { setFormError(error.message); setFormState('error'); return; }

    setFormState('success');
    setEditId(null);
    await fetchListings();
    setTimeout(() => setFormState('idle'), 1000);
  }

  // ── Close auction ─────────────────────────────
  async function handleClose(id: string) {
    await supabase.from('auctions')
      .update({ status: 'SOLD', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('seller_id', user!.id);
    await fetchListings();
  }

  // ── Open edit form ────────────────────────────
  function openEdit(listing: SellerListing) {
    setEditId(listing.id);
    setForm({
      title:         listing.title,
      subtitle:      '',
      category:      listing.category as AuctionCategory,
      startingPrice: String(listing.current_bid),
      reservePrice:  String(listing.current_bid),
      buyNowPrice:   '',
      endsInHours:   '24',
    });
    setTab('create');
  }

  // ══════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 className="mono" style={{
            fontSize: '18px', fontWeight: 700,
            letterSpacing: '0.04em', color: 'var(--text-primary)',
          }}>
            SELLER DASHBOARD
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {profile?.handle} · {listings.length} listing{listings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <span className="mono" style={{
          fontSize: '11px', color: 'var(--accent-amber)', letterSpacing: '0.06em',
        }}>
          ● SELLER
        </span>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display:     'grid',
        gridTemplateColumns: '1fr 1fr',
        borderBottom: 'var(--border-subtle)',
        marginBottom: '4px',
      }}>
        {([['listings', 'MY LISTINGS'], ['create', editId ? 'EDIT LISTING' : 'CREATE LISTING']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === 'listings') { setEditId(null); setForm(EMPTY_FORM); setFormState('idle'); } }}
            style={{
              padding:         '12px',
              background:      'none',
              border:          'none',
              borderBottom:    tab === t
                ? '2px solid var(--accent-amber)'
                : '2px solid transparent',
              color:           tab === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontFamily:      'var(--font-mono)',
              fontSize:        '11px',
              letterSpacing:   '0.07em',
              cursor:          'pointer',
              transition:      'var(--transition-fast)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══ MY LISTINGS tab ══════════════════════ */}
      {tab === 'listings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

          {/* Column headers */}
          <div style={{
            display:             'grid',
            gridTemplateColumns: '1fr 100px 70px 140px 100px 120px',
            gap:                 '0 12px',
            padding:             '0 16px',
            fontSize:            '10px',
            letterSpacing:       '0.06em',
            color:               'var(--text-tertiary)',
          }}>
            <span>TITLE</span>
            <span style={{ textAlign: 'right' }}>CURRENT BID</span>
            <span style={{ textAlign: 'center' }}>BIDS</span>
            <span style={{ textAlign: 'center' }}>ENDS</span>
            <span style={{ textAlign: 'center' }}>STATUS</span>
            <span style={{ textAlign: 'center' }}>ACTIONS</span>
          </div>

          {fetching ? (
            <p className="mono" style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '24px 16px' }}>
              LOADING LISTINGS...
            </p>
          ) : listings.length === 0 ? (
            <div style={{
              padding:         '48px 16px',
              textAlign:       'center',
              backgroundColor: 'var(--bg-surface)',
              border:          'var(--border-subtle)',
              borderRadius:    '8px',
            }}>
              <p className="mono" style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px', letterSpacing: '0.06em' }}>
                NO LISTINGS YET
              </p>
              <button
                onClick={() => setTab('create')}
                style={{
                  padding:         '10px 24px',
                  backgroundColor: 'var(--accent-amber)',
                  border:          'none',
                  borderRadius:    '6px',
                  color:           '#000',
                  fontFamily:      'var(--font-mono)',
                  fontSize:        '11px',
                  fontWeight:      700,
                  letterSpacing:   '0.06em',
                  cursor:          'pointer',
                }}
              >
                CREATE FIRST LISTING →
              </button>
            </div>
          ) : listings.map(listing => {
            const statusColor = STATUS_COLORS[listing.status] ?? 'var(--text-tertiary)';
            const canClose    = listing.status === 'LIVE' || listing.status === 'ENDING' || listing.status === 'UPCOMING';

            return (
              <div
                key={listing.id}
                style={{
                  display:             'grid',
                  gridTemplateColumns: '1fr 100px 70px 140px 100px 120px',
                  gap:                 '0 12px',
                  alignItems:          'center',
                  padding:             '14px 16px',
                  backgroundColor:     'var(--bg-surface)',
                  border:              'var(--border-subtle)',
                  borderRadius:        '6px',
                }}
              >
                {/* Title */}
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    fontSize:     '13px',
                    fontWeight:   500,
                    color:        'var(--text-primary)',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                  }}>
                    {listing.title}
                  </p>
                  <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {listing.category} · {listing.id}
                  </p>
                </div>

                {/* Current bid */}
                <span className="mono" style={{
                  color: 'var(--accent-green)', fontSize: '13px',
                  fontWeight: 600, textAlign: 'right',
                }}>
                  ${formatPrice(listing.current_bid)}
                </span>

                {/* Bid count */}
                <span className="mono" style={{
                  color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center',
                }}>
                  {listing.bid_count}
                </span>

                {/* Ends at */}
                <span className="mono" style={{
                  color: 'var(--text-tertiary)', fontSize: '10px', textAlign: 'center',
                }}>
                  {formatDate(listing.ends_at)}
                </span>

                {/* Status */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span className="mono" style={{
                    color:           statusColor,
                    backgroundColor: `color-mix(in srgb, ${statusColor} 10%, transparent)`,
                    border:          `1px solid color-mix(in srgb, ${statusColor} 30%, transparent)`,
                    padding:         '3px 10px',
                    borderRadius:    '4px',
                    fontSize:        '9px',
                    letterSpacing:   '0.08em',
                    fontWeight:      600,
                  }}>
                    {listing.status}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                  <button
                    onClick={() => openEdit(listing)}
                    style={{
                      padding:         '4px 10px',
                      backgroundColor: 'var(--bg-elevated)',
                      border:          'var(--border-subtle)',
                      borderRadius:    '4px',
                      color:           'var(--text-secondary)',
                      fontFamily:      'var(--font-mono)',
                      fontSize:        '9px',
                      letterSpacing:   '0.05em',
                      cursor:          'pointer',
                    }}
                  >
                    EDIT
                  </button>
                  {canClose && (
                    <button
                      onClick={() => handleClose(listing.id)}
                      style={{
                        padding:         '4px 10px',
                        backgroundColor: 'color-mix(in srgb, var(--accent-red) 10%, transparent)',
                        border:          '1px solid color-mix(in srgb, var(--accent-red) 25%, transparent)',
                        borderRadius:    '4px',
                        color:           'var(--accent-red)',
                        fontFamily:      'var(--font-mono)',
                        fontSize:        '9px',
                        letterSpacing:   '0.05em',
                        cursor:          'pointer',
                      }}
                    >
                      CLOSE
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ CREATE / EDIT tab ════════════════════ */}
      {tab === 'create' && (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border:          'var(--border-subtle)',
          borderRadius:    '8px',
          overflow:        'hidden',
          maxWidth:        '560px',
        }}>
          {/* Card header */}
          <div style={{
            padding:         '14px 20px',
            borderBottom:    'var(--border-subtle)',
            backgroundColor: 'var(--bg-elevated)',
            fontSize:        '11px',
            letterSpacing:   '0.07em',
            color:           'var(--text-tertiary)',
            fontFamily:      'var(--font-mono)',
          }}>
            {editId ? `EDITING — ${editId.toUpperCase()}` : 'NEW LISTING'}
          </div>

          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Title */}
            <FormField label="TITLE" required>
              <input
                type="text"
                placeholder="e.g. Apple MacBook Pro M3 Max"
                value={form.title}
                onChange={e => setField('title', e.target.value)}
                style={inputStyle(formState === 'error' && !form.title)}
              />
            </FormField>

            {/* Subtitle */}
            <FormField label="SUBTITLE">
              <input
                type="text"
                placeholder="e.g. 16-inch · 36GB RAM · Space Black"
                value={form.subtitle}
                onChange={e => setField('subtitle', e.target.value)}
                style={inputStyle(false)}
              />
            </FormField>

            {/* Category */}
            <FormField label="CATEGORY" required>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setField('category', cat)}
                    style={{
                      padding:         '6px 12px',
                      borderRadius:    '4px',
                      border:          form.category === cat
                        ? '1px solid var(--accent-amber)'
                        : 'var(--border-subtle)',
                      backgroundColor: form.category === cat
                        ? 'color-mix(in srgb, var(--accent-amber) 12%, transparent)'
                        : 'var(--bg-elevated)',
                      color:           form.category === cat
                        ? 'var(--accent-amber)'
                        : 'var(--text-tertiary)',
                      fontFamily:      'var(--font-mono)',
                      fontSize:        '10px',
                      letterSpacing:   '0.05em',
                      cursor:          'pointer',
                      transition:      'var(--transition-fast)',
                    }}
                  >
                    {cat.toUpperCase()}
                  </button>
                ))}
              </div>
            </FormField>

            {/* Prices row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <FormField label="STARTING PRICE" required>
                <PriceInput
                  value={form.startingPrice}
                  onChange={v => setField('startingPrice', v)}
                  hasError={formState === 'error' && !form.startingPrice}
                />
              </FormField>
              <FormField label="RESERVE PRICE" required>
                <PriceInput
                  value={form.reservePrice}
                  onChange={v => setField('reservePrice', v)}
                  hasError={formState === 'error' && !form.reservePrice}
                />
              </FormField>
              <FormField label="BUY NOW (optional)">
                <PriceInput
                  value={form.buyNowPrice}
                  onChange={v => setField('buyNowPrice', v)}
                  hasError={false}
                />
              </FormField>
            </div>

            {/* Duration */}
            {!editId && (
              <FormField label="DURATION (HOURS)" required>
                <input
                  type="number"
                  min="1"
                  max="168"
                  placeholder="24"
                  value={form.endsInHours}
                  onChange={e => setField('endsInHours', e.target.value)}
                  style={inputStyle(formState === 'error' && !form.endsInHours)}
                />
              </FormField>
            )}

            {/* Error */}
            {formState === 'error' && (
              <p style={{
                fontSize: '12px', color: 'var(--accent-red)',
                fontFamily: 'var(--font-mono)',
              }}>
                ✕ {formError}
              </p>
            )}

            {/* Submit */}
            {formState === 'success' ? (
              <div style={{
                padding:         '12px',
                backgroundColor: 'color-mix(in srgb, var(--accent-green) 10%, transparent)',
                border:          '1px solid color-mix(in srgb, var(--accent-green) 30%, transparent)',
                borderRadius:    '6px',
                color:           'var(--accent-green)',
                fontFamily:      'var(--font-mono)',
                fontSize:        '12px',
                textAlign:       'center',
                letterSpacing:   '0.06em',
              }}>
                ✓ {editId ? 'LISTING UPDATED' : 'LISTING CREATED'}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                {editId && (
                  <button
                    onClick={() => { setEditId(null); setForm(EMPTY_FORM); setTab('listings'); }}
                    style={{
                      flex:            1,
                      padding:         '12px',
                      backgroundColor: 'var(--bg-elevated)',
                      border:          'var(--border-default)',
                      borderRadius:    '6px',
                      color:           'var(--text-secondary)',
                      fontFamily:      'var(--font-mono)',
                      fontSize:        '12px',
                      cursor:          'pointer',
                      letterSpacing:   '0.04em',
                    }}
                  >
                    CANCEL
                  </button>
                )}
                <button
                  onClick={() => {
                    const listing = listings.find(l => l.id === editId);
                    listing ? handleEdit(listing) : handleCreate();
                  }}
                  disabled={formState === 'submitting'}
                  style={{
                    flex:            2,
                    padding:         '12px',
                    backgroundColor: formState === 'submitting'
                      ? 'var(--bg-elevated)'
                      : 'var(--accent-amber)',
                    border:          'none',
                    borderRadius:    '6px',
                    color:           formState === 'submitting' ? 'var(--accent-amber)' : '#000',
                    fontSize:        '13px',
                    fontWeight:      700,
                    fontFamily:      'var(--font-mono)',
                    cursor:          formState === 'submitting' ? 'not-allowed' : 'pointer',
                    letterSpacing:   '0.04em',
                    transition:      'var(--transition-fast)',
                  }}
                >
                  {formState === 'submitting'
                    ? 'SUBMITTING...'
                    : editId
                      ? 'SAVE CHANGES →'
                      : 'CREATE LISTING →'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small layout helpers ──────────────────────────
function FormField({ label, required, children }: {
  label:    string;
  required?: boolean;
  children: React.ReactNode;
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
        {label}{required && <span style={{ color: 'var(--accent-amber)', marginLeft: '4px' }}>*</span>}
      </p>
      {children}
    </div>
  );
}

function PriceInput({ value, onChange, hasError }: {
  value:    string;
  onChange: (v: string) => void;
  hasError: boolean;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position:  'absolute', left: '10px', top: '50%',
        transform: 'translateY(-50%)',
        color:     'var(--text-secondary)', fontSize: '13px',
        fontFamily:'var(--font-mono)',
      }}>$</span>
      <input
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        style={inputStyle(hasError, true)}
      />
    </div>
  );
}

function inputStyle(hasError: boolean, hasDollar = false): React.CSSProperties {
  return {
    width:           '100%',
    padding:         hasDollar ? '10px 12px 10px 22px' : '10px 12px',
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
    boxSizing:       'border-box' as const,
  };
}