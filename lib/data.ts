// ═══════════════════════════════════════════════════
//  MOCK DATA — 25 Auctions across 5 categories
//  CS Note: We use a flat array + helper functions
//  instead of nested objects. Flat structures are
//  O(1) to index by id (via Map) and easier to sort/
//  filter without recursion. Same principle as
//  database normalisation.
// ═══════════════════════════════════════════════════

import type { Auction, MarketSummary } from './types';

const NOW  = Date.now();
const MIN  = 60_000;
const HOUR = 3_600_000;
const DAY  = 86_400_000;

// ── Seeded PRNG (Mulberry32 algorithm) ────────────
// CS Note: Math.random() is non-deterministic across
// JS runtimes — it produces a different sequence in
// Node.js (SSR) vs the browser (hydration), causing
// React hydration mismatches. A seeded PRNG always
// produces the SAME sequence from the same seed,
// making initial state identical on both sides.
// Mulberry32 is fast, small, and passes statistical
// randomness tests — ideal for mock data generation.
function makePRNG(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

// Single module-level RNG instance — fixed seed means
// the same call order always produces the same output.
const rng = makePRNG(0xABCD1234);

// Deterministic alphanumeric string using rng()
function randomId(len: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) {
    s += chars[Math.floor(rng() * chars.length)];
  }
  return s;
}

// ── Helper to generate fake price history ─────────
function makePriceHistory(
  base: number,
  points = 24,
  volatility = 0.04
): { t: number; price: number }[] {
  const history: { t: number; price: number }[] = [];
  let price = base * 0.72;

  for (let i = points; i >= 0; i--) {
    const swing = (rng() - 0.48) * volatility; // ← rng() not Math.random()
    price = Math.max(price * (1 + swing), base * 0.5);
    history.push({ t: NOW - i * HOUR, price: Math.round(price) });
  }

  history[history.length - 1].price = base;
  return history;
}

// ── Helper to generate fake recent bids ───────────
function makeBids(
  current: number,
  count: number
): Auction['recentBids'] {
  const bids = [];
  let price = current;

  for (let i = 0; i < Math.min(count, 5); i++) {
    price = Math.round(price * (0.88 + rng() * 0.08)); // ← rng()
    bids.push({
      id:        `bid_${randomId(7)}`,              // ← deterministic
      bidder:    `usr_${randomId(4)}`,              // ← deterministic
      amount:    price,
      timestamp: NOW - i * (MIN * (2 + rng() * 8)), // ← rng()
    });
  }

  return bids;
}

// ── The auctions ──────────────────────────────────
export const AUCTIONS: Auction[] = [

  // ── ELECTRONICS (6) ─────────────────────────────
  {
    id:            'auc_001',
    title:         'Apple MacBook Pro M3 Max',
    subtitle:      '16-inch · 36GB RAM · 1TB · Space Black',
    category:      'Electronics',
    status:        'LIVE',
    currentBid:    2847,
    reservePrice:  2500,
    startingPrice: 1800,
    buyNowPrice:   3400,
    bidCount:      18,
    watcherCount:  143,
    endsAt:        NOW + 2 * HOUR + 14 * MIN,
    startedAt:     NOW - 22 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'sys_depot', reputation: 98, totalSales: 412 },
    specs: {
      Chip:    'Apple M3 Max',
      RAM:     '36 GB Unified',
      Storage: '1 TB NVMe SSD',
      Display: '16.2" Liquid Retina XDR',
      Battery: '100Wh · 22hr rated',
      Year:    '2024',
    },
    recentBids:   makeBids(2847, 18),
    priceHistory: makePriceHistory(2847),
    tags:         ['apple', 'laptop', 'sealed', 'warranty'],
  },

  {
    id:            'auc_002',
    title:         'NVIDIA RTX 5090 FE',
    subtitle:      'Founders Edition · Factory Sealed · ASUS ROG Bundle',
    category:      'Electronics',
    status:        'ENDING',
    currentBid:    3100,
    reservePrice:  2800,
    startingPrice: 2000,
    buyNowPrice:   null,
    bidCount:      41,
    watcherCount:  892,
    endsAt:        NOW + 38 * MIN,
    startedAt:     NOW - 47 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'volt_rack', reputation: 94, totalSales: 88 },
    specs: {
      VRAM:         '32 GB GDDR7',
      'Core Clock': '2.9 GHz Boost',
      TDP:          '575W',
      Connector:    '16-pin 12VHPWR',
      Condition:    'Sealed in Box',
    },
    recentBids:   makeBids(3100, 41),
    priceHistory: makePriceHistory(3100, 24, 0.07),
    tags:         ['nvidia', 'gpu', 'sealed', 'rare'],
  },

  {
    id:            'auc_003',
    title:         'Sony A9 III Mirrorless',
    subtitle:      'Global Shutter · 120fps · Dual CFexpress',
    category:      'Electronics',
    status:        'LIVE',
    currentBid:    3580,
    reservePrice:  3200,
    startingPrice: 2400,
    buyNowPrice:   4200,
    bidCount:      9,
    watcherCount:  67,
    endsAt:        NOW + 8 * HOUR,
    startedAt:     NOW - 16 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'lens_vault', reputation: 97, totalSales: 234 },
    specs: {
      Sensor:   '24.6MP BSI-CMOS Global Shutter',
      ISO:      '100–51,200 (exp. 204,800)',
      AF:       '759-point phase-detect',
      Video:    '4K 120fps 10-bit',
      Shutter:  '1/80,000s electronic',
    },
    recentBids:   makeBids(3580, 9),
    priceHistory: makePriceHistory(3580),
    tags:         ['sony', 'camera', 'professional'],
  },

  {
    id:            'auc_004',
    title:         'iPhone 16 Pro Max 1TB',
    subtitle:      'Desert Titanium · Unlocked · AppleCare+',
    category:      'Electronics',
    status:        'UPCOMING',
    currentBid:    1320,
    reservePrice:  1200,
    startingPrice: 900,
    buyNowPrice:   1499,
    bidCount:      0,
    watcherCount:  211,
    endsAt:        NOW + 2 * DAY,
    startedAt:     NOW + 4 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'sys_depot', reputation: 98, totalSales: 412 },
    specs: {
      Chip:    'A18 Pro',
      Storage: '1 TB',
      Display: '6.9" ProMotion 120Hz',
      Camera:  '5x Optical Zoom · 4K 120fps',
      Color:   'Desert Titanium',
    },
    recentBids:   [],
    priceHistory: [],
    tags:         ['apple', 'iphone', 'unlocked', 'applecare'],
  },

  {
    id:            'auc_005',
    title:         'Lian Li O11D EVO XL',
    subtitle:      'Custom Hardline Loop · EK Blocks · Full White',
    category:      'Electronics',
    status:        'LIVE',
    currentBid:    1740,
    reservePrice:  1400,
    startingPrice: 800,
    buyNowPrice:   null,
    bidCount:      22,
    watcherCount:  388,
    endsAt:        NOW + 5 * HOUR + 30 * MIN,
    startedAt:     NOW - 18 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'coolant_co', reputation: 91, totalSales: 55 },
    specs: {
      Case:    'Lian Li O11D EVO XL',
      Loop:    'EK Quantum full hardline',
      GPU:     'RTX 4090 EK Waterblock',
      CPU:     'i9-14900K + 360mm rad',
      RGB:     'Unified ARGB',
    },
    recentBids:   makeBids(1740, 22),
    priceHistory: makePriceHistory(1740),
    tags:         ['custom-pc', 'watercooled', 'showcase'],
  },

  {
    id:            'auc_006',
    title:         'Steam Deck OLED 1TB',
    subtitle:      'Limited Edition Translucent Shell · Modded',
    category:      'Electronics',
    status:        'ENDING',
    currentBid:    780,
    reservePrice:  600,
    startingPrice: 400,
    buyNowPrice:   950,
    bidCount:      34,
    watcherCount:  521,
    endsAt:        NOW + 55 * MIN,
    startedAt:     NOW - 23 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1640955014216-75201056c829?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'deck_lab', reputation: 89, totalSales: 120 },
    specs: {
      Display:  '7.4" OLED 90Hz HDR',
      Storage:  '1TB NVMe',
      Battery:  '50Wh',
      Shell:    'Translucent Limited',
      Mods:     'Gulikit hall-effect sticks',
    },
    recentBids:   makeBids(780, 34),
    priceHistory: makePriceHistory(780, 24, 0.06),
    tags:         ['valve', 'handheld', 'limited', 'modded'],
  },

  // ── DIGITAL ART (5) ──────────────────────────────
  {
    id:            'auc_007',
    title:         'Beeple — Everydays #041',
    subtitle:      'Original 1/1 NFT + Signed Physical Print',
    category:      'Digital Art',
    status:        'ENDING',
    currentBid:    14200,
    reservePrice:  12000,
    startingPrice: 8000,
    buyNowPrice:   null,
    bidCount:      7,
    watcherCount:  1204,
    endsAt:        NOW + 22 * MIN,
    startedAt:     NOW - 71 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'vault_nft', reputation: 99, totalSales: 31 },
    specs: {
      Artist:    'Beeple (Mike Winkelmann)',
      Edition:   '1 of 1',
      Medium:    'Digital + Physical print',
      Blockchain: 'Ethereum',
      Token:     'ERC-721',
    },
    recentBids:   makeBids(14200, 7),
    priceHistory: makePriceHistory(14200, 24, 0.09),
    tags:         ['beeple', '1of1', 'signed', 'ethereum'],
  },

  {
    id:            'auc_008',
    title:         'XCOPY — Right-click Save',
    subtitle:      'Edition 3/10 · Superrare Provenance',
    category:      'Digital Art',
    status:        'LIVE',
    currentBid:    8600,
    reservePrice:  7000,
    startingPrice: 5000,
    buyNowPrice:   null,
    bidCount:      12,
    watcherCount:  674,
    endsAt:        NOW + 11 * HOUR,
    startedAt:     NOW - 13 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1634193295627-1cdddf751ebf?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'xcopy_col', reputation: 96, totalSales: 18 },
    specs: {
      Artist:     'XCOPY',
      Edition:    '3 of 10',
      Platform:   'SuperRare',
      Style:      'Glitch / Death',
      Blockchain: 'Ethereum',
    },
    recentBids:   makeBids(8600, 12),
    priceHistory: makePriceHistory(8600),
    tags:         ['xcopy', 'glitch', 'superrare'],
  },

  {
    id:            'auc_009',
    title:         'Dmitri Cherniak — Ringers #879',
    subtitle:      'Art Blocks Curated · Long-term holder',
    category:      'Digital Art',
    status:        'UPCOMING',
    currentBid:    44000,
    reservePrice:  38000,
    startingPrice: 30000,
    buyNowPrice:   null,
    bidCount:      0,
    watcherCount:  3821,
    endsAt:        NOW + 3 * DAY,
    startedAt:     NOW + 18 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'blocks_max', reputation: 100, totalSales: 9 },
    specs: {
      Artist:     'Dmitri Cherniak',
      Collection: 'Ringers',
      Token:      '#879',
      Platform:   'Art Blocks Curated',
      Rarity:     'Outlier trait distribution',
    },
    recentBids:   [],
    priceHistory: [],
    tags:         ['artblocks', 'ringers', 'generative', 'rare'],
  },

  {
    id:            'auc_010',
    title:         'Tyler Hobbs — Fidenza #313',
    subtitle:      'Art Blocks · Iconic turbulent flow field',
    category:      'Digital Art',
    status:        'LIVE',
    currentBid:    61000,
    reservePrice:  55000,
    startingPrice: 40000,
    buyNowPrice:   null,
    bidCount:      5,
    watcherCount:  5510,
    endsAt:        NOW + 4 * HOUR + 11 * MIN,
    startedAt:     NOW - 20 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'hobbs_src', reputation: 100, totalSales: 4 },
    specs: {
      Artist:  'Tyler Hobbs',
      Token:   'Fidenza #313',
      Series:  'Art Blocks Curated #78',
      Traits:  'Turbulent · Wide · Natural Palette',
      Rarity:  'Top 1%',
    },
    recentBids:   makeBids(61000, 5),
    priceHistory: makePriceHistory(61000, 24, 0.05),
    tags:         ['fidenza', 'hobbs', 'artblocks', 'blue-chip'],
  },

  {
    id:            'auc_011',
    title:         'Pak — Merge Collectible',
    subtitle:      'Mass × 48 · Consolidated parcel',
    category:      'Digital Art',
    status:        'SOLD',
    currentBid:    28400,
    reservePrice:  20000,
    startingPrice: 15000,
    buyNowPrice:   null,
    bidCount:      19,
    watcherCount:  882,
    endsAt:        NOW - 2 * DAY,
    startedAt:     NOW - 5 * DAY,
    imageUrl:      'https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'merge_dao', reputation: 97, totalSales: 14 },
    specs: {
      Artist:  'Pak',
      Token:   'Merge (mass × 48)',
      Network: 'Ethereum',
      Type:    'Dynamic NFT',
    },
    recentBids:   makeBids(28400, 5),
    priceHistory: makePriceHistory(28400),
    tags:         ['pak', 'merge', 'dynamic'],
  },

  // ── RARE SNEAKERS (5) ────────────────────────────
  {
    id:            'auc_012',
    title:         'Air Jordan 1 Chicago OG 1985',
    subtitle:      'Bred tag · Size 10.5 US · Original box',
    category:      'Rare Sneakers',
    status:        'ENDING',
    currentBid:    8500,
    reservePrice:  7500,
    startingPrice: 5000,
    buyNowPrice:   null,
    bidCount:      28,
    watcherCount:  1440,
    endsAt:        NOW + 45 * MIN,
    startedAt:     NOW - 47 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'og_kicks', reputation: 95, totalSales: 177 },
    specs: {
      Model:     'Air Jordan 1 High OG',
      Year:      '1985 (original)',
      Size:      '10.5 US / 44.5 EU',
      Condition: '7/10 · Yellowing sole',
      Includes:  'OG box, hang tag',
    },
    recentBids:   makeBids(8500, 28),
    priceHistory: makePriceHistory(8500, 24, 0.08),
    tags:         ['jordan', 'og', '1985', 'chicago', 'vintage'],
  },

  {
    id:            'auc_013',
    title:         'Nike Air Yeezy 1 Prototype',
    subtitle:      'Sample / 1-of-1 · Grammy Performance Pair',
    category:      'Rare Sneakers',
    status:        'UPCOMING',
    currentBid:    110000,
    reservePrice:  100000,
    startingPrice: 80000,
    buyNowPrice:   null,
    bidCount:      0,
    watcherCount:  14230,
    endsAt:        NOW + 7 * DAY,
    startedAt:     NOW + 24 * HOUR,
    imageUrl:      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_CnT6if4q77Peflz5b82X6X12bZAVjcd8Lw&s',
    seller:        { handle: 'proto_vault', reputation: 100, totalSales: 3 },
    specs: {
      Model:     'Nike Air Yeezy 1 Proto',
      Worn:      '2008 Grammy Awards',
      Size:      '12 US',
      Condition: 'Sample / 1 of 1',
      Auth:      'GOAT certified + provenance docs',
    },
    recentBids:   [],
    priceHistory: [],
    tags:         ['yeezy', 'nike', 'sample', 'grammy', '1of1'],
  },

  {
    id:            'auc_014',
    title:         'New Balance 990v1 "Grey"',
    subtitle:      'DS · Size 11 US · 1982 First Production Run',
    category:      'Rare Sneakers',
    status:        'LIVE',
    currentBid:    4200,
    reservePrice:  3500,
    startingPrice: 2500,
    buyNowPrice:   5000,
    bidCount:      11,
    watcherCount:  332,
    endsAt:        NOW + 6 * HOUR + 22 * MIN,
    startedAt:     NOW - 18 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'nb_archive', reputation: 93, totalSales: 62 },
    specs: {
      Model:     'NB 990v1',
      Year:      '1982 First Run',
      Size:      '11 US / 45 EU',
      Condition: 'Deadstock',
      Made:      'USA',
    },
    recentBids:   makeBids(4200, 11),
    priceHistory: makePriceHistory(4200),
    tags:         ['new-balance', 'usa', 'deadstock', 'vintage'],
  },

  {
    id:            'auc_015',
    title:         'Adidas Yeezy 350 V2 "Zebra"',
    subtitle:      'DS · CP9654 · Size 9.5 US',
    category:      'Rare Sneakers',
    status:        'ENDING',
    currentBid:    620,
    reservePrice:  500,
    startingPrice: 300,
    buyNowPrice:   750,
    bidCount:      33,
    watcherCount:  289,
    endsAt:        NOW + 29 * MIN,
    startedAt:     NOW - 71 * HOUR,
    imageUrl:      'https://image-cdn.hypb.st/https%3A%2F%2Fhypebeast.com%2Fimage%2F2017%2F01%2Fadidas-yeezy-boost-350-v2-zebra-release-date-1.jpg?q=75&w=800&cbr=1&fit=max',
    seller:        { handle: 'triple_ds', reputation: 88, totalSales: 344 },
    specs: {
      Model:     'Yeezy 350 V2 Zebra',
      SKU:       'CP9654',
      Size:      '9.5 US / 43.5 EU',
      Condition: 'Deadstock',
    },
    recentBids:   makeBids(620, 33),
    priceHistory: makePriceHistory(620, 24, 0.06),
    tags:         ['yeezy', 'adidas', 'zebra', 'deadstock'],
  },

  {
    id:            'auc_016',
    title:         'Salehe Bembury × NB 2002R "Yurt"',
    subtitle:      'Size 10 US · Collab · DS',
    category:      'Rare Sneakers',
    status:        'LIVE',
    currentBid:    340,
    reservePrice:  280,
    startingPrice: 200,
    buyNowPrice:   420,
    bidCount:      14,
    watcherCount:  198,
    endsAt:        NOW + 9 * HOUR,
    startedAt:     NOW - 15 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'collab_crv', reputation: 90, totalSales: 88 },
    specs: {
      Model:     'New Balance 2002R',
      Collab:    'Salehe Bembury',
      Size:      '10 US / 44 EU',
      Condition: 'Deadstock',
    },
    recentBids:   makeBids(340, 14),
    priceHistory: makePriceHistory(340),
    tags:         ['new-balance', 'collab', 'bembury'],
  },

  // ── WATCHES (5) ──────────────────────────────────
  {
    id:            'auc_017',
    title:         'Rolex Daytona Ref 6265',
    subtitle:      '1971 · "Paul Newman" Dial · Full Set',
    category:      'Watches',
    status:        'LIVE',
    currentBid:    61000,
    reservePrice:  55000,
    startingPrice: 45000,
    buyNowPrice:   null,
    bidCount:      6,
    watcherCount:  2104,
    endsAt:        NOW + 3 * HOUR + 44 * MIN,
    startedAt:     NOW - 21 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'patina_co', reputation: 99, totalSales: 22 },
    specs: {
      Reference: '6265',
      Year:      '1971',
      Dial:      'Paul Newman exotic',
      Movement:  'Cal. 727 manual-wind',
      Case:      '37mm Oyster steel',
      Papers:    'Full set, original bracelet',
    },
    recentBids:   makeBids(61000, 6),
    priceHistory: makePriceHistory(61000, 24, 0.03),
    tags:         ['rolex', 'daytona', 'paul-newman', 'vintage', 'full-set'],
  },

  {
    id:            'auc_018',
    title:         'Patek Philippe Nautilus 5711/1A',
    subtitle:      '2020 · Blue Dial · Service Papers',
    category:      'Watches',
    status:        'ENDING',
    currentBid:    134000,
    reservePrice:  120000,
    startingPrice: 100000,
    buyNowPrice:   null,
    bidCount:      4,
    watcherCount:  6732,
    endsAt:        NOW + 51 * MIN,
    startedAt:     NOW - 71 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'pp_resale', reputation: 100, totalSales: 7 },
    specs: {
      Reference: '5711/1A-010',
      Year:      '2020',
      Dial:      'Gradated blue',
      Movement:  'Cal. 26-330 S C auto',
      Case:      '40mm stainless steel',
      Includes:  'Box, papers, service receipt',
    },
    recentBids:   makeBids(134000, 4),
    priceHistory: makePriceHistory(134000, 24, 0.02),
    tags:         ['patek', 'nautilus', 'discontinued', 'blue'],
  },

  {
    id:            'auc_019',
    title:         'A. Lange & Söhne Datograph',
    subtitle:      'Ref 403.035 · Platinum · Flyback Chronograph',
    category:      'Watches',
    status:        'UPCOMING',
    currentBid:    88000,
    reservePrice:  80000,
    startingPrice: 70000,
    buyNowPrice:   null,
    bidCount:      0,
    watcherCount:  1888,
    endsAt:        NOW + 4 * DAY,
    startedAt:     NOW + 3 * HOUR,
    imageUrl:      'https://monochrome-watches.com/wp-content/uploads/2024/05/Lange-Sohne-Datograph-Up-Down-25th-anniversary-white-gold-blue-dial-review-restrospective-history-Datograph-2.jpg',
    seller:        { handle: 'lange_src', reputation: 100, totalSales: 5 },
    specs: {
      Reference: '403.035',
      Metal:     'Platinum',
      Movement:  'Cal. L951.6 flyback',
      Case:      '39mm',
      Functions: 'Flyback chrono, outsize date',
    },
    recentBids:   [],
    priceHistory: [],
    tags:         ['lange', 'datograph', 'platinum', 'flyback'],
  },

  {
    id:            'auc_020',
    title:         'Seiko 6159-7001 "Tuna"',
    subtitle:      '1975 · Original "Grandfather Tuna" · Full Titanium',
    category:      'Watches',
    status:        'LIVE',
    currentBid:    9800,
    reservePrice:  8000,
    startingPrice: 5000,
    buyNowPrice:   12000,
    bidCount:      17,
    watcherCount:  744,
    endsAt:        NOW + 7 * HOUR + 5 * MIN,
    startedAt:     NOW - 17 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'depth_col', reputation: 94, totalSales: 49 },
    specs: {
      Reference: '6159-7001',
      Year:      '1975',
      Nickname:  'Grandfather Tuna',
      Movement:  'Cal. 6159A auto',
      Case:      'Full titanium shroud',
      WR:        '600m',
    },
    recentBids:   makeBids(9800, 17),
    priceHistory: makePriceHistory(9800),
    tags:         ['seiko', 'tuna', 'diver', 'titanium', 'vintage'],
  },

  {
    id:            'auc_021',
    title:         'F.P. Journe Chronomètre Bleu',
    subtitle:      'Tantalum Case · Blue Brass Dial · Signed Buckle',
    category:      'Watches',
    status:        'LIVE',
    currentBid:    47500,
    reservePrice:  42000,
    startingPrice: 35000,
    buyNowPrice:   null,
    bidCount:      8,
    watcherCount:  1103,
    endsAt:        NOW + 1 * HOUR + 18 * MIN,
    startedAt:     NOW - 23 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'journe_int', reputation: 99, totalSales: 11 },
    specs: {
      Model:     'Chronomètre Bleu',
      Case:      'Tantalum (rare metal)',
      Dial:      'Blue brass with remontoir',
      Movement:  'Cal. 1304 (resonance)',
      Size:      '39mm',
    },
    recentBids:   makeBids(47500, 8),
    priceHistory: makePriceHistory(47500, 24, 0.04),
    tags:         ['fpjourne', 'tantalum', 'independent', 'blue'],
  },

  // ── KEYBOARDS (4) ────────────────────────────────
  {
    id:            'auc_022',
    title:         'GMK Dracula R2 Fullkit',
    subtitle:      'Cherry profile · Base + Novelties + Addons',
    category:      'Keyboards',
    status:        'UPCOMING',
    currentBid:    340,
    reservePrice:  280,
    startingPrice: 200,
    buyNowPrice:   440,
    bidCount:      0,
    watcherCount:  87,
    endsAt:        NOW + 1 * DAY + 4 * HOUR,
    startedAt:     NOW + 2 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'keycap_kv', reputation: 92, totalSales: 156 },
    specs: {
      Profile:  'Cherry (GMK)',
      Material: 'ABS doubleshot',
      Kit:      'Base + Novelties + Spacebars + Addons',
      Colorway: 'Dracula R2',
      Units:    'GB run — never opened',
    },
    recentBids:   [],
    priceHistory: [],
    tags:         ['gmk', 'dracula', 'cherry', 'keycaps'],
  },

  {
    id:            'auc_023',
    title:         'Keycult No.2/65 Rev.1',
    subtitle:      'Brass weight · Zeal Aqua switches · Lubed',
    category:      'Keyboards',
    status:        'LIVE',
    currentBid:    1480,
    reservePrice:  1200,
    startingPrice: 800,
    buyNowPrice:   null,
    bidCount:      21,
    watcherCount:  612,
    endsAt:        NOW + 4 * HOUR + 55 * MIN,
    startedAt:     NOW - 19 * HOUR,
    imageUrl:      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80&auto=format&fit=crop',
    seller:        { handle: 'endgame_kb', reputation: 96, totalSales: 73 },
    specs: {
      Layout:    '65%',
      Case:      'CNC aluminium + brass weight',
      Switches:  'Zeal Aqua 67g tactile (lubed)',
      Keycaps:   'GMK Muted R2',
      PCB:       'Hotswap USB-C',
      Mount:     'Top mount',
    },
    recentBids:   makeBids(1480, 21),
    priceHistory: makePriceHistory(1480),
    tags:         ['keycult', '65%', 'brass', 'zeal', 'endgame'],
  },

  {
    id:            'auc_024',
    title:         'HHKB Professional Hybrid Type-S',
    subtitle:      '45g Topre · White PBT · BT + USB-C',
    category:      'Keyboards',
    status:        'ENDING',
    currentBid:    310,
    reservePrice:  250,
    startingPrice: 180,
    buyNowPrice:   380,
    bidCount:      16,
    watcherCount:  234,
    endsAt:        NOW + 44 * MIN,
    startedAt:     NOW - 71 * HOUR,
    imageUrl:      'https://cdn.mos.cms.futurecdn.net/z9PDHx72iYFvkG387mmWnb.jpeg',
    seller:        { handle: 'topre_tmpl', reputation: 90, totalSales: 44 },
    specs: {
      Switch:    'Topre 45g silent',
      Layout:    '60% HHKB',
      Case:      'White PBT',
      Connect:   'Bluetooth 4.2 + USB-C',
      Feature:   'DIP switch remapping',
    },
    recentBids:   makeBids(310, 16),
    priceHistory: makePriceHistory(310, 24, 0.05),
    tags:         ['hhkb', 'topre', 'silent', 'bluetooth'],
  },

  {
    id:            'auc_025',
    title:         'Mode Sonnet 75% Kit',
    subtitle:      'Polycarbonate + Brass · E-white · Built',
    category:      'Keyboards',
    status:        'LIVE',
    currentBid:    520,
    reservePrice:  420,
    startingPrice: 300,
    buyNowPrice:   680,
    bidCount:      9,
    watcherCount:  178,
    endsAt:        NOW + 10 * HOUR + 2 * MIN,
    startedAt:     NOW - 14 * HOUR,
    imageUrl:      'https://cdn.mos.cms.futurecdn.net/E4K8wLK37BbT8uhLNbcYwR.jpg',
    seller:        { handle: 'mode_builds', reputation: 94, totalSales: 38 },
    specs: {
      Layout:   '75%',
      Case:     'PC + Brass weight · E-white',
      Switches: 'Gateron Oil King (lubed, filmed)',
      Keycaps:  'KAT Milkshake',
      PCB:      'Hotswap',
      Sound:    'Thocky · foam modded',
    },
    recentBids:   makeBids(520, 9),
    priceHistory: makePriceHistory(520),
    tags:         ['mode', 'sonnet', '75%', 'polycarbonate'],
  },
];

// ── Lookup helpers (O(1) via Map) ─────────────────
export const AUCTION_MAP = new Map<string, Auction>(
  AUCTIONS.map(a => [a.id, a])
);

export function getAuctionById(id: string): Auction | undefined {
  return AUCTION_MAP.get(id);
}

export function getAuctionsByCategory(
  category: Auction['category']
): Auction[] {
  return AUCTIONS.filter(a => a.category === category);
}

export function getLiveAuctions(): Auction[] {
  return AUCTIONS.filter(a => a.status === 'LIVE' || a.status === 'ENDING');
}

// ── Market summary ────────────────────────────────
export const MARKET_SUMMARY: MarketSummary = {
  totalListings:  AUCTIONS.length,
  liveAuctions:   getLiveAuctions().length,
  totalBidsToday: AUCTIONS.reduce((acc, a) => acc + a.bidCount, 0),
  topLot: (() => {
    const top = [...AUCTIONS].sort(
      (a, b) => b.currentBid - a.currentBid
    )[0];
    return { title: top.title, price: top.currentBid };
  })(),
};

// ── Search scorer ─────────────────────────────────
// CS Note: Instead of a simple .includes() check,
// we score each auction across multiple fields with
// different weights. Title matches score highest (10),
// tag matches score medium (6), subtitle/category
// lower (4/3). The result is a ranked list, not just
// a yes/no filter — same principle as TF-IDF scoring
// in information retrieval.

export interface SearchResult {
  auction: Auction;
  score:   number;
}

export function searchAuctions(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: SearchResult[] = [];

  for (const auction of AUCTIONS) {
    let score = 0;
    const title    = auction.title.toLowerCase();
    const subtitle = auction.subtitle.toLowerCase();
    const category = auction.category.toLowerCase();
    const tags     = auction.tags.join(' ').toLowerCase();
    const seller   = auction.seller.handle.toLowerCase();

    // Exact title match — highest signal
    if (title === q)             score += 50;
    // Title starts with query — very strong
    if (title.startsWith(q))     score += 20;
    // Title contains query — strong
    if (title.includes(q))       score += 10;
    // Subtitle contains query
    if (subtitle.includes(q))    score +=  4;
    // Category matches
    if (category.includes(q))    score +=  3;
    // Tag match — each matching tag adds points
    for (const tag of auction.tags) {
      if (tag.includes(q))       score +=  6;
    }
    // Seller handle
    if (seller.includes(q))      score +=  2;

    // Boost live/ending auctions in results
    if (auction.status === 'LIVE')   score += 2;
    if (auction.status === 'ENDING') score += 3;

    if (score > 0) results.push({ auction, score });
  }

  // Sort descending by score — highest relevance first
  return results.sort((a, b) => b.score - a.score);
}