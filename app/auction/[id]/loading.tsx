// ═══════════════════════════════════════════════════
//  AUCTION DETAIL SKELETON — loading.tsx
//  Mirrors the two-column layout of [id]/page.tsx:
//  left column (specs + tags) and right column
//  (price history card + bid history + bid panel).
//
//  CS Note: Dynamic route segments support loading.tsx
//  identically to static routes — Next.js wraps the
//  entire [id] segment in a Suspense boundary and
//  renders this until the async page.tsx resolves.
// ═══════════════════════════════════════════════════

function Shimmer({
  width  = '100%',
  height = '14px',
  radius = '4px',
  style  = {} as React.CSSProperties,
}) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius:    radius,
        backgroundColor: 'var(--bg-elevated)',
        flexShrink:      0,
        ...style,
      }}
    />
  );
}

// ── Reusable card shell ───────────────────────────
function SkeletonCard({
  children,
  headerRight,
}: {
  children:     React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border:          'var(--border-subtle)',
      borderRadius:    '8px',
      overflow:        'hidden',
    }}>
      {/* Card header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '14px 20px',
        borderBottom:   'var(--border-subtle)',
      }}>
        <Shimmer width="120px" height="11px" style={{ opacity: 0.5 }} />
        {headerRight}
      </div>
      {children}
    </div>
  );
}

export default function AuctionDetailLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Breadcrumb skeleton ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Shimmer width="88px"  height="12px" />
        <Shimmer width="6px"   height="12px" style={{ opacity: 0.3 }} />
        <Shimmer width="100px" height="12px" />
        <Shimmer width="6px"   height="12px" style={{ opacity: 0.3 }} />
        <Shimmer width="64px"  height="12px" />
      </div>

      {/* ── Title row skeleton ── */}
      <div style={{
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
        gap:            '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          {/* Category bar */}
          <Shimmer width="4px" height="52px" radius="2px" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Shimmer width="320px" height="22px" />
            <Shimmer width="200px" height="13px" style={{ opacity: 0.6 }} />
          </div>
        </div>
        {/* Status badge */}
        <Shimmer width="72px" height="32px" radius="4px" style={{ flexShrink: 0 }} />
      </div>

      {/* ── Two-column layout skeleton ── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '1fr 320px',
        gap:                 '16px',
        alignItems:          'start',
      }}>

        {/* ══ LEFT COLUMN ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Specs card */}
          <SkeletonCard>
            <div style={{ padding: '8px 0' }}>
              {[55, 70, 45, 80, 60, 50].map((w, i) => (
                <div
                  key={i}
                  style={{
                    display:             'grid',
                    gridTemplateColumns: '140px 1fr',
                    gap:                 '12px',
                    padding:             '9px 20px',
                    backgroundColor:     i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)',
                  }}
                >
                  <Shimmer width="80px"    height="12px" style={{ opacity: 0.5 }} />
                  <Shimmer width={`${w}%`} height="12px" />
                </div>
              ))}
            </div>
          </SkeletonCard>

          {/* Tags row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {[48, 64, 56, 72, 44, 60].map((w, i) => (
              <Shimmer key={i} width={`${w}px`} height="22px" radius="3px" style={{ opacity: 0.5 }} />
            ))}
          </div>
        </div>

        {/* ══ RIGHT COLUMN ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Price history card */}
          <SkeletonCard
            headerRight={
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shimmer width="100px" height="20px" />
                <Shimmer width="52px"  height="22px" radius="4px" style={{ opacity: 0.6 }} />
              </div>
            }
          >
            {/* Sparkline placeholder */}
            <div style={{ padding: '16px 20px 12px' }}>
              <Shimmer width="100%" height="80px" radius="4px" style={{ opacity: 0.4 }} />
            </div>
            {/* Price range footer */}
            <div style={{
              display:        'flex',
              justifyContent: 'space-between',
              padding:        '8px 20px 14px',
            }}>
              <Shimmer width="72px" height="11px" style={{ opacity: 0.4 }} />
              <Shimmer width="72px" height="11px" style={{ opacity: 0.4 }} />
              <Shimmer width="72px" height="11px" style={{ opacity: 0.4 }} />
            </div>
          </SkeletonCard>

          {/* Bid history card */}
          <SkeletonCard
            headerRight={<Shimmer width="64px" height="11px" style={{ opacity: 0.4 }} />}
          >
            <div>
              {[false, false, false, true].map((dim, i) => (
                <div
                  key={i}
                  style={{
                    display:             'grid',
                    gridTemplateColumns: '1fr auto auto',
                    alignItems:          'center',
                    gap:                 '16px',
                    padding:             '10px 20px',
                    borderBottom:        i < 3 ? 'var(--border-subtle)' : 'none',
                    opacity:             dim ? 0.4 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {i === 0 && (
                      <Shimmer width="52px" height="16px" radius="3px" />
                    )}
                    <Shimmer width="80px" height="12px" />
                  </div>
                  <Shimmer width="64px" height="13px" />
                  <Shimmer width="44px" height="11px" style={{ opacity: 0.5 }} />
                </div>
              ))}
            </div>
          </SkeletonCard>

          {/* Bid panel skeleton */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border:          'var(--border-subtle)',
            borderRadius:    '8px',
            padding:         '20px',
            display:         'flex',
            flexDirection:   'column',
            gap:             '16px',
          }}>
            {/* Countdown */}
            <div style={{
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
            }}>
              <Shimmer width="80px"  height="11px" style={{ opacity: 0.5 }} />
              <Shimmer width="100px" height="28px" />
            </div>
            {/* Current bid display */}
            <div style={{
              padding:      '16px',
              borderRadius: '6px',
              border:       'var(--border-subtle)',
              display:      'flex',
              flexDirection:'column',
              gap:          '8px',
              alignItems:   'center',
            }}>
              <Shimmer width="60px"  height="11px" style={{ opacity: 0.5 }} />
              <Shimmer width="140px" height="32px" />
              <Shimmer width="100px" height="11px" style={{ opacity: 0.4 }} />
            </div>
            {/* Bid input */}
            <Shimmer width="100%" height="44px" radius="6px" />
            {/* Place bid button */}
            <Shimmer width="100%" height="44px" radius="6px" />
            {/* Watchlist button */}
            <Shimmer width="100%" height="36px" radius="6px" style={{ opacity: 0.5 }} />
          </div>

        </div>
      </div>
    </div>
  );
}