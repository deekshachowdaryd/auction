'use client';

// ═══════════════════════════════════════════════════
//  COMMAND PALETTE
//  Triggered by Cmd+K / Ctrl+K (wired in layout.tsx).
//  Searches auctions (live prices from context) and
//  static nav pages. Arrow keys + Enter to navigate.
//
//  CS Note: Fuzzy scoring — we count how many chars
//  of the query appear in the target string in order.
//  Higher score = better match. Same idea as fzf.
// ═══════════════════════════════════════════════════

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCommandPalette } from '@/app/live/context/CommandPaletteContext';
import { useAuctions } from '@/app/live/context/AuctionContext';
import type { Auction, AuctionStatus } from '@/lib/types';

// ── Types ─────────────────────────────────────────

type ResultKind = 'page' | 'auction';

interface PageResult {
  kind:        'page';
  id:          string;
  label:       string;
  description: string;
  href:        string;
  icon:        string;
}

interface AuctionResult {
  kind:     'auction';
  auction:  Auction;
  score:    number;
}

type Result = PageResult | AuctionResult;

// ── Static nav pages ─────────────────────────────

const PAGES: PageResult[] = [
  { kind: 'page', id: 'home',      label: 'All Markets',    description: 'Browse all active auctions',   href: '/',          icon: '◈' },
  { kind: 'page', id: 'live',      label: 'Live Feed',      description: 'Real-time bid activity',       href: '/live',      icon: '◉' },
  { kind: 'page', id: 'dashboard', label: 'Dashboard',      description: 'Your watchlist & bid history', href: '/dashboard', icon: '◧' },
  { kind: 'page', id: 'search',    label: 'Search',         description: 'Full-text auction search',     href: '/search',    icon: '◎' },
];

// ── Fuzzy scorer ──────────────────────────────────
// Returns 0 if query doesn't match at all,
// or a positive score (higher = better match).
// Exact substring match scores highest.

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (!q) return 1;
  if (t.includes(q)) return 100 + (q.length / t.length) * 50;

  // Character-order match
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  if (qi < q.length) return 0; // not all chars found in order
  return (q.length / t.length) * 40;
}

function scoreAuction(query: string, auction: Auction): number {
  return Math.max(
    fuzzyScore(query, auction.title),
    fuzzyScore(query, auction.category),
    fuzzyScore(query, auction.subtitle),
    ...auction.tags.map(t => fuzzyScore(query, t)),
  );
}

// ── Visual helpers ────────────────────────────────

function statusColor(status: AuctionStatus): string {
  switch (status) {
    case 'LIVE':     return 'var(--accent-green)';
    case 'ENDING':   return 'var(--accent-amber)';
    case 'OUTBID':   return 'var(--accent-red)';
    case 'UPCOMING': return 'var(--accent-blue)';
    case 'SOLD':     return 'var(--text-tertiary)';
    case 'RESERVED': return 'var(--accent-red)';
  }
}

function formatPrice(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Component ─────────────────────────────────────

export default function CommandPalette() {
  const router                          = useRouter();
  const { isOpen, closePalette, togglePalette }        = useCommandPalette();
  const { getAllAuctions }              = useAuctions();

  const [query,         setQuery]        = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef     = useRef<HTMLInputElement>(null);
  const resultsRef   = useRef<HTMLDivElement>(null);

  // ── Compute results ────────────────────────────
  // Derived synchronously — no useEffect needed.
  // This is "derived state": results are 100% determined
  // by (query, auctions). No need to store them separately.

  const results: Result[] = (() => {
    const auctions = getAllAuctions();

    if (!query.trim()) {
      // Empty query — show all pages + top 6 live auctions
      const liveAuctions: AuctionResult[] = auctions
        .filter(a => a.status === 'LIVE' || a.status === 'ENDING')
        .slice(0, 6)
        .map(a => ({ kind: 'auction', auction: a, score: 1 }));
      return [...PAGES, ...liveAuctions];
    }

    const matchedPages: PageResult[] = PAGES.filter(p =>
      p.label.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase())
    );

    const matchedAuctions: AuctionResult[] = auctions
      .map(a => ({ kind: 'auction' as const, auction: a, score: scoreAuction(query, a) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    return [...matchedPages, ...matchedAuctions];
  })();

  // ── Clamp selectedIndex when results change ────
  useEffect(() => {
    setSelectedIndex(idx => Math.min(idx, Math.max(0, results.length - 1)));
  }, [results.length]);

  // ── Focus input when opened ────────────────────
  useEffect(() => {
    if (isOpen) {
      // rAF ensures the modal has painted before we focus
      requestAnimationFrame(() => inputRef.current?.focus());
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        togglePalette();
      }
    }
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [togglePalette]);

  // ── Scroll selected item into view ────────────
  useEffect(() => {
    const container = resultsRef.current;
    if (!container) return;
    const selected = container.querySelector<HTMLElement>('[data-selected="true"]');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // ── Navigate to result ────────────────────────
  const navigate = useCallback((result: Result) => {
    closePalette();
    if (result.kind === 'page') {
      router.push(result.href);
    } else {
      router.push(`/auction/${result.auction.id}`);
    }
  }, [closePalette, router]);

  // ── Keyboard handler ──────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) navigate(results[selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        closePalette();
        break;
    }
  }, [results, selectedIndex, navigate, closePalette]);

  if (!isOpen) return null;

  // Group label helpers
  const hasPages    = results.some(r => r.kind === 'page');
  const hasAuctions = results.some(r => r.kind === 'auction');
  let pageCount = 0;
  let auctionCount = 0;

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={closePalette}
        style={{
          position:        'fixed',
          inset:           0,
          backgroundColor: 'rgba(0, 0, 0, 0.72)',
          backdropFilter:  'blur(2px)',
          zIndex:          999,
        }}
      />

      {/* ── Modal ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={{
          position:        'fixed',
          top:             '18vh',
          left:            '50%',
          transform:       'translateX(-50%)',
          width:           'min(640px, calc(100vw - 32px))',
          backgroundColor: 'var(--bg-surface)',
          border:          '1px solid var(--border-default)',
          borderRadius:    '10px',
          boxShadow:       '0 0 0 1px var(--accent-green-muted), 0 24px 80px rgba(0,0,0,0.8), 0 0 40px rgba(0, 255, 100, 0.04)',
          zIndex:          1000,
          overflow:        'hidden',
          display:         'flex',
          flexDirection:   'column',
          maxHeight:       '60vh',
        }}
      >
        {/* ── Scanline header ── */}
        <div style={{
          padding:      '0 16px',
          borderBottom: '1px solid var(--border-default)',
          display:      'flex',
          alignItems:   'center',
          gap:          '10px',
          flexShrink:   0,
        }}>
          {/* Search icon */}
          <span style={{
            fontSize:    '14px',
            color:       'var(--accent-green)',
            flexShrink:  0,
            lineHeight:  1,
            paddingTop:  '1px',
          }}>
            ◎
          </span>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search auctions, pages, categories..."
            spellCheck={false}
            autoComplete="off"
            style={{
              flex:            1,
              height:          '52px',
              background:      'transparent',
              border:          'none',
              outline:         'none',
              fontSize:        '15px',
              fontFamily:      'var(--font-mono)',
              color:           'var(--text-primary)',
              caretColor:      'var(--accent-green)',
            }}
          />

          {/* Escape hint */}
          <kbd style={{
            fontSize:        '10px',
            fontFamily:      'var(--font-mono)',
            color:           'var(--text-tertiary)',
            backgroundColor: 'var(--bg-elevated)',
            border:          '1px solid var(--border-default)',
            borderRadius:    '4px',
            padding:         '3px 7px',
            flexShrink:      0,
          }}>
            ESC
          </kbd>
        </div>

        {/* ── Results list ── */}
        <div
          ref={resultsRef}
          style={{ overflowY: 'auto', flex: 1 }}
        >
          {results.length === 0 ? (
            <div style={{
              padding:   '32px 20px',
              textAlign: 'center',
              fontSize:  '13px',
              color:     'var(--text-tertiary)',
              fontFamily:'var(--font-mono)',
            }}>
              NO RESULTS FOR &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((result, i) => {
              const isSelected = i === selectedIndex;

              // ── Group label injection ──
              let groupLabel: string | null = null;
              if (result.kind === 'page' && pageCount === 0) {
                groupLabel = 'PAGES';
                pageCount++;
              } else if (result.kind === 'auction' && auctionCount === 0) {
                groupLabel = query.trim() ? 'AUCTIONS' : 'LIVE NOW';
                auctionCount++;
              }

              return (
                <div key={result.kind === 'page' ? result.id : result.auction.id}>
                  {/* Group label */}
                  {groupLabel && (
                    <div style={{
                      padding:       '10px 16px 4px',
                      fontSize:      '10px',
                      letterSpacing: '0.1em',
                      color:         'var(--text-tertiary)',
                      fontFamily:    'var(--font-mono)',
                      fontWeight:    600,
                    }}>
                      {groupLabel}
                    </div>
                  )}

                  {/* Result row */}
                  <div
                    data-selected={isSelected}
                    onClick={() => navigate(result)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    style={{
                      display:         'flex',
                      alignItems:      'center',
                      gap:             '12px',
                      padding:         '9px 16px',
                      cursor:          'pointer',
                      backgroundColor: isSelected
                        ? 'color-mix(in srgb, var(--accent-green) 8%, transparent)'
                        : 'transparent',
                      borderLeft:      isSelected
                        ? '2px solid var(--accent-green)'
                        : '2px solid transparent',
                      transition:      'background-color 80ms, border-color 80ms',
                    }}
                  >
                    {result.kind === 'page' ? (
                      // ── Page result ──
                      <>
                        <span style={{
                          fontSize:   '16px',
                          color:      isSelected ? 'var(--accent-green)' : 'var(--text-tertiary)',
                          flexShrink: 0,
                          width:      '20px',
                          textAlign:  'center',
                          transition: 'color 80ms',
                        }}>
                          {result.icon}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize:  '13px',
                            fontWeight: 500,
                            color:     isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                            transition:'color 80ms',
                          }}>
                            {result.label}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color:    'var(--text-tertiary)',
                            marginTop:'1px',
                          }}>
                            {result.description}
                          </div>
                        </div>
                        <span style={{
                          fontSize:   '10px',
                          fontFamily: 'var(--font-mono)',
                          color:      'var(--text-tertiary)',
                          flexShrink: 0,
                        }}>
                          PAGE
                        </span>
                      </>
                    ) : (
                      // ── Auction result ──
                      <>
                        {/* Status dot */}
                        <span style={{
                          width:           '8px',
                          height:          '8px',
                          borderRadius:    '50%',
                          backgroundColor: statusColor(result.auction.status),
                          flexShrink:      0,
                          boxShadow:       (result.auction.status === 'LIVE' || result.auction.status === 'ENDING')
                            ? `0 0 6px ${statusColor(result.auction.status)}`
                            : 'none',
                        }} />

                        {/* Title + category */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize:     '13px',
                            fontWeight:   500,
                            color:        isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                            overflow:     'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace:   'nowrap',
                            transition:   'color 80ms',
                          }}>
                            {result.auction.title}
                          </div>
                          <div style={{
                            fontSize:  '11px',
                            color:     'var(--text-tertiary)',
                            marginTop: '1px',
                          }}>
                            {result.auction.category} · {result.auction.id.toUpperCase()}
                          </div>
                        </div>

                        {/* Live price */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{
                            fontSize:   '13px',
                            fontWeight: 600,
                            fontFamily: 'var(--font-mono)',
                            color:      isSelected ? 'var(--accent-green)' : 'var(--text-secondary)',
                            transition: 'color 80ms',
                          }}>
                            ${formatPrice(result.auction.currentBid)}
                          </div>
                          <div style={{
                            fontSize:   '10px',
                            fontFamily: 'var(--font-mono)',
                            color:      statusColor(result.auction.status),
                            marginTop:  '1px',
                            letterSpacing: '0.04em',
                          }}>
                            {result.auction.status}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer hint bar ── */}
        <div style={{
          display:       'flex',
          alignItems:    'center',
          gap:           '16px',
          padding:       '8px 16px',
          borderTop:     '1px solid var(--border-default)',
          flexShrink:    0,
          backgroundColor: 'var(--bg-elevated)',
        }}>
          {[
            { keys: ['↑', '↓'],   label: 'navigate' },
            { keys: ['↵'],        label: 'open'     },
            { keys: ['ESC'],      label: 'close'    },
          ].map(({ keys, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {keys.map(k => (
                <kbd key={k} style={{
                  fontSize:        '10px',
                  fontFamily:      'var(--font-mono)',
                  color:           'var(--text-secondary)',
                  backgroundColor: 'var(--bg-surface)',
                  border:          '1px solid var(--border-default)',
                  borderRadius:    '3px',
                  padding:         '2px 5px',
                }}>
                  {k}
                </kbd>
              ))}
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginLeft: '2px' }}>
                {label}
              </span>
            </div>
          ))}

          <span style={{
            marginLeft:  'auto',
            fontSize:    '10px',
            fontFamily:  'var(--font-mono)',
            color:       'var(--text-tertiary)',
            letterSpacing: '0.06em',
          }}>
            AUCTION TERMINAL
          </span>
        </div>
      </div>
    </>
  );
}