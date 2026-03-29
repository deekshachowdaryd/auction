'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/app/live/context/ToastContext';
import type { Toast, ToastVariant } from '@/app/live/context/ToastContext';

// ── Variant styles ────────────────────────────────
function getVariantStyles(variant: ToastVariant): {
  border:     string;
  iconColor:  string;
  icon:       string;
  titleColor: string;
} {
  switch (variant) {
    case 'success':
      return {
        border:     '1px solid color-mix(in srgb, var(--accent-green) 30%, transparent)',
        iconColor:  'var(--accent-green)',
        icon:       '✓',
        titleColor: 'var(--accent-green)',
      };
    case 'error':
      return {
        border:     '1px solid color-mix(in srgb, var(--accent-red) 30%, transparent)',
        iconColor:  'var(--accent-red)',
        icon:       '✕',
        titleColor: 'var(--accent-red)',
      };
    case 'warning':
      return {
        border:     '1px solid color-mix(in srgb, var(--accent-amber) 30%, transparent)',
        iconColor:  'var(--accent-amber)',
        icon:       '⚡',
        titleColor: 'var(--accent-amber)',
      };
    case 'info':
      return {
        border:     '1px solid color-mix(in srgb, var(--text-secondary) 20%, transparent)',
        iconColor:  'var(--text-secondary)',
        icon:       '●',
        titleColor: 'var(--text-primary)',
      };
  }
}

// ── Progress bar — drains over the toast's duration ──
function ProgressBar({
  duration,
  createdAt,
  variant,
}: {
  duration:  number;
  createdAt: number;
  variant:   ToastVariant;
}) {
  const [pct, setPct] = useState(100);

  // CS Note: requestAnimationFrame would be ideal here,
  // but a 50ms interval is imperceptible and simpler.
  // At 50ms ticks, we do 20 updates/sec — smooth enough
  // for a progress bar without burning CPU.
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - createdAt;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setPct(remaining);
    }, 50);
    return () => clearInterval(id);
  }, [duration, createdAt]);

  const colorMap: Record<ToastVariant, string> = {
    success: 'var(--accent-green)',
    error:   'var(--accent-red)',
    warning: 'var(--accent-amber)',
    info:    'var(--text-secondary)',
  };

  return (
    <div style={{
      position:        'absolute',
      bottom:          0,
      left:            0,
      right:           0,
      height:          '2px',
      backgroundColor: 'var(--bg-elevated)',
      borderRadius:    '0 0 8px 8px',
      overflow:        'hidden',
    }}>
      <div style={{
        height:          '100%',
        width:           `${pct}%`,
        backgroundColor: colorMap[variant],
        transition:      'width 50ms linear',
        borderRadius:    '0 0 8px 8px',
      }} />
    </div>
  );
}

// ── Single toast card ─────────────────────────────
function ToastCard({
  toast,
  onDismiss,
}: {
  toast:     Toast;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const styles = getVariantStyles(toast.variant);

  // Trigger enter animation on mount —
  // the 10ms delay gives the browser one paint cycle
  // to register the initial state before transitioning.
  // Without this, the browser skips the animation entirely.
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      style={{
        position:        'relative',
        backgroundColor: 'var(--bg-surface)',
        border:          styles.border,
        borderRadius:    '8px',
        padding:         '14px 16px',
        paddingBottom:   '18px',
        minWidth:        '300px',
        maxWidth:        '380px',
        boxShadow:       '0 8px 32px rgba(0,0,0,0.4)',
        display:         'flex',
        alignItems:      'flex-start',
        gap:             '12px',
        // Slide-in from right — GPU-accelerated transform
        transform:       visible ? 'translateX(0)' : 'translateX(110%)',
        opacity:         visible ? 1 : 0,
        transition:      'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 280ms ease',
        cursor:          'default',
      }}
    >
      {/* Icon */}
      <span style={{
        fontFamily:  'var(--font-mono)',
        fontSize:    '13px',
        color:       styles.iconColor,
        flexShrink:  0,
        marginTop:   '1px',
        fontWeight:  700,
      }}>
        {styles.icon}
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize:     '12px',
          fontFamily:   'var(--font-mono)',
          fontWeight:   700,
          color:        styles.titleColor,
          letterSpacing:'0.04em',
          marginBottom: toast.message ? '3px' : 0,
          whiteSpace:   'nowrap',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
        }}>
          {toast.title}
        </p>
        {toast.message && (
          <p style={{
            fontSize: '11px',
            color:    'var(--text-tertiary)',
            lineHeight: 1.4,
          }}>
            {toast.message}
          </p>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background:  'none',
          border:      'none',
          color:       'var(--text-tertiary)',
          fontSize:    '14px',
          cursor:      'pointer',
          padding:     '0 2px',
          lineHeight:  1,
          flexShrink:  0,
          marginTop:   '1px',
          transition:  'var(--transition-fast)',
        }}
        title="Dismiss"
      >
        ×
      </button>

      {/* Progress bar */}
      <ProgressBar
        duration={toast.duration}
        createdAt={toast.createdAt}
        variant={toast.variant}
      />
    </div>
  );
}

// ── Container — fixed position, stacks toasts ─────
export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  // Don't render the container at all if no toasts —
  // avoids an invisible div intercepting pointer events
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position:      'fixed',
      bottom:        '24px',
      right:         '24px',
      zIndex:        9999,
      display:       'flex',
      flexDirection: 'column',
      gap:           '8px',
      // pointer-events only on children, not the container itself
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastCard toast={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}