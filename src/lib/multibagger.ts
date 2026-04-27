/**
 * Multibagger Score — 알트 트랙 (100~1000% 수익률 추구).
 *
 * 사용자 사후 분석 6 체크리스트 기반:
 *   1. TVL 7d > +30%
 *   2. CG 카테고리 30d > +50%
 *   3. Funding 양수 + OI 상승
 *   4. (whale tracking은 향후)
 *   5. (상장 임박은 향후)
 *   6. 시총 < $500M (성장 여력)
 *
 * 4개 이상 충족 = watchlist 진입 후보.
 */

import type { SignalSnapshot } from "./signals.ts";
import type { Coin } from "./universe.ts";

export interface MultibaggerInputs {
  coin: Coin;
  signal: SignalSnapshot;
  marketCapUsd?: number | null;
}

export interface MultibaggerScore {
  base: string;
  total: number;          // 0-6
  checks: {
    tvlGrowth: boolean;        // TVL 7d > +30%
    categoryHot: boolean;      // 카테고리 30d > +50%
    perpBullish: boolean;      // funding 양수 + OI 상승
    rsiOversold: boolean;      // 주봉 RSI < 40 (멀티배거 진입은 침체에서)
    contrarianFear: boolean;   // F&G < 30
    smallCap: boolean;         // 시총 < $500M (있으면)
  };
  reasons: string[];
  rating: "candidate" | "watch" | "weak";
}

export function computeMultibaggerScore({ coin, signal, marketCapUsd }: MultibaggerInputs): MultibaggerScore {
  const reasons: string[] = [];
  const tvl = signal.onchain?.tvl;
  const perp = signal.onchain?.perp;
  const cat30 = signal.onchain?.categoryChange30d;
  const fg = signal.onchain?.fearGreed;

  const checks = {
    tvlGrowth: !!tvl && Math.abs(tvl.tvl7dChange) < 0.9 && tvl.tvl7dChange > 0.3,
    categoryHot: typeof cat30 === "number" && Math.abs(cat30) < 5 && cat30 > 0.5,
    perpBullish: !!perp && perp.fundingRate > 0 && perp.oiChange24hPct > 0.1,
    rsiOversold: signal.rsiWeekly < 40,
    contrarianFear: typeof fg === "number" && fg < 30,
    smallCap: typeof marketCapUsd === "number" && marketCapUsd < 500_000_000,
  };

  if (checks.tvlGrowth && tvl) reasons.push(`TVL +${(tvl.tvl7dChange * 100).toFixed(0)}%/7d`);
  if (checks.categoryHot && typeof cat30 === "number") reasons.push(`카테고리 +${(cat30 * 100).toFixed(0)}%/30d`);
  if (checks.perpBullish && perp) reasons.push(`Funding ${(perp.annualizedFundingPct).toFixed(0)}%/yr + OI +${(perp.oiChange24hPct * 100).toFixed(0)}%`);
  if (checks.rsiOversold) reasons.push(`주봉 RSI ${signal.rsiWeekly.toFixed(0)} (저평가 진입)`);
  if (checks.contrarianFear && typeof fg === "number") reasons.push(`F&G ${fg} (Contrarian 진입)`);
  if (checks.smallCap && typeof marketCapUsd === "number") reasons.push(`시총 ${(marketCapUsd / 1e6).toFixed(0)}M (성장 여력)`);

  const total = Object.values(checks).filter(Boolean).length;
  const rating: MultibaggerScore["rating"] =
    total >= 4 ? "candidate" : total >= 2 ? "watch" : "weak";

  // BTC는 멀티배거 트랙 아님
  void coin;

  return {
    base: signal.base,
    total,
    checks,
    reasons,
    rating,
  };
}
