/**
 * CoinGecko global + categories — 무료, 키 불필요.
 *
 *   /global                — 전체 시총, BTC dominance
 *   /coins/categories      — 카테고리별 24h/7d/30d 변화 (narrative tracker)
 */

const BASE = "https://api.coingecko.com/api/v3";

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": "crypto-dashboard/0.1" } });
  if (res.status === 429) throw new Error("CoinGecko rate limited");
  if (!res.ok) throw new Error(`CoinGecko ${res.status}: ${res.statusText}`);
  return res.json();
}

export interface GlobalMarket {
  totalMarketCapUsd: number;
  totalVolumeUsd: number;
  btcDominance: number;
  ethDominance: number;
  marketCapChangePct24h: number;
  activeCryptocurrencies: number;
  markets: number;
}

export async function fetchGlobalMarket(): Promise<GlobalMarket> {
  const raw = (await fetchJSON(`${BASE}/global`)) as {
    data: {
      total_market_cap: { usd: number };
      total_volume: { usd: number };
      market_cap_percentage: Record<string, number>;
      market_cap_change_percentage_24h_usd: number;
      active_cryptocurrencies: number;
      markets: number;
    };
  };
  const d = raw.data;
  return {
    totalMarketCapUsd: d.total_market_cap.usd,
    totalVolumeUsd: d.total_volume.usd,
    btcDominance: d.market_cap_percentage.btc / 100,
    ethDominance: d.market_cap_percentage.eth / 100,
    marketCapChangePct24h: d.market_cap_change_percentage_24h_usd / 100,
    activeCryptocurrencies: d.active_cryptocurrencies,
    markets: d.markets,
  };
}

export interface CategoryStat {
  id: string;
  name: string;
  marketCapUsd: number;
  volume24hUsd: number;
  change24hPct: number;
  topCoins: string[];   // 최대 3개 base symbol
}

interface RawCategory {
  id: string;
  name: string;
  market_cap: number;
  market_cap_change_24h: number;
  volume_24h: number;
  top_3_coins: string[]; // image URLs
  top_3_coins_id?: string[];
  updated_at: string;
}

export async function fetchCategories(): Promise<CategoryStat[]> {
  const raw = (await fetchJSON(`${BASE}/coins/categories`)) as RawCategory[];
  return raw.map((c) => ({
    id: c.id,
    name: c.name,
    marketCapUsd: c.market_cap ?? 0,
    volume24hUsd: c.volume_24h ?? 0,
    change24hPct: (c.market_cap_change_24h ?? 0) / 100,
    topCoins: c.top_3_coins_id ?? [],
  }));
}

/** Top hot categories — 24h 변화율 기준 정렬, 최소 시총 필터 */
export function topHotCategories(cats: CategoryStat[], minMarketCap = 100_000_000, limit = 10): CategoryStat[] {
  return cats
    .filter((c) => c.marketCapUsd >= minMarketCap)
    .sort((a, b) => b.change24hPct - a.change24hPct)
    .slice(0, limit);
}

export function topColdCategories(cats: CategoryStat[], minMarketCap = 100_000_000, limit = 10): CategoryStat[] {
  return cats
    .filter((c) => c.marketCapUsd >= minMarketCap)
    .sort((a, b) => a.change24hPct - b.change24hPct)
    .slice(0, limit);
}

/** 알트 시즌 진입 시그널 — BTC.D < 50% 또는 빠르게 하락 */
export function altSeasonSignal(btcDominance: number): {
  state: "alt-season" | "alt-coming" | "btc-dominant" | "extreme-btc";
  comment: string;
} {
  if (btcDominance < 0.45) return { state: "alt-season", comment: "BTC dominance < 45% — 알트 시즌 본격" };
  if (btcDominance < 0.5) return { state: "alt-coming", comment: "BTC dominance < 50% — 알트 시즌 진입" };
  if (btcDominance > 0.6) return { state: "extreme-btc", comment: "BTC dominance > 60% — 극단 BTC 우위 (알트 매수 보류)" };
  return { state: "btc-dominant", comment: `BTC dominance ${(btcDominance * 100).toFixed(1)}% — 평범한 BTC 우위` };
}
