'use client';

import {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react';
import type { Auction }  from '@/lib/types';
import { useAuctions }   from '@/app/live/context/AuctionContext';

const STORAGE_KEY = 'auction_terminal_my_bids';

export type BidStatus = 'WINNING' | 'OUTBID' | 'WON' | 'LOST';

export interface MyBid {
  id:               string;
  auctionId:        string;
  auctionTitle:     string;
  auctionCategory:  string;
  myAmount:         number;
  currentPrice:     number;
  endsAt:           number;
  status:           BidStatus;
  placedAt:         number;
}

export interface BidStats {
  totalBids:       number;
  winning:         number;
  outbid:          number;
  won:             number;
  totalSpentOnWon: number;
  activeSpend:     number;
}

function computeStats(bids: MyBid[]): BidStats {
  return {
    totalBids:       bids.length,
    winning:         bids.filter(b => b.status === 'WINNING').length,
    outbid:          bids.filter(b => b.status === 'OUTBID').length,
    won:             bids.filter(b => b.status === 'WON').length,
    totalSpentOnWon: bids.filter(b => b.status === 'WON').reduce((s, b) => s + b.myAmount, 0),
    activeSpend:     bids.filter(b => b.status === 'WINNING').reduce((s, b) => s + b.myAmount, 0),
  };
}

function generateSeedBids(): MyBid[] {
  const now  = Date.now();
  const hour = 3_600_000;
  return [
    {
      id: 'bid-001', auctionId: 'auc_001',
      auctionTitle: 'Sony A7R V — 61MP Full-Frame Mirrorless',
      auctionCategory: 'Electronics',
      myAmount: 2100, currentPrice: 2100,
      endsAt: now + 2 * hour, status: 'WINNING', placedAt: now - 15 * 60_000,
    },
    {
      id: 'bid-002', auctionId: 'auc_003',
      auctionTitle: 'Beeple — Everydays Study #112',
      auctionCategory: 'Digital Art',
      myAmount: 1800, currentPrice: 2200,
      endsAt: now + 4 * hour, status: 'OUTBID', placedAt: now - 45 * 60_000,
    },
    {
      id: 'bid-003', auctionId: 'auc_004',
      auctionTitle: "Nike Air Jordan 1 Retro High OG 'Chicago'",
      auctionCategory: 'Rare Sneakers',
      myAmount: 950, currentPrice: 950,
      endsAt: now - 2 * hour, status: 'WON', placedAt: now - 5 * hour,
    },
    {
      id: 'bid-004', auctionId: 'auc_005',
      auctionTitle: 'TX-65 Portico 75% Keyboard Kit',
      auctionCategory: 'Custom Keyboards',
      myAmount: 380, currentPrice: 380,
      endsAt: now + 30 * 60_000, status: 'WINNING', placedAt: now - 20 * 60_000,
    },
  ];
}

// ── Context shape ─────────────────────────────────
interface MyBidsContextValue {
  bids:            MyBid[];
  activeBids:      MyBid[];
  historicalBids:  MyBid[];
  stats:           BidStats;
  hydrated:        boolean;
  placeBid:        (auction: Auction, amount: number) => void;
  clearBids:       () => void;
}

const MyBidsContext = createContext<MyBidsContextValue | null>(null);

export function MyBidsProvider({ children }: { children: React.ReactNode }) {
  const [bids, setBids]       = useState<MyBid[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { state }             = useAuctions();

  // Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setBids(stored ? JSON.parse(stored) : generateSeedBids());
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(generateSeedBids()));
      }
    } catch {
      setBids(generateSeedBids());
    }
    setHydrated(true);
  }, []);

  // Persist whenever bids change
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bids)); } catch { /* silent */ }
  }, [bids, hydrated]);

  // Sync status + currentPrice whenever AuctionContext receives a new bid
  useEffect(() => {
    if (!hydrated) return;
    setBids(prev => prev.map(bid => {
      const live = state.auctions.get(bid.auctionId);
      if (!live) return bid;
      if (bid.status === 'WON' || bid.status === 'LOST') return bid;
      const status: BidStatus = live.currentBid > bid.myAmount ? 'OUTBID' : 'WINNING';
      return { ...bid, currentPrice: live.currentBid, status };
    }));
  }, [state.lastUpdated, hydrated]);

  const placeBid = useCallback((auction: Auction, amount: number) => {
    const newBid: MyBid = {
      id:              `bid-${Date.now()}`,
      auctionId:       auction.id,
      auctionTitle:    auction.title,
      auctionCategory: auction.category,
      myAmount:        amount,
      currentPrice:    amount,
      endsAt:          auction.endsAt,
      status:          'WINNING',
      placedAt:        Date.now(),
    };
    setBids(prev => {
      const existing = prev.findIndex(b => b.auctionId === auction.id);
      if (existing !== -1) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], ...newBid };
        return updated;
      }
      return [newBid, ...prev];
    });
  }, []);

  const clearBids = useCallback(() => setBids([]), []);

  const stats          = computeStats(bids);
  const activeBids     = bids.filter(b => b.status === 'WINNING' || b.status === 'OUTBID').sort((a, b) => b.placedAt - a.placedAt);
  const historicalBids = bids.filter(b => b.status === 'WON'     || b.status === 'LOST').sort((a, b) => b.placedAt - a.placedAt);

  return (
    <MyBidsContext.Provider value={{ bids, activeBids, historicalBids, stats, hydrated, placeBid, clearBids }}>
      {children}
    </MyBidsContext.Provider>
  );
}

export function useMyBids() {
  const ctx = useContext(MyBidsContext);
  if (!ctx) throw new Error('useMyBids must be used inside MyBidsProvider');
  return ctx;
}