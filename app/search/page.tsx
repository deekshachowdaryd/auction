'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuctions } from '@/app/live/context/AuctionContext';
import type { Auction } from '@/lib/types';

// ── Helpers ───────────────────────────────────────

function formatPrice(n: number): string {
  return '$' + n.toLocaleString('en-US')
}

function formatTimeLeft(endsAt: number): string {
  const diff = endsAt - Date.now()
  if (diff <= 0) return 'ENDED'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// ── Status styles — must be above ResultRow ───────

const STATUS_STYLES: Record<Auction['status'], { color: string; label: string }> = {
  LIVE:     { color: 'var(--accent-green)',  label: '● LIVE'     },
  ENDING:   { color: 'var(--accent-amber)',  label: '⚡ ENDING'  },
  UPCOMING: { color: 'var(--accent-blue)',   label: '◷ UPCOMING' },
  OUTBID:   { color: 'var(--accent-red)',    label: '↑ OUTBID'   },
  SOLD:     { color: 'var(--text-tertiary)', label: '✓ SOLD'     },
  RESERVED: { color: 'var(--accent-amber)',  label: '◈ RESERVED' },
}

// ── Highlight matched text ────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const q      = query.trim()
  const lower  = text.toLowerCase()
  const qLower = q.toLowerCase()
  const idx    = lower.indexOf(qLower)

  if (idx === -1) return <>{text}</>

  const before = text.slice(0, idx)
  const match  = text.slice(idx, idx + q.length)
  const after  = text.slice(idx + q.length)

  return (
    <>
      {before}
      <mark style={{
        backgroundColor: 'color-mix(in srgb, var(--accent-green) 25%, transparent)',
        color:           'var(--accent-green)',
        borderRadius:    '2px',
        padding:         '0 1px',
      }}>
        {match}
      </mark>
      {after}
    </>
  )
}

// ── Single result row ─────────────────────────────

function ResultRow({
  auction,
  query,
  isActive,
  onMouseEnter,
}: {
  auction:      Auction
  query:        string
  isActive:     boolean
  onMouseEnter: () => void
}) {
  const st          = STATUS_STYLES[auction.status as keyof typeof STATUS_STYLES]
  const isLive      = auction.status === 'LIVE' || auction.status === 'ENDING'

  return (
    <Link href={`/auction/${auction.id}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={onMouseEnter}
        style={{
          display:             'grid',
          gridTemplateColumns: '1fr auto',
          gap:                 '16px',
          alignItems:          'center',
          padding:             '14px 20px',
          backgroundColor:     isActive
            ? 'color-mix(in srgb, var(--accent-green) 6%, transparent)'
            : 'transparent',
          borderLeft:  isActive
            ? '2px solid var(--accent-green)'
            : '2px solid transparent',
          borderBottom: '1px solid color-mix(in srgb, var(--border-color, #fff) 8%, transparent)',
          cursor:       'pointer',
          transition:   'background-color 80ms ease, border-left-color 80ms ease',
        }}
        className="auction-row"
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', color: st.color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {st.label}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {auction.category}
            </span>
          </div>

          <p style={{
            fontSize:     '13px',
            fontWeight:   600,
            color:        'var(--text-primary)',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
            marginBottom: '2px',
          }}>
            <Highlight text={auction.title} query={query} />
          </p>

          <p style={{
            fontSize:     '11px',
            color:        'var(--text-tertiary)',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            <Highlight text={auction.subtitle} query={query} />
          </p>

          {auction.tags.some((t: string) => t.toLowerCase().includes(query.toLowerCase())) && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
              {auction.tags
                .filter((t: string) => t.toLowerCase().includes(query.toLowerCase()))
                .map((tag: string) => (
                  <span key={tag} style={{
                    fontSize:        '10px',
                    fontFamily:      'var(--font-mono)',
                    color:           'var(--accent-green)',
                    backgroundColor: 'color-mix(in srgb, var(--accent-green) 10%, transparent)',
                    border:          '1px solid color-mix(in srgb, var(--accent-green) 25%, transparent)',
                    borderRadius:    '3px',
                    padding:         '1px 5px',
                  }}>
                    #{tag}
                  </span>
                ))}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-green)' }}>
            {formatPrice(auction.currentBid)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            {auction.bidCount} bids
          </div>
          {isLive && (
            <div className="mono" style={{
              fontSize:  '10px',
              color:     auction.status === 'ENDING' ? 'var(--accent-amber)' : 'var(--text-tertiary)',
              marginTop: '2px',
            }}>
              {formatTimeLeft(auction.endsAt)}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── Category quick-filter chips ───────────────────

const CATEGORIES = ['Electronics', 'Digital Art', 'Rare Sneakers', 'Watches', 'Keyboards'] as const

function CategoryChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize:        '11px',
        fontFamily:      'var(--font-mono)',
        color:           'var(--text-secondary)',
        backgroundColor: 'transparent',
        border:          '1px solid color-mix(in srgb, var(--border-color, #fff) 15%, transparent)',
        borderRadius:    '4px',
        padding:         '4px 10px',
        cursor:          'pointer',
        transition:      'color 120ms, border-color 120ms, background-color 120ms',
        letterSpacing:   '0.04em',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.color           = 'var(--accent-green)'
        el.style.borderColor     = 'var(--accent-green)'
        el.style.backgroundColor = 'color-mix(in srgb, var(--accent-green) 8%, transparent)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.color           = 'var(--text-secondary)'
        el.style.borderColor     = 'color-mix(in srgb, var(--border-color, #fff) 15%, transparent)'
        el.style.backgroundColor = 'transparent'
      }}
    >
      {label}
    </button>
  )
}

// ── Main page ─────────────────────────────────────

export default function SearchPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { state }    = useAuctions()

  const [query,          setQuery]          = useState(searchParams.get('q') ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const [cursor,         setCursor]         = useState(-1)
  const [isMounted,      setIsMounted]      = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  // Client-side search implementation over the live context
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return []
    const q = debouncedQuery.toLowerCase()
    return Array.from(state.auctions.values())
      .filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.subtitle.toLowerCase().includes(q) || 
        a.category.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      )
      .sort((a, b) => b.bidCount - a.bidCount) // Basic relevance: popularity
  }, [debouncedQuery, state.auctions])

  useEffect(() => {
    setIsMounted(true)
    inputRef.current?.focus()
  }, [])

  // Sync typed query to URL conditionally to break Next.js router loop.
  // We compare the URL string before firing replace() to prevent infinite re-renders.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
      setCursor(-1)

      const currentQ = searchParams.get('q') ?? ''
      if (currentQ === query) return // break the infinite layout loop

      const params = new URLSearchParams(searchParams.toString())
      if (query) { params.set('q', query) } else { params.delete('q') }
      router.replace(`/search?${params.toString()}`, { scroll: false })
    }, 150)

    return () => clearTimeout(timer)
  }, [query, router, searchParams])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setCursor(c => Math.min(c + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setCursor(c => Math.max(c - 1, -1))
        break
      case 'Enter':
        if (cursor >= 0 && results[cursor]) {
          router.push(`/auction/${results[cursor].id}`)
        }
        break
      case 'Escape':
        setQuery('')
        setCursor(-1)
        break
    }
  }, [cursor, results, router])

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      <div>
        <h2 className="mono" style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
          SEARCH
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          {Array.from(state.auctions.values()).length} listings · full-text · dynamic live feed
        </p>
      </div>

      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '14px', color: 'var(--text-tertiary)', pointerEvents: 'none', userSelect: 'none',
        }}>
          ⌕
        </span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search auctions, categories, tags, sellers…"
          autoComplete="off"
          spellCheck={false}
          style={{
            width:           '100%',
            boxSizing:       'border-box',
            padding:         '12px 40px 12px 38px',
            fontSize:        '14px',
            fontFamily:      'var(--font-mono)',
            color:           'var(--text-primary)',
            backgroundColor: 'var(--bg-surface)',
            border:          '1px solid color-mix(in srgb, var(--accent-green) 30%, transparent)',
            borderRadius:    '6px',
            outline:         'none',
            letterSpacing:   '0.02em',
          }}
        />

        {query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus() }}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              fontSize: '16px', color: 'var(--text-tertiary)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', lineHeight: 1,
            }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <CategoryChip key={cat} label={cat} onClick={() => setQuery(cat)} />
        ))}
      </div>

      {results.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          <span><kbd style={{ padding: '1px 4px', border: '1px solid var(--text-tertiary)', borderRadius: '2px' }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ padding: '1px 4px', border: '1px solid var(--text-tertiary)', borderRadius: '2px' }}>↵</kbd> open</span>
          <span><kbd style={{ padding: '1px 4px', border: '1px solid var(--text-tertiary)', borderRadius: '2px' }}>esc</kbd> clear</span>
        </div>
      )}

      {!debouncedQuery && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>⌕</div>
          <p>Start typing to search across all {Array.from(state.auctions.values()).length} listings</p>
          <p style={{ marginTop: '6px', fontSize: '11px' }}>
            Try:{' '}
            <span className="mono" style={{ color: 'var(--text-secondary)' }}>rolex</span>,{' '}
            <span className="mono" style={{ color: 'var(--text-secondary)' }}>sealed</span>,{' '}
            <span className="mono" style={{ color: 'var(--text-secondary)' }}>nvidia</span>,{' '}
            <span className="mono" style={{ color: 'var(--text-secondary)' }}>1of1</span>
          </p>
        </div>
      )}

      {debouncedQuery && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>∅</div>
          <p>No results for <span className="mono" style={{ color: 'var(--text-secondary)' }}>"{debouncedQuery}"</span></p>
          <p style={{ marginTop: '6px', fontSize: '11px' }}>Try a shorter query or browse by category</p>
        </div>
      )}

      {results.length > 0 && (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border:          '1px solid color-mix(in srgb, var(--border-color, #fff) 10%, transparent)',
          borderRadius:    '8px',
          overflow:        'hidden',
        }}>
          <div style={{
            padding:        '10px 20px',
            borderBottom:   '1px solid color-mix(in srgb, var(--border-color, #fff) 8%, transparent)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
              {results.length} RESULT{results.length !== 1 ? 'S' : ''}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              sorted by relevance score
            </span>
          </div>

          {results.map((auction: Auction, i: number) => (
            <ResultRow
              key={auction.id}
              auction={auction}
              query={debouncedQuery}
              isActive={isMounted && cursor === i}
              onMouseEnter={() => setCursor(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}