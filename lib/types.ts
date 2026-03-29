// ═══════════════════════════════════════════════════
//  AUCTION TERMINAL — Core Type Definitions
//  CS Note: These interfaces act like a "contract".
//  TypeScript enforces them at compile time, catching
//  mismatches before they become runtime bugs. Think
//  of them as table schemas for your frontend state.
// ═══════════════════════════════════════════════════

export type AuctionStatus =
  | 'LIVE'
  | 'ENDING'    // < 1 hour remaining
  | 'OUTBID'    // user was outbid (personal status)
  | 'UPCOMING'  // not yet started
  | 'SOLD'      // completed
  | 'RESERVED'; // reserve price not met

export type AuctionCategory =
  | 'Electronics'
  | 'Digital Art'
  | 'Rare Sneakers'
  | 'Watches'
  | 'Keyboards';

export interface Bid {
  id:        string;
  bidder:    string;   // anonymised handle e.g. "usr_7x4k"
  amount:    number;
  timestamp: number;   // Unix ms — fast to sort & diff
}

export interface Auction {
  id:            string;
  title:         string;
  subtitle:      string;         // e.g. "2023 · Space Gray · 36GB RAM"
  category:      AuctionCategory;
  status:        AuctionStatus;
  currentBid:    number;
  reservePrice:  number;
  startingPrice: number;
  buyNowPrice:   number | null;  // null = no buy-now option
  bidCount:      number;
  watcherCount:  number;
  endsAt:        number;         // Unix ms timestamp
  startedAt:     number;
  imageUrl:      string | null;

  // Seller info
  seller: {
    handle:     string;
    reputation: number;          // 0–100
    totalSales: number;
  };

  // Rich metadata per category
  specs: Record<string, string>;

  // Last 5 bids — enough for the live feed panel
  recentBids: Bid[];

  // Price history for the sparkline chart
  priceHistory: { t: number; price: number }[];

  // Tags drive the filter chips
  tags: string[];
}

// ── Derived / UI helpers ──────────────────────────

export interface MarketSummary {
  totalListings:  number;
  liveAuctions:   number;
  totalBidsToday: number;
  topLot:         { title: string; price: number };
}

export type SortKey =
  | 'endingSoon'
  | 'highestBid'
  | 'lowestBid'
  | 'mostBids'
  | 'newest';

export type FilterState = {
  category: AuctionCategory | 'All';
  status:   AuctionStatus   | 'All';
  sort:     SortKey;
  minPrice: number;
  maxPrice: number;
};