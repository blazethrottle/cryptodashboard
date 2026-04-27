/**
 * 기관 포트폴리오 분석.
 *  - 기관별 보유 코인의 시그널 집계
 *  - X-VIP vs 기관 매트릭스 (어디만 보유, 어디 둘 다)
 *  - 신규 편입 추적 (history snapshot 비교)
 */

import { INSTITUTIONS, XVIP_UNIVERSE, type Institution } from "./universe.ts";
import type { SignalSnapshot } from "./signals.ts";

export interface InstitutionStats {
  name: Institution;
  totalHoldings: number;
  signaledHoldings: Array<{ base: string; level: SignalSnapshot["level"]; score: number }>;
  buyCount: number;
  sellCount: number;
  watchCount: number;
  averageScore: number;
  uniqueCoins: string[];        // 다른 기관에 없는 코인 (이 기관만 보유)
  overlapWithXVIP: string[];    // X-VIP와 겹치는 코인
}

export interface CrossAnalysis {
  byInstitution: InstitutionStats[];
  /** 모든 기관에 공통으로 있는 코인 (consensus picks) */
  consensus: string[];
  /** X-VIP에는 있지만 어떤 기관도 보유 안한 코인 (X-VIP 독자 픽) */
  xvipOnly: string[];
  /** 기관에는 있지만 X-VIP에는 없는 코인 (편입 후보) */
  institutionOnly: string[];
  /** 코인별 보유 기관 수 */
  holderCount: Map<string, number>;
}

export function analyzeInstitutions(
  signalsByBase: Map<string, SignalSnapshot>,
): CrossAnalysis {
  const xvipBases = new Set(XVIP_UNIVERSE.map((c) => c.base));
  const allInstitutionCoins = new Set<string>();
  for (const list of Object.values(INSTITUTIONS)) for (const b of list) allInstitutionCoins.add(b);

  const holderCount = new Map<string, number>();
  for (const list of Object.values(INSTITUTIONS)) {
    for (const b of list) holderCount.set(b, (holderCount.get(b) ?? 0) + 1);
  }

  // 모든 기관에 공통: holderCount === Object.keys(INSTITUTIONS).length
  const totalInstitutions = Object.keys(INSTITUTIONS).length;
  const consensus = [...holderCount.entries()]
    .filter(([, count]) => count === totalInstitutions)
    .map(([base]) => base);

  const xvipOnly = [...xvipBases].filter((b) => !allInstitutionCoins.has(b));
  const institutionOnly = [...allInstitutionCoins].filter((b) => !xvipBases.has(b));

  const byInstitution: InstitutionStats[] = [];
  for (const [name, holdings] of Object.entries(INSTITUTIONS)) {
    const signaledHoldings: InstitutionStats["signaledHoldings"] = [];
    let totalScore = 0;
    let scoredCount = 0;
    let buyCount = 0;
    let sellCount = 0;
    let watchCount = 0;

    for (const base of holdings) {
      const sig = signalsByBase.get(base);
      if (!sig) continue;
      signaledHoldings.push({ base, level: sig.level, score: sig.score });
      totalScore += sig.score;
      scoredCount++;
      if (sig.level === "BUY" || sig.level === "BUY_STRONG") buyCount++;
      else if (sig.level === "SELL" || sig.level === "SELL_STRONG") sellCount++;
      else if (sig.level === "WATCH") watchCount++;
    }

    // 이 기관에만 있는 코인 (다른 기관 0)
    const uniqueCoins = (holdings as readonly string[]).filter((b) => holderCount.get(b) === 1);
    // X-VIP와 겹침
    const overlapWithXVIP = (holdings as readonly string[]).filter((b) => xvipBases.has(b));

    byInstitution.push({
      name: name as Institution,
      totalHoldings: holdings.length,
      signaledHoldings: signaledHoldings.sort((a, b) => b.score - a.score),
      buyCount,
      sellCount,
      watchCount,
      averageScore: scoredCount > 0 ? totalScore / scoredCount : 0,
      uniqueCoins,
      overlapWithXVIP,
    });
  }

  return {
    byInstitution: byInstitution.sort((a, b) => b.averageScore - a.averageScore),
    consensus,
    xvipOnly,
    institutionOnly,
    holderCount,
  };
}
