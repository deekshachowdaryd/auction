'use client';
import { useSupabaseRealtime } from '@/lib/hooks/useSupabaseRealtime';

// This component renders nothing — it just activates
// the Supabase Realtime hook so it runs globally across all pages.
// CS Note: This is the "headless component" pattern —
// a component whose only job is to run side effects,
// not render UI. Same idea as a Web Worker: invisible,
// but doing real work in the background.
export default function SimulatorProvider() {
  useSupabaseRealtime({ intervalMs: 4000, enabled: true });
  return null;
}