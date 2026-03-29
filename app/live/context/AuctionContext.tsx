'use client';

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { AUCTIONS } from '@/lib/data';
import type { Auction } from '@/lib/types';

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

    case 'RESET':
      return buildInitialState();

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

  const getLiveAuctions = useCallback(() => {
    return Array.from(state.auctions.values()).filter(
      a => a.status === 'LIVE' || a.status === 'ENDING'
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