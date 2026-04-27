/**
 * 매매 시그널 판정 — 사용자 정의 룰 기반.
 *
 *   매수
 *     - 장기  : 주봉 RSI ≤ 30 (과매도)
 *     - 단/중기: 일봉 RSI ≤ 50 + 50일선 돌파
 *     - 보조  : 가격이 200일선 위에서 상향 추세
 *
 *   매도
 *     - 장기  : 주봉 RSI ≥ 70 (과매수)
 *     - 단/중기: 일봉 RSI ≥ 80
 *     - 보조  : 200일선 하향 돌파 + 지속 하락 추세
 */

import type { Candle } from "./exchanges/binance.ts";
import type { ProtocolTvlMetrics, FeesSummary } from "./onchain/defillama.ts";
import { rsi, sma, slope, crossedAbove, crossedBelow } from "./indicators.ts";

export type SignalLevel = "BUY_STRONG" | "BUY" | "WATCH" | "NEUTRAL" | "SELL" | "SELL_STRONG";

export interface OnchainContext {
  tvl?: ProtocolTvlMetrics | null;
  fees?: FeesSummary | null;
}

export interface SignalSnapshot {
  symbol: string;
  base: string;
  price: number;
  rsiDaily: number;
  rsiWeekly: number;
  ma50: number;
  ma200: number;
  ma200Slope: number;
  priceVs200: number;
  priceVs50: number;
  cross50Up: boolean;
  cross200Down: boolean;
  reasons: string[];
  level: SignalLevel;
  score: number;
  onchain?: OnchainContext;
}

export interface SignalInputs {
  base: string;
  symbol: string;
  daily: Candle[];
  weekly: Candle[];
  onchain?: OnchainContext;
}

export function evaluate({ base, symbol, daily, weekly, onchain }: SignalInputs): SignalSnapshot {
  const dCloses = daily.map((c) => c.close);
  const wCloses = weekly.map((c) => c.close);

  const rsiD = rsi(dCloses, 14);
  const rsiW = rsi(wCloses, 14);
  const ma50Series = sma(dCloses, 50);
  const ma200Series = sma(dCloses, 200);

  const price = dCloses.at(-1) ?? NaN;
  const rsiDaily = rsiD.at(-1) ?? NaN;
  const rsiWeekly = rsiW.at(-1) ?? NaN;
  const ma50 = ma50Series.at(-1) ?? NaN;
  const ma200 = ma200Series.at(-1) ?? NaN;
  const ma200Slope = slope(ma200Series.filter((v) => !Number.isNaN(v)), 20);

  const priceVs200 = (price - ma200) / ma200;
  const priceVs50 = (price - ma50) / ma50;
  const cross50Up = crossedAbove(dCloses, ma50Series, 5);
  const cross200Down = crossedBelow(dCloses, ma200Series, 5);

  const reasons: string[] = [];
  let score = 0;

  // 매수 시그널 (양의 점수)
  if (rsiWeekly <= 30) {
    reasons.push(`주봉 RSI ${rsiWeekly.toFixed(1)} (≤30 과매도)`);
    score += 3;
  } else if (rsiWeekly <= 40) {
    reasons.push(`주봉 RSI ${rsiWeekly.toFixed(1)} (40 이하)`);
    score += 1;
  }
  if (rsiDaily <= 30) {
    reasons.push(`일봉 RSI ${rsiDaily.toFixed(1)} (≤30 과매도)`);
    score += 2;
  } else if (rsiDaily <= 50 && cross50Up) {
    reasons.push(`일봉 RSI ${rsiDaily.toFixed(1)} + 50일선 돌파`);
    score += 2;
  }
  if (price > ma200 && ma200Slope > 0) {
    reasons.push(`200일선 위 + 상향 추세`);
    score += 1;
  }

  // 매도 시그널 (음의 점수)
  if (rsiWeekly >= 70) {
    reasons.push(`주봉 RSI ${rsiWeekly.toFixed(1)} (≥70 과매수)`);
    score -= 3;
  }
  if (rsiDaily >= 80) {
    reasons.push(`일봉 RSI ${rsiDaily.toFixed(1)} (≥80)`);
    score -= 2;
  }
  if (cross200Down && ma200Slope < 0) {
    reasons.push(`200일선 하향 돌파 + 하락 추세`);
    score -= 3;
  } else if (price < ma200 && ma200Slope < 0) {
    reasons.push(`200일선 아래 + 하락 추세`);
    score -= 1;
  }

  // 온체인 펀더멘털 가중치 — DefiLlama TVL 변화율
  const tvl = onchain?.tvl;
  if (tvl) {
    const t30 = tvl.tvl30dChange;
    const t7 = tvl.tvl7dChange;
    // TVL 노이즈 가드: ±90% 이상은 데이터셋 변경/마이그레이션 가능성, 시그널 적용 제외
    const usable = Math.abs(t30) < 0.9;
    if (usable) {
      if (t30 >= 0.5) {
        reasons.push(`TVL +${(t30 * 100).toFixed(0)}% / 30d (펀더 강세)`);
        score += 2;
      } else if (t30 >= 0.2) {
        reasons.push(`TVL +${(t30 * 100).toFixed(0)}% / 30d`);
        score += 1;
      } else if (t30 <= -0.3 && t7 <= -0.05) {
        reasons.push(`TVL ${(t30 * 100).toFixed(0)}% / 30d (펀더 약화)`);
        score -= 2;
      } else if (t30 <= -0.15) {
        reasons.push(`TVL ${(t30 * 100).toFixed(0)}% / 30d`);
        score -= 1;
      }
    }
  }

  // Fee 추세 (DefiLlama) — 펀더멘털 사용량 보강
  const fees = onchain?.fees;
  if (fees && typeof fees.change_7d === "number") {
    const f = fees.change_7d > 1 ? fees.change_7d / 100 : fees.change_7d; // sometimes percent, sometimes fraction
    if (f >= 0.5) {
      reasons.push(`Fees +${(f * 100).toFixed(0)}% / 7d`);
      score += 1;
    } else if (f <= -0.4) {
      reasons.push(`Fees ${(f * 100).toFixed(0)}% / 7d`);
      score -= 1;
    }
  }

  const level: SignalLevel =
    score >= 4 ? "BUY_STRONG" :
    score >= 2 ? "BUY" :
    score >= 1 ? "WATCH" :
    score <= -4 ? "SELL_STRONG" :
    score <= -2 ? "SELL" :
    "NEUTRAL";

  return {
    symbol,
    base,
    price,
    rsiDaily,
    rsiWeekly,
    ma50,
    ma200,
    ma200Slope,
    priceVs200,
    priceVs50,
    cross50Up,
    cross200Down,
    reasons,
    level,
    score,
    onchain,
  };
}
