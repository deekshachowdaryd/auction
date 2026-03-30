'use client';

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';
import { AUCTIONS } from '@/lib/data';
import type { Auction } from '@/lib/types';
import { supabase } from '@/lib/supabase';

// ── State shape ───────────────────────────────────
export interface AuctionState {
  auctions: Map<string, Auction>;
  lastUpdated: number;
}

// ── Actions ───────────────────────────────────────
export type AuctionAction =
  | {
      type: 'BID_PLACED';
      payload: {
        auctionId: string;
        newBid: number;
        bidder: string;
      };
    }
  | {
      type: 'AUCTION_SOLD';
      payload: {
        auctionId: string;
        finalPrice: number;
        buyer: string;
      };
    }
  | {
      type: 'HYDRATE_AUCTIONS';
      payload: Map<string, Auction>;
    }
  | {
      type: 'NEW_AUCTION';
      payload: Auction;
    }
  | {
      type: 'RESET';
    };

// ── Reducer ───────────────────────────────────────
function auctionReducer(
  state: AuctionState,
  action: AuctionAction
): AuctionState {
  switch (action.type) {
    case 'BID_PLACED': {
      const { auctionId, newBid, bidder } = action.payload;
      const auction = state.auctions.get(auctionId);
      if (!auction) return state;

      const updatedAuction: Auction = {
        ...auction,
        currentBid: newBid,
        bidCount:   auction.bidCount + 1,
        recentBids: [
          {
            id:        `bid-${Date.now()}`,
            bidder,
            amount:    newBid,
            timestamp: Date.now(),
          },
          ...auction.recentBids.slice(0, 4),
        ],
        priceHistory: [
          ...auction.priceHistory,
          { t: Date.now(), price: newBid },
        ],
      };

      const updatedAuctions = new Map(state.auctions);
      updatedAuctions.set(auctionId, updatedAuction);

      return { auctions: updatedAuctions, lastUpdated: Date.now() };
    }

    case 'AUCTION_SOLD': {
      const { auctionId, finalPrice, buyer } = action.payload;
      const auction = state.auctions.get(auctionId);
      if (!auction) return state;

      // Mark the auction as SOLD locally — this immediately hides the bid
      // input, countdown, and Buy Now button in every component reading
      // from AuctionContext, without waiting for a Realtime event.
      const updatedAuction: Auction = {
        ...auction,
        status:     'SOLD',
        currentBid: finalPrice,
        recentBids: [
          {
            id:        `bid-${Date.now()}`,
            bidder:    buyer,
            amount:    finalPrice,
            timestamp: Date.now(),
          },
          ...auction.recentBids.slice(0, 4),
        ],
        priceHistory: [
          ...auction.priceHistory,
          { t: Date.now(), price: finalPrice },
        ],
      };

      const updatedAuctions = new Map(state.auctions);
      updatedAuctions.set(auctionId, updatedAuction);

      return { auctions: updatedAuctions, lastUpdated: Date.now() };
    }

    case 'HYDRATE_AUCTIONS': {
      return { auctions: action.payload, lastUpdated: Date.now() };
    }

    case 'NEW_AUCTION': {
      const updatedAuctions = new Map(state.auctions);
      updatedAuctions.set(action.payload.id, action.payload);
      return { auctions: updatedAuctions, lastUpdated: Date.now() };
    }

    case 'RESET': {
      return buildInitialState();
    }

    default:
      return state;
  }
}

// ── Initial state ─────────────────────────────────
function buildInitialState(): AuctionState {
  return {
    auctions:    new Map(AUCTIONS.map(a => [a.id, a])),
    lastUpdated: Date.now(),
  };
}

// ── Context types ─────────────────────────────────
interface AuctionContextValue {
  state:    AuctionState;
  dispatch: React.Dispatch<AuctionAction>;
  getLiveAuctions:  () => Auction[];
  getAuction:       (id: string) => Auction | undefined;
  getAllAuctions:    () => Auction[];
}

const AuctionContext = createContext<AuctionContextValue | null>(null);

// ── Provider ──────────────────────────────────────
export function AuctionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(auctionReducer, undefined, buildInitialState);

  // Fetch from Supabase on mount
  useEffect(() => {
    async function hydrateAuctions() {
      const { data, error } = await supabase.from('auctions').select('*');
      if (error || !data) return;

      const newMap = new Map<string, Auction>(state.auctions); // keep static mocks as base

      for (const row of data) {
        let parsedEndsAt = Date.now() + 86400000;
        if (row.ends_at) {
          parsedEndsAt = typeof row.ends_at === 'string' ? new Date(row.ends_at).getTime() : Number(row.ends_at);
          if (parsedEndsAt < 20000000000) parsedEndsAt *= 1000; // auto-correct epoch seconds
          if (isNaN(parsedEndsAt)) parsedEndsAt = Date.now() + 86400000;
        }

        // Demo Environment Self-Healing:
        // If the database time has historically passed but the system hasn't marked it SOLD,
        // automatically push the timer to +24hrs (or 30 mins) so the UI doesn't say "ENDED" on a LIVE badge.
        let safeStatus = row.status;

        if ((safeStatus === 'LIVE' || safeStatus === 'ENDING') && parsedEndsAt <= Date.now()) {
          parsedEndsAt = Date.now() + (safeStatus === 'ENDING' ? 1800000 : 86400000);
        }

        // Without a backend column for started_at, UPCOMING auctions default to Date.now()
        // which evaluates to '<= 0' instantly. We mathematically push them forward
        // using a deterministic pseudo-random hash of their ID so the UI shows
        // beautifully staggered unique start times (e.g. 5h, 12h, 2d).
        let idHash = 0;
        for (let i = 0; i < row.id.length; i++) {
          idHash = (idHash << 5) - idHash + row.id.charCodeAt(i);
          idHash |= 0;
        }
        const offsetMs = 3600000 + (Math.abs(idHash) % 255600000); // Between 1 and 72 hours
        
        const parsedStartedAt = safeStatus === 'UPCOMING' 
          ? Date.now() + offsetMs
          : Date.now();

        const base = newMap.get(row.id) || {
          // Mock missing UI fields for new listings
          id:            row.id,
          title:         row.title,
          subtitle:      'New Listing',
          category:      row.category,
          status:        safeStatus,
          currentBid:    row.current_bid,
          reservePrice:  row.current_bid,
          startingPrice: row.current_bid,
          buyNowPrice:   null,
          bidCount:      row.bid_count,
          watcherCount:  0,
          endsAt:        parsedEndsAt,
          startedAt:     parsedStartedAt,
          imageUrl:      null,
          seller: {
            handle:     `seller_${row.seller_id?.substring(0,6) || 'anon'}`,
            reputation: 100,
            totalSales: 0,
          },
          specs:         {},
          recentBids:    [],
          priceHistory:  [{ t: Date.now(), price: row.current_bid }],
          tags:          ['NEW LISTING'],
        };

        newMap.set(row.id, {
          ...base,
          title:      row.title,
          category:   row.category,
          status:     safeStatus,
          currentBid: row.current_bid,
          bidCount:   row.bid_count,
          endsAt:     parsedEndsAt,
          startedAt:  parsedStartedAt,
        });
      }
      dispatch({ type: 'HYDRATE_AUCTIONS', payload: newMap });
    }
    
    // Only run if we actually have state.auctions initialized and the database hasn't been fetched yet
    hydrateAuctions();
  }, []);

  const getLiveAuctions = useCallback(() => {
    return Array.from(state.auctions.values()).filter(
      a => a.status === 'LIVE' || a.status === 'ENDING' || a.status === 'UPCOMING'
    );
  }, [state.auctions]);

  const getAuction = useCallback(
    (id: string) => state.auctions.get(id),
    [state.auctions]
  );

  const getAllAuctions = useCallback(
    () => Array.from(state.auctions.values()),
    [state.auctions]
  );

  const value = useMemo(
    () => ({ state, dispatch, getLiveAuctions, getAuction, getAllAuctions }),
    [state, dispatch, getLiveAuctions, getAuction, getAllAuctions]
  );

  return (
    <AuctionContext.Provider value={value}>
      {children}
    </AuctionContext.Provider>
  );
}

// ── Custom hook ───────────────────────────────────
export function useAuctions() {
  const ctx = useContext(AuctionContext);
  if (!ctx) {
    throw new Error('useAuctions must be used inside <AuctionProvider>');
  }
  return ctx;
}