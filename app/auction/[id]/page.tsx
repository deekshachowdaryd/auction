// ═══════════════════════════════════════════════════
//  AUCTION DETAIL PAGE — Server Component
//  Static shell only: breadcrumb, title, specs, tags.
//  All live/interactive sections are delegated to
//  LiveDetailClient (a 'use client' island).
// ═══════════════════════════════════════════════════

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuctionById } from '@/lib/data';
import type { AuctionStatus, AuctionCategory } from '@/lib/types';
import LiveDetailClient from './LiveDetailClient';

// ── Visual helpers ────────────────────────────────

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

const CATEGORY_COLORS: Record<AuctionCategory, string> = {
  'Electronics':   'var(--accent-blue)',
  'Digital Art':   'var(--accent-green)',
  'Rare Sneakers': 'var(--accent-amber)',
  'Watches':       'var(--accent-red)',
  'Keyboards':     '#a78bfa',
};

function formatPrice(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Page ──────────────────────────────────────────

export default async function AuctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auction = getAuctionById(id);
  if (!auction) notFound();

  const statusCol = statusColor(auction.status);
  const catColor  = CATEGORY_COLORS[auction.category];
  const isActive  = auction.status === 'LIVE' || auction.status === 'ENDING';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
        <Link
          href="/"
          style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}
          className="breadcrumb-link"
        >
          ALL MARKETS
        </Link>
        <span style={{ color: 'var(--text-tertiary)' }}>/</span>
        <span style={{ color: 'var(--text-tertiary)' }}>{auction.category.toUpperCase()}</span>
        <span style={{ color: 'var(--text-tertiary)' }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>{auction.id.toUpperCase()}</span>
      </div>

      {/* ── Title row ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          {/* Category bar */}
          <div style={{
            width:           '4px',
            height:          '52px',
            borderRadius:    '2px',
            backgroundColor: catColor,
            flexShrink:      0,
            marginTop:       '3px',
            boxShadow:       isActive ? `0 0 10px ${catColor}` : 'none',
          }} />
          <div>
            <h1 style={{
              fontSize:      '22px',
              fontWeight:    700,
              color:         'var(--text-primary)',
              lineHeight:    1.2,
              letterSpacing: '-0.01em',
            }}>
              {auction.title}
            </h1>
            <p style={{
              fontSize:  '13px',
              color:     'var(--text-secondary)',
              marginTop: '4px',
            }}>
              {auction.subtitle}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <span className="mono" style={{
          color:           statusCol,
          backgroundColor: `color-mix(in srgb, ${statusCol} 10%, transparent)`,
          border:          `1px solid color-mix(in srgb, ${statusCol} 30%, transparent)`,
          padding:         '6px 16px',
          borderRadius:    '4px',
          fontSize:        '12px',
          letterSpacing:   '0.08em',
          fontWeight:      600,
          whiteSpace:      'nowrap',
          flexShrink:      0,
        }}>
          {auction.status === 'LIVE' && '● '}
          {auction.status}
        </span>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', alignItems: 'start' }}>

        {/* ══ LEFT COLUMN — static content ════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
  {/* Hero image */}
  {auction.imageUrl && (
    <div style={{
      borderRadius: '8px',
      overflow:     'hidden',
      border:       'var(--border-subtle)',
      position:     'relative',
      aspectRatio:  '16 / 7',
      backgroundColor: 'var(--bg-elevated)',
    }}>
      <img
        src={auction.imageUrl}
        alt={auction.title}
        style={{
          width:      '100%',
          height:     '100%',
          objectFit:  'cover',
          display:    'block',
          opacity:    auction.status === 'SOLD' ? 0.45 : 1,
          filter:     isActive
            ? `saturate(1.15) drop-shadow(0 0 20px color-mix(in srgb, ${catColor} 25%, transparent))`
            : 'saturate(0.8)',
          transition: 'opacity 0.3s ease',
        }}
      />
      {/* Category label overlay */}
      <span className="mono" style={{
        position:        'absolute',
        bottom:          '12px',
        left:            '12px',
        fontSize:        '10px',
        letterSpacing:   '0.08em',
        color:           catColor,
        backgroundColor: 'color-mix(in srgb, var(--bg-void) 80%, transparent)',
        border:          `1px solid color-mix(in srgb, ${catColor} 30%, transparent)`,
        padding:         '3px 8px',
        borderRadius:    '3px',
        backdropFilter:  'blur(4px)',
      }}>
        {auction.category.toUpperCase()}
      </span>
    </div>
  )}
          {/* Specs card — static, safe to render on server */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border:          'var(--border-subtle)',
            borderRadius:    '8px',
            overflow:        'hidden',
          }}>
            <div style={{
              padding:       '14px 20px',
              borderBottom:  'var(--border-subtle)',
              fontSize:      '11px',
              letterSpacing: '0.06em',
              color:         'var(--text-tertiary)',
            }}>
              SPECIFICATIONS
            </div>
            <div style={{ padding: '8px 0' }}>
              {Object.entries(auction.specs).map(([key, val], i) => (
                <div
                  key={key}
                  style={{
                    display:             'grid',
                    gridTemplateColumns: '140px 1fr',
                    gap:                 '12px',
                    padding:             '9px 20px',
                    backgroundColor:     i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)',
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {key}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tags — static */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {auction.tags.map(tag => (
              <span
                key={tag}
                className="mono"
                style={{
                  fontSize:        '10px',
                  color:           'var(--text-tertiary)',
                  backgroundColor: 'var(--bg-elevated)',
                  border:          'var(--border-subtle)',
                  padding:         '3px 8px',
                  borderRadius:    '3px',
                  letterSpacing:   '0.04em',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* ══ RIGHT COLUMN — LiveDetailClient island ══
            Renders: price history chart, bid history,
            countdown timer, bid input, watchlist toggle.
            Receives the server-fetched auction as the
            hydration seed; subscribes to AuctionContext
            for live updates after mount.
        ════════════════════════════════════════════ */}
        <LiveDetailClient initialAuction={auction} />
      </div>
    </div>
  );
}
