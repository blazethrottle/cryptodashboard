/**
 * snapshot.json 형식 — 백엔드 src/scripts/snapshot.ts 출력과 동일.
 */

export type SignalLevel = "BUY_STRONG" | "BUY" | "WATCH" | "NEUTRAL" | "SELL" | "SELL_STRONG";

export type Group =
  | "core" | "layer1" | "layer1_2" | "rwa_defi" | "ai" | "meme" | "privacy" | "institution_only";

export interface Coin {
  base: string;
  name: string;
  groups: Group[];
  priority: boolean;
  coingeckoId?: string;
  defillamaSlug?: string;
  chain?: string;
  notes?: string;
}

export interface ProtocolTvlMetrics {
  slug: string;
  name: string;
  tvlUsd: number;
  tvl7dChange: number;
  tvl30dChange: number;
  tvl90dChange: number;
}

export interface FeesSummary {
  slug: string;
  total24h?: number;
  total7d?: number;
  total30d?: number;
  change_1d?: number;
  change_7d?: number;
  change_1m?: number;
}

export interface SignalSnapshot {
  symbol: string;
  base: string;
  price: number;
  rsiDaily: number;
  rsiWeekly: number;
  ma50: number;
  ma200: number;
  ma200Slope: number;
  priceVs200: number;
  priceVs50: number;
  cross50Up: boolean;
  cross200Down: boolean;
  reasons: string[];
  level: SignalLevel;
  score: number;
  onchain?: {
    tvl?: ProtocolTvlMetrics | null;
    fees?: FeesSummary | null;
  };
}

export interface BtcNetworkState {
  blockHeight: number;
  feesSatPerVb: { fastest: number; halfHour: number; hour: number; minimum: number };
  hashrate24hEhs: number;
  difficulty: number;
  difficultyChangePct: number;
  mempoolCount: number;
  mempoolVsizeMB: number;
}

export interface SolNetworkState {
  slot: number;
  epoch: number;
  epochProgress: number;
  tps5min: number;
  inflationRate: number;
  totalStakeSol: number;
}

export interface ChainTvl {
  name: string;
  tvl: number;
  tvl7dChange: number;
  tvl30dChange: number;
}

export interface StablecoinSnapshot {
  totalUsd: number;
  change7dPct: number;
  change30dPct: number;
}

export interface FearGreedDay {
  value: number;
  classification: string;
  timestamp: number;
}

export interface FearGreedSnapshot {
  current: FearGreedDay;
  yesterday?: FearGreedDay;
  weekAgo?: FearGreedDay;
  monthAgo?: FearGreedDay;
  series30d: FearGreedDay[];
}

export interface GlobalMarket {
  totalMarketCapUsd: number;
  totalVolumeUsd: number;
  btcDominance: number;
  ethDominance: number;
  marketCapChangePct24h: number;
}

export interface CategoryStat {
  id: string;
  name: string;
  marketCapUsd: number;
  change24hPct: number;
  topCoins: string[];
}

export interface MvrvZ {
  date: string;
  mvrv: number;
  mvrvZ: number;
  price: number;
}

export interface BtcCycleSnapshot {
  current: MvrvZ;
  yesterday?: MvrvZ;
  weekAgo?: MvrvZ;
  monthAgo?: MvrvZ;
  series365d: MvrvZ[];
  cycleState: "cycle-bottom" | "accumulation" | "growth" | "euphoria" | "cycle-top";
}

export interface AltSeasonSignal {
  state: "alt-season" | "alt-coming" | "btc-dominant" | "extreme-btc";
  comment: string;
}

export interface PerpSnapshot {
  symbol: string;
  fundingRate: number;
  annualizedFundingPct: number;
  openInterestUsd: number;
  oiChange24hPct: number;
  longShortRatio: number;
  longShortTrend: "rising" | "falling" | "flat";
}

export interface MultibaggerScore {
  base: string;
  total: number;
  checks: {
    tvlGrowth: boolean;
    categoryHot: boolean;
    perpBullish: boolean;
    rsiOversold: boolean;
    contrarianFear: boolean;
    smallCap: boolean;
  };
  reasons: string[];
  rating: "candidate" | "watch" | "weak";
}

export interface Macro {
  btc?: BtcNetworkState;
  sol?: SolNetworkState;
  chains: Record<string, ChainTvl | null>;
  stablecoins?: StablecoinSnapshot;
  fearGreed?: FearGreedSnapshot;
  global?: GlobalMarket;
  categories?: CategoryStat[];
  altSeason?: AltSeasonSignal;
  btcCycle?: BtcCycleSnapshot;
}

export interface CandleFile {
  base: string;
  name: string;
  candles: Array<{
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    closeTime: number;
  }>;
}

// ── Trade Plan ─────────────────────────────────────────────────────────────

export interface TakeProfitLeg {
  price: number;
  fraction: number;
  triggered: boolean;
  triggeredAt?: string;
  triggeredPrice?: number;
}

export interface TradePlan {
  id: string;
  coin: string;
  status: "open" | "closed" | "cancelled";
  createdAt: string;
  entry: {
    plannedPrice?: number;
    actualPrice: number;
    enteredAt: string;
    sizeUsd: number;
    sizeCoin: number;
    rationale: string;
  };
  stopLoss: {
    price: number;
    fraction: number;
    triggered: boolean;
    triggeredAt?: string;
    triggeredPrice?: number;
    rationale: string;
  };
  takeProfit: TakeProfitLeg[];
  thesis: {
    timeHorizon: "short" | "medium" | "long";
    narrative: string;
    validUntil?: string;
  };
}

export interface TradePlanEvaluation {
  plan: TradePlan;
  currentPrice: number;
  pnlUsd: number;
  pnlPct: number;
  triggers: Array<{
    type: "stopLoss" | "takeProfit";
    legIndex?: number;
    price: number;
    fraction: number;
  }>;
}

export interface PlansFile {
  timestamp: string;
  evaluations: TradePlanEvaluation[];
}

export type Institution =
  | "Grayscale" | "Bitwise" | "21Shares" | "CoinShares" | "Pantera" | "Galaxy Digital" | "Paradigm";

export interface Row {
  coin: Coin;
  holders: Institution[];
  source?: string;
  result?: SignalSnapshot;
  multibagger?: MultibaggerScore;
  error?: string;
}

export interface SnapshotFile {
  timestamp: string;
  macro: Macro;
  rows: Row[];
}
