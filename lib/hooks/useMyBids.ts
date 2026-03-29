"use client";

import { useState, useEffect, useCallback } from "react";
import { Auction } from "@/lib/types";
import { useAuctions } from "@/app/live/context/AuctionContext";

const STORAGE_KEY = "auction_terminal_my_bids";

export type BidStatus = "WINNING" | "OUTBID" | "WON" | "LOST";

export interface MyBid {
  id: string;           // unique bid ID
  auctionId: string;
  auctionTitle: string;
  auctionCategory: string;
  myAmount: number;     // what I bid
  currentPrice: number; // live current price of the auction
  endsAt: number;      // timestamp ms
  status: BidStatus;
  placedAt: number;     // timestamp ms when I placed the bid
}

// Derived stats — computed, never stored
export interface BidStats {
  totalBids: number;
  winning: number;
  outbid: number;
  won: number;
  totalSpentOnWon: number;
  activeSpend: number; // sum of my bids where I'm currently WINNING
}

function computeStats(bids: MyBid[]): BidStats {
  return {
    totalBids: bids.length,
    winning: bids.filter((b) => b.status === "WINNING").length,
    outbid: bids.filter((b) => b.status === "OUTBID").length,
    won: bids.filter((b) => b.status === "WON").length,
    totalSpentOnWon: bids
      .filter((b) => b.status === "WON")
      .reduce((sum, b) => sum + b.myAmount, 0),
    activeSpend: bids
      .filter((b) => b.status === "WINNING")
      .reduce((sum, b) => sum + b.myAmount, 0),
  };
}

// Seed some realistic mock bids so the dashboard isn't empty on first load
function generateSeedBids(): MyBid[] {
  const now = Date.now();
  const hour = 3600 * 1000;

  return [
    {
      id: "bid-001",
      auctionId: "1",
      auctionTitle: 'Sony A7R V — 61MP Full-Frame Mirrorless',
      auctionCategory: "Electronics",
      myAmount: 2100,
      currentPrice: 2100,
      endsAt: now + 2 * hour,
      status: "WINNING",
      placedAt: now - 15 * 60 * 1000,
    },
    {
      id: "bid-002",
      auctionId: "6",
      auctionTitle: "Beeple — Everydays Study #112",
      auctionCategory: "Digital Art",
      myAmount: 1800,
      currentPrice: 2200,
      endsAt: now + 4 * hour,
      status: "OUTBID",
      placedAt: now - 45 * 60 * 1000,
    },
    {
      id: "bid-003",
      auctionId: "11",
      auctionTitle: "Nike Air Jordan 1 Retro High OG 'Chicago'",
      auctionCategory: "Rare Sneakers",
      myAmount: 950,
      currentPrice: 950,
      endsAt: now - 2 * hour, // already ended
      status: "WON",
      placedAt: now - 5 * hour,
    },
    {
      id: "bid-004",
      auctionId: "16",
      auctionTitle: "Rolex Submariner Date 126610LN",
      auctionCategory: "Vintage Watches",
      myAmount: 9500,
      currentPrice: 11200,
      endsAt: now - 1 * hour,
      status: "LOST",
      placedAt: now - 6 * hour,
    },
    {
      id: "bid-005",
      auctionId: "21",
      auctionTitle: "TX-65 Portico 75% Keyboard Kit",
      auctionCategory: "Custom Keyboards",
      myAmount: 380,
      currentPrice: 380,
      endsAt: now + 30 * 60 * 1000, // ending soon
      status: "WINNING",
      placedAt: now - 20 * 60 * 1000,
    },
  ];
}

export function useMyBids() {
  const [bids, setBids] = useState<MyBid[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate — seed if first visit
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setBids(JSON.parse(stored));
      } else {
        // First visit: seed with mock bids
        const seeded = generateSeedBids();
        setBids(seeded);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      }
    } catch {
      console.warn("Could not read bids from localStorage");
      setBids(generateSeedBids());
    }
    setHydrated(true);
  }, []);

  // Persist on every change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bids));
    } catch {
      console.warn("Could not persist bids");
    }
  }, [bids, hydrated]);

  // After the persist useEffect
const { state } = useAuctions();

// Sync bid statuses whenever AuctionContext updates.
// CS Note: state.lastUpdated is a timestamp bumped by every
// BID_PLACED dispatch — using it as the dep means this effect
// fires exactly once per bid event, not on every render.
useEffect(() => {
  if (!hydrated) return;
  setBids(prev => prev.map(bid => {
    const live = state.auctions.get(bid.auctionId);
    if (!live) return bid;

    // Only re-evaluate bids that are still active
    if (bid.status === 'WON' || bid.status === 'LOST') return bid;

    const status: BidStatus = live.currentBid > bid.myAmount ? 'OUTBID' : 'WINNING';
    return { ...bid, currentPrice: live.currentBid, status };
  }));
}, [state.lastUpdated, hydrated]);

  // Place a new bid — called from BidPanel in a later phase
  const placeBid = useCallback(
    (auction: Auction, amount: number) => {
      const newBid: MyBid = {
        id: `bid-${Date.now()}`,
        auctionId: auction.id,
        auctionTitle: auction.title,
        auctionCategory: auction.category,
        myAmount: amount,
        currentPrice: amount,
        endsAt: auction.endsAt,
        status: "WINNING",
        placedAt: Date.now(),
      };

      setBids((prev) => {
        // If already bid on this auction, update it instead of duplicating
        const existing = prev.findIndex((b) => b.auctionId === auction.id);
        if (existing !== -1) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], ...newBid };
          return updated;
        }
        return [newBid, ...prev];
      });
    },
    []
  );

  const clearBids = useCallback(() => {
    setBids([]);
  }, []);

  // Derived — computed fresh every render from the stored array
  const stats = computeStats(bids);

  // Sorted views — most recent first
  const activeBids = bids
    .filter((b) => b.status === "WINNING" || b.status === "OUTBID")
    .sort((a, b) => b.placedAt - a.placedAt);

  const historicalBids = bids
    .filter((b) => b.status === "WON" || b.status === "LOST")
    .sort((a, b) => b.placedAt - a.placedAt);

  return {
    bids,
    activeBids,
    historicalBids,
    stats,
    hydrated,
    placeBid,
    clearBids,
  };
}