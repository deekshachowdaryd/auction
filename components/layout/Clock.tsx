'use client';

// ═══════════════════════════════════════════════════
//  CLOCK — Isolated Client Component
//  Extracted from TopBar so its 1-second setInterval
//  state updates are fully contained here.
//
//  CS Note: Before this extraction, TopBar re-rendered
//  every second — triggering useMemo comparison on
//  tickerItems even though the memo correctly bailed.
//  Isolating the clock means TopBar only re-renders
//  when auction data changes (~every 4s from simulator),
//  not on every clock tick. This is the "component
//  isolation" performance pattern — keep fast-changing
//  state as deep in the tree as possible.
// ═══════════════════════════════════════════════════

import { useState, useEffect } from 'react';

export default function Clock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour12:  false,
          hour:    '2-digit',
          minute:  '2-digit',
          second:  '2-digit',
        })
      );
    }
    tick(); // run immediately — no blank flash on mount
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
      <span style={{
        height:          '6px',
        width:           '6px',
        borderRadius:    '50%',
        backgroundColor: 'var(--accent-green)',
        display:         'inline-block',
        boxShadow:       'var(--glow-green)',
      }} />
      <span
        className="mono"
        style={{ fontSize: '11px', color: 'var(--text-secondary)' }}
        suppressHydrationWarning   // time differs between server snapshot and first client tick
      >
        {time || '00:00:00'}
      </span>
      <span className="mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
        UTC
      </span>
    </div>
  );
}
