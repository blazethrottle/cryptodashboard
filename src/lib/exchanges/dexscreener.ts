/**
 * DexScreener API — for tokens that only trade on DEXes (no CEX listing).
 * Free, no key required.
 *
 * GET /latest/dex/tokens/{address}     → all pairs for a token contract
 * GET /latest/dex/search/?q=SYMBOL     → search by symbol
 *
 * NOTE: DexScreener gives current snapshot only — no historical OHLC.
 * Useful for spot price / 24h change / liquidity, not RSI/MA.
 */

const BASE = "https://api.dexscreener.com";

export interface DexPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; symbol: string; name: string };
  quoteToken: { address: string; symbol: string; name: string };
  priceUsd?: string;
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
  volume?: { h24?: number };
}

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "crypto-dashboard/0.1" },
  });
  if (!res.ok) throw new Error(`DexScreener ${res.status}: ${res.statusText} (${url})`);
  return res.json();
}

export interface SpotQuote {
  symbol: string;
  priceUsd: number;
  change24h: number;
  liquidityUsd: number;
  volumeUsd24h: number;
  source: string;
}

export async function searchSymbol(symbol: string): Promise<SpotQuote | null> {
  const data = (await fetchJSON(`${BASE}/latest/dex/search?q=${encodeURIComponent(symbol)}`)) as { pairs?: DexPair[] };
  const pairs = data.pairs ?? [];
  if (pairs.length === 0) return null;

  // Pick the pair with the highest USD liquidity for the matching base symbol.
  const matching = pairs.filter((p) => p.baseToken.symbol.toUpperCase() === symbol.toUpperCase());
  const candidates = matching.length > 0 ? matching : pairs;
  const best = candidates.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];

  return {
    symbol: best.baseToken.symbol,
    priceUsd: parseFloat(best.priceUsd ?? "0"),
    change24h: best.priceChange?.h24 ?? 0,
    liquidityUsd: best.liquidity?.usd ?? 0,
    volumeUsd24h: best.volume?.h24 ?? 0,
    source: `${best.dexId}/${best.chainId}`,
  };
}
