'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWatchlist } from '@/lib/hooks/useWatchlist';
import { useMyBids } from '@/app/live/context/MyBidsContext';
import { useAuctions } from '@/app/live/context/AuctionContext';
import type { MyBid } from '@/lib/hooks/useMyBids';

function formatPrice(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTimeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatTimeLeft(ms: number): string {
  const diff = ms - Date.now();
  if (diff <= 0) return 'ENDED';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Status badge ─────────────────────────────────
function StatusBadge({ status }: { status: MyBid['status'] }) {
  const map = {
    WINNING: { color: 'var(--accent-green)', bg: 'var(--accent-green-muted)', label: '▲ WINNING' },
    OUTBID: { color: 'var(--accent-red)', bg: 'var(--accent-red-muted)', label: '▼ OUTBID' },
    WON: { color: 'var(--accent-green)', bg: 'var(--accent-green-muted)', label: '✓ WON' },
    LOST: { color: 'var(--text-tertiary)', bg: 'var(--bg-elevated)', label: '✕ LOST' },
  };
  const s = map[status];
  return (
    <span style={{
      fontSize: '10px',
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.06em',
      padding: '3px 8px',
      borderRadius: '4px',
      color: s.color,
      backgroundColor: s.bg,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

// ── Stat card ────────────────────────────────────
function StatCard({
  label, value, sub, highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: highlight
        ? '1px solid color-mix(in srgb, var(--accent-green) 25%, transparent)'
        : 'var(--border-subtle)',
      borderRadius: '8px',
      padding: '16px 20px',
      flex: 1,
      minWidth: '140px',
    }}>
      <p style={{
        fontSize: '10px',
        letterSpacing: '0.07em',
        color: 'var(--text-tertiary)',
        marginBottom: '8px',
      }}>
        {label}
      </p>
      <p className="mono" style={{
        fontSize: '20px',
        fontWeight: 700,
        color: highlight ? 'var(--accent-green)' : 'var(--text-primary)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {value}
      </p>
      {sub && (
        <p style={{
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          marginTop: '4px',
        }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Bid row ──────────────────────────────────────
function BidRow({ bid }: { bid: MyBid }) {
  const isPriceDifferent = bid.currentPrice !== bid.myAmount;
  const isOutbid = bid.status === 'OUTBID';

  return (
    <Link href={`/auction/${bid.auctionId}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto',
        gap: '16px',
        alignItems: 'center',
        padding: '14px 20px',
        borderBottom: 'var(--border-subtle)',
        cursor: 'pointer',
        transition: 'var(--transition-fast)',
      }}
        className="table-row-hover"
      >
        {/* Title + meta */}
        <div>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-primary)',
            fontWeight: 500,
            marginBottom: '2px',
          }}>
            {bid.auctionTitle}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {bid.auctionCategory} · placed {formatTimeAgo(bid.placedAt)}
          </p>
        </div>

        {/* My bid vs current */}
        <div style={{ textAlign: 'right' }}>
          <p className="mono" style={{
            fontSize: '13px',
            color: isOutbid ? 'var(--accent-red)' : 'var(--text-primary)',
          }}>
            ${formatPrice(bid.myAmount)}
          </p>
          {isPriceDifferent && (
            <p className="mono" style={{
              fontSize: '11px',
              color: 'var(--text-tertiary)',
            }}>
              now ${formatPrice(bid.currentPrice)}
            </p>
          )}
        </div>

        {/* Time left */}
        <div className="mono" style={{
          fontSize: '11px',
          color: formatTimeLeft(bid.endsAt) === 'ENDED'
            ? 'var(--text-tertiary)'
            : 'var(--text-secondary)',
          whiteSpace: 'nowrap',
        }}>
          {formatTimeLeft(bid.endsAt)}
        </div>

        {/* Status */}
        <StatusBadge status={bid.status} />
      </div>
    </Link>
  );
}

// ── Watchlist row ────────────────────────────────
function WatchRow({
  auctionId,
  onRemove,
}: {
  auctionId: string;
  onRemove: (id: string) => void;
}) {
  const { state } = useAuctions();
  // O(1) lookup from the Map in AuctionContext
  const auction = state.auctions.get(auctionId);
  if (!auction) return null;

  const isEnding = auction.status === 'ENDING';
  const isLive = auction.status === 'LIVE';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto auto auto',
      gap: '16px',
      alignItems: 'center',
      padding: '14px 20px',
      borderBottom: 'var(--border-subtle)',
    }}>
      {/* Title + meta */}
      <Link href={`/auction/${auction.id}`} style={{ textDecoration: 'none' }}>
        <div className="table-row-hover" style={{ cursor: 'pointer' }}>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-primary)',
            fontWeight: 500,
            marginBottom: '2px',
          }}>
            {auction.title}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {auction.category} · {auction.bidCount} bids
          </p>
        </div>
      </Link>

      {/* Current bid */}
      <div className="mono" style={{
        fontSize: '13px',
        color: 'var(--accent-green)',
      }}>
        ${formatPrice(auction.currentBid)}
      </div>

      {/* Status pill */}
      <span style={{
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.06em',
        padding: '3px 8px',
        borderRadius: '4px',
        color: isEnding ? 'var(--accent-amber)' : isLive ? 'var(--accent-green)' : 'var(--text-tertiary)',
        backgroundColor: isEnding ? 'var(--accent-amber-glow)' : isLive ? 'var(--accent-green-muted)' : 'var(--bg-elevated)',
        whiteSpace: 'nowrap',
      }}>
        {isEnding ? '⚡ ENDING' : isLive ? '● LIVE' : auction.status}
      </span>

      {/* Remove button */}
      <button
        onClick={() => onRemove(auctionId)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-tertiary)',
          fontSize: '16px',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '4px',
          lineHeight: 1,
          transition: 'var(--transition-fast)',
        }}
        title="Remove from watchlist"
      >
        ×
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════
//  MAIN DASHBOARD PAGE
// ══════════════════════════════════════════════════
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'bids' | 'watchlist'>('bids');

  const {
    watchlist,
    hydrated: wHydrated,
    removeFromWatchlist,
  } = useWatchlist();

  const {
    activeBids,
    historicalBids,
    stats,
    hydrated: bHydrated,
  } = useMyBids();

  const hydrated = wHydrated && bHydrated;

  const TABS = [
    { id: 'bids', label: 'MY BIDS', count: activeBids.length + historicalBids.length },
    { id: 'watchlist', label: 'WATCHLIST', count: watchlist.length },
  ] as const;

  return (
    <div style={{
      minHeight: '100vh',
      padding: '32px 40px',
      maxWidth: '1100px',
      margin: '0 auto',
    }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
          marginBottom: '4px',
        }}>
          DASHBOARD
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          Your bids, watchlist, and activity
        </p>
      </div>

      {/* ── Stats strip ── */}
      {!hydrated ? (
        <div style={{
          height: '88px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            LOADING...
          </span>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}>
          <StatCard
            label="ACTIVE BIDS"
            value={String(stats.winning)}
            sub={`${stats.outbid} outbid`}
            highlight={stats.winning > 0}
          />
          <StatCard
            label="COMMITTED"
            value={`$${formatPrice(stats.activeSpend)}`}
            sub="across winning bids"
          />
          <StatCard
            label="AUCTIONS WON"
            value={String(stats.won)}
            sub={stats.won > 0 ? `$${formatPrice(stats.totalSpentOnWon)} total` : 'none yet'}
          />
          <StatCard
            label="WATCHLIST"
            value={String(watchlist.length)}
            sub="saved auctions"
          />
        </div>
      )}

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex',
        gap: '2px',
        marginBottom: '2px',
        borderBottom: 'var(--border-subtle)',
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: isActive
                  ? '2px solid var(--accent-green)'
                  : '2px solid transparent',
                color: isActive ? 'var(--accent-green)' : 'var(--text-tertiary)',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.07em',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
              <span style={{
                marginLeft: '8px',
                fontSize: '10px',
                backgroundColor: isActive ? 'var(--accent-green-muted)' : 'var(--bg-elevated)',
                color: isActive ? 'var(--accent-green)' : 'var(--text-tertiary)',
                padding: '1px 6px',
                borderRadius: '10px',
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Content panel ── */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: 'var(--border-subtle)',
        borderRadius: '0 8px 8px 8px',
        overflow: 'hidden',
      }}>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto',
          gap: '16px',
          padding: '10px 20px',
          borderBottom: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-elevated)',
        }}>
          {activeTab === 'bids' ? (
            <>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>AUCTION</span>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>MY BID</span>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>ENDS</span>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>STATUS</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>AUCTION</span>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>CURRENT BID</span>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>STATUS</span>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}></span>
            </>
          )}
        </div>

        {/* Rows */}
        {!hydrated ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              LOADING...
            </span>
          </div>
        ) : activeTab === 'bids' ? (
          <>
            {activeBids.length === 0 && historicalBids.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                  No bids yet
                </p>
                <Link href="/" style={{
                  fontSize: '12px',
                  color: 'var(--accent-green)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  Browse auctions →
                </Link>
              </div>
            ) : (
              <>
                {/* Active bids section */}
                {activeBids.length > 0 && (
                  <>
                    <div style={{
                      padding: '8px 20px',
                      backgroundColor: 'var(--bg-elevated)',
                      fontSize: '10px',
                      color: 'var(--text-tertiary)',
                      letterSpacing: '0.06em',
                      borderBottom: 'var(--border-subtle)',
                    }}>
                      ACTIVE
                    </div>
                    {activeBids.map(bid => <BidRow key={bid.id} bid={bid} />)}
                  </>
                )}

                {/* Historical bids section */}
                {historicalBids.length > 0 && (
                  <>
                    <div style={{
                      padding: '8px 20px',
                      backgroundColor: 'var(--bg-elevated)',
                      fontSize: '10px',
                      color: 'var(--text-tertiary)',
                      letterSpacing: '0.06em',
                      borderBottom: 'var(--border-subtle)',
                    }}>
                      HISTORY
                    </div>
                    {historicalBids.map(bid => <BidRow key={bid.id} bid={bid} />)}
                  </>
                )}
              </>
            )}
          </>
        ) : (
          /* Watchlist tab */
          watchlist.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                No auctions saved yet
              </p>
              <Link href="/" style={{
                fontSize: '12px',
                color: 'var(--accent-green)',
                fontFamily: 'var(--font-mono)',
              }}>
                Browse auctions →
              </Link>
            </div>
          ) : (
            watchlist.map(id => (
              <WatchRow
                key={id}
                auctionId={id}
                onRemove={removeFromWatchlist}
              />
            ))
          )
        )}
      </div>
    </div>
  );
}