'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuctions }      from '@/app/live/context/AuctionContext'
import { useNotifications } from '@/app/live/context/NotificationContext'
import type { Notification } from '@/app/live/context/NotificationContext'
import Clock from '@/components/layout/Clock'
import { useAuth } from '@/app/live/context/AuthContext'

const NAV_LINKS = [
  { label: 'MARKET',    href: '/'          },
  { label: 'LIVE',      href: '/live'      },
  { label: 'SEARCH',    href: '/search'    },
  { label: 'DASHBOARD', href: '/dashboard' },
  { label: 'SELLER',    href: '/seller'    },
  { label: 'ADMIN',     href: '/admin'     },
  { label: 'WALLET',    href: '/wallet'    },
]

const TYPE_COLORS: Record<Notification['type'], string> = {
  OUTBID:      'var(--accent-red)',
  WATCHED_BID: 'var(--accent-green)',
  MARKET:      'var(--accent-blue)',
  SYSTEM:      'var(--accent-amber)',
}

const TYPE_LABELS: Record<Notification['type'], string> = {
  OUTBID:      '▼ OUTBID',
  WATCHED_BID: '★ WATCHED',
  MARKET:      '◈ MARKET',
  SYSTEM:      '⚙ SYSTEM',
}

function formatTimeAgo(ms: number): string {
  const diff = Date.now() - ms
  const m    = Math.floor(diff / 60_000)
  const h    = Math.floor(diff / 3_600_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Notification dropdown ─────────────────────────
function NotificationPanel({
  notifications,
  onMarkAllRead,
  onClearAll,
}: {
  notifications: Notification[]
  onMarkAllRead: () => void
  onClearAll:    () => void
}) {
  return (
    <div style={{
      position:        'absolute',
      top:             'calc(100% + 8px)',
      right:           0,
      width:           '340px',
      backgroundColor: 'var(--bg-surface)',
      border:          'var(--border-default)',
      borderRadius:    '8px',
      boxShadow:       '0 8px 32px rgba(0,0,0,0.6)',
      zIndex:          200,
      overflow:        'hidden',
    }}>
      {/* Header */}
      <div style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '12px 16px',
        borderBottom:    'var(--border-subtle)',
        backgroundColor: 'var(--bg-elevated)',
      }}>
        <span style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      '11px',
          letterSpacing: '0.07em',
          color:         'var(--text-primary)',
        }}>
          NOTIFICATIONS
        </span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onMarkAllRead}
            style={{
              background:    'none',
              border:        'none',
              fontFamily:    'var(--font-mono)',
              fontSize:      '10px',
              color:         'var(--accent-green)',
              cursor:        'pointer',
              letterSpacing: '0.05em',
              padding:       0,
            }}
          >
            MARK ALL READ
          </button>
          <button
            onClick={onClearAll}
            style={{
              background:    'none',
              border:        'none',
              fontFamily:    'var(--font-mono)',
              fontSize:      '10px',
              color:         'var(--text-tertiary)',
              cursor:        'pointer',
              letterSpacing: '0.05em',
              padding:       0,
            }}
          >
            CLEAR ALL
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{
            padding:   '32px 16px',
            textAlign: 'center',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   '11px',
              color:      'var(--text-tertiary)',
            }}>
              No notifications yet
            </p>
          </div>
        ) : (
          notifications.map((n, i) => (
            <div
              key={`${n.id}-${i}`}
              style={{
                display:         'flex',
                gap:             '12px',
                padding:         '12px 16px',
                borderBottom:    'var(--border-subtle)',
                backgroundColor: n.read ? 'transparent' : 'color-mix(in srgb, var(--accent-green) 4%, transparent)',
                transition:      'var(--transition-fast)',
              }}
            >
              {/* Unread dot */}
              <div style={{
                width:           '6px',
                height:          '6px',
                borderRadius:    '50%',
                backgroundColor: n.read ? 'transparent' : TYPE_COLORS[n.type],
                flexShrink:      0,
                marginTop:       '5px',
              }} />

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display:        'flex',
                  justifyContent: 'space-between',
                  alignItems:     'center',
                  marginBottom:   '3px',
                }}>
                  <span style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '9px',
                    letterSpacing: '0.07em',
                    color:         TYPE_COLORS[n.type],
                  }}>
                    {TYPE_LABELS[n.type]}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize:   '9px',
                    color:      'var(--text-tertiary)',
                  }}>
                    {formatTimeAgo(n.timestamp)}
                  </span>
                </div>
                <p style={{
                  fontSize:     '12px',
                  color:        'var(--text-primary)',
                  fontWeight:   500,
                  marginBottom: '2px',
                }}>
                  {n.title}
                </p>
                <p style={{
                  fontSize:     '11px',
                  color:        'var(--text-tertiary)',
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace:   'nowrap',
                }}>
                  {n.body}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function AvatarMenu({ profile, signOut }: {
  profile:  ReturnType<typeof useAuth>['profile'];
  signOut:  () => void;
}) {
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const avatarColor = profile?.role === 'manager' ? 'var(--accent-red)'
    : profile?.role === 'seller' ? 'var(--accent-amber)'
    : 'var(--accent-green)';

  return (
    <div ref={avatarRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setAvatarOpen(o => !o)}
        style={{
          width:           '30px',
          height:          '30px',
          borderRadius:    '50%',
          backgroundColor: 'var(--bg-elevated)',
          border:          `1px solid ${avatarColor}`,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          cursor:          'pointer',
          fontFamily:      'var(--font-mono)',
          fontSize:        '11px',
          color:           avatarColor,
          fontWeight:      700,
        }}
      >
        {profile?.avatarInitials ?? '··'}
      </button>

      {avatarOpen && (
        <div style={{
          position:        'absolute',
          top:             'calc(100% + 8px)',
          right:           0,
          width:           '200px',
          backgroundColor: 'var(--bg-surface)',
          border:          'var(--border-default)',
          borderRadius:    '8px',
          boxShadow:       '0 8px 32px rgba(0,0,0,0.6)',
          zIndex:          200,
          overflow:        'hidden',
        }}>
          <div style={{
            padding:         '12px 16px',
            borderBottom:    'var(--border-subtle)',
            backgroundColor: 'var(--bg-elevated)',
          }}>
            <p className="mono" style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 700 }}>
              {profile?.handle ?? '···'}
            </p>
            <p style={{
              fontSize: '11px', color: avatarColor,
              fontFamily: 'var(--font-mono)', marginTop: '2px', letterSpacing: '0.06em',
            }}>
              {profile?.role?.toUpperCase() ?? '···'}
            </p>
          </div>
          <button
            onClick={() => { setAvatarOpen(false); signOut(); }}
            style={{
              width:        '100%',
              padding:      '12px 16px',
              background:   'none',
              border:       'none',
              textAlign:    'left',
              fontFamily:   'var(--font-mono)',
              fontSize:     '11px',
              letterSpacing:'0.06em',
              color:        'var(--accent-red)',
              cursor:       'pointer',
            }}
          >
            SIGN OUT
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
//  TOPBAR
// ══════════════════════════════════════════════════
export default function TopBar() {
  const pathname                             = usePathname()
  const { getAllAuctions }                   = useAuctions()
  const { notifications, unreadCount,
          markAllRead, clearAll }            = useNotifications()
  const { profile, user, signOut }          = useAuth()
  const [bellOpen, setBellOpen]             = useState(false)
  const bellRef                             = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Mark all read when panel opens
  function handleBellClick() {
    const opening = !bellOpen
    setBellOpen(opening)
    if (opening) markAllRead()
  }

  const tickerItems = useMemo(() => {
    const allAuctions = getAllAuctions()
    const topLot      = [...allAuctions].sort((a, b) => b.currentBid - a.currentBid)[0]
    const liveCount   = allAuctions.filter(a => a.status === 'LIVE' || a.status === 'ENDING').length
    const totalBids   = allAuctions.reduce((sum, a) => sum + a.bidCount, 0)

    return [
      { label: 'BTC',     value: '67,842.10',   change: '+2.4%',     up: true  },
      { label: 'ETH',     value: '3,521.88',    change: '+1.1%',     up: true  },
      { label: 'ACTIVE',  value: String(liveCount), change: 'AUCTIONS', up: true },
      { label: 'BIDS',    value: totalBids.toLocaleString('en-US'), change: 'TODAY', up: true },
      { label: 'TOP LOT', value: topLot ? `$${topLot.currentBid.toLocaleString('en-US')}` : '—',
                          change: topLot ? topLot.title.split(' ').slice(0, 2).join(' ').toUpperCase() : '—',
                          up: true },
      { label: 'SOL',     value: '142.33',       change: '-0.8%',     up: false },
    ]
  }, [getAllAuctions])

  return (
    <header style={{
      position:             'sticky',
      top:                  0,
      zIndex:               100,
      backgroundColor:      'var(--bg-void)',
      borderBottom:         'var(--border-default)',
      backdropFilter:       'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    }}>

      {/* ── TOP STRIP ── */}
      <div style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '0 24px',
        height:          '28px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom:    '1px solid var(--bg-border)',
        overflow:        'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', overflow: 'hidden' }}>
          {tickerItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
                {item.label}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {item.value}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: item.up ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {item.change}
              </span>
              {i < tickerItems.length - 1 && (
                <span style={{ marginLeft: '10px', color: 'var(--bg-border)', fontSize: '12px', userSelect: 'none' }}>|</span>
              )}
            </div>
          ))}
        </div>
        <Clock />
      </div>

      {/* ── MAIN NAV ROW ── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '0 24px',
        height:         '48px',
      }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <div style={{
            width: '22px', height: '22px',
            backgroundColor: 'var(--accent-green)',
            borderRadius: '3px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--glow-green)',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--bg-void)', lineHeight: 1 }}>▶</span>
          </div>
          <span className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.12em' }}>
            AUCTION<span style={{ color: 'var(--accent-green)' }}>_</span>TERMINAL
          </span>
        </Link>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {NAV_LINKS
            .filter(navItem => {
              // Hide WALLET link if we're on seller or admin pages
              const isSpecial = pathname.startsWith('/seller') || pathname.startsWith('/admin')
              if (isSpecial && navItem.label === 'WALLET') return false
              return true
            })
            .map(navItem => {
            const isActive = navItem.href === '/' ? pathname === '/' : pathname.startsWith(navItem.href)
            return (
              <Link
                key={navItem.href}
                href={navItem.href}
                style={{
                  fontFamily:      'var(--font-mono)',
                  fontSize:        '11px',
                  fontWeight:      600,
                  letterSpacing:   '0.08em',
                  color:           isActive ? 'var(--accent-green)' : 'var(--text-secondary)',
                  textDecoration:  'none',
                  padding:         '6px 14px',
                  borderRadius:    '4px',
                  backgroundColor: isActive ? 'var(--accent-green-muted)' : 'transparent',
                  border:          isActive ? '1px solid rgba(0,255,65,0.2)' : '1px solid transparent',
                  transition:      'var(--transition-fast)',
                }}
                className={`nav-link ${isActive ? '' : 'nav-link-inactive'}`}
              >
                {navItem.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          {/* Bell — with live unread count badge */}
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button
              onClick={handleBellClick}
              style={{
                position:        'relative',
                background:      bellOpen ? 'var(--bg-elevated)' : 'none',
                border:          'var(--border-subtle)',
                borderRadius:    '4px',
                padding:         '6px 10px',
                cursor:          'pointer',
                color:           bellOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize:        '14px',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                transition:      'var(--transition-fast)',
              }}
            >
              🔔
              {/* Badge — only shown when there are unread notifications */}
              {unreadCount > 0 && (
                <span style={{
                  position:        'absolute',
                  top:             '3px',
                  right:           '3px',
                  minWidth:        '14px',
                  height:          '14px',
                  borderRadius:    '7px',
                  backgroundColor: 'var(--accent-red)',
                  border:          '1px solid var(--bg-void)',
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  fontFamily:      'var(--font-mono)',
                  fontSize:        '8px',
                  fontWeight:      700,
                  color:           '#fff',
                  padding:         '0 3px',
                  lineHeight:      1,
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown panel */}
            {bellOpen && (
              <NotificationPanel
                notifications={notifications}
                onMarkAllRead={markAllRead}
                onClearAll={clearAll}
              />
            )}
          </div>
          {/* Balance — real from Supabase, fallback while loading */}
          {(user && !pathname.startsWith('/seller') && !pathname.startsWith('/admin')) && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '4px',
              backgroundColor: 'var(--bg-surface)', border: 'var(--border-subtle)',
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>BAL</span>
              <span style={{ fontSize: '12px', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {profile
                  ? `$${profile.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '—'}
              </span>
            </div>
          )}

          {/* Avatar — initials from profile, sign out on click */}
{/* Avatar + role badge — initials from profile, sign out on click */}
{user ? (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

    {/* Role badge */}
    {profile?.role && (() => {
      const ROLE_META = {
        buyer:   { color: 'var(--accent-green)', label: 'BUYER'   },
        seller:  { color: 'var(--accent-amber)', label: 'SELLER'  },
        manager: { color: 'var(--accent-red)',   label: 'MANAGER' },
      } as const;
      const meta = ROLE_META[profile.role];
      return (
        <span style={{
          fontFamily:      'var(--font-mono)',
          fontSize:        '9px',
          letterSpacing:   '0.08em',
          fontWeight:      700,
          color:           meta.color,
          backgroundColor: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
          border:          `1px solid color-mix(in srgb, ${meta.color} 30%, transparent)`,
          padding:         '3px 8px',
          borderRadius:    '3px',
        }}>
          {meta.label}
        </span>
      );
    })()}

    <AvatarMenu profile={profile} signOut={signOut} />

  </div>
) : (
            <Link
              href="/login"
              style={{
                padding:         '6px 14px',
                backgroundColor: 'var(--accent-green)',
                borderRadius:    '4px',
                fontFamily:      'var(--font-mono)',
                fontSize:        '11px',
                fontWeight:      700,
                color:           '#000',
                textDecoration:  'none',
                letterSpacing:   '0.06em',
                boxShadow:       'var(--glow-green)',
              }}
            >
              SIGN IN
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}