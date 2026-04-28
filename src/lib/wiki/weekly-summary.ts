/**
 * 주간 데이터 집계 — Weekly Brief 입력용.
 *
 * 누적:
 *  - data/snapshots/ 중 지난 7일치
 *  - data/trade-plans/closed/ 중 지난 7일에 청산된 plan
 *  - data/trade-plans/active.json 현재 활성
 *  - signal level 변동 (어떤 코인이 어떻게 변했나)
 *  - 매크로 변화 (F&G, BTC.D, MVRV-Z 등)
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { TradePlan } from "../tradeplan.ts";
import type { SignalSnapshot } from "../signals.ts";

export interface WeeklySnapshotRow {
  base: string;
  name: string;
  startLevel?: string;
  endLevel: string;
  startPrice?: number;
  endPrice: number;
  priceChangePct: number;
}

export interface WeeklyMacroDelta {
  fearGreedStart?: number;
  fearGreedEnd?: number;
  btcDominanceStart?: number;
  btcDominanceEnd?: number;
  mvrvZStart?: number;
  mvrvZEnd?: number;
  stableSupplyChange30d?: number;
}

export interface WeeklySummary {
  rangeStart: string;
  rangeEnd: string;
  totalSnapshots: number;
  signalChanges: WeeklySnapshotRow[];   // signal level 바뀐 코인만
  priceMovers: WeeklySnapshotRow[];     // 가격 변화 |10%|+ 코인
  macroDelta: WeeklyMacroDelta;
  closedPlans: Array<{
    plan: TradePlan;
    pnlPct: number;
    pnlUsd: number;
    holdDays: number;
  }>;
  activePlans: TradePlan[];
}

interface SnapshotShape {
  timestamp: string;
  macro?: {
    fearGreed?: { current?: { value?: number } };
    global?: { btcDominance?: number };
    btcCycle?: { current?: { mvrvZ?: number } };
    stablecoins?: { change30dPct?: number };
  };
  rows: Array<{
    coin: { base: string; name: string };
    result?: SignalSnapshot;
  }>;
}

export async function aggregateWeekly(repoRoot: string, days = 7): Promise<WeeklySummary> {
  const snapshotDir = path.join(repoRoot, "data", "snapshots");
  const closedDir = path.join(repoRoot, "data", "trade-plans", "closed");
  const activeFile = path.join(repoRoot, "data", "trade-plans", "active.json");

  // 1. snapshots 로드 (지난 N일)
  const cutoff = Date.now() - days * 86400 * 1000;
  const allFiles = (await fs.readdir(snapshotDir).catch(() => [])).filter((f) => f.endsWith(".json")).sort();
  const recent: SnapshotShape[] = [];
  for (const f of allFiles) {
    const fullPath = path.join(snapshotDir, f);
    const stat = await fs.stat(fullPath);
    if (stat.mtimeMs < cutoff) continue;
    try {
      const data = JSON.parse(await fs.readFile(fullPath, "utf-8")) as SnapshotShape;
      recent.push(data);
    } catch {
      // ignore corrupt
    }
  }
  recent.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const first = recent[0];
  const last = recent.at(-1);

  // 2. signal level 변경 + 가격 이동
  const signalChanges: WeeklySnapshotRow[] = [];
  const priceMovers: WeeklySnapshotRow[] = [];
  if (first && last) {
    const startMap = new Map<string, { level: string; price: number; name: string }>();
    for (const r of first.rows) {
      if (r.result) startMap.set(r.coin.base, { level: r.result.level, price: r.result.price, name: r.coin.name });
    }
    for (const r of last.rows) {
      if (!r.result) continue;
      const start = startMap.get(r.coin.base);
      if (!start) continue;
      const pctChange = (r.result.price - start.price) / start.price;
      const row: WeeklySnapshotRow = {
        base: r.coin.base,
        name: r.coin.name,
        startLevel: start.level,
        endLevel: r.result.level,
        startPrice: start.price,
        endPrice: r.result.price,
        priceChangePct: pctChange,
      };
      if (start.level !== r.result.level) signalChanges.push(row);
      if (Math.abs(pctChange) >= 0.1) priceMovers.push(row);
    }
  }

  // 3. 매크로 변화
  const macroDelta: WeeklyMacroDelta = {
    fearGreedStart: first?.macro?.fearGreed?.current?.value,
    fearGreedEnd: last?.macro?.fearGreed?.current?.value,
    btcDominanceStart: first?.macro?.global?.btcDominance,
    btcDominanceEnd: last?.macro?.global?.btcDominance,
    mvrvZStart: first?.macro?.btcCycle?.current?.mvrvZ,
    mvrvZEnd: last?.macro?.btcCycle?.current?.mvrvZ,
    stableSupplyChange30d: last?.macro?.stablecoins?.change30dPct,
  };

  // 4. 청산된 plans
  const closedFiles = (await fs.readdir(closedDir).catch(() => [])).filter((f) => f.endsWith(".json"));
  const closedPlans: WeeklySummary["closedPlans"] = [];
  for (const f of closedFiles) {
    const stat = await fs.stat(path.join(closedDir, f));
    if (stat.mtimeMs < cutoff) continue;
    try {
      const plan = JSON.parse(await fs.readFile(path.join(closedDir, f), "utf-8")) as TradePlan;
      if (!plan.closed) continue;
      const enteredAt = new Date(plan.entry.enteredAt).getTime();
      const closedAt = new Date(plan.closed.closedAt).getTime();
      const holdDays = (closedAt - enteredAt) / 86400_000;
      closedPlans.push({
        plan,
        pnlPct: plan.closed.pnlPct,
        pnlUsd: plan.closed.pnlUsd,
        holdDays,
      });
    } catch {
      // skip
    }
  }

  // 5. active plans
  let activePlans: TradePlan[] = [];
  try {
    activePlans = JSON.parse(await fs.readFile(activeFile, "utf-8")) as TradePlan[];
  } catch {
    // empty
  }

  return {
    rangeStart: first?.timestamp ?? new Date(cutoff).toISOString(),
    rangeEnd: last?.timestamp ?? new Date().toISOString(),
    totalSnapshots: recent.length,
    signalChanges: signalChanges.sort((a, b) => Math.abs(b.priceChangePct) - Math.abs(a.priceChangePct)),
    priceMovers: priceMovers.sort((a, b) => b.priceChangePct - a.priceChangePct),
    macroDelta,
    closedPlans,
    activePlans,
  };
}

/** Weekly Summary → LLM 친화적 텍스트 (brief 입력용) */
export function summarizeForLLM(s: WeeklySummary): string {
  const lines: string[] = [];
  const dStart = s.rangeStart.slice(0, 10);
  const dEnd = s.rangeEnd.slice(0, 10);
  lines.push(`### 기간: ${dStart} → ${dEnd} (${s.totalSnapshots} snapshots)`);
  lines.push("");

  lines.push(`### 매크로 변화`);
  const m = s.macroDelta;
  if (m.fearGreedStart != null && m.fearGreedEnd != null) {
    lines.push(`- Fear & Greed: ${m.fearGreedStart} → ${m.fearGreedEnd}`);
  }
  if (m.btcDominanceStart != null && m.btcDominanceEnd != null) {
    lines.push(`- BTC dominance: ${(m.btcDominanceStart * 100).toFixed(1)}% → ${(m.btcDominanceEnd * 100).toFixed(1)}%`);
  }
  if (m.mvrvZStart != null && m.mvrvZEnd != null) {
    lines.push(`- BTC MVRV-Z: ${m.mvrvZStart.toFixed(2)} → ${m.mvrvZEnd.toFixed(2)}`);
  }
  if (m.stableSupplyChange30d != null) {
    lines.push(`- Stablecoin 30d 변화: ${(m.stableSupplyChange30d * 100).toFixed(2)}%`);
  }
  lines.push("");

  lines.push(`### 시그널 레벨 변경 (${s.signalChanges.length}개)`);
  for (const r of s.signalChanges.slice(0, 20)) {
    const pct = (r.priceChangePct * 100).toFixed(1);
    lines.push(`- ${r.base} (${r.name}): ${r.startLevel} → ${r.endLevel} · 가격 ${pct >= "0" ? "+" : ""}${pct}%`);
  }
  lines.push("");

  lines.push(`### 가격 큰 이동 (±10%+, ${s.priceMovers.length}개)`);
  for (const r of s.priceMovers.slice(0, 20)) {
    const pct = (r.priceChangePct * 100).toFixed(1);
    lines.push(`- ${r.base}: ${pct >= "0" ? "+" : ""}${pct}% (${r.endLevel})`);
  }
  lines.push("");

  lines.push(`### 청산된 Trade Plans (${s.closedPlans.length}개)`);
  for (const cp of s.closedPlans) {
    const sign = cp.pnlPct >= 0 ? "+" : "";
    lines.push(`- ${cp.plan.coin}: ${sign}${(cp.pnlPct * 100).toFixed(1)}% (${cp.holdDays.toFixed(1)}일 보유) — ${cp.plan.thesis.narrative}`);
    if (cp.plan.closed?.lessons) lines.push(`  교훈: ${cp.plan.closed.lessons}`);
  }
  lines.push("");

  lines.push(`### 활성 Trade Plans (${s.activePlans.length}개)`);
  for (const p of s.activePlans) {
    lines.push(`- ${p.coin}: 진입 $${p.entry.actualPrice} · 손절 $${p.stopLoss.price} · 익절 ${p.takeProfit.map((t) => `$${t.price}`).join(",")} · ${p.thesis.timeHorizon} · ${p.thesis.narrative}`);
  }

  return lines.join("\n");
}
