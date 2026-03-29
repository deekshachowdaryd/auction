"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "auction_terminal_watchlist";

export function useWatchlist() {
  // Initialize with empty array — we'll hydrate from localStorage in useEffect
  // This avoids the SSR/client mismatch (localStorage doesn't exist on the server)
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once, after mount (client-side only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setWatchlist(JSON.parse(stored));
      }
    } catch {
      // localStorage can throw in private browsing or if quota exceeded
      console.warn("Could not read watchlist from localStorage");
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage every time watchlist changes (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
    } catch {
      console.warn("Could not persist watchlist to localStorage");
    }
  }, [watchlist, hydrated]);

  // useCallback memoizes these functions so they don't cause re-renders
  // when passed as props — referential stability matters in React
  const addToWatchlist = useCallback((auctionId: string) => {
    setWatchlist((prev) =>
      prev.includes(auctionId) ? prev : [...prev, auctionId]
    );
  }, []);

  const removeFromWatchlist = useCallback((auctionId: string) => {
    setWatchlist((prev) => prev.filter((id) => id !== auctionId));
  }, []);

  const toggleWatchlist = useCallback((auctionId: string) => {
    setWatchlist((prev) =>
      prev.includes(auctionId)
        ? prev.filter((id) => id !== auctionId)
        : [...prev, auctionId]
    );
  }, []);

  const isWatching = useCallback(
    (auctionId: string) => watchlist.includes(auctionId),
    [watchlist]
  );

  return {
    watchlist,       // string[] of auction IDs
    hydrated,        // boolean — false until localStorage is read
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isWatching,
  };
}