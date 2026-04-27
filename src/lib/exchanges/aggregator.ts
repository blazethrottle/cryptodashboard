/**
 * Multi-source candle fetcher with fallback chain:
 *   Binance → CoinGecko (sequential queue, in-memory cache)
 *
 * CoinGecko free tier is rate-limited (~10-30 req/min), so all CoinGecko
 * traffic is funneled through a single FIFO queue with a polite delay,
 * and each (coingeckoId) is fetched only once per process.
 * Daily candles are kept; weekly is derived via aggregation.
 */

import type { Candle, Interval } from "./binance.ts";
import { fetchKlinesAuto } from "./binance.ts";
import { fetchOhlc, aggregateWeekly } from "./coingecko.ts";

export type Source = "binance" | "coingecko";

export interface FallbackResult {
  symbol: string;
  candles: Candle[];
  source: Source;
}

export interface CoinRef {
  base: string;
  coingeckoId?: string;
}

// ── CoinGecko sequential queue + cache ─────────────────────────────────────
class SequentialQueue {
  private chain: Promise<unknown> = Promise.resolve();
  constructor(private readonly minDelayMs: number) {}
  run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.chain.then(() => fn());
    this.chain = next
      .catch(() => undefined)
      .then(() => new Promise((r) => setTimeout(r, this.minDelayMs)));
    return next;
  }
}

const cgQueue = new SequentialQueue(1800); // ≈33 req/min upper bound
const cgDailyCache = new Map<string, Promise<Candle[]>>();

function getCgDaily(id: string): Promise<Candle[]> {
  let cached = cgDailyCache.get(id);
  if (!cached) {
    cached = cgQueue.run(() => fetchOhlc({ id, days: 365 }));
    cgDailyCache.set(id, cached);
  }
  return cached;
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function fetchCandlesWithFallback(
  coin: CoinRef,
  interval: Interval,
  limit = 400,
): Promise<FallbackResult> {
  const errors: string[] = [];

  try {
    const r = await fetchKlinesAuto(coin.base, interval, limit);
    return { symbol: r.symbol, candles: r.candles, source: "binance" };
  } catch (err) {
    errors.push(`binance: ${(err as Error).message.slice(0, 80)}`);
  }

  if (coin.coingeckoId) {
    try {
      const daily = await getCgDaily(coin.coingeckoId);
      if (daily.length > 0) {
        const candles = interval === "1w" ? aggregateWeekly(daily) : daily;
        return {
          symbol: `${coin.base}/USD (cg:${coin.coingeckoId})`,
          candles,
          source: "coingecko",
        };
      }
    } catch (err) {
      errors.push(`coingecko: ${(err as Error).message.slice(0, 80)}`);
    }
  }

  throw new Error(`No candle source for ${coin.base}: ${errors.join(" | ")}`);
}
