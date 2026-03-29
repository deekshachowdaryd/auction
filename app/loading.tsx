// ═══════════════════════════════════════════════════
//  HOME PAGE SKELETON — loading.tsx
//  Next.js App Router renders this instantly while
//  the async page.tsx is streaming in. No JS needed —
//  this is a pure Server Component.
//
//  CS Note: co-locating loading.tsx with page.tsx
//  causes Next.js to automatically wrap the segment
//  in a Suspense boundary. The skeleton must match
//  the real page's layout exactly — same grid columns,
//  same row heights — to prevent layout shift (CLS).
// ═══════════════════════════════════════════════════

// ── Reusable shimmer block ────────────────────────
// The animation is a CSS keyframe defined in globals.css.
// We pass width/height as props so one component covers
// every skeleton shape in the page.

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

// ── Skeleton auction row — mirrors the real grid ──
function SkeletonRow({ dim = false }: { dim?: boolean }) {
  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: '1fr 110px 80px 90px 100px',
      gap:                 '0 16px',
      alignItems:          'center',
      padding:             '14px 20px',
      borderRadius:        '6px',
      backgroundColor:     'var(--bg-surface)',
      border:              'var(--border-subtle)',
      opacity:             dim ? 0.5 : 1,
    }}>
      {/* Item column: category bar + title/subtitle stack */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Shimmer width="3px" height="32px" radius="2px" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <Shimmer width="55%" height="13px" />
          <Shimmer width="35%" height="11px" style={{ opacity: 0.6 }} />
        </div>
      </div>

      {/* Current bid */}
      <Shimmer width="80px" height="13px" style={{ marginLeft: 'auto' }} />

      {/* Bid count */}
      <Shimmer width="28px" height="12px" style={{ margin: '0 auto' }} />

      {/* Time left */}
      <Shimmer width="48px" height="12px" style={{ margin: '0 auto' }} />

      {/* Status badge */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Shimmer width="58px" height="22px" radius="4px" />
      </div>
    </div>
  );
}

export default function HomeLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Page header skeleton ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Shimmer width="140px" height="18px" />
          <Shimmer width="240px" height="12px" style={{ opacity: 0.6 }} />
        </div>
        <Shimmer width="80px" height="12px" />
      </div>

      {/* ── Filter bar skeleton ── */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        gap:           '6px',
        paddingBottom: '16px',
        borderBottom:  'var(--border-subtle)',
      }}>
        {/* Category chips */}
        {[70, 88, 110, 120, 80, 96].map((w, i) => (
          <Shimmer key={i} width={`${w}px`} height="28px" radius="4px" />
        ))}
        {/* Spacer */}
        <div style={{ flex: 1 }} />
        {/* Sort options */}
        {[88, 96, 80, 80, 66].map((w, i) => (
          <Shimmer key={i} width={`${w}px`} height="24px" radius="4px" style={{ opacity: 0.7 }} />
        ))}
      </div>

      {/* ── Column header row skeleton ── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '1fr 110px 80px 90px 100px',
        gap:                 '0 16px',
        padding:             '0 20px',
      }}>
        {[null, null, null, null, null].map((_, i) => (
          <Shimmer
            key={i}
            width={i === 0 ? '40px' : '60px'}
            height="10px"
            style={{ margin: i > 0 ? '0 auto' : undefined, opacity: 0.4 }}
          />
        ))}
      </div>

      {/* ── Auction rows skeleton ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* First 3 rows full opacity, last 3 fade out — suggests more content below */}
        {[false, false, false, true, true, true].map((dim, i) => (
          <SkeletonRow key={i} dim={dim} />
        ))}
      </div>
    </div>
  );
}