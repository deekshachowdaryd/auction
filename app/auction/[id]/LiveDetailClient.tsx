'use client';

import { useMemo } from 'react';
import { useAuctions } from '@/app/live/context/AuctionContext';
import BidPanel from './BidPanel';
import type { Auction } from '@/lib/types';

// ── Helpers (duplicated from page.tsx — client bundle only) ──
function formatPrice(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m    = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Sparkline — same pure SVG as page.tsx ────────
function Sparkline({ data }: { data: { t: number; price: number }[] }) {
  if (!data || data.length < 2) {
    return (
      <div style={{
        height:         '80px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        color:          'var(--text-tertiary)',
        fontSize:       '12px',
      }}>
        No price history
      </div>
    );
  }

  const W = 600, H = 80, PAD = 4;
  const prices = data.map(d => d.price);
  const minP   = Math.min(...prices);
  const maxP   = Math.max(...prices);
  const rangeP = maxP - minP || 1;

  const scaleX = (i: number) =>
    PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const scaleY = (p: number) =>
    PAD + (1 - (p - minP) / rangeP) * (H - PAD * 2);

  const points = data.map((d, i) => `${scaleX(i)},${scaleY(d.price)}`);
  const pathD  = `M ${points.join(' L ')}`;
  const areaD  = `${pathD} L ${scaleX(data.length - 1)},${H} L ${scaleX(0)},${H} Z`;
  const isUp   = data[data.length - 1].price >= data[0].price;
  const lineColor = isUp ? 'var(--accent-green)' : 'var(--accent-red)';

  // CS Note: We use a stable fillId derived from the auction ID prop
  // rather than Math.random() — random IDs would cause hydration mismatches.
  // SVG gradient IDs must be unique per page but stable across renders.
  const fillId = `spark-fill-live`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: '80px', display: 'block' }}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={lineColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${fillId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={scaleX(data.length - 1)}
        cy={scaleY(data[data.length - 1].price)}
        r="3"
        fill={lineColor}
        style={{ filter: `drop-shadow(0 0 4px ${lineColor})` }}
      />
    </svg>
  );
}

// ── Main client component ─────────────────────────
export default function LiveDetailClient({
  initialAuction,
}: {
  initialAuction: Auction;
}) {
  const { getAuction } = useAuctions();

  // Prefer live context data, fall back to server-provided initial.
  // This means: first paint = static (matches server), subsequent renders
  // = live. No flicker, no hydration mismatch.
  const auction = getAuction(initialAuction.id) ?? initialAuction;

  // Derived price change — recomputes only when auction updates
  const { priceChange, pricePct } = useMemo(() => {
    const change = auction.priceHistory.length >= 2
      ? auction.currentBid - auction.priceHistory[0].price
      : 0;
    const pct = auction.priceHistory.length >= 2
      ? ((change / auction.priceHistory[0].price) * 100).toFixed(1)
      : '0.0';
    return { priceChange: change, pricePct: pct };
  }, [auction.currentBid, auction.priceHistory]);

  return (
    <>
      {/* ── Price history card ── */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border:          'var(--border-subtle)',
        borderRadius:    '8px',
        overflow:        'hidden',
      }}>
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '14px 20px',
          borderBottom:   'var(--border-subtle)',
        }}>
          <span style={{ fontSize: '11px', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
            PRICE HISTORY · 24H
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="mono" style={{
              fontSize:   '20px',
              fontWeight: 700,
              color:      'var(--accent-green)',
              transition: 'color 300ms ease',
            }}>
              ${formatPrice(auction.currentBid)}
            </span>
            {priceChange !== 0 && (
              <span className="mono" style={{
                fontSize:        '12px',
                fontWeight:      600,
                color:           priceChange > 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                backgroundColor: priceChange > 0 ? 'var(--accent-green-muted)' : 'var(--accent-red-muted)',
                padding:         '2px 8px',
                borderRadius:    '4px',
              }}>
                {priceChange > 0 ? '+' : ''}{pricePct}%
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 20px 12px' }}>
          <Sparkline data={auction.priceHistory} />
        </div>

        {auction.priceHistory.length > 0 && (
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            padding:        '8px 20px 14px',
            fontSize:       '11px',
            color:          'var(--text-tertiary)',
          }}>
            <span className="mono">
              LOW ${formatPrice(Math.min(...auction.priceHistory.map(d => d.price)))}
            </span>
            <span className="mono">
              HIGH ${formatPrice(Math.max(...auction.priceHistory.map(d => d.price)))}
            </span>
            <span className="mono">
              START ${formatPrice(auction.startingPrice)}
            </span>
          </div>
        )}
      </div>

      {/* ── Bid history card ── */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border:          'var(--border-subtle)',
        borderRadius:    '8px',
        overflow:        'hidden',
      }}>
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '14px 20px',
          borderBottom:   'var(--border-subtle)',
        }}>
          <span style={{ fontSize: '11px', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
            BID HISTORY
          </span>
          <span className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {auction.bidCount} total bids
          </span>
        </div>

        {auction.recentBids.length === 0 ? (
          <p style={{ padding: '20px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
            No bids yet — be the first.
          </p>
        ) : (
          <div>
            {auction.recentBids.map((bid, i) => (
              <div
                key={`${bid.id}-${i}`}
                style={{
                  display:             'grid',
                  gridTemplateColumns: '1fr auto auto',
                  alignItems:          'center',
                  gap:                 '16px',
                  padding:             '10px 20px',
                  borderBottom:        i < auction.recentBids.length - 1
                    ? 'var(--border-subtle)'
                    : 'none',
                  backgroundColor: i === 0 ? 'var(--accent-green-glow)' : 'transparent',
                  transition:      'background-color 400ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {i === 0 && (
                    <span style={{
                      fontSize:        '9px',
                      letterSpacing:   '0.08em',
                      color:           'var(--accent-green)',
                      backgroundColor: 'var(--accent-green-muted)',
                      padding:         '2px 6px',
                      borderRadius:    '3px',
                      fontWeight:      700,
                    }}>
                      LEADING
                    </span>
                  )}
                  <span className="mono" style={{
                    fontSize: '12px',
                    color:    i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}>
                    {bid.bidder}
                  </span>
                </div>

                <span className="mono" style={{
                  fontSize:   '13px',
                  fontWeight: i === 0 ? 700 : 400,
                  color:      i === 0 ? 'var(--accent-green)' : 'var(--text-secondary)',
                }}>
                  ${formatPrice(bid.amount)}
                </span>

                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }} suppressHydrationWarning>
                  {formatTimeAgo(bid.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── BidPanel — also receives live auction ── */}
      <BidPanel auction={auction} />
    </>
  );
}