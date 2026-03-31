"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/live/context/AuthContext";

const BASE_STORAGE_KEY = "auction_terminal_watchlist_";

export function useWatchlist() {
  const { user } = useAuth();
  // Initialize with empty array — we'll hydrate from localStorage in useEffect
  // This avoids the SSR/client mismatch (localStorage doesn't exist on the server)
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once, after mount (client-side only) or when user changes
  useEffect(() => {
    try {
      const storageKey = BASE_STORAGE_KEY + (user ? user.id : "guest");
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setWatchlist(JSON.parse(stored));
      } else {
        setWatchlist([]);
      }
    } catch {
      // localStorage can throw in private browsing or if quota exceeded
      console.warn("Could not read watchlist from localStorage");
      setWatchlist([]);
    }
    setHydrated(true);
  }, [user?.id]);

  // Persist to localStorage every time watchlist changes (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      const storageKey = BASE_STORAGE_KEY + (user ? user.id : "guest");
      localStorage.setItem(storageKey, JSON.stringify(watchlist));
    } catch {
      console.warn("Could not persist watchlist to localStorage");
    }
  }, [watchlist, hydrated, user?.id]);

  // useCallback memoizes these functions so they don't cause re-renders
  // when passed as props — referential stability matters in React
  const addToWatchlist = useCallback((auctionId: string) => {
    setWatchlist((prev: string[]) =>
      prev.includes(auctionId) ? prev : [...prev, auctionId]
    );
  }, []);

  const removeFromWatchlist = useCallback((auctionId: string) => {
    setWatchlist((prev: string[]) => prev.filter((id: string) => id !== auctionId));
  }, []);

  const toggleWatchlist = useCallback((auctionId: string) => {
    setWatchlist((prev: string[]) =>
      prev.includes(auctionId)
        ? prev.filter((id: string) => id !== auctionId)
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