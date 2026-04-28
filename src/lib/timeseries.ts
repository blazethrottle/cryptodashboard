/**
 * 시계열 데이터 누적 — 매 snapshot 시 핵심 metric을 단일 파일에 append.
 *
 * 저장 위치: data/timeseries.json (git tracked, GitHub Actions가 매 cycle commit)
 *
 * 보존 정책:
 *  - 최근 5,000 포인트 유지 (30분 cycle 기준 약 100일)
 *  - 그 이상은 자동 truncate
 *
 * 사용처:
 *  - snapshot.ts에서 매 cycle append
 *  - web 시계열 차트 (web/public/data/timeseries.json)
 */

import fs from "node:fs/promises";
import path from "node:path";

export interface TimeseriesPoint {
  t: number;   // unix ms
  v: number;
}

export interface SeriesSlot {
  unit: string;          // "EH/s", "USD", "%", etc.
  description: string;
  points: TimeseriesPoint[];   // sorted by t ascending
}

export interface TimeseriesFile {
  lastUpdated: string;
  series: Record<string, SeriesSlot>;
}

const MAX_POINTS_PER_SERIES = 5000;   // ≈ 100일 (30분 cycle)

const DEFAULT_FILE: TimeseriesFile = {
  lastUpdated: new Date(0).toISOString(),
  series: {},
};

export async function loadTimeseries(rootDir: string): Promise<TimeseriesFile> {
  const file = path.join(rootDir, "data", "timeseries.json");
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as TimeseriesFile;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { ...DEFAULT_FILE };
    throw err;
  }
}

export async function saveTimeseries(rootDir: string, ts: TimeseriesFile): Promise<void> {
  const file = path.join(rootDir, "data", "timeseries.json");
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(ts, null, 2));
}

/**
 * 단일 metric에 포인트 추가. timestamp가 마지막보다 작거나 같으면 무시 (중복 방지).
 */
export function appendPoint(
  ts: TimeseriesFile,
  metric: string,
  value: number,
  meta: { unit: string; description: string },
): void {
  if (!Number.isFinite(value)) return;
  const now = Date.now();
  const slot = ts.series[metric] ?? { unit: meta.unit, description: meta.description, points: [] };
  const last = slot.points.at(-1);
  // 30분 미만 간격은 중복으로 간주, 마지막 값만 업데이트 (cron이 빨리 재실행되어도 안전)
  if (last && now - last.t < 60_000) {
    last.v = value;
  } else {
    slot.points.push({ t: now, v: value });
  }
  // truncate
  if (slot.points.length > MAX_POINTS_PER_SERIES) {
    slot.points = slot.points.slice(-MAX_POINTS_PER_SERIES);
  }
  ts.series[metric] = slot;
  ts.lastUpdated = new Date(now).toISOString();
}

/**
 * 추적할 표준 metric 정의.
 * snapshot.ts에서 macro·rows를 받아 각 metric 값 계산 후 appendPoint.
 */
export const METRIC_DEFINITIONS = {
  "btc-hashrate-ehs": { unit: "EH/s", description: "BTC 24h 평균 해시레이트" },
  "btc-fee-fastest": { unit: "sat/vB", description: "BTC fastest 수수료" },
  "btc-mempool-mb": { unit: "MB", description: "BTC mempool 크기" },
  "btc-difficulty-change-pct": { unit: "%", description: "BTC 다음 난이도 조정 예상" },
  "btc-mvrv-z": { unit: "z-score", description: "BTC MVRV Z-Score (사이클 위치)" },
  "btc-mvrv": { unit: "ratio", description: "BTC MVRV (시가/실현가)" },
  "btc-price": { unit: "USD", description: "BTC 가격" },
  "sol-tps": { unit: "tx/s", description: "SOL non-vote TPS (5분 평균)" },
  "sol-epoch-progress": { unit: "%", description: "SOL epoch 진행률" },
  "eth-tvl-usd": { unit: "USD", description: "Ethereum DeFi TVL" },
  "sol-tvl-usd": { unit: "USD", description: "Solana DeFi TVL" },
  "btc-dominance": { unit: "%", description: "BTC dominance" },
  "eth-dominance": { unit: "%", description: "ETH dominance" },
  "fear-greed": { unit: "0-100", description: "Crypto Fear & Greed Index" },
  "stable-supply-usd": { unit: "USD", description: "Stablecoin 총 공급" },
} as const;

export type MetricKey = keyof typeof METRIC_DEFINITIONS;
