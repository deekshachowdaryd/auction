'use client';

// ═══════════════════════════════════════════════════
//  PAGE TRANSITION
//  Wraps {children} in layout.tsx and animates on
//  every route change.
//
//  CS Note: Setting key={pathname} on the wrapper div
//  makes React unmount and remount the node on every
//  navigation — naturally triggering the CSS enter
//  animation. No useEffect, no state, no animation
//  library. This is the "key remount" pattern —
//  React's reconciler does the heavy lifting.
//
//  The animation itself is a gentle fade + 6px upward
//  slide: subtle enough not to feel sluggish, but
//  distinct enough to signal a page change.
// ═══════════════════════════════════════════════════

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [animClass, setAnimClass] = useState('page-transition');

  // Safely re-trigger the CSS animation on route change without
  // violently unmounting the React tree (which breaks Suspense
  // boundaries and causes glitchy flashes on client navigation).
  useEffect(() => {
    setAnimClass('');
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimClass('page-transition'));
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <div
      className={animClass}
      style={{
        // Ensure the wrapper fills the main column without
        // adding any layout side-effects.
        flex:    1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}