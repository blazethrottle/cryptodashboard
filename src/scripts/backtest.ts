/**
 * 백테스트 CLI — 핵심 코인에 대해 시그널 룰 시뮬레이션.
 *
 *   npm run backtest                       # core 4개 (BTC, ETH, SOL, XRP)
 *   npm run backtest -- --coins=BTC,ETH    # 특정 코인
 *   npm run backtest -- --capital=100000   # 초기 자본
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchCandlesWithFallback } from "../lib/exchanges/aggregator.ts";
import { backtest, type BacktestResult } from "../lib/backtest.ts";
import { ALL_COINS } from "../lib/universe.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(REPO_ROOT, "data", "backtests");

interface CliArgs {
  coins: string[];
  capital: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const get = (key: string): string | undefined => {
    return args.find((a) => a.startsWith(`--${key}=`))?.split("=")[1];
  };
  const coins = (get("coins") ?? "BTC,ETH,SOL,XRP,LINK,SUI,AVAX,ONDO").split(",");
  const capital = Number(get("capital") ?? 10_000);
  return { coins, capital };
}

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function pct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(1)}%`;
}

function printResult(r: BacktestResult): void {
  const c = C;
  const winColor = r.totalReturnPct >= 0 ? c.green : c.red;
  const outpColor = r.outperformancePct >= 0 ? c.green : c.red;
  console.log();
  console.log(`${c.bold}━━━ ${r.base} ${r.startDate} → ${r.endDate} ━━━${c.reset}`);
  console.log(`  자본: $${r.initialCapital.toLocaleString()} → ${winColor}$${r.finalCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${pct(r.totalReturnPct)})${c.reset}`);
  console.log(`  Buy & Hold: ${pct(r.buyHoldReturnPct).padStart(7)}  ·  vs B&H: ${outpColor}${pct(r.outperformancePct)}${c.reset}`);
  console.log(`  거래: ${r.numTrades}회 (매수 ${r.signalAccuracy.buyTriggers} / 매도 ${r.signalAccuracy.sellTriggers}) · 승률 ${(r.winRate * 100).toFixed(0)}%`);
  console.log(`  최대 손실: ${c.red}-${(r.maxDrawdownPct * 100).toFixed(1)}%${c.reset}  ·  Sharpe ${r.sharpe.toFixed(2)}`);
  if (r.trades.length > 0 && r.trades.length <= 20) {
    console.log(`  ${c.dim}최근 거래:${c.reset}`);
    for (const t of r.trades.slice(-5)) {
      const tag = t.action.startsWith("BUY") ? c.green : c.yellow;
      console.log(
        `    ${t.date}  ${tag}${t.action}${c.reset} @ $${t.price.toFixed(2).padStart(10)}  포트폴리오 $${t.portfolioValue.toFixed(0)}`,
      );
    }
  } else if (r.trades.length > 20) {
    console.log(`  ${c.dim}거래 ${r.trades.length}회 (출력 생략, JSON 참조)${c.reset}`);
  }
}

async function main(): Promise<void> {
  const { coins, capital } = parseArgs();
  console.log(`📊 백테스트: ${coins.join(", ")} · 자본 $${capital.toLocaleString()}`);

  await fs.mkdir(OUT_DIR, { recursive: true });

  const results: BacktestResult[] = [];
  for (const base of coins) {
    const coin = ALL_COINS.find((c) => c.base === base);
    if (!coin) {
      console.log(`  ${C.red}${base} — universe에 없음${C.reset}`);
      continue;
    }
    try {
      const [daily, weekly] = await Promise.all([
        fetchCandlesWithFallback(coin, "1d", 1000),
        fetchCandlesWithFallback(coin, "1w", 200),
      ]);
      if (daily.candles.length < 250) {
        console.log(`  ${C.yellow}${base} — 데이터 ${daily.candles.length}일 (200일 MA 부족)${C.reset}`);
        continue;
      }
      const result = backtest({ base, daily: daily.candles, weekly: weekly.candles, initialCapital: capital });
      results.push(result);
      printResult(result);
    } catch (err) {
      console.log(`  ${C.red}${base} — ${(err as Error).message}${C.reset}`);
    }
  }

  // 종합
  if (results.length > 0) {
    const c = C;
    const avgReturn = results.reduce((s, r) => s + r.totalReturnPct, 0) / results.length;
    const avgBh = results.reduce((s, r) => s + r.buyHoldReturnPct, 0) / results.length;
    const avgWin = results.reduce((s, r) => s + r.winRate, 0) / results.length;
    const avgDd = results.reduce((s, r) => s + r.maxDrawdownPct, 0) / results.length;
    console.log();
    console.log(`${c.bold}━━━ 종합 (${results.length} 코인 평균) ━━━${c.reset}`);
    console.log(`  우리 룰 평균 수익률: ${avgReturn >= avgBh ? c.green : c.red}${pct(avgReturn)}${c.reset}`);
    console.log(`  Buy & Hold 평균:     ${pct(avgBh)}`);
    console.log(`  vs B&H:              ${avgReturn - avgBh >= 0 ? c.green : c.red}${pct(avgReturn - avgBh)}${c.reset}`);
    console.log(`  평균 승률:           ${(avgWin * 100).toFixed(0)}%`);
    console.log(`  평균 최대 손실:      ${c.red}-${(avgDd * 100).toFixed(1)}%${c.reset}`);
  }

  // JSON 저장
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(OUT_DIR, `${ts}.json`);
  await fs.writeFile(file, JSON.stringify({ timestamp: new Date().toISOString(), capital, results }, null, 2));
  console.log();
  console.log(`${C.dim}💾 ${path.relative(REPO_ROOT, file)}${C.reset}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
