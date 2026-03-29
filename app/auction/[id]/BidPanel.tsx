'use client';
// ═══════════════════════════════════════════════════
//  BID PANEL — Client Component
// ═══════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import type { Auction } from '@/lib/types';
import { useWatchlist } from '@/lib/hooks/useWatchlist';
import { useAuctions }  from '@/app/live/context/AuctionContext';
import { supabase }     from '@/lib/supabase';
import { useMyBids }    from '@/app/live/context/MyBidsContext';
import { useAuth }      from '@/app/live/context/AuthContext';
import { useRouter }    from 'next/navigation';

function formatPrice(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function useCountdown(endsAt: number) {
  const [diff, setDiff] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setDiff(endsAt - Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (diff === null) return { h: 0, m: 0, s: 0, ended: false, loading: true };
  if (diff <= 0)     return { h: 0, m: 0, s: 0, ended: true,  loading: false };
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { h, m, s, ended: false, loading: false };
}

export default function BidPanel({ auction }: { auction: Auction }) {
  const [bidAmount,   setBidAmount]   = useState('');
  const [bidState,    setBidState]    = useState
    <'idle' | 'confirm' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg,    setErrorMsg]    = useState('');
  // 'sold' is the new terminal state after a successful Buy Now
  const [buyNowState, setBuyNowState] = useState
    <'idle' | 'submitting' | 'sold'>('idle');
  const confirmedAmount = useRef<number>(0) as React.MutableRefObject<number>;

  const { user, profile, refreshProfile } = useAuth();
  const router             = useRouter();
  const countdown          = useCountdown(auction.endsAt);
  const { getAuction, dispatch }     = useAuctions();
  const liveAuction        = getAuction(auction.id) ?? auction;
  const { placeBid }       = useMyBids();
  const minNextBid         = Math.ceil(liveAuction.currentBid * 1.02);

  // Derive canBid from liveAuction.status so it reacts to AUCTION_SOLD dispatch
  const canBid   = liveAuction.status === 'LIVE' || liveAuction.status === 'ENDING';
  const isSold   = liveAuction.status === 'SOLD';
  const isEnding = liveAuction.status === 'ENDING';
  const { isWatching, toggleWatchlist, hydrated } = useWatchlist();
  const watching = hydrated && isWatching(auction.id);

  // ── Auth + role gate ──────────────────────────────
  if (!user) {
    return (
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border:          'var(--border-subtle)',
        borderRadius:    '8px',
        padding:         '32px 20px',
        textAlign:       'center',
        display:         'flex',
        flexDirection:   'column',
        gap:             '12px',
        alignItems:      'center',
      }}>
        <span style={{ fontSize: '24px' }}>🔒</span>
        <p className="mono" style={{ fontSize: '12px', color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>
          SIGN IN TO BID
        </p>
        <button
          onClick={() => router.push('/login')}
          style={{
            padding:         '10px 24px',
            backgroundColor: 'var(--accent-green)',
            border:          'none',
            borderRadius:    '6px',
            color:           '#000',
            fontSize:        '12px',
            fontWeight:      700,
            fontFamily:      'var(--font-mono)',
            cursor:          'pointer',
            letterSpacing:   '0.06em',
            boxShadow:       'var(--glow-green)',
          }}
        >
          SIGN IN →
        </button>
      </div>
    );
  }

  if (profile?.role && profile.role !== 'buyer') {
    return (
      <div style={{
        backgroundColor: 'color-mix(in srgb, var(--accent-red) 6%, var(--bg-surface))',
        border:          '1px solid color-mix(in srgb, var(--accent-red) 25%, transparent)',
        borderRadius:    '8px',
        padding:         '32px 20px',
        textAlign:       'center',
        display:         'flex',
        flexDirection:   'column',
        gap:             '10px',
        alignItems:      'center',
      }}>
        <span className="mono" style={{
          fontSize:      '11px',
          letterSpacing: '0.12em',
          color:         'var(--accent-red)',
          fontWeight:    700,
        }}>
          ✕ ACCESS DENIED
        </span>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          Only buyer accounts can place bids.
        </p>
        <span className="mono" style={{
          fontSize:        '10px',
          color:           'var(--accent-red)',
          backgroundColor: 'color-mix(in srgb, var(--accent-red) 8%, transparent)',
          border:          '1px solid color-mix(in srgb, var(--accent-red) 20%, transparent)',
          padding:         '3px 10px',
          borderRadius:    '3px',
          letterSpacing:   '0.08em',
        }}>
          ROLE: {profile.role.toUpperCase()}
        </span>
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────

  function handleBidInput(val: string) {
    setBidAmount(val.replace(/[^0-9.]/g, ''));
    setBidState('idle');
    setErrorMsg('');
  }

  function handlePlaceBid() {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount)) {
      setErrorMsg('Enter a valid amount.');
      setBidState('error');
      return;
    }
    confirmedAmount.current = amount;
    setBidState('confirm');
  }

  async function handleConfirm() {
    setBidState('submitting');

    const amount = confirmedAmount.current;
    if (!amount || isNaN(amount) || amount <= 0) {
      setErrorMsg('Invalid bid amount.');
      setBidState('error');
      return;
    }

    const { error } = await supabase.rpc('place_bid', {
      p_auction_id: auction.id,
      p_amount:     amount,
      p_bidder:     profile?.handle ?? 'anonymous',
      p_user_id:    user!.id,
    });

    if (error) {
      if (error.message.includes('INSUFFICIENT_FUNDS')) {
        setErrorMsg('Insufficient balance for this bid.');
      } else if (error.message.includes('BID_TOO_LOW')) {
        setErrorMsg(`Price moved. Minimum is now $${formatPrice(Math.ceil(liveAuction.currentBid * 1.02))}`);
      } else {
        setErrorMsg(error.message);
      }
      setBidState('error');
      return;
    }

    dispatch({
      type: 'BID_PLACED',
      payload: {
        auctionId: auction.id,
        newBid:    amount,
        bidder:    profile?.handle ?? 'anonymous',
      },
    });
    placeBid(liveAuction, amount);
    setBidState('success');
    setBidAmount('');
    await refreshProfile();
  }

  async function handleBuyNow() {
    const rawPrice = auction.buyNowPrice ?? liveAuction.buyNowPrice;
    if (!rawPrice) return;

    setBuyNowState('submitting');

    const buyPrice = Math.max(rawPrice, liveAuction.currentBid + 1);

    const { error: bidError } = await supabase.rpc('place_bid', {
      p_auction_id: auction.id,
      p_amount:     buyPrice,
      p_bidder:     profile?.handle ?? 'anonymous',
      p_user_id:    user!.id,
      p_is_buy_now: true,
    });

    if (bidError) {
      setBuyNowState('idle');
      if (bidError.message.includes('INSUFFICIENT_FUNDS')) {
        setErrorMsg('Insufficient balance for Buy Now.');
      } else {
        setErrorMsg(bidError.message);
      }
      setBidState('error');
      return;
    }

    // Mark SOLD in DB — Buy Now ends the auction immediately for everyone
    await supabase
      .from('auctions')
      .update({ status: 'SOLD', updated_at: new Date().toISOString() })
      .eq('id', auction.id);

    // Dispatch AUCTION_SOLD so the UI reacts immediately without waiting
    // for a Realtime event — canBid flips to false, bid input disappears,
    // Buy Now card disappears, and the sold banner renders instantly.
    dispatch({
      type: 'AUCTION_SOLD',
      payload: {
        auctionId:  auction.id,
        finalPrice: buyPrice,
        buyer:      profile?.handle ?? 'anonymous',
      },
    });

    placeBid(liveAuction, buyPrice);
    await refreshProfile();
    setBuyNowState('sold');
  }

  // ── Render ────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'sticky', top: '100px' }}>

      {/* ── Current bid / final price card ── */}
      <div style={{
        backgroundColor: isSold
          ? 'color-mix(in srgb, var(--accent-green) 6%, var(--bg-surface))'
          : 'var(--bg-surface)',
        border:          isSold
          ? '1px solid color-mix(in srgb, var(--accent-green) 30%, transparent)'
          : 'var(--border-subtle)',
        borderRadius:    '8px',
        overflow:        'hidden',
      }}>
        <div style={{
          padding:      '14px 20px',
          borderBottom: 'var(--border-subtle)',
          fontSize:     '11px',
          letterSpacing:'0.06em',
          color:        isSold ? 'var(--accent-green)' : 'var(--text-tertiary)',
        }}>
          {isSold ? '✓ SOLD' : 'CURRENT BID'}
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div className="mono" style={{
            fontSize:      '32px',
            fontWeight:    700,
            color:         'var(--accent-green)',
            letterSpacing: '-0.02em',
            lineHeight:    1,
          }}>
            ${formatPrice(liveAuction.currentBid)}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
            {isSold
              ? 'Auction closed · Final price'
              : `${liveAuction.bidCount} bids · ${liveAuction.watcherCount} watching`
            }
          </p>
        </div>
      </div>

      {/* ── You won this auction banner (Buy Now success) ── */}
      {buyNowState === 'sold' && (
        <div style={{
          backgroundColor: 'color-mix(in srgb, var(--accent-green) 10%, var(--bg-surface))',
          border:          '1px solid color-mix(in srgb, var(--accent-green) 40%, transparent)',
          borderRadius:    '8px',
          padding:         '20px',
          display:         'flex',
          flexDirection:   'column',
          gap:             '8px',
          alignItems:      'center',
          textAlign:       'center',
          boxShadow:       'var(--glow-green)',
        }}>
          <span style={{ fontSize: '28px' }}>🏆</span>
          <span className="mono" style={{
            fontSize:      '13px',
            fontWeight:    700,
            color:         'var(--accent-green)',
            letterSpacing: '0.08em',
          }}>
            AUCTION WON
          </span>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            You purchased this item via Buy Now for{' '}
            <span className="mono" style={{ color: 'var(--accent-green)', fontWeight: 700 }}>
              ${formatPrice(Math.max(auction.buyNowPrice ?? 0, liveAuction.currentBid))}
            </span>
            . Your balance has been updated.
          </p>
        </div>
      )}

      {/* ── Watchlist toggle ── */}
      <button
        onClick={() => toggleWatchlist(auction.id)}
        style={{
          width:           '100%',
          padding:         '10px 16px',
          backgroundColor: watching ? 'var(--accent-green-muted)' : 'var(--bg-surface)',
          border:          watching
            ? '1px solid color-mix(in srgb, var(--accent-green) 30%, transparent)'
            : 'var(--border-subtle)',
          borderRadius:    '8px',
          color:           watching ? 'var(--accent-green)' : 'var(--text-secondary)',
          fontSize:        '12px',
          fontFamily:      'var(--font-mono)',
          letterSpacing:   '0.06em',
          cursor:          'pointer',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          gap:             '8px',
          transition:      'var(--transition-fast)',
        }}
      >
        <span style={{ fontSize: '14px' }}>{watching ? '★' : '☆'}</span>
        {watching ? 'WATCHING' : 'ADD TO WATCHLIST'}
        {watching && (
          <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '4px' }}>
            (click to remove)
          </span>
        )}
      </button>

      {/* ── Countdown card — hidden once sold ── */}
      {canBid && (
        <div style={{
          backgroundColor: isEnding ? 'var(--accent-amber-glow)' : 'var(--bg-surface)',
          border:          `1px solid ${isEnding ? 'color-mix(in srgb, var(--accent-amber) 30%, transparent)' : 'var(--bg-border)'}`,
          borderRadius:    '8px',
          padding:         '14px 20px',
        }}>
          <p style={{
            fontSize:     '11px',
            letterSpacing:'0.06em',
            color:        isEnding ? 'var(--accent-amber)' : 'var(--text-tertiary)',
            marginBottom: '10px',
          }}>
            {isEnding ? '⚡ ENDING SOON' : 'TIME REMAINING'}
          </p>
          {countdown.loading ? (
            <span className="mono" style={{ fontSize: '18px', color: 'var(--text-tertiary)' }}>
              --:--:--
            </span>
          ) : countdown.ended ? (
            <span className="mono" style={{ fontSize: '18px', color: 'var(--text-tertiary)' }}>
              AUCTION ENDED
            </span>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
              {[
                { val: countdown.h, label: 'HRS' },
                { val: countdown.m, label: 'MIN' },
                { val: countdown.s, label: 'SEC' },
              ].map(({ val, label }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div className="mono" style={{
                    fontSize:        '28px',
                    fontWeight:      700,
                    color:           isEnding ? 'var(--accent-amber)' : 'var(--text-primary)',
                    backgroundColor: 'var(--bg-elevated)',
                    border:          'var(--border-subtle)',
                    borderRadius:    '6px',
                    padding:         '8px 12px',
                    minWidth:        '54px',
                    textAlign:       'center',
                    lineHeight:      1,
                    letterSpacing:   '-0.02em',
                  }}>
                    {String(val).padStart(2, '0')}
                  </div>
                  <div style={{
                    fontSize:     '9px',
                    color:        'var(--text-tertiary)',
                    letterSpacing:'0.08em',
                    marginTop:    '4px',
                  }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Bid input card — hidden once sold ── */}
      {canBid && !countdown.ended && (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border:          'var(--border-subtle)',
          borderRadius:    '8px',
          overflow:        'hidden',
        }}>
          <div style={{
            padding:      '14px 20px',
            borderBottom: 'var(--border-subtle)',
            fontSize:     '11px',
            letterSpacing:'0.06em',
            color:        'var(--text-tertiary)',
          }}>
            PLACE BID
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              Minimum next bid:{' '}
              <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                ${formatPrice(minNextBid)}
              </span>
            </p>

            <div style={{ position: 'relative' }}>
              <span style={{
                position:  'absolute',
                left:      '12px',
                top:       '50%',
                transform: 'translateY(-50%)',
                color:     'var(--text-secondary)',
                fontSize:  '14px',
                fontFamily:'var(--font-mono)',
              }}>
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder={String(minNextBid)}
                value={bidAmount}
                onChange={e => handleBidInput(e.target.value)}
                disabled={bidState === 'submitting' || bidState === 'success'}
                style={{
                  width:           '100%',
                  padding:         '10px 12px 10px 24px',
                  backgroundColor: 'var(--bg-elevated)',
                  border:          bidState === 'error'
                    ? '1px solid var(--accent-red)'
                    : '1px solid var(--bg-border)',
                  borderRadius:    '6px',
                  color:           'var(--text-primary)',
                  fontSize:        '15px',
                  fontFamily:      'var(--font-mono)',
                  outline:         'none',
                  transition:      'var(--transition-fast)',
                }}
                className="bid-input"
              />
            </div>

            {bidState === 'error' && (
              <p style={{ fontSize: '11px', color: 'var(--accent-red)', marginTop: '-4px' }}>
                {errorMsg}
              </p>
            )}

            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { label: `+$${Math.round(liveAuction.currentBid * 0.02)}`, inc: 0.02 },
                { label: `+$${Math.round(liveAuction.currentBid * 0.05)}`, inc: 0.05 },
                { label: `+$${Math.round(liveAuction.currentBid * 0.10)}`, inc: 0.10 },
              ].map(({ label, inc }) => (
                <button
                  key={label}
                  onClick={() => {
                    const next = Math.ceil(liveAuction.currentBid * (1 + inc));
                    setBidAmount(String(next));
                    setBidState('idle');
                    setErrorMsg('');
                  }}
                  style={{
                    flex:            1,
                    padding:         '6px 4px',
                    backgroundColor: 'var(--bg-elevated)',
                    border:          'var(--border-subtle)',
                    borderRadius:    '4px',
                    color:           'var(--text-secondary)',
                    fontSize:        '11px',
                    fontFamily:      'var(--font-mono)',
                    cursor:          'pointer',
                  }}
                  className="quick-btn"
                >
                  {label}
                </button>
              ))}
            </div>

            {bidState === 'confirm' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{
                  fontSize:        '12px',
                  color:           'var(--accent-amber)',
                  backgroundColor: 'var(--accent-amber-glow)',
                  border:          '1px solid color-mix(in srgb, var(--accent-amber) 30%, transparent)',
                  padding:         '8px 12px',
                  borderRadius:    '4px',
                }}>
                  Confirm bid of{' '}
                  <span className="mono" style={{ fontWeight: 700 }}>
                    ${formatPrice(confirmedAmount.current)}
                  </span>
                  ? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setBidState('idle')}
                    style={{
                      flex:            1,
                      padding:         '10px',
                      backgroundColor: 'var(--bg-elevated)',
                      border:          'var(--border-default)',
                      borderRadius:    '6px',
                      color:           'var(--text-secondary)',
                      fontSize:        '12px',
                      cursor:          'pointer',
                    }}
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleConfirm}
                    style={{
                      flex:            2,
                      padding:         '10px',
                      backgroundColor: 'var(--accent-green)',
                      border:          'none',
                      borderRadius:    '6px',
                      color:           '#000',
                      fontSize:        '13px',
                      fontWeight:      700,
                      fontFamily:      'var(--font-mono)',
                      cursor:          'pointer',
                      letterSpacing:   '0.04em',
                    }}
                  >
                    CONFIRM BID
                  </button>
                </div>
              </div>
            ) : bidState === 'submitting' ? (
              <button disabled style={{
                width:           '100%',
                padding:         '12px',
                backgroundColor: 'var(--bg-elevated)',
                border:          'var(--border-subtle)',
                borderRadius:    '6px',
                color:           'var(--accent-green)',
                fontSize:        '13px',
                fontFamily:      'var(--font-mono)',
                letterSpacing:   '0.04em',
                cursor:          'not-allowed',
              }}>
                SUBMITTING...
              </button>
            ) : bidState === 'success' ? (
              <div style={{
                padding:         '12px',
                backgroundColor: 'var(--accent-green-muted)',
                border:          '1px solid color-mix(in srgb, var(--accent-green) 30%, transparent)',
                borderRadius:    '6px',
                color:           'var(--accent-green)',
                fontSize:        '13px',
                fontFamily:      'var(--font-mono)',
                textAlign:       'center',
                letterSpacing:   '0.04em',
              }}>
                ✓ BID PLACED SUCCESSFULLY
              </div>
            ) : (
              <button
                onClick={handlePlaceBid}
                style={{
                  width:           '100%',
                  padding:         '12px',
                  backgroundColor: 'var(--accent-green)',
                  border:          'none',
                  borderRadius:    '6px',
                  color:           '#000',
                  fontSize:        '13px',
                  fontWeight:      700,
                  fontFamily:      'var(--font-mono)',
                  cursor:          'pointer',
                  letterSpacing:   '0.04em',
                  boxShadow:       'var(--glow-green)',
                }}
                className="bid-btn"
              >
                PLACE BID
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Seller card ── */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border:          'var(--border-subtle)',
        borderRadius:    '8px',
        padding:         '14px 20px',
      }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '10px' }}>
          SELLER
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="mono" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
            {auction.seller.handle}
          </span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              Rep{' '}
              <span className="mono" style={{
                color: auction.seller.reputation >= 95
                  ? 'var(--accent-green)'
                  : 'var(--text-secondary)',
              }}>
                {auction.seller.reputation}
              </span>
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              Sales{' '}
              <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                {auction.seller.totalSales}
              </span>
            </span>
          </div>
        </div>

        <div style={{
          marginTop:       '10px',
          height:          '3px',
          borderRadius:    '2px',
          backgroundColor: 'var(--bg-elevated)',
          overflow:        'hidden',
        }}>
          <div style={{
            height:          '100%',
            width:           `${auction.seller.reputation}%`,
            borderRadius:    '2px',
            backgroundColor: auction.seller.reputation >= 95
              ? 'var(--accent-green)'
              : auction.seller.reputation >= 80
                ? 'var(--accent-amber)'
                : 'var(--accent-red)',
            boxShadow:       'var(--glow-green)',
          }} />
        </div>
      </div>

      {/* ── Buy Now card — hidden once sold ── */}
      {auction.buyNowPrice && canBid && buyNowState !== 'sold' && (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border:          'var(--border-subtle)',
          borderRadius:    '8px',
          padding:         '14px 20px',
        }}>
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            marginBottom:   '6px',
          }}>
            <span style={{ fontSize: '11px', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
              BUY NOW PRICE
            </span>
            <span className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              ${formatPrice(Math.max(auction.buyNowPrice!, liveAuction.currentBid + 1))}
            </span>
          </div>

          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '10px' }}>
            Skip the auction — purchase immediately at this price. Ends bidding for everyone.
          </p>

          <button
            onClick={handleBuyNow}
            disabled={buyNowState === 'submitting'}
            style={{
              width:           '100%',
              padding:         '10px',
              backgroundColor: buyNowState === 'submitting'
                ? 'var(--bg-elevated)'
                : 'transparent',
              border:          '1px solid var(--bg-border)',
              borderRadius:    '6px',
              color:           buyNowState === 'submitting'
                ? 'var(--text-tertiary)'
                : 'var(--text-secondary)',
              fontSize:        '12px',
              fontFamily:      'var(--font-mono)',
              cursor:          buyNowState === 'submitting' ? 'not-allowed' : 'pointer',
              letterSpacing:   '0.04em',
              transition:      'var(--transition-fast)',
            }}
            className="buy-now-btn"
          >
            {buyNowState === 'submitting'
              ? 'PROCESSING...'
              : `BUY NOW — $${formatPrice(Math.max(auction.buyNowPrice!, liveAuction.currentBid + 1))}`}
          </button>
        </div>
      )}
    </div>
  );
}