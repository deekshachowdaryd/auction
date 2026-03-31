// ═══════════════════════════════════════════════════
//  LIVE FEED PAGE — Client Component
// ═══════════════════════════════════════════════════

'use client'

import { useReducer, useEffect, useRef, useCallback, useState } from 'react'
import Link from 'next/link'
import type { Auction } from '@/lib/types'
import { useAuctions } from './context/AuctionContext'

// ── Types ─────────────────────────────────────────

interface LiveAuction extends Auction {
  displayBid: number
  lastBidder: string
  flash:      'up' | 'down' | null
}

interface FeedEvent {
  id:        string
  auctionId: string
  title:     string
  bidder:    string
  amount:    number
  prev:      number
  ts:        number
}

interface LiveState {
  auctions: LiveAuction[]
  feed:     FeedEvent[]
}

type LiveAction =
  | { type: 'SYNC'; auctions: Auction[] }
  | { type: 'CLEAR_FLASH'; id: string }

// ── Helpers ───────────────────────────────────────

// CS Note: This PRNG mirrors the one in data.ts but with
// a different seed — used client-side only (inside effects),
// never during render, so hydration safety doesn't apply here.
// We still use it for consistency rather than Math.random().
function randomHandle(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = 'usr_'
  for (let i = 0; i < 4; i++) {
    s += chars[Math.floor(Math.random() * chars.length)]
  }
  return s
  // Math.random() is safe here because this only runs inside
  // useEffect/dispatch — never during SSR or initial render.
}

function formatPrice(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// CS Note: Both formatTimeLeft and formatTimeAgo call Date.now().
// Date.now() returns different values on server vs client, so
// calling these during render causes hydration mismatches.
// Solution: only call them after isMounted is true (post-hydration).
function formatTimeLeft(endsAt: number): string {
  const diff = endsAt - Date.now()
  if (diff <= 0) return 'ENDED'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1000)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 10)  return 'just now'
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

// ── Reducer ───────────────────────────────────────

function liveReducer(state: LiveState, action: LiveAction): LiveState {
  switch (action.type) {

  case 'SYNC': {
    const incomingMap = new Map(action.auctions.map(a => [a.id, a]));
    const newAuctions = [...state.auctions];
    const newEvents:   FeedEvent[] = [];

    newAuctions.forEach((liveAuction, idx) => {
      const updated = incomingMap.get(liveAuction.id);
      if (!updated) return;

      // Only react if the bid actually changed
      const didChange = updated.currentBid !== liveAuction.displayBid;
      if (!didChange) return;

      const latestBid = updated.recentBids[0];

      newAuctions[idx] = {
        ...updated,
        displayBid: updated.currentBid,
        lastBidder: latestBid?.bidder ?? liveAuction.lastBidder,
        flash:      'up',
      };

      newEvents.push({
        id:        `evt_${Date.now()}_${liveAuction.id}`,
        auctionId: liveAuction.id,
        title:     liveAuction.title,
        bidder:    latestBid?.bidder ?? 'usr_0000',
        amount:    updated.currentBid,
        prev:      liveAuction.displayBid,
        ts:        Date.now(),
      });
    });

  if (newEvents.length === 0) return state;

  const newFeed = [...newEvents, ...state.feed].slice(0, 50);
  return { auctions: newAuctions, feed: newFeed };
}

    case 'CLEAR_FLASH': {
      return {
        ...state,
        auctions: state.auctions.map(a =>
          a.id === action.id ? { ...a, flash: null } : a
        ),
      }
    }

    default:
      return state
  }
}


// ── Component ─────────────────────────────────────

export default function LivePage() {
  const { state: contextState } = useAuctions();

  const [state, dispatch] = useReducer(liveReducer, undefined, () => {
    const liveAuctions = Array.from(contextState.auctions.values()).filter(
      a => a.status === 'LIVE' || a.status === 'ENDING'
    );
    return {
      auctions: liveAuctions.map(a => ({
        ...a,
        displayBid: a.currentBid,
        lastBidder: a.recentBids[0]?.bidder ?? 'usr_0000',
        flash:      null,
      })),
      feed: liveAuctions
        .flatMap(a => a.recentBids.slice(0, 2).map(b => ({
          id:        b.id,
          auctionId: a.id,
          title:     a.title,
          bidder:    b.bidder,
          amount:    b.amount,
          prev:      Math.round(b.amount * 0.97),
          ts:        b.timestamp,
        })))
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 20),
    };
  });

  // CS Note: isMounted starts false on both server and client.
  // useEffect only runs client-side, after React has confirmed
  // the hydrated DOM matches the server HTML. Setting it to true
  // here is the "green light" to render any time/random-dependent
  // content. This is the standard pattern for SSR-safe dynamic UI.
  const [isMounted, setIsMounted] = useState(false)

  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Simulation — only after mount
  useEffect(() => {
    if (!isMounted) return;
    const liveAuctions = Array.from(contextState.auctions.values()).filter(
      a => a.status === 'LIVE' || a.status === 'ENDING'
    );
    dispatch({ type: 'SYNC', auctions: liveAuctions });
  }, [contextState.lastUpdated, isMounted]);

  // Clear flash after 600ms
  const clearFlash = useCallback((id: string) => {
    setTimeout(() => dispatch({ type: 'CLEAR_FLASH', id }), 600)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    state.auctions.forEach(a => {
      if (a.flash) clearFlash(a.id)
    })
  }, [state.auctions, clearFlash, isMounted])

  const live   = state.auctions.filter(a => a.status === 'LIVE')
  const ending = state.auctions.filter(a => a.status === 'ENDING')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 className="mono" style={{
            fontSize:      '18px',
            fontWeight:    700,
            letterSpacing: '0.04em',
            color:         'var(--text-primary)',
          }}>
            LIVE AUCTIONS
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {live.length} live · {ending.length} ending soon · updates every 2s
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Gate the animated pulse behind isMounted — animation triggers
              a style difference the server cannot predict */}
          {isMounted && (
            <span style={{
              width:           '8px',
              height:          '8px',
              borderRadius:    '50%',
              backgroundColor: 'var(--accent-green)',
              boxShadow:       'var(--glow-green)',
              display:         'inline-block',
              animation:       'livePulse 1.4s ease-in-out infinite',
            }} />
          )}
          <span className="mono" style={{
            fontSize:      '11px',
            color:         'var(--accent-green)',
            letterSpacing: '0.06em',
          }}>
            STREAMING LIVE
          </span>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', alignItems: 'start' }}>

        {/* ══ LEFT — Auction cards ══════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ending.length > 0 && (
            <>
              <div style={{
                fontSize:      '10px',
                letterSpacing: '0.08em',
                color:         'var(--accent-amber)',
                padding:       '0 2px',
                display:       'flex',
                alignItems:    'center',
                gap:           '8px',
              }}>
                <span>⚡ ENDING SOON</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'color-mix(in srgb, var(--accent-amber) 20%, transparent)' }} />
              </div>
              {ending.map(auction => (
                <LiveAuctionCard
                  key={auction.id}
                  auction={auction}
                  isMounted={isMounted}
                />
              ))}
            </>
          )}

          {live.length > 0 && (
            <>
              <div style={{
                fontSize:      '10px',
                letterSpacing: '0.08em',
                color:         'var(--accent-green)',
                padding:       '0 2px',
                display:       'flex',
                alignItems:    'center',
                gap:           '8px',
                marginTop:     ending.length > 0 ? '4px' : '0',
              }}>
                <span>● LIVE</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'color-mix(in srgb, var(--accent-green) 20%, transparent)' }} />
              </div>
              {live.map(auction => (
                <LiveAuctionCard
                  key={auction.id}
                  auction={auction}
                  isMounted={isMounted}
                />
              ))}
            </>
          )}
        </div>

        {/* ══ RIGHT — Activity feed ═════════════════ */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border:          'var(--border-subtle)',
          borderRadius:    '8px',
          overflow:        'hidden',
          position:        'sticky',
          top:             '100px',
          maxHeight:       'calc(100vh - 140px)',
          display:         'flex',
          flexDirection:   'column',
        }}>
          <div style={{
            padding:        '12px 16px',
            borderBottom:   'var(--border-subtle)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            flexShrink:     0,
          }}>
            <span style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>
              BID ACTIVITY
            </span>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--accent-green)' }}>
              {state.feed.length} events
            </span>
          </div>

          <div ref={feedRef} style={{ overflowY: 'auto', flex: 1 }}>
            {/* Gate the entire feed behind isMounted.
                FeedRow renders formatTimeAgo(event.ts) which calls Date.now() —
                safe only after hydration is confirmed complete. */}
            {isMounted
              ? state.feed.map((event, i) => (
                  <FeedRow key={`${event.id}-${i}`} event={event} index={i} />
                ))
              : (
                // Deterministic placeholder — server and client agree on this exact output
                <div style={{ padding: '16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  Connecting…
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// ── LiveAuctionCard ───────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Electronics':   'var(--accent-blue)',
  'Digital Art':   'var(--accent-green)',
  'Rare Sneakers': 'var(--accent-amber)',
  'Watches':       'var(--accent-red)',
  'Keyboards':     '#a78bfa',
}

function LiveAuctionCard({
  auction,
  isMounted,
}: {
  auction:   LiveAuction
  isMounted: boolean
}) {
  const isEnding   = auction.status === 'ENDING'
  const catColor   = CATEGORY_COLORS[auction.category] ?? 'var(--accent-green)'

  return (
    <Link href={`/auction/${auction.id}`} style={{ textDecoration: 'none' }}>
      <div
        className="auction-row"
        style={{
          backgroundColor: auction.flash ? 'var(--accent-green-glow)' : 'var(--bg-surface)',
          border:          auction.flash
            ? '1px solid color-mix(in srgb, var(--accent-green) 40%, transparent)'
            : 'var(--border-subtle)',
          borderRadius: '8px',
          padding:      '16px 20px',
          transition:   'background-color 300ms ease, border-color 300ms ease',
          cursor:       'pointer',
        }}
      >
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <div style={{
              width:           '3px',
              height:          '48px',
              borderRadius:    '2px',
              backgroundColor: catColor,
              flexShrink:      0,
              boxShadow:       `0 0 8px ${catColor}`,
            }} />

            {/* ✅ Image Thumbnail */}
            <div style={{
              width:           '56px',
              height:          '48px',
              borderRadius:    '6px',
              backgroundColor: 'var(--bg-elevated)',
              border:          'var(--border-subtle)',
              overflow:        'hidden',
              flexShrink:      0,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
            }}>
              {auction.imageUrl ? (
                <img
                  src={auction.imageUrl}
                  alt={auction.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '16px', filter: 'grayscale(1)', opacity: 0.3 }}>🖼️</span>
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{
                fontSize:     '13px',
                fontWeight:   600,
                color:        'var(--text-primary)',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
              }}>
                {auction.title}
              </p>
              <p style={{
                fontSize:     '11px',
                color:        'var(--text-tertiary)',
                marginTop:    '2px',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
              }}>
                {auction.subtitle}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div className="mono" style={{
              fontSize:      '16px',
              fontWeight:    700,
              color:         'var(--accent-green)',
              letterSpacing: '-0.01em',
              textShadow:    auction.flash ? 'var(--glow-green)' : 'none',
              transition:    'text-shadow 300ms ease',
            }}>
              ${formatPrice(auction.displayBid)}
            </div>
            {auction.flash && (
              <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-green)', marginTop: '2px' }}>
                ▲ NEW BID
              </div>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '16px',
          marginTop:  '12px',
          paddingTop: '10px',
          borderTop:  'var(--border-subtle)',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            <span className="mono" style={{ color: 'var(--text-secondary)' }}>
              {auction.bidCount}
            </span>{' '}bids
          </span>

          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            <span className="mono" style={{ color: 'var(--text-secondary)' }}>
              {auction.watcherCount.toLocaleString('en-US')}
            </span>{' '}watching
          </span>

          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Last:{' '}
            {/* Gate behind isMounted — Realtime bot bids update AuctionContext
                before hydration completes, causing lastBidder to differ between
                the server-rendered HTML and the first client render. */}
            {isMounted ? (
              <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                {auction.lastBidder}
              </span>
            ) : (
              <span className="mono" style={{ color: 'var(--text-tertiary)' }}>
                ——
              </span>
            )}
          </span>

          {/* ✅ Time remaining — gated: Date.now() only runs client-side */}
          {isMounted ? (
            <span
              className="mono"
              style={{
                marginLeft:      'auto',
                fontSize:        '11px',
                fontWeight:      600,
                color:           isEnding ? 'var(--accent-amber)' : 'var(--text-secondary)',
                backgroundColor: isEnding
                  ? 'color-mix(in srgb, var(--accent-amber) 10%, transparent)'
                  : 'transparent',
                padding:      isEnding ? '2px 6px' : '0',
                borderRadius: '3px',
                border:       isEnding
                  ? '1px solid color-mix(in srgb, var(--accent-amber) 25%, transparent)'
                  : 'none',
              }}
            >
              {formatTimeLeft(auction.endsAt)}
            </span>
          ) : (
            // Static placeholder — same on server and client
            <span className="mono" style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
              ——
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── FeedRow ───────────────────────────────────────

function FeedRow({ event, index }: { event: FeedEvent; index: number }) {
  const delta = event.amount - event.prev
  const pct   = ((delta / event.prev) * 100).toFixed(1)

  return (
    <div style={{
      padding:         '10px 16px',
      borderBottom:    'var(--border-subtle)',
      backgroundColor: index === 0 ? 'var(--accent-green-glow)' : 'transparent',
      transition:      'background-color 600ms ease',
    }}>
      <Link href={`/auction/${event.auctionId}`} style={{ textDecoration: 'none' }}>
        <p style={{
          fontSize:     '11px',
          fontWeight:   500,
          color:        index === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
          marginBottom: '5px',
        }}>
          {event.title}
        </p>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-green)' }}>
            ${formatPrice(event.amount)}
          </span>
          <span className="mono" style={{
            fontSize:        '10px',
            color:           'var(--accent-green)',
            backgroundColor: 'var(--accent-green-muted)',
            padding:         '1px 5px',
            borderRadius:    '3px',
          }}>
            +{pct}%
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
            {event.bidder}
          </span>
          {/* ✅ Safe: FeedRow only renders after isMounted=true (gated in parent) */}
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
            {formatTimeAgo(event.ts)}
          </span>
        </div>
      </div>
    </div>
  )
}