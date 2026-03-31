'use client'

// ═══════════════════════════════════════════════════
//  SIDEBAR — Client Component
//  CS Note: We use useSearchParams() to READ the URL,
//  and Next.js <Link> to WRITE to it. The sidebar never
//  owns the filter state — the URL does. This is the
//  single-source-of-truth principle applied to UI state.
// ═══════════════════════════════════════════════════

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuctions } from '@/app/live/context/AuctionContext'
import type { AuctionCategory } from '@/lib/types'

export default function SideBar() {
  const { getAllAuctions } = useAuctions()
  const auctions         = getAllAuctions()
  const searchParams     = useSearchParams()
  const currentCat       = searchParams.get('cat')  ?? 'All'
  const currentSort      = searchParams.get('sort') ?? 'endingSoon'

  // ── Compute real counts from live data ────────────
  const categoryCounts = auctions.reduce<Record<string, number>>(
    (acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + 1
      return acc
    },
    {}
  )

  const categories: {
    label: AuctionCategory | 'All'
    count: number
    icon:  string
  }[] = [
    { label: 'All',           count: auctions.length,                      icon: '◈' },
    { label: 'Electronics',   count: categoryCounts['Electronics']   ?? 0, icon: '⬡' },
    { label: 'Digital Art',   count: categoryCounts['Digital Art']   ?? 0, icon: '◇' },
    { label: 'Rare Sneakers', count: categoryCounts['Rare Sneakers'] ?? 0, icon: '◉' },
    { label: 'Watches',       count: categoryCounts['Watches']       ?? 0, icon: '◎' },
    { label: 'Keyboards',     count: categoryCounts['Keyboards']     ?? 0, icon: '▦' },
  ]

  // ── Compute real system status numbers ────────────
  const liveCount     = auctions.filter(a => a.status === 'LIVE').length
  const endingCount   = auctions.filter(a => a.status === 'ENDING').length
  const upcomingCount = auctions.filter(a => a.status === 'UPCOMING').length
  const totalWatchers = auctions.reduce((acc, a) => acc + a.watcherCount, 0)
  const totalBids     = auctions.reduce((acc, a) => acc + a.bidCount, 0)

  const categoryColors: Record<string, string> = {
    'All':           'var(--accent-green)',
    'Electronics':   'var(--accent-blue)',
    'Digital Art':   'var(--accent-green)',
    'Rare Sneakers': 'var(--accent-amber)',
    'Watches':       'var(--accent-red)',
    'Keyboards':     '#a78bfa',
  }

  const STATUS_ITEMS = [
    { label: 'Live Now',   value: liveCount,                             color: 'var(--accent-green)' },
    { label: 'Ending <1h', value: endingCount,                           color: 'var(--accent-red)'   },
    { label: 'Upcoming',   value: upcomingCount,                         color: 'var(--accent-blue)'  },
    { label: 'Watchers',   value: totalWatchers.toLocaleString('en-US'), color: 'var(--accent-amber)' },
  ]

  return (
    <aside style={{
      width:           '200px',
      flexShrink:      0,
      borderRight:     'var(--border-default)',
      display:         'flex',
      flexDirection:   'column',
      backgroundColor: 'var(--bg-surface)',
      minHeight:       'calc(100vh - 76px)',
    }}>

      {/* ── Section: Categories ── */}
      <div style={{ padding: '20px 0 8px' }}>
        <div style={{
          padding:       '0 16px 10px',
          fontFamily:    'var(--font-mono)',
          fontSize:      '9px',
          fontWeight:    700,
          color:         'var(--text-tertiary)',
          letterSpacing: '0.14em',
        }}>
          MARKETS
        </div>

        {categories.map((cat: any) => {
          const isActive = cat.label === currentCat
          const dotColor = categoryColors[cat.label] ?? 'var(--accent-green)'

          return (
            <Link
              key={cat.label}
              href={`/?cat=${cat.label}&sort=${currentSort}`}
              style={{
                width:           '100%',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'space-between',
                padding:         '9px 16px',
                textDecoration:  'none',
                borderLeft:      isActive
                  ? '2px solid var(--accent-green)'
                  : '2px solid transparent',
                transition:      'var(--transition-fast)',
                backgroundColor: isActive
                  ? 'var(--accent-green-muted)'
                  : 'transparent',
              }}
              className={`sidebar-cat-link ${isActive ? 'sidebar-cat-active' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {cat.label === 'All' ? (
                  <span style={{
                    fontSize: '12px',
                    color:    isActive ? 'var(--accent-green)' : 'var(--text-tertiary)',
                  }}>
                    {cat.icon}
                  </span>
                ) : (
                  <span style={{
                    width:           '7px',
                    height:          '7px',
                    borderRadius:    '50%',
                    backgroundColor: dotColor,
                    flexShrink:      0,
                    boxShadow:       isActive ? `0 0 6px ${dotColor}` : 'none',
                    transition:      'var(--transition-fast)',
                  }} />
                )}
                <span style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize:   '12px',
                  color:      isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                }}>
                  {cat.label}
                </span>
              </div>
              <span style={{
                fontFamily:         'var(--font-mono)',
                fontSize:           '10px',
                color:              isActive ? 'var(--accent-green-dim)' : 'var(--text-tertiary)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {cat.count}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Divider */}
      <div style={{ margin: '8px 16px', borderTop: 'var(--border-subtle)' }} />

      {/* ── Section: System Status ── */}
      <div style={{ padding: '8px 0 20px' }}>
        <div style={{
          padding:       '0 16px 10px',
          fontFamily:    'var(--font-mono)',
          fontSize:      '9px',
          fontWeight:    700,
          color:         'var(--text-tertiary)',
          letterSpacing: '0.14em',
        }}>
          SYSTEM STATUS
        </div>

        {STATUS_ITEMS.map((item) => (
          <div key={item.label} style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '8px 16px',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {item.label}
            </span>
            <span style={{
              fontFamily:         'var(--font-mono)',
              fontSize:           '12px',
              fontWeight:         700,
              color:              item.color,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {item.value}
            </span>
          </div>
        ))}

        {/* Live bids today — bonus row */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '8px 16px',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Bids Today
          </span>
          <span style={{
            fontFamily:         'var(--font-mono)',
            fontSize:           '12px',
            fontWeight:         700,
            color:              'var(--text-secondary)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {totalBids.toLocaleString()}
          </span>
        </div>
      </div>

    </aside>
  )
}