/**
 * Trade Plan 시스템 — X-VIP 십계명 #5, #7 직접 구현.
 *
 * 핵심 원칙:
 *  - **진입 전 손절·익절 사전 정의 강제** (#5 고통 = 수익의 대가)
 *  - **팔 이유 나올 때까지 보유** (#7 — 사전 정의된 trigger 외 청산 안 함)
 *  - 매 snapshot 시 자동 평가 → 도달 시 강한 알림 + Vault 자동 기록
 *
 * 저장: data/trade-plans/active.json (open) + data/trade-plans/closed/<id>.json (closed)
 */

import fs from "node:fs/promises";
import path from "node:path";

export type PlanStatus = "open" | "closed" | "cancelled";

export interface TakeProfitLeg {
  price: number;
  fraction: number;          // 0~1, 이 가격에 청산할 비중
  triggered: boolean;
  triggeredAt?: string;
  triggeredPrice?: number;   // 실제 도달 시점 가격 (slippage 포함)
}

export interface TradePlan {
  id: string;
  coin: string;
  status: PlanStatus;
  createdAt: string;

  /** 진입 정보 */
  entry: {
    plannedPrice?: number;    // 계획된 진입가 (목표)
    actualPrice: number;      // 실제 진입가
    enteredAt: string;
    sizeUsd: number;          // USD 가치
    sizeCoin: number;         // 코인 수량
    rationale: string;        // 진입 이유 (thesis)
  };

  /** 손절 — 절대적 룰 (변경 시 사유 명시) */
  stopLoss: {
    price: number;
    fraction: number;          // 0~1, 손절 시 청산 비중 (보통 1.0)
    triggered: boolean;
    triggeredAt?: string;
    triggeredPrice?: number;
    rationale: string;         // 왜 이 가격에서 손절?
  };

  /** 익절 — 분할 매도 가능. 사전 정의된 가격 외 변경 금지 */
  takeProfit: TakeProfitLeg[];

  /** 청산 정보 (status === "closed" 시) */
  closed?: {
    closedAt: string;
    avgExitPrice: number;       // 분할 청산 평균 (또는 단일 청산가)
    pnlUsd: number;
    pnlPct: number;
    lessons?: string;           // 사후 회고
  };

  /** 매수 thesis 검증 — 매주 자동 brief에서 재평가 */
  thesis: {
    timeHorizon: "short" | "medium" | "long";   // 단기 (수일) / 중기 (수주) / 장기 (수개월+)
    narrative: string;                           // 어떤 narrative로 진입했나
    validUntil?: string;                         // thesis 유효 기간 (선택)
  };
}

export interface PlanEvaluation {
  plan: TradePlan;
  currentPrice: number;
  currentPnLUsd: number;
  currentPnLPct: number;
  /** 도달한 trigger들 (이번 snapshot에서) */
  triggers: Array<{
    type: "stopLoss" | "takeProfit";
    legIndex?: number;          // takeProfit leg 인덱스
    price: number;
    fraction: number;
  }>;
  /** Plan이 살아있나? (open + 모든 trigger 도달 안 함) */
  stillOpen: boolean;
}

// ── 저장 / 로드 ────────────────────────────────────────────────────────────

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function loadActivePlans(rootDir: string): Promise<TradePlan[]> {
  const file = path.join(rootDir, "data", "trade-plans", "active.json");
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as TradePlan[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function saveActivePlans(rootDir: string, plans: TradePlan[]): Promise<void> {
  const dir = path.join(rootDir, "data", "trade-plans");
  await ensureDir(dir);
  await fs.writeFile(path.join(dir, "active.json"), JSON.stringify(plans, null, 2));
}

export async function archiveClosedPlan(rootDir: string, plan: TradePlan): Promise<void> {
  const dir = path.join(rootDir, "data", "trade-plans", "closed");
  await ensureDir(dir);
  await fs.writeFile(path.join(dir, `${plan.id}.json`), JSON.stringify(plan, null, 2));
}

// ── 평가 (매 snapshot 시 호출) ─────────────────────────────────────────────

export function evaluatePlan(plan: TradePlan, currentPrice: number): PlanEvaluation {
  const triggers: PlanEvaluation["triggers"] = [];

  if (plan.status !== "open") {
    return {
      plan,
      currentPrice,
      currentPnLUsd: 0,
      currentPnLPct: 0,
      triggers: [],
      stillOpen: false,
    };
  }

  // 손절 도달?
  if (!plan.stopLoss.triggered && currentPrice <= plan.stopLoss.price) {
    triggers.push({
      type: "stopLoss",
      price: plan.stopLoss.price,
      fraction: plan.stopLoss.fraction,
    });
  }

  // 익절 도달?
  for (let i = 0; i < plan.takeProfit.length; i++) {
    const leg = plan.takeProfit[i];
    if (!leg.triggered && currentPrice >= leg.price) {
      triggers.push({
        type: "takeProfit",
        legIndex: i,
        price: leg.price,
        fraction: leg.fraction,
      });
    }
  }

  const pnlUsd = (currentPrice - plan.entry.actualPrice) * plan.entry.sizeCoin;
  const pnlPct = (currentPrice - plan.entry.actualPrice) / plan.entry.actualPrice;

  return {
    plan,
    currentPrice,
    currentPnLUsd: pnlUsd,
    currentPnLPct: pnlPct,
    triggers,
    stillOpen: triggers.length === 0,
  };
}

// ── ID 생성 ────────────────────────────────────────────────────────────────

export function makePlanId(coin: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${coin}-${ts}`;
}

// ── Plan 생성 헬퍼 ────────────────────────────────────────────────────────

export interface CreatePlanInput {
  coin: string;
  entryPrice: number;
  sizeUsd: number;
  stopLossPrice: number;
  /** 익절 가격들 (분할). 비중 fraction은 균등 분배 또는 명시 */
  takeProfit: Array<{ price: number; fraction?: number }>;
  rationale: string;
  thesis: {
    timeHorizon: "short" | "medium" | "long";
    narrative: string;
    validUntil?: string;
  };
}

export function createPlan(input: CreatePlanInput): TradePlan {
  const sizeCoin = input.sizeUsd / input.entryPrice;
  // 익절 fraction 자동 균등 분배 (명시 안 했을 시)
  const tpCount = input.takeProfit.length;
  const defaultFraction = 1 / tpCount;
  const takeProfit: TakeProfitLeg[] = input.takeProfit.map((tp) => ({
    price: tp.price,
    fraction: tp.fraction ?? defaultFraction,
    triggered: false,
  }));

  return {
    id: makePlanId(input.coin),
    coin: input.coin,
    status: "open",
    createdAt: new Date().toISOString(),
    entry: {
      actualPrice: input.entryPrice,
      enteredAt: new Date().toISOString(),
      sizeUsd: input.sizeUsd,
      sizeCoin,
      rationale: input.rationale,
    },
    stopLoss: {
      price: input.stopLossPrice,
      fraction: 1.0,
      triggered: false,
      rationale: `Stop loss at ${input.stopLossPrice} (${(((input.stopLossPrice - input.entryPrice) / input.entryPrice) * 100).toFixed(1)}%)`,
    },
    takeProfit,
    thesis: input.thesis,
  };
}
