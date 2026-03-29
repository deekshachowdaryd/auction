// ═══════════════════════════════════════════════════
//  ALL MARKETS — Server Component
//  Reads filter/sort from URL search params.
//  No useState — URL is the state store.
// ═══════════════════════════════════════════════════

import Link from 'next/link';
import {
  AUCTIONS,
  MARKET_SUMMARY,
  getLiveAuctions,
} from '@/lib/data';
import type { Auction, AuctionStatus, AuctionCategory, SortKey } from '@/lib/types';

// ── Helpers ───────────────────────────────────────

function statusColor(status: AuctionStatus): string {
  switch (status) {
    case 'LIVE':     return 'var(--accent-green)';
    case 'ENDING':   return 'var(--accent-amber)';
    case 'OUTBID':   return 'var(--accent-red)';
    case 'UPCOMING': return 'var(--accent-blue)';
    case 'SOLD':     return 'var(--text-tertiary)';
    case 'RESERVED': return 'var(--accent-red-dim)';
  }
}

function formatPrice(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTimeLeft(endsAt: number): string {
  const diff = endsAt - Date.now();
  if (diff <= 0) return 'ENDED';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0)  return `${h}h ${m}m`;
  return `${m}m`;
}

// Category dot colors
const CATEGORY_COLORS: Record<AuctionCategory, string> = {
  'Electronics':  'var(--accent-blue)',
  'Digital Art':  'var(--accent-green)',
  'Rare Sneakers':'var(--accent-amber)',
  'Watches':      'var(--accent-red)',
  'Keyboards':    '#a78bfa',
};

const CATEGORIES: (AuctionCategory | 'All')[] = [
  'All', 'Electronics', 'Digital Art', 'Rare Sneakers', 'Watches', 'Keyboards',
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'endingSoon',  label: 'Ending Soon'   },
  { key: 'highestBid',  label: 'Highest Bid'   },
  { key: 'lowestBid',   label: 'Lowest Bid'    },
  { key: 'mostBids',    label: 'Most Bids'     },
  { key: 'newest',      label: 'Newest'        },
];

// ── Filtering + sorting (pure functions — easy to test) ──
function applyFilters(
  auctions: Auction[],
  category: string,
  sort: string,
): Auction[] {
  let result = [...auctions];

  if (category && category !== 'All') {
    result = result.filter(a => a.category === category);
  }

  switch (sort) {
    case 'endingSoon': result.sort((a, b) => a.endsAt - b.endsAt);         break;
    case 'highestBid': result.sort((a, b) => b.currentBid - a.currentBid); break;
    case 'lowestBid':  result.sort((a, b) => a.currentBid - b.currentBid); break;
    case 'mostBids':   result.sort((a, b) => b.bidCount - a.bidCount);     break;
    case 'newest':     result.sort((a, b) => b.startedAt - a.startedAt);   break;
    default:           result.sort((a, b) => a.endsAt - b.endsAt);
  }

  return result;
}

// ── Page (Server Component) ───────────────────────
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const category = (params?.cat as string) ?? 'All';
  const sort = (params?.sort as string) ?? 'endingSoon';

  const filtered = applyFilters(AUCTIONS, category, sort);
  const live      = getLiveAuctions().length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2
            className="mono"
            style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-primary)' }}
          >
            ALL MARKETS
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {MARKET_SUMMARY.totalListings} active listings
            <span style={{ margin: '0 8px', color: 'var(--bg-border)' }}>·</span>
            {live} live auctions
            <span style={{ margin: '0 8px', color: 'var(--bg-border)' }}>·</span>
            {MARKET_SUMMARY.totalBidsToday} bids today
          </p>
        </div>
        <span className="mono" style={{ fontSize: '11px', color: 'var(--accent-green)', letterSpacing: '0.06em' }}>
          ● LIVE FEED
        </span>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            '12px',
        flexWrap:       'wrap',
        paddingBottom:  '16px',
        borderBottom:   'var(--border-subtle)',
      }}>
        {/* Category chips */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => {
            const isActive = cat === category;
            return (
              <Link
                key={cat}
                href={`/?cat=${cat}&sort=${sort}`}
                style={{
                  display:         'flex',
                  alignItems:      'center',
                  gap:             '6px',
                  padding:         '5px 12px',
                  borderRadius:    '4px',
                  fontSize:        '11px',
                  letterSpacing:   '0.04em',
                  fontWeight:      500,
                  textDecoration:  'none',
                  transition:      'var(--transition-fast)',
                  backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
                  border:          isActive
                    ? '1px solid var(--bg-border)'
                    : '1px solid transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {cat !== 'All' && (
                  <span style={{
                    width: '6px', height: '6px',
                    borderRadius: '50%',
                    backgroundColor: CATEGORY_COLORS[cat as AuctionCategory],
                    flexShrink: 0,
                    boxShadow: isActive
                      ? `0 0 6px ${CATEGORY_COLORS[cat as AuctionCategory]}`
                      : 'none',
                  }} />
                )}
                {cat.toUpperCase()}
              </Link>
            );
          })}
        </div>

        {/* Sort dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>
            SORT
          </span>
          {SORT_OPTIONS.map(opt => (
            <Link
              key={opt.key}
              href={`/?cat=${category}&sort=${opt.key}`}
              style={{
                padding:         '4px 10px',
                borderRadius:    '4px',
                fontSize:        '11px',
                letterSpacing:   '0.03em',
                textDecoration:  'none',
                transition:      'var(--transition-fast)',
                backgroundColor: sort === opt.key ? 'var(--bg-elevated)' : 'transparent',
                border:          sort === opt.key
                  ? '1px solid var(--bg-border)'
                  : '1px solid transparent',
                color: sort === opt.key ? 'var(--accent-green)' : 'var(--text-tertiary)',
              }}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Column header row ── */}
      <div style={{
        display:       'grid',
        gridTemplateColumns: '1fr 110px 80px 90px 100px',
        gap:           '0 16px',
        padding:       '0 20px',
        fontSize:      '10px',
        letterSpacing: '0.06em',
        color:         'var(--text-tertiary)',
      }}>
        <span>ITEM</span>
        <span style={{ textAlign: 'right' }}>CURRENT BID</span>
        <span style={{ textAlign: 'center' }}>BIDS</span>
        <span style={{ textAlign: 'center' }}>TIME LEFT</span>
        <span style={{ textAlign: 'center' }}>STATUS</span>
      </div>

      {/* ── Auction rows ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {filtered.length === 0 && (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', padding: '32px 20px' }}>
            No auctions found in this category.
          </p>
        )}

        {filtered.map((item) => {
          const color     = statusColor(item.status);
          const isLive    = item.status === 'LIVE' || item.status === 'ENDING';
          const catColor  = CATEGORY_COLORS[item.category];

          return (
            <Link
              key={item.id}
              href={`/auction/${item.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  display:         'grid',
                  gridTemplateColumns: '1fr 110px 80px 90px 100px',
                  gap:             '0 16px',
                  alignItems:      'center',
                  padding:         '14px 20px',
                  borderRadius:    '6px',
                  backgroundColor: 'var(--bg-surface)',
                  border:          'var(--border-subtle)',
                  cursor:          'pointer',
                  transition:      'var(--transition-fast)',
                  // We'll handle hover via CSS class below
                }}
                className="auction-row"
              >

                {/* Item name + category */}
<div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
  {/* Category accent bar */}
  <span style={{
    width: '3px', height: '32px',
    borderRadius: '2px',
    backgroundColor: catColor,
    flexShrink: 0,
    boxShadow: isLive ? `0 0 8px ${catColor}` : 'none',
  }} />

  {/* Thumbnail */}
  {item.imageUrl ? (
    <img
      src={item.imageUrl}
      alt={item.title}
      style={{
        width:        '52px',
        height:       '36px',
        objectFit:    'cover',
        borderRadius: '4px',
        flexShrink:   0,
        border:       '1px solid var(--bg-border)',
        opacity:      item.status === 'SOLD' ? 0.4 : 1,
        filter:       isLive
          ? `drop-shadow(0 0 4px color-mix(in srgb, ${catColor} 40%, transparent))`
          : 'none',
      }}
    />
  ) : (
    <div style={{
      width:           '52px',
      height:          '36px',
      borderRadius:    '4px',
      flexShrink:      0,
      backgroundColor: 'var(--bg-elevated)',
      border:          '1px solid var(--bg-border)',
    }} />
  )}

  {/* Title + subtitle */}
  <div style={{ minWidth: 0 }}>
    <p style={{
      fontSize:     '13px',
      fontWeight:   500,
      color:        'var(--text-primary)',
      overflow:     'hidden',
      textOverflow: 'ellipsis',
      whiteSpace:   'nowrap',
    }}>
      {item.title}
    </p>
    <p style={{
      fontSize:     '11px',
      color:        'var(--text-tertiary)',
      marginTop:    '2px',
      overflow:     'hidden',
      textOverflow: 'ellipsis',
      whiteSpace:   'nowrap',
    }}>
      {item.subtitle}
    </p>
  </div>
</div>


                {/* Current bid */}
                <span
                  className="mono"
                  style={{
                    color:      'var(--accent-green)',
                    fontSize:   '13px',
                    fontWeight: 600,
                    textAlign:  'right',
                  }}
                >
                  ${formatPrice(item.currentBid)}
                </span>

                {/* Bid count */}
                <span
                  className="mono"
                  style={{
                    color:     'var(--text-secondary)',
                    fontSize:  '12px',
                    textAlign: 'center',
                  }}
                >
                  {item.bidCount}
                </span>

                {/* Time left */}
                <span
                  className="mono"
                  style={{
                    color:     item.status === 'ENDING'
                      ? 'var(--accent-amber)'
                      : item.status === 'UPCOMING'
                        ? 'var(--accent-blue)'
                        : 'var(--text-secondary)',
                    fontSize:  '12px',
                    textAlign: 'center',
                  }}
                >
                  {item.status === 'UPCOMING'
                    ? `STARTS ${formatTimeLeft(item.startedAt)}`
                    : item.status === 'SOLD'
                      ? '—'
                      : formatTimeLeft(item.endsAt)}
                </span>

                {/* Status badge */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span
                    className="mono"
                    style={{
                      color:           color,
                      backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
                      border:          `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                      padding:         '3px 10px',
                      borderRadius:    '4px',
                      fontSize:        '10px',
                      letterSpacing:   '0.08em',
                      fontWeight:      600,
                      whiteSpace:      'nowrap',
                    }}
                  >
                    {item.status === 'LIVE' && '● '}
                    {item.status}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Shell status line ── */}
      <p className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', paddingTop: '8px' }}>
        {'>'} {filtered.length} results · sorted by {sort} · filter: {category}
      </p>
    </div>
  );
}