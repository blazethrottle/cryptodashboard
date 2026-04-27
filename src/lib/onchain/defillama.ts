/**
 * DefiLlama API client (free, no key required).
 * Docs: https://defillama.com/docs/api
 *
 * Endpoints used:
 *   GET /protocols                        — list all protocols
 *   GET /protocol/{slug}                  — protocol TVL time series + breakdown
 *   GET /v2/chains                        — current chain TVL
 *   GET /v2/historicalChainTvl/{chain}    — chain TVL time series
 *   GET /summary/fees/{slug}              — protocol fees (24h, 7d, 30d)
 */

const BASE = "https://api.llama.fi";

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "crypto-dashboard/0.1" },
  });
  if (!res.ok) throw new Error(`DefiLlama ${res.status}: ${res.statusText} (${url})`);
  return res.json();
}

export interface ProtocolSummary {
  slug: string;
  name: string;
  category?: string;
  tvl: number;
  change_1d?: number;
  change_7d?: number;
  change_1m?: number;
  mcap?: number;
}

interface ProtocolDetail {
  name: string;
  symbol?: string;
  tvl: Array<{ date: number; totalLiquidityUSD: number }>;
  currentChainTvls?: Record<string, number>;
}

export interface ProtocolTvlMetrics {
  slug: string;
  name: string;
  tvlUsd: number;
  tvl7dChange: number;
  tvl30dChange: number;
  tvl90dChange: number;
}

export async function fetchProtocolTvl(slug: string): Promise<ProtocolTvlMetrics | null> {
  const detail = (await fetchJSON(`${BASE}/protocol/${slug}`)) as ProtocolDetail;
  const series = detail.tvl ?? [];
  if (series.length === 0) return null;

  const now = series.at(-1)!.totalLiquidityUSD;
  const findBack = (days: number): number => {
    const target = (series.at(-1)!.date) - days * 86400;
    // find closest entry before target
    let prev = series[0];
    for (const e of series) {
      if (e.date <= target) prev = e;
      else break;
    }
    return prev.totalLiquidityUSD;
  };

  const t7 = findBack(7);
  const t30 = findBack(30);
  const t90 = findBack(90);

  const pct = (a: number, b: number) => (b === 0 ? 0 : (a - b) / b);

  return {
    slug,
    name: detail.name,
    tvlUsd: now,
    tvl7dChange: pct(now, t7),
    tvl30dChange: pct(now, t30),
    tvl90dChange: pct(now, t90),
  };
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

export async function fetchProtocolFees(slug: string): Promise<FeesSummary | null> {
  try {
    const data = (await fetchJSON(`${BASE}/summary/fees/${slug}`)) as Record<string, unknown>;
    return {
      slug,
      total24h: data.total24h as number | undefined,
      total7d: data.total7d as number | undefined,
      total30d: data.total30d as number | undefined,
      change_1d: data.change_1d as number | undefined,
      change_7d: data.change_7d as number | undefined,
      change_1m: data.change_1m as number | undefined,
    };
  } catch {
    return null; // not all protocols have fee data
  }
}

export interface ChainTvl {
  name: string;
  tvl: number;
  tvl7dChange: number;
  tvl30dChange: number;
}

interface ChainHistorical {
  date: number;
  tvl: number;
}

export async function fetchChainTvl(chain: string): Promise<ChainTvl | null> {
  try {
    const series = (await fetchJSON(`${BASE}/v2/historicalChainTvl/${chain}`)) as ChainHistorical[];
    if (series.length === 0) return null;
    const now = series.at(-1)!.tvl;
    const findBack = (days: number): number => {
      const target = (series.at(-1)!.date) - days * 86400;
      let prev = series[0];
      for (const e of series) {
        if (e.date <= target) prev = e;
        else break;
      }
      return prev.tvl;
    };
    const t7 = findBack(7);
    const t30 = findBack(30);
    const pct = (a: number, b: number) => (b === 0 ? 0 : (a - b) / b);
    return {
      name: chain,
      tvl: now,
      tvl7dChange: pct(now, t7),
      tvl30dChange: pct(now, t30),
    };
  } catch {
    return null;
  }
}

/**
 * Stablecoin total supply — proxy for "dry powder" waiting to be deployed.
 * Endpoint: https://stablecoins.llama.fi/stablecoincharts/{chain|all}
 *   - Returns array of { date: "unix-string", totalCirculatingUSD: { peggedUSD: number } }
 */
export interface StablecoinSnapshot {
  totalUsd: number;
  change7dPct: number;
  change30dPct: number;
}

interface StablecoinChartEntry {
  date: string | number;
  totalCirculatingUSD?: { peggedUSD?: number };
  totalCirculating?: { peggedUSD?: number };
}

export async function fetchStablecoinSupply(chain?: string): Promise<StablecoinSnapshot | null> {
  try {
    const url = `https://stablecoins.llama.fi/stablecoincharts/${chain ?? "all"}`;
    const series = (await fetchJSON(url)) as StablecoinChartEntry[];
    if (!series || series.length === 0) return null;

    const getTotal = (e: StablecoinChartEntry): number =>
      e.totalCirculatingUSD?.peggedUSD ?? e.totalCirculating?.peggedUSD ?? 0;

    const last = series.at(-1)!;
    const totalUsd = getTotal(last);

    const lastTs = Number(last.date);
    const findBack = (days: number): number => {
      const target = lastTs - days * 86400;
      let prev = series[0];
      for (const e of series) {
        if (Number(e.date) <= target) prev = e;
        else break;
      }
      return getTotal(prev);
    };

    const t7 = findBack(7);
    const t30 = findBack(30);
    const pct = (a: number, b: number) => (b === 0 ? 0 : (a - b) / b);

    return {
      totalUsd,
      change7dPct: pct(totalUsd, t7),
      change30dPct: pct(totalUsd, t30),
    };
  } catch {
    return null;
  }
}
