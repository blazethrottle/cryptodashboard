/**
 * 백테스트 엔진 — 우리 시그널 룰을 과거 데이터로 시뮬레이션.
 *
 * 룰:
 *   - BUY / BUY_STRONG 시그널 → 매수 (전체 자본의 50% / 100%)
 *   - SELL / SELL_STRONG 시그널 → 매도 (보유분 50% / 100%)
 *   - WATCH / NEUTRAL → 보유 (no action)
 *
 * 측정:
 *   - 총 수익률 vs Buy & Hold
 *   - 승률 (win rate, 거래 단위)
 *   - 최대 손실 (max drawdown)
 *   - 거래 횟수
 *   - Sharpe ratio (간단 근사)
 */

import type { Candle } from "./exchanges/binance.ts";
import { rsi, sma, slope, crossedAbove, crossedBelow } from "./indicators.ts";

export interface BacktestParams {
  base: string;
  daily: Candle[];
  weekly: Candle[];
  /** 시작 시점 (인덱스). 200일 MA를 위해 최소 200 권장 */
  startIdx?: number;
  /** 초기 자본 USD */
  initialCapital?: number;
  /** 거래 수수료 % (편도) */
  feePct?: number;
}

export interface Trade {
  date: string;
  action: "BUY" | "BUY_STRONG" | "SELL" | "SELL_STRONG";
  price: number;
  size: number;       // 코인 수량
  cashChange: number; // 현금 변화 (음수=매수, 양수=매도)
  reasons: string[];
  portfolioValue: number;
}

export interface BacktestResult {
  base: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturnPct: number;       // (final - initial) / initial
  buyHoldReturnPct: number;     // 단순 보유 시 수익률
  outperformancePct: number;    // 우리 룰 - B&H
  trades: Trade[];
  numTrades: number;
  winRate: number;              // 0..1, 매수→매도 사이클 기준
  maxDrawdownPct: number;       // 0..1, 최대 평가액 → 최저 평가액
  sharpe: number;               // 간단 근사 (일별 수익률의 mean / std × sqrt(252))
  signalAccuracy: {
    buyTriggers: number;
    sellTriggers: number;
    profitableBuys: number;
    profitableSells: number;
  };
}

/**
 * 일별 시그널 — 백테스트용 단순화 버전.
 * 사용자 룰 직접 구현 (signals.ts와 동일 로직, 온체인 데이터는 제외).
 */
function dailySignal(
  dCloses: number[],
  wCloses: number[],
  i: number,
  rsiD: number[],
  rsiW: number[],
  ma50Series: number[],
  ma200Series: number[],
): { level: "BUY_STRONG" | "BUY" | "SELL_STRONG" | "SELL" | "HOLD"; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const rsiDaily = rsiD[i];
  const rsiWeeklyIdx = Math.floor(i / 7);
  const rsiWeekly = rsiW[rsiWeeklyIdx] ?? rsiW.at(-1) ?? NaN;
  const ma50 = ma50Series[i];
  const ma200 = ma200Series[i];
  const price = dCloses[i];

  if (![rsiDaily, ma50, ma200, price].every(Number.isFinite)) return { level: "HOLD", reasons: [] };

  const ma200Slope = slope(ma200Series.slice(Math.max(0, i - 20), i + 1).filter((v) => !Number.isNaN(v)), 20);
  const cross50Up = crossedAbove(dCloses.slice(Math.max(0, i - 5), i + 1), ma50Series.slice(Math.max(0, i - 5), i + 1), 5);
  const cross200Down = crossedBelow(dCloses.slice(Math.max(0, i - 5), i + 1), ma200Series.slice(Math.max(0, i - 5), i + 1), 5);

  // 매수
  if (rsiWeekly <= 30) {
    reasons.push(`주봉 RSI ${rsiWeekly.toFixed(1)} ≤30`);
    score += 3;
  } else if (rsiWeekly <= 40) {
    reasons.push(`주봉 RSI ${rsiWeekly.toFixed(1)} ≤40`);
    score += 1;
  }
  if (rsiDaily <= 30) {
    reasons.push(`일봉 RSI ${rsiDaily.toFixed(1)} ≤30`);
    score += 2;
  } else if (rsiDaily <= 50 && cross50Up) {
    reasons.push(`일봉 RSI + 50일선 돌파`);
    score += 2;
  }
  if (price > ma200 && ma200Slope > 0) {
    reasons.push(`200일선 위 + 상향`);
    score += 1;
  }

  // 매도
  if (rsiWeekly >= 70) {
    reasons.push(`주봉 RSI ${rsiWeekly.toFixed(1)} ≥70`);
    score -= 3;
  }
  if (rsiDaily >= 80) {
    reasons.push(`일봉 RSI ≥80`);
    score -= 2;
  }
  if (cross200Down && ma200Slope < 0) {
    reasons.push(`200일선 하향 돌파 + 하락`);
    score -= 3;
  }

  let level: "BUY_STRONG" | "BUY" | "SELL_STRONG" | "SELL" | "HOLD" = "HOLD";
  if (score >= 4) level = "BUY_STRONG";
  else if (score >= 2) level = "BUY";
  else if (score <= -4) level = "SELL_STRONG";
  else if (score <= -2) level = "SELL";

  return { level, reasons };
}

export function backtest({
  base,
  daily,
  weekly,
  startIdx = 200,
  initialCapital = 10_000,
  feePct = 0.001,
}: BacktestParams): BacktestResult {
  const dCloses = daily.map((c) => c.close);
  const wCloses = weekly.map((c) => c.close);

  const rsiD = rsi(dCloses, 14);
  const rsiW = rsi(wCloses, 14);
  const ma50Series = sma(dCloses, 50);
  const ma200Series = sma(dCloses, 200);

  let cash = initialCapital;
  let coinAmount = 0;
  const trades: Trade[] = [];

  // Buy & Hold 비교 — startIdx 시점 진입
  const startPrice = dCloses[startIdx];
  const endPrice = dCloses.at(-1)!;
  const buyHoldFinal = (initialCapital / startPrice) * endPrice;

  // Drawdown 추적
  let peakValue = initialCapital;
  let maxDrawdown = 0;
  const dailyReturns: number[] = [];

  // 시그널별 통계
  let buyTriggers = 0;
  let sellTriggers = 0;
  let profitableBuys = 0;
  let profitableSells = 0;

  // 매수→매도 사이클 추적 (승률용)
  const cycles: { entryPrice: number; exitPrice: number }[] = [];
  let lastEntryPrice: number | null = null;

  for (let i = startIdx; i < daily.length; i++) {
    const sig = dailySignal(dCloses, wCloses, i, rsiD, rsiW, ma50Series, ma200Series);
    const price = dCloses[i];
    const date = new Date(daily[i].openTime).toISOString().slice(0, 10);
    const portfolioBefore = cash + coinAmount * price;

    if ((sig.level === "BUY" || sig.level === "BUY_STRONG") && cash > 0) {
      const fraction = sig.level === "BUY_STRONG" ? 1.0 : 0.5;
      const allocateCash = cash * fraction;
      const buyAmount = (allocateCash * (1 - feePct)) / price;
      const cashChange = -allocateCash;
      cash -= allocateCash;
      coinAmount += buyAmount;
      const portfolioValue = cash + coinAmount * price;
      trades.push({ date, action: sig.level, price, size: buyAmount, cashChange, reasons: sig.reasons, portfolioValue });
      buyTriggers++;
      if (lastEntryPrice === null) lastEntryPrice = price;
    } else if ((sig.level === "SELL" || sig.level === "SELL_STRONG") && coinAmount > 0) {
      const fraction = sig.level === "SELL_STRONG" ? 1.0 : 0.5;
      const sellAmount = coinAmount * fraction;
      const cashIn = sellAmount * price * (1 - feePct);
      cash += cashIn;
      coinAmount -= sellAmount;
      const portfolioValue = cash + coinAmount * price;
      trades.push({ date, action: sig.level, price, size: sellAmount, cashChange: cashIn, reasons: sig.reasons, portfolioValue });
      sellTriggers++;
      if (lastEntryPrice !== null) {
        cycles.push({ entryPrice: lastEntryPrice, exitPrice: price });
        if (price > lastEntryPrice) profitableBuys++;
        else profitableSells++; // sell trigger가 손실 회피했는지
        if (coinAmount === 0) lastEntryPrice = null;
      }
    }

    const portfolioValue = cash + coinAmount * price;
    if (portfolioValue > peakValue) peakValue = portfolioValue;
    const drawdown = (peakValue - portfolioValue) / peakValue;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    if (i > startIdx) {
      const prev = trades.length > 0 ? trades.at(-1)?.portfolioValue : portfolioBefore;
      const r = ((portfolioValue - (prev ?? portfolioBefore)) / (prev ?? portfolioBefore));
      if (Number.isFinite(r)) dailyReturns.push(r);
    }
  }

  // 마지막 청산
  const finalPrice = dCloses.at(-1)!;
  const finalCapital = cash + coinAmount * finalPrice;

  const totalReturnPct = (finalCapital - initialCapital) / initialCapital;
  const buyHoldReturnPct = (buyHoldFinal - initialCapital) / initialCapital;
  const outperformancePct = totalReturnPct - buyHoldReturnPct;

  const winRate = cycles.length > 0 ? cycles.filter((c) => c.exitPrice > c.entryPrice).length / cycles.length : 0;

  // Sharpe — 일별 수익률 mean / std × sqrt(252)
  const meanR = dailyReturns.reduce((s, x) => s + x, 0) / Math.max(1, dailyReturns.length);
  const variance =
    dailyReturns.reduce((s, x) => s + (x - meanR) ** 2, 0) / Math.max(1, dailyReturns.length);
  const stdR = Math.sqrt(variance);
  const sharpe = stdR > 0 ? (meanR / stdR) * Math.sqrt(252) : 0;

  return {
    base,
    startDate: new Date(daily[startIdx].openTime).toISOString().slice(0, 10),
    endDate: new Date(daily.at(-1)!.openTime).toISOString().slice(0, 10),
    initialCapital,
    finalCapital,
    totalReturnPct,
    buyHoldReturnPct,
    outperformancePct,
    trades,
    numTrades: trades.length,
    winRate,
    maxDrawdownPct: maxDrawdown,
    sharpe,
    signalAccuracy: { buyTriggers, sellTriggers, profitableBuys, profitableSells },
  };
}
