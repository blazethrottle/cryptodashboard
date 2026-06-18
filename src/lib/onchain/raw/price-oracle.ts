/**
 * PriceOracle — "온체인 수량 × 오프체인 가격"의 가격 쪽 1급 컴포넌트.
 *
 * 설계 문서: docs/btc-onchain-raw-source-design.md §2, §5
 *
 * 핵심 전제: Realized Cap/MVRV/NUPL/SOPR 값은 어떤 가격 기준을 쓰느냐에
 * 직접 좌우된다. 기준을 코드로 고정하고 문서화한다.
 *
 * Phase 1 기준 가격: CoinMetrics PriceUSD (UTC 일별) — 2010-07부터 전 기간 커버,
 * repo에 이미 있는 fetchBtcMetrics() 재사용. CoinMetrics CapRealUSD와의 회귀
 * 대조(btc:verify)에서 가격 기준 차이로 인한 오차를 최소화하는 선택.
 *
 * 시장 이전(2009~2010-07) 정책: "zero" — 가격 데이터가 없는 시기의 UTXO는
 * 취득원가 0으로 간주 (Realized Cap 관례. 사토시 시대 코인의 장부가 ≈ 0).
 */

import { fetchBtcMetrics } from "../coinmetrics.ts";

export interface PriceOracle {
  /** 블록타임(unix sec) → 해당 UTC 일자의 BTC/USD 가격 */
  priceAt(unixSec: number): number;
}

export interface DailyPricePoint {
  /** "YYYY-MM-DD" (UTC) */
  date: string;
  priceUsd: number;
}

/** 가격 데이터 범위 밖 시점 처리 정책 */
export interface DailyPriceOraclePolicy {
  /** 첫 데이터 이전: "zero"(기본, realized cap 관례) | "clamp"(첫 값 사용) */
  beforeFirst: "zero" | "clamp";
}

const SEC_PER_DAY = 86400;

function toEpochDay(unixSec: number): number {
  return Math.floor(unixSec / SEC_PER_DAY);
}

function dateToEpochDay(date: string): number {
  return toEpochDay(Date.parse(`${date}T00:00:00Z`) / 1000);
}

/**
 * UTC 일별 가격 시계열 기반 오라클.
 *  - 조회일에 데이터가 있으면 그 값
 *  - 중간 결손일은 직전 일자 값 (carry-forward)
 *  - 마지막 데이터 이후는 마지막 값 (clamp)
 *  - 첫 데이터 이전은 policy.beforeFirst
 */
export class DailyPriceOracle implements PriceOracle {
  private readonly days: number[];      // epoch day, 오름차순
  private readonly prices: number[];    // days와 1:1
  private readonly policy: DailyPriceOraclePolicy;

  constructor(series: DailyPricePoint[], policy: DailyPriceOraclePolicy = { beforeFirst: "zero" }) {
    const cleaned = series
      .filter((p) => Number.isFinite(p.priceUsd) && p.priceUsd >= 0)
      .map((p) => ({ day: dateToEpochDay(p.date), priceUsd: p.priceUsd }))
      .sort((a, b) => a.day - b.day);
    if (cleaned.length === 0) throw new Error("DailyPriceOracle: 빈 가격 시계열");
    this.days = cleaned.map((p) => p.day);
    this.prices = cleaned.map((p) => p.priceUsd);
    this.policy = policy;
  }

  /** 시계열 커버 범위 (검증 리포트용) */
  range(): { firstDate: string; lastDate: string; points: number } {
    const fmt = (day: number): string => new Date(day * SEC_PER_DAY * 1000).toISOString().slice(0, 10);
    return { firstDate: fmt(this.days[0]), lastDate: fmt(this.days[this.days.length - 1]), points: this.days.length };
  }

  priceAt(unixSec: number): number {
    const day = toEpochDay(unixSec);
    if (day < this.days[0]) {
      return this.policy.beforeFirst === "zero" ? 0 : this.prices[0];
    }
    // 이분 탐색: day 이하인 마지막 인덱스 (carry-forward + 끝단 clamp)
    let lo = 0;
    let hi = this.days.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.days[mid] <= day) lo = mid;
      else hi = mid - 1;
    }
    return this.prices[lo];
  }
}

/**
 * CoinMetrics Community API에서 일별 가격 시계열 로드.
 * days 기본 7000일 ≈ 2010-07(가격 데이터 시작) 이전까지 전 기간 커버.
 */
export async function loadPriceSeriesFromCoinMetrics(days = 7000): Promise<DailyPricePoint[]> {
  const metrics = await fetchBtcMetrics(days);
  return metrics
    .filter((m) => Number.isFinite(m.price))
    .map((m) => ({ date: m.date, priceUsd: m.price }));
}
