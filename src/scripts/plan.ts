/**
 * Trade Plan CLI.
 *
 *   npm run plan list                                            # active plan 목록
 *   npm run plan add BTC --entry=77000 --size=3000 \
 *       --stop=70000 --target=120000,170000 \
 *       --rationale="장기 사이클 바닥 매수, MVRV-Z 0 근처" \
 *       --horizon=long --narrative="BTC ETF 자금 유입 + 사이클 회복"
 *   npm run plan close <id> --price=80000 --lessons="..."        # 청산
 *   npm run plan cancel <id>                                     # 취소
 *   npm run plan check                                           # 현재 시세로 평가 + 도달 시 알림
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadActivePlans,
  saveActivePlans,
  archiveClosedPlan,
  createPlan,
  evaluatePlan,
  type TradePlan,
} from "../lib/tradeplan.ts";
import { fetchCandlesWithFallback } from "../lib/exchanges/aggregator.ts";
import { ALL_COINS } from "../lib/universe.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
};

function pct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(1)}%`;
}

function fmtUsd(n: number): string {
  if (Math.abs(n) >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (Math.abs(n) >= 1) return `$${n.toFixed(2)}`;
  if (Math.abs(n) >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toExponential(2)}`;
}

function parseFlags(args: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of args) {
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > 0) out[a.slice(2, eq)] = a.slice(eq + 1);
    }
  }
  return out;
}

async function fetchCurrentPrice(coin: string): Promise<number | null> {
  const c = ALL_COINS.find((x) => x.base === coin);
  if (!c) return null;
  try {
    const r = await fetchCandlesWithFallback(c, "1d", 10);
    return r.candles.at(-1)?.close ?? null;
  } catch {
    return null;
  }
}

// ── Commands ───────────────────────────────────────────────────────────────

async function cmdList(): Promise<void> {
  const plans = await loadActivePlans(REPO_ROOT);
  if (plans.length === 0) {
    console.log(`${C.dim}활성 plan 없음. \`npm run plan add ...\`로 추가.${C.reset}`);
    return;
  }
  console.log(`${C.bold}활성 Trade Plans (${plans.length})${C.reset}`);
  console.log();
  for (const p of plans) {
    const price = await fetchCurrentPrice(p.coin);
    const pnl = price ? (price - p.entry.actualPrice) / p.entry.actualPrice : 0;
    const pnlColor = pnl >= 0 ? C.green : C.red;
    console.log(`  ${C.bold}${p.coin}${C.reset}  id=${p.id}`);
    console.log(`    진입: ${fmtUsd(p.entry.actualPrice)} × ${p.entry.sizeCoin.toFixed(6)} (${fmtUsd(p.entry.sizeUsd)})`);
    if (price !== null) console.log(`    현재: ${fmtUsd(price)}  ${pnlColor}${pct(pnl)}${C.reset}`);
    console.log(`    ${C.red}손절${C.reset}: ${fmtUsd(p.stopLoss.price)} (${pct((p.stopLoss.price - p.entry.actualPrice) / p.entry.actualPrice)})`);
    for (let i = 0; i < p.takeProfit.length; i++) {
      const leg = p.takeProfit[i];
      const tag = leg.triggered ? `${C.green}✓${C.reset}` : "○";
      console.log(`    ${C.green}익절${i + 1}${C.reset}: ${tag} ${fmtUsd(leg.price)} (${pct((leg.price - p.entry.actualPrice) / p.entry.actualPrice)}) × ${(leg.fraction * 100).toFixed(0)}%`);
    }
    console.log(`    thesis: ${C.dim}${p.thesis.narrative} (${p.thesis.timeHorizon})${C.reset}`);
    console.log(`    rationale: ${C.dim}${p.entry.rationale}${C.reset}`);
    console.log();
  }
}

async function cmdAdd(args: string[]): Promise<void> {
  const coin = args[0];
  if (!coin) {
    console.error("사용법: npm run plan add <COIN> --entry=<price> --size=<usd> --stop=<price> --target=<p1,p2> --rationale=\"...\" --horizon=short|medium|long --narrative=\"...\"");
    process.exit(1);
  }
  const flags = parseFlags(args.slice(1));
  const entryPrice = Number(flags.entry);
  const sizeUsd = Number(flags.size);
  const stopLossPrice = Number(flags.stop);
  const targets = (flags.target ?? "").split(",").map(Number).filter(Number.isFinite);
  const rationale = flags.rationale ?? "(rationale 미입력 — 매수 사유 기록 필수)";
  const horizon = (flags.horizon ?? "medium") as "short" | "medium" | "long";
  const narrative = flags.narrative ?? "(narrative 미입력)";

  if (!Number.isFinite(entryPrice) || !Number.isFinite(sizeUsd) || !Number.isFinite(stopLossPrice) || targets.length === 0) {
    console.error("필수 인자 누락. 다음을 모두 명시:");
    console.error("  --entry=<price>  --size=<usd>  --stop=<price>  --target=<p1[,p2,...]>");
    process.exit(1);
  }

  // X-VIP 십계명 #5 강제 — 손절은 진입가 아래여야 함
  if (stopLossPrice >= entryPrice) {
    console.error(`${C.red}손절가(${stopLossPrice})가 진입가(${entryPrice}) 이상. 거부.${C.reset}`);
    process.exit(1);
  }
  // 익절은 진입가 위여야 함
  if (targets.some((t) => t <= entryPrice)) {
    console.error(`${C.red}익절 가격 중 진입가(${entryPrice}) 이하인 값. 거부.${C.reset}`);
    process.exit(1);
  }

  const plan = createPlan({
    coin,
    entryPrice,
    sizeUsd,
    stopLossPrice,
    takeProfit: targets.map((p) => ({ price: p })),
    rationale,
    thesis: { timeHorizon: horizon, narrative },
  });

  const plans = await loadActivePlans(REPO_ROOT);
  plans.push(plan);
  await saveActivePlans(REPO_ROOT, plans);

  console.log(`${C.green}✓ Plan 등록${C.reset} ${plan.id}`);
  console.log(`  ${coin} 진입 ${fmtUsd(entryPrice)} × ${plan.entry.sizeCoin.toFixed(6)} (${fmtUsd(sizeUsd)})`);
  console.log(`  ${C.red}손절${C.reset} ${fmtUsd(stopLossPrice)} (${pct((stopLossPrice - entryPrice) / entryPrice)})`);
  console.log(`  ${C.green}익절${C.reset} ${targets.map((t) => `${fmtUsd(t)} (${pct((t - entryPrice) / entryPrice)})`).join(", ")}`);
  console.log(`  thesis: ${narrative} · 시간: ${horizon}`);
  console.log();
  console.log(`${C.dim}매 snapshot 시 자동 평가. 도달 시 강한 알림 + Vault 자동 기록.${C.reset}`);
}

async function cmdClose(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    console.error("사용법: npm run plan close <id> --price=<actual> [--lessons=\"...\"]");
    process.exit(1);
  }
  const flags = parseFlags(args.slice(1));
  const price = Number(flags.price);
  if (!Number.isFinite(price)) {
    console.error("필수: --price=<actual close price>");
    process.exit(1);
  }
  const plans = await loadActivePlans(REPO_ROOT);
  const idx = plans.findIndex((p) => p.id === id);
  if (idx === -1) {
    console.error(`Plan ${id} 없음`);
    process.exit(1);
  }
  const plan = plans[idx];
  const pnlUsd = (price - plan.entry.actualPrice) * plan.entry.sizeCoin;
  const pnlPct = (price - plan.entry.actualPrice) / plan.entry.actualPrice;
  plan.status = "closed";
  plan.closed = {
    closedAt: new Date().toISOString(),
    avgExitPrice: price,
    pnlUsd,
    pnlPct,
    lessons: flags.lessons,
  };
  await archiveClosedPlan(REPO_ROOT, plan);
  plans.splice(idx, 1);
  await saveActivePlans(REPO_ROOT, plans);
  const color = pnlUsd >= 0 ? C.green : C.red;
  console.log(`${color}✓ Plan ${id} 청산${C.reset}`);
  console.log(`  ${plan.coin} ${fmtUsd(plan.entry.actualPrice)} → ${fmtUsd(price)}`);
  console.log(`  PnL: ${color}${pct(pnlPct)} (${fmtUsd(pnlUsd)})${C.reset}`);
}

async function cmdCancel(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    console.error("사용법: npm run plan cancel <id>");
    process.exit(1);
  }
  const plans = await loadActivePlans(REPO_ROOT);
  const idx = plans.findIndex((p) => p.id === id);
  if (idx === -1) {
    console.error(`Plan ${id} 없음`);
    process.exit(1);
  }
  const plan = plans[idx];
  plan.status = "cancelled";
  await archiveClosedPlan(REPO_ROOT, plan);
  plans.splice(idx, 1);
  await saveActivePlans(REPO_ROOT, plans);
  console.log(`${C.yellow}Plan ${id} 취소됨${C.reset}`);
}

async function cmdCheck(): Promise<void> {
  const plans = await loadActivePlans(REPO_ROOT);
  if (plans.length === 0) {
    console.log(`${C.dim}활성 plan 없음.${C.reset}`);
    return;
  }
  let alerts = 0;
  for (const p of plans) {
    const price = await fetchCurrentPrice(p.coin);
    if (price === null) {
      console.log(`${C.yellow}${p.coin}: 가격 조회 실패${C.reset}`);
      continue;
    }
    const evalRes = evaluatePlan(p, price);
    if (evalRes.triggers.length > 0) {
      alerts += evalRes.triggers.length;
      for (const t of evalRes.triggers) {
        const color = t.type === "stopLoss" ? C.red : C.green;
        const label = t.type === "stopLoss" ? "🚨 손절 트리거" : "🎯 익절 트리거";
        console.log(`${color}${C.bold}${label}${C.reset}  ${p.coin}  ${fmtUsd(price)}  (${pct(evalRes.currentPnLPct)} ${fmtUsd(evalRes.currentPnLUsd)})`);
        console.log(`  trigger 가격 ${fmtUsd(t.price)}, 비중 ${(t.fraction * 100).toFixed(0)}%`);
        console.log(`  Plan ID: ${p.id}`);
        console.log(`  → 즉시 거래소에서 ${t.type === "stopLoss" ? "손절" : "익절"} 실행 후 \`npm run plan close ${p.id} --price=<실제>\``);
      }
    } else {
      const pColor = evalRes.currentPnLPct >= 0 ? C.green : C.red;
      console.log(`${C.dim}${p.coin}${C.reset}  ${fmtUsd(price)}  ${pColor}${pct(evalRes.currentPnLPct)}${C.reset}  (entry ${fmtUsd(p.entry.actualPrice)}, stop ${fmtUsd(p.stopLoss.price)}, next TP ${fmtUsd(p.takeProfit.find((t) => !t.triggered)?.price ?? 0)})`);
    }
  }
  if (alerts === 0) console.log(`${C.dim}모든 plan 정상 — 트리거 도달 없음.${C.reset}`);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const [, , subcommand, ...args] = process.argv;
  switch (subcommand) {
    case "list":
      await cmdList();
      break;
    case "add":
      await cmdAdd(args);
      break;
    case "close":
      await cmdClose(args);
      break;
    case "cancel":
      await cmdCancel(args);
      break;
    case "check":
      await cmdCheck();
      break;
    default:
      console.log("Usage:");
      console.log("  npm run plan list");
      console.log("  npm run plan add <COIN> --entry=<price> --size=<usd> --stop=<price> --target=<p1,p2> --rationale=\"...\" --horizon=short|medium|long --narrative=\"...\"");
      console.log("  npm run plan close <id> --price=<actual> [--lessons=\"...\"]");
      console.log("  npm run plan cancel <id>");
      console.log("  npm run plan check");
      process.exit(subcommand ? 1 : 0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
