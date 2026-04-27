/**
 * DexScreener trending — 24h volume 급증 / 신규 페어 발굴.
 * 무료, 300 req/min, 키 불필요.
 *
 * 알트 멀티배거 초기 발견 핵심.
 */

const BASE = "https://api.dexscreener.com";

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": "crypto-dashboard/0.1" } });
  if (!res.ok) throw new Error(`DexScreener ${res.status}: ${res.statusText}`);
  return res.json();
}

export interface TrendingPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseSymbol: string;
  baseAddress: string;
  baseName: string;
  priceUsd: number;
  priceChange24hPct: number;
  priceChange1hPct: number;
  liquidityUsd: number;
  volume24hUsd: number;
  volumeToLiqRatio: number;   // > 1 = 강한 회전 / 신규 펌프 가능성
  fdvUsd?: number;
  marketCapUsd?: number;
  pairCreatedAtMs?: number;
  ageDays?: number;
}

interface RawPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  priceChange?: { h1?: number; h24?: number };
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
}

/**
 * 인기 페어 검색. 쿼리는 chain별 또는 토큰 주소.
 * 광역 trending은 search?q= 사용 (아쉽지만 dex screener는 trending API 직접 제공 X)
 */
export async function fetchPairsByChain(chain: string, limit = 50): Promise<TrendingPair[]> {
  // chain 별 인기 토큰 list 직접 API는 없음. 대신 검색을 chain 이름으로
  const data = (await fetchJSON(`${BASE}/latest/dex/search?q=${encodeURIComponent(chain)}`)) as { pairs?: RawPair[] };
  const pairs = (data.pairs ?? []).slice(0, limit);
  return mapPairs(pairs);
}

export async function fetchPairsBySymbol(symbol: string, limit = 30): Promise<TrendingPair[]> {
  const data = (await fetchJSON(`${BASE}/latest/dex/search?q=${encodeURIComponent(symbol)}`)) as { pairs?: RawPair[] };
  return mapPairs((data.pairs ?? []).slice(0, limit));
}

function mapPairs(raw: RawPair[]): TrendingPair[] {
  const now = Date.now();
  return raw.map((p) => {
    const liq = p.liquidity?.usd ?? 0;
    const vol = p.volume?.h24 ?? 0;
    const created = p.pairCreatedAt;
    return {
      chainId: p.chainId,
      dexId: p.dexId,
      pairAddress: p.pairAddress,
      baseSymbol: p.baseToken.symbol,
      baseAddress: p.baseToken.address,
      baseName: p.baseToken.name,
      priceUsd: parseFloat(p.priceUsd ?? "0"),
      priceChange24hPct: (p.priceChange?.h24 ?? 0) / 100,
      priceChange1hPct: (p.priceChange?.h1 ?? 0) / 100,
      liquidityUsd: liq,
      volume24hUsd: vol,
      volumeToLiqRatio: liq > 0 ? vol / liq : 0,
      fdvUsd: p.fdv,
      marketCapUsd: p.marketCap,
      pairCreatedAtMs: created,
      ageDays: created ? (now - created) / 86400_000 : undefined,
    };
  });
}

/**
 * 멀티배거 초기 발견 필터:
 *  - 시총 < $500M (성장 여력)
 *  - 유동성 > $200K (스캠 / dust 필터)
 *  - 24h 가격 > +20% (모멘텀)
 *  - vol/liq > 1 (강한 회전)
 *  - age < 90d (신규)
 */
export function filterMultibaggerCandidates(pairs: TrendingPair[]): TrendingPair[] {
  return pairs.filter(
    (p) =>
      (p.marketCapUsd ?? p.fdvUsd ?? 0) < 500_000_000 &&
      p.liquidityUsd > 200_000 &&
      p.priceChange24hPct >= 0.2 &&
      p.volumeToLiqRatio >= 1 &&
      (p.ageDays === undefined || p.ageDays <= 90),
  );
}

/**
 * 통합 trending — 주요 체인 (eth/sol/base/bsc/arb) 기준 멀티배거 후보.
 * 호출 1번에 5번의 API call. rate limit 안전.
 */
export async function fetchMultibaggerCandidates(): Promise<TrendingPair[]> {
  const chains = ["solana", "base", "ethereum", "arbitrum", "bsc"];
  const all: TrendingPair[] = [];
  for (const chain of chains) {
    try {
      const pairs = await fetchPairsByChain(chain, 30);
      all.push(...pairs);
    } catch {
      // 개별 chain 실패는 무시
    }
  }
  // dedup by baseAddress
  const seen = new Set<string>();
  const unique = all.filter((p) => {
    const key = `${p.chainId}:${p.baseAddress}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return filterMultibaggerCandidates(unique).sort(
    (a, b) => b.volumeToLiqRatio * b.priceChange24hPct - a.volumeToLiqRatio * a.priceChange24hPct,
  );
}
