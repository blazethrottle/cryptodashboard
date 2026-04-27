/**
 * Binance Public API client.
 * Spot klines: https://api.binance.com/api/v3/klines
 * No API key required for public endpoints.
 */

export type Interval = "1d" | "1w" | "4h" | "1h";

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface FetchOptions {
  symbol: string;
  interval: Interval;
  limit?: number;
}

const BASE = "https://api.binance.com";
const FALLBACKS = ["https://api1.binance.com", "https://api2.binance.com", "https://api3.binance.com"];

async function fetchJSON(url: string, attempt = 0): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": "crypto-dashboard/0.1" } });
  if (res.status === 429 || res.status === 418) {
    const retryAfter = Number(res.headers.get("retry-after") ?? 2);
    if (attempt > 3) throw new Error(`Rate limited after ${attempt} retries`);
    await sleep(retryAfter * 1000);
    return fetchJSON(url, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`Binance ${res.status}: ${res.statusText} (${url})`);
  }
  return res.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchKlines({ symbol, interval, limit = 500 }: FetchOptions): Promise<Candle[]> {
  const params = new URLSearchParams({ symbol, interval, limit: String(limit) });
  const hosts = [BASE, ...FALLBACKS];

  let lastErr: unknown;
  for (const host of hosts) {
    try {
      const raw = (await fetchJSON(`${host}/api/v3/klines?${params}`)) as unknown[][];
      return raw.map((row) => ({
        openTime: row[0] as number,
        open: parseFloat(row[1] as string),
        high: parseFloat(row[2] as string),
        low: parseFloat(row[3] as string),
        close: parseFloat(row[4] as string),
        volume: parseFloat(row[5] as string),
        closeTime: row[6] as number,
      }));
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`All Binance hosts failed for ${symbol} ${interval}: ${(lastErr as Error)?.message}`);
}

/**
 * Try a list of quote-currency variants (USDT, USD, USDC, BUSD).
 * Some symbols don't trade against USDT on Binance — fall through to alternatives.
 */
export async function fetchKlinesAuto(base: string, interval: Interval, limit = 500): Promise<{
  symbol: string;
  candles: Candle[];
}> {
  const quotes = ["USDT", "USD", "USDC", "FDUSD", "BUSD"];
  let lastErr: unknown;
  for (const q of quotes) {
    const symbol = `${base}${q}`;
    try {
      const candles = await fetchKlines({ symbol, interval, limit });
      if (candles.length > 0) return { symbol, candles };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`No tradable Binance pair for ${base}: ${(lastErr as Error)?.message}`);
}
