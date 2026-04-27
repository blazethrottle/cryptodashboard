/**
 * Binance Futures (perp) public API — funding rate, OI, long-short ratio.
 * 무료, 키 불필요. Rate limit: 1200 weight/min.
 *
 * 알트 단/중기 멀티배거 진입·청산 시그널의 핵심.
 */

const FAPI = "https://fapi.binance.com";

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": "crypto-dashboard/0.1" } });
  if (!res.ok) throw new Error(`Binance fapi ${res.status}: ${res.statusText} (${url})`);
  return res.json();
}

export interface FundingRate {
  symbol: string;
  fundingRate: number;       // 8시간 단위. 연환산 = × 365 × 3
  fundingTime: number;
  markPrice: number;
}

interface RawPremiumIndex {
  symbol: string;
  markPrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
}

export async function fetchFundingRate(symbol: string): Promise<FundingRate | null> {
  try {
    const raw = (await fetchJSON(`${FAPI}/fapi/v1/premiumIndex?symbol=${symbol}`)) as RawPremiumIndex;
    return {
      symbol,
      fundingRate: parseFloat(raw.lastFundingRate),
      fundingTime: raw.nextFundingTime,
      markPrice: parseFloat(raw.markPrice),
    };
  } catch {
    return null; // 모든 코인이 perp 상장은 아님
  }
}

/** Funding rate 8시간 단위 → 연환산 % */
export function annualizedFunding(rate8h: number): number {
  return rate8h * 3 * 365; // 8h × 3 × 365 = 일/년 펀딩
}

export interface OpenInterest {
  symbol: string;
  openInterest: number;       // contracts
  notionalUsd: number;        // OI × markPrice (계산값)
  timestamp: number;
}

interface RawOI {
  symbol: string;
  openInterest: string;
  time: number;
}

export async function fetchOpenInterest(symbol: string, markPrice?: number): Promise<OpenInterest | null> {
  try {
    const raw = (await fetchJSON(`${FAPI}/fapi/v1/openInterest?symbol=${symbol}`)) as RawOI;
    const oi = parseFloat(raw.openInterest);
    const price = markPrice ?? 0;
    return {
      symbol,
      openInterest: oi,
      notionalUsd: oi * price,
      timestamp: raw.time,
    };
  } catch {
    return null;
  }
}

/**
 * OI 추세 — 최근 24h 변화율
 * Endpoint: /futures/data/openInterestHist (5min/15min/30min/1h/2h/4h/6h/12h/1d intervals)
 */
export interface OpenInterestHist {
  current: number;
  hours24Ago: number;
  change24hPct: number;
}

interface RawOIHist {
  symbol: string;
  sumOpenInterest: string;
  sumOpenInterestValue: string;
  timestamp: number;
}

export async function fetchOpenInterestTrend(symbol: string): Promise<OpenInterestHist | null> {
  try {
    const raw = (await fetchJSON(`${FAPI}/futures/data/openInterestHist?symbol=${symbol}&period=1h&limit=24`)) as RawOIHist[];
    if (!raw || raw.length < 2) return null;
    const current = parseFloat(raw.at(-1)!.sumOpenInterest);
    const oldest = parseFloat(raw[0].sumOpenInterest);
    return {
      current,
      hours24Ago: oldest,
      change24hPct: oldest === 0 ? 0 : (current - oldest) / oldest,
    };
  } catch {
    return null;
  }
}

/**
 * Long-Short Account Ratio — 군중 포지션 (1 = 50/50, 2 = 2배 long, 0.5 = 2배 short)
 * /futures/data/globalLongShortAccountRatio
 */
export interface LongShortRatio {
  current: number;
  trend: "rising" | "falling" | "flat";
}

interface RawLSR {
  symbol: string;
  longShortRatio: string;
  longAccount: string;
  shortAccount: string;
  timestamp: number;
}

export async function fetchLongShortRatio(symbol: string): Promise<LongShortRatio | null> {
  try {
    const raw = (await fetchJSON(`${FAPI}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=4h&limit=6`)) as RawLSR[];
    if (!raw || raw.length === 0) return null;
    const current = parseFloat(raw.at(-1)!.longShortRatio);
    const oldest = parseFloat(raw[0].longShortRatio);
    const delta = current - oldest;
    const trend = Math.abs(delta) < 0.05 ? "flat" : delta > 0 ? "rising" : "falling";
    return { current, trend };
  } catch {
    return null;
  }
}

/** 통합 perp 데이터 (한 번에) */
export interface PerpSnapshot {
  symbol: string;
  fundingRate: number;
  annualizedFundingPct: number;
  openInterestUsd: number;
  oiChange24hPct: number;
  longShortRatio: number;
  longShortTrend: "rising" | "falling" | "flat";
}

export async function fetchPerpSnapshot(base: string): Promise<PerpSnapshot | null> {
  // Binance perp은 USDT 기준
  const symbol = `${base}USDT`;
  const [fund, oiHist, lsr] = await Promise.all([
    fetchFundingRate(symbol),
    fetchOpenInterestTrend(symbol),
    fetchLongShortRatio(symbol),
  ]);
  if (!fund) return null;
  const oi = await fetchOpenInterest(symbol, fund.markPrice);
  return {
    symbol,
    fundingRate: fund.fundingRate,
    annualizedFundingPct: annualizedFunding(fund.fundingRate),
    openInterestUsd: oi?.notionalUsd ?? 0,
    oiChange24hPct: oiHist?.change24hPct ?? 0,
    longShortRatio: lsr?.current ?? 1,
    longShortTrend: lsr?.trend ?? "flat",
  };
}

/** 시그널 점수 계산 — Contrarian + Trend */
export function perpScore(snap: PerpSnapshot): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Funding 극단치 (군중 반대)
  if (snap.annualizedFundingPct >= 50) {
    reasons.push(`Funding +${snap.annualizedFundingPct.toFixed(0)}%/yr (Long 과열)`);
    score -= 1;
  } else if (snap.annualizedFundingPct >= 100) {
    reasons.push(`Funding +${snap.annualizedFundingPct.toFixed(0)}%/yr (극단 과열)`);
    score -= 2;
  } else if (snap.annualizedFundingPct <= -10) {
    reasons.push(`Funding ${snap.annualizedFundingPct.toFixed(0)}%/yr (Short 과열, 스퀴즈 가능)`);
    score += 1;
  }

  // LSR 극단치
  if (snap.longShortRatio >= 3) {
    reasons.push(`L/S ratio ${snap.longShortRatio.toFixed(1)} (군중 long crowded)`);
    score -= 1;
  } else if (snap.longShortRatio <= 0.5) {
    reasons.push(`L/S ratio ${snap.longShortRatio.toFixed(2)} (군중 short crowded)`);
    score += 1;
  }

  // OI 급증 + 가격 상승 = 확신, OI 급증 + 가격 하락 = 위험
  if (snap.oiChange24hPct >= 0.2) {
    reasons.push(`OI +${(snap.oiChange24hPct * 100).toFixed(0)}%/24h (포지션 급증)`);
  }

  return { score, reasons };
}
