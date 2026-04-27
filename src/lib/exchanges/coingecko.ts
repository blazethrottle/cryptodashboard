/**
 * CoinGecko Public API client (free tier, no key required).
 * Free rate limit: ~10-30 calls/min — keep concurrency low.
 *
 * Endpoints:
 *   GET /coins/{id}/ohlc?vs_currency=usd&days=365
 *     → [[ts, o, h, l, c], ...]  (daily granularity for days >= 90)
 */

import type { Candle, Interval } from "./binance.ts";

const BASE = "https://api.coingecko.com/api/v3";

export interface CoinGeckoOhlcOptions {
  id: string;          // CoinGecko coin id (e.g. "bitcoin")
  days?: number;       // 1, 7, 14, 30, 90, 180, 365
  vs?: string;         // default usd
}

async function fetchJSON(url: string, attempt = 0): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "crypto-dashboard/0.1" },
  });
  if (res.status === 429) {
    if (attempt > 4) throw new Error(`CoinGecko rate limited after ${attempt} retries`);
    const wait = 2000 * (attempt + 1);
    await new Promise((r) => setTimeout(r, wait));
    return fetchJSON(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`CoinGecko ${res.status}: ${res.statusText} (${url})`);
  return res.json();
}

/**
 * OHLC candles. Granularity is decided by `days`:
 *   1   → 30 min
 *   7   → 4 hours
 *   14+ → 4 hours (older data)
 *   90+ → daily
 * For RSI/MA we want daily, so use 90 / 180 / 365.
 */
export async function fetchOhlc({ id, days = 365, vs = "usd" }: CoinGeckoOhlcOptions): Promise<Candle[]> {
  const url = `${BASE}/coins/${id}/ohlc?vs_currency=${vs}&days=${days}`;
  const raw = (await fetchJSON(url)) as number[][];
  return raw.map((row) => ({
    openTime: row[0],
    open: row[1],
    high: row[2],
    low: row[3],
    close: row[4],
    volume: 0, // OHLC endpoint doesn't provide volume
    closeTime: row[0],
  }));
}

/**
 * Aggregate daily candles into weekly.
 * Week starts Monday (ISO).
 */
export function aggregateWeekly(daily: Candle[]): Candle[] {
  if (daily.length === 0) return [];
  const buckets = new Map<number, Candle[]>();
  for (const c of daily) {
    const d = new Date(c.openTime);
    // Monday-anchored week (UTC)
    const day = (d.getUTCDay() + 6) % 7; // 0=Mon
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
    const key = monday.getTime();
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(c);
  }
  const weeks: Candle[] = [];
  for (const [openTime, group] of [...buckets.entries()].sort(([a], [b]) => a - b)) {
    const sorted = group.sort((a, b) => a.openTime - b.openTime);
    weeks.push({
      openTime,
      open: sorted[0].open,
      high: Math.max(...sorted.map((c) => c.high)),
      low: Math.min(...sorted.map((c) => c.low)),
      close: sorted.at(-1)!.close,
      volume: sorted.reduce((s, c) => s + c.volume, 0),
      closeTime: sorted.at(-1)!.closeTime,
    });
  }
  return weeks;
}

/**
 * Convenience wrapper that returns daily or weekly candles.
 */
export async function fetchCandlesByInterval(id: string, interval: Interval, days = 365): Promise<Candle[]> {
  const daily = await fetchOhlc({ id, days });
  if (interval === "1d") return daily;
  if (interval === "1w") return aggregateWeekly(daily);
  // 4h/1h not supported via OHLC endpoint at long range; fall back to daily.
  return daily;
}
