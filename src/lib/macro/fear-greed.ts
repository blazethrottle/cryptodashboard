/**
 * Crypto Fear & Greed Index — alternative.me (free, no key).
 * Contrarian 시그널의 1순위 — Extreme Fear (≤25)에 매수, Extreme Greed (≥75)에 매도.
 *
 * Endpoint: https://api.alternative.me/fng/?limit=N
 */

const BASE = "https://api.alternative.me";

export interface FearGreedDay {
  value: number;          // 0–100
  classification: string; // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
  timestamp: number;      // unix sec
}

export interface FearGreedSnapshot {
  current: FearGreedDay;
  yesterday?: FearGreedDay;
  weekAgo?: FearGreedDay;
  monthAgo?: FearGreedDay;
  series30d: FearGreedDay[];   // 최신부터
}

interface RawResp {
  data: Array<{ value: string; value_classification: string; timestamp: string; time_until_update?: string }>;
}

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": "crypto-dashboard/0.1" } });
  if (!res.ok) throw new Error(`alternative.me ${res.status}: ${res.statusText}`);
  return res.json();
}

export async function fetchFearGreed(): Promise<FearGreedSnapshot> {
  const raw = (await fetchJSON(`${BASE}/fng/?limit=30`)) as RawResp;
  const series: FearGreedDay[] = raw.data.map((d) => ({
    value: Number(d.value),
    classification: d.value_classification,
    timestamp: Number(d.timestamp),
  }));
  return {
    current: series[0],
    yesterday: series[1],
    weekAgo: series[7],
    monthAgo: series[29],
    series30d: series,
  };
}

/** 시그널 강도 — Contrarian 가중치용. Extreme Fear → +2 (BUY), Extreme Greed → -2 (SELL) */
export function fearGreedScore(value: number): number {
  if (value <= 20) return 2;
  if (value <= 30) return 1;
  if (value >= 80) return -2;
  if (value >= 70) return -1;
  return 0;
}
