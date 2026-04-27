/**
 * 메인 실행 스크립트.
 *   npm run snapshot                          # priority 코인만 (기본)
 *   npm run snapshot -- --universe=core
 *   npm run snapshot -- --universe=xvip
 *   npm run snapshot -- --universe=all
 *   npm run snapshot -- --no-onchain          # 온체인 데이터 fetch 끄기
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchCandlesWithFallback, type Source } from "../lib/exchanges/aggregator.ts";
import { evaluate, type SignalSnapshot } from "../lib/signals.ts";
import { filterUniverse, holdersOf, type Coin } from "../lib/universe.ts";
import { fetchProtocolTvl, fetchProtocolFees, fetchChainTvl, fetchStablecoinSupply, type ProtocolTvlMetrics, type FeesSummary, type ChainTvl, type StablecoinSnapshot } from "../lib/onchain/defillama.ts";
import { fetchBtcNetwork, type BtcNetworkState } from "../lib/onchain/btc.ts";
import { fetchSolNetwork, type SolNetworkState } from "../lib/onchain/sol.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SNAPSHOT_DIR = path.join(REPO_ROOT, "data", "snapshots");

interface CliArgs {
  universe: "core" | "xvip" | "priority" | "all";
  concurrency: number;
  onchain: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const get = (key: string): string | undefined => {
    const found = args.find((a) => a.startsWith(`--${key}=`));
    return found?.split("=")[1];
  };
  const universe = (get("universe") ?? "priority") as CliArgs["universe"];
  const concurrency = Number(get("concurrency") ?? 4);
  const onchain = !args.includes("--no-onchain");
  return { universe, concurrency, onchain };
}

interface CoinResult {
  coin: Coin;
  result?: SignalSnapshot;
  source?: Source | string;
  error?: string;
}

interface MacroContext {
  btc?: BtcNetworkState;
  sol?: SolNetworkState;
  chains: Record<string, ChainTvl | null>;
  stablecoins?: StablecoinSnapshot;
}

async function processCoin(
  coin: Coin,
  tvlByBase: Map<string, ProtocolTvlMetrics | null>,
  feesByBase: Map<string, FeesSummary | null>,
): Promise<CoinResult> {
  try {
    const [daily, weekly] = await Promise.all([
      fetchCandlesWithFallback(coin, "1d", 400),
      fetchCandlesWithFallback(coin, "1w", 200),
    ]);
    const result = evaluate({
      base: coin.base,
      symbol: daily.symbol,
      daily: daily.candles,
      weekly: weekly.candles,
      onchain: {
        tvl: tvlByBase.get(coin.base) ?? null,
        fees: feesByBase.get(coin.base) ?? null,
      },
    });
    const source = daily.source === weekly.source ? daily.source : `${daily.source}/${weekly.source}`;
    return { coin, result, source };
  } catch (err) {
    return { coin, error: (err as Error).message };
  }
}

async function fetchOnchainForUniverse(coins: Coin[]): Promise<{
  tvl: Map<string, ProtocolTvlMetrics | null>;
  fees: Map<string, FeesSummary | null>;
}> {
  const tvl = new Map<string, ProtocolTvlMetrics | null>();
  const fees = new Map<string, FeesSummary | null>();
  const slugged = coins.filter((c) => c.defillamaSlug);

  await Promise.all(
    slugged.map(async (c) => {
      try {
        const t = await fetchProtocolTvl(c.defillamaSlug!);
        tvl.set(c.base, t);
      } catch {
        tvl.set(c.base, null);
      }
      try {
        const f = await fetchProtocolFees(c.defillamaSlug!);
        fees.set(c.base, f);
      } catch {
        fees.set(c.base, null);
      }
    }),
  );

  return { tvl, fees };
}

async function fetchMacro(): Promise<MacroContext> {
  const [btcRes, solRes, chainsRes, stableRes] = await Promise.allSettled([
    fetchBtcNetwork(),
    fetchSolNetwork(),
    Promise.all([
      fetchChainTvl("Ethereum"),
      fetchChainTvl("Solana"),
      fetchChainTvl("Sui"),
      fetchChainTvl("Arbitrum"),
      fetchChainTvl("Base"),
    ]),
    fetchStablecoinSupply(),
  ]);
  const chains: Record<string, ChainTvl | null> = {};
  if (chainsRes.status === "fulfilled") {
    const [eth, sol, sui, arb, base] = chainsRes.value;
    chains.Ethereum = eth;
    chains.Solana = sol;
    chains.Sui = sui;
    chains.Arbitrum = arb;
    chains.Base = base;
  }
  return {
    btc: btcRes.status === "fulfilled" ? btcRes.value : undefined,
    sol: solRes.status === "fulfilled" ? solRes.value : undefined,
    chains,
    stablecoins: stableRes.status === "fulfilled" ? (stableRes.value ?? undefined) : undefined,
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: limit }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await worker(items[i]);
    }
  });
  await Promise.all(runners);
  return out;
}

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function levelTag(level: SignalSnapshot["level"]): string {
  const c = COLORS;
  switch (level) {
    case "BUY_STRONG": return `${c.bold}${c.green}🟢 STRONG BUY${c.reset}`;
    case "BUY":        return `${c.green}🟢 BUY      ${c.reset}`;
    case "WATCH":      return `${c.cyan}🔵 WATCH    ${c.reset}`;
    case "NEUTRAL":    return `${c.dim}⚪ NEUTRAL  ${c.reset}`;
    case "SELL":       return `${c.yellow}🟡 SELL     ${c.reset}`;
    case "SELL_STRONG":return `${c.bold}${c.red}🔴 STRONG SELL${c.reset}`;
  }
}

function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "  -  ";
  if (Math.abs(n) >= 10000) return n.toFixed(0);
  return n.toFixed(digits);
}

function pct(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "  -  ";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(1)}%`;
}

function fmtUsdShort(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "-";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function printMacro(macro: MacroContext): void {
  const c = COLORS;
  console.log();
  console.log(`${c.bold}🌐 매크로 컨텍스트${c.reset}`);
  if (macro.btc) {
    const trend = macro.btc.difficultyChangePct >= 0 ? c.green : c.red;
    console.log(
      `  ${c.yellow}₿${c.reset}  block ${macro.btc.blockHeight.toLocaleString()}  hashrate ${macro.btc.hashrate24hEhs.toFixed(0)} EH/s  diff ${trend}${macro.btc.difficultyChangePct >= 0 ? "+" : ""}${macro.btc.difficultyChangePct.toFixed(1)}%${c.reset}  fee ${macro.btc.feesSatPerVb.fastest} sat/vB  mempool ${macro.btc.mempoolVsizeMB.toFixed(0)}MB`,
    );
  }
  if (macro.sol) {
    console.log(
      `  ${c.cyan}◎${c.reset}  epoch ${macro.sol.epoch} (${(macro.sol.epochProgress * 100).toFixed(0)}%)  TPS ${macro.sol.tps5min.toFixed(0)}  inflation ${(macro.sol.inflationRate * 100).toFixed(1)}%/yr`,
    );
  }
  const chainParts: string[] = [];
  for (const [name, t] of Object.entries(macro.chains)) {
    if (!t) continue;
    const colored = t.tvl7dChange >= 0 ? c.green : c.red;
    chainParts.push(`${name} ${fmtUsdShort(t.tvl)} (${colored}${pct(t.tvl7dChange).trim()}/7d${c.reset})`);
  }
  if (chainParts.length > 0) console.log(`  ${c.blue}⛓${c.reset}  ${chainParts.join("  ·  ")}`);
  if (macro.stablecoins) {
    const s = macro.stablecoins;
    const trend = s.change30dPct >= 0 ? c.green : c.red;
    console.log(`  ${c.green}💵${c.reset}  Stablecoins ${fmtUsdShort(s.totalUsd)}  ${trend}${pct(s.change7dPct).trim()}/7d  ${pct(s.change30dPct).trim()}/30d${c.reset}  ${c.dim}(매수 대기 자금)${c.reset}`);
  }
}

function printTable(rows: CoinResult[]): void {
  const c = COLORS;
  console.log();
  console.log(`${c.bold}━━━ 매매 시그널 Snapshot ━━━${c.reset}  ${c.dim}${new Date().toLocaleString("ko-KR")}${c.reset}`);
  console.log();
  console.log(
    `${c.dim}${"코인".padEnd(8)} ${"가격".padStart(10)}  ${"RSI(D)".padStart(6)} ${"RSI(W)".padStart(6)}  ${"vs200".padStart(7)}  ${"TVL30d".padStart(7)}  ${"src".padEnd(4)}  ${"시그널".padEnd(18)} 사유${c.reset}`,
  );
  console.log(c.dim + "─".repeat(120) + c.reset);

  // 시그널 강도 순으로 정렬: 매수 강 → 매수 → 워치 → 중립 → 매도 → 매도 강
  const order = { BUY_STRONG: 0, BUY: 1, WATCH: 2, NEUTRAL: 3, SELL: 4, SELL_STRONG: 5 } as const;
  const sorted = rows.slice().sort((a, b) => {
    if (!a.result) return 1;
    if (!b.result) return -1;
    return order[a.result.level] - order[b.result.level];
  });

  for (const r of sorted) {
    if (r.error) {
      console.log(`${c.red}${r.coin.base.padEnd(10)} ${r.error.slice(0, 100)}${c.reset}`);
      continue;
    }
    if (!r.result) continue;
    const star = r.coin.priority ? "★" : " ";
    const reasonStr = r.result.reasons.slice(0, 2).join(" · ") || "-";
    const tvl30 = r.result.onchain?.tvl?.tvl30dChange;
    const src = r.source === "binance" ? " " : (r.source === "coingecko" ? "cg" : "?");
    console.log(
      `${star}${r.coin.base.padEnd(7)} ${fmt(r.result.price).padStart(10)}  ${fmt(r.result.rsiDaily).padStart(6)} ${fmt(r.result.rsiWeekly).padStart(6)}  ${pct(r.result.priceVs200).padStart(7)}  ${pct(tvl30).padStart(7)}  ${(src as string).padEnd(4)}  ${levelTag(r.result.level).padEnd(28)} ${c.dim}${reasonStr}${c.reset}`,
    );
  }
  console.log();
  console.log(`${c.dim}★ = X-VIP 강조(priority) · src: cg=CoinGecko fallback · TVL30d=DefiLlama 30일 변화율${c.reset}`);
}

function summarize(rows: CoinResult[]): void {
  const c = COLORS;
  const buys = rows.filter((r) => r.result && (r.result.level === "BUY" || r.result.level === "BUY_STRONG"));
  const sells = rows.filter((r) => r.result && (r.result.level === "SELL" || r.result.level === "SELL_STRONG"));

  if (buys.length > 0) {
    console.log(`${c.bold}${c.green}■ 매수 후보${c.reset}`);
    for (const { coin, result } of buys) {
      const holders = holdersOf(coin.base);
      const inst = holders.length > 0 ? `${c.dim}[${holders.join(", ")}]${c.reset}` : "";
      console.log(`  • ${coin.base} (${coin.name}) — ${result!.reasons.join(", ")} ${inst}`);
    }
    console.log();
  }
  if (sells.length > 0) {
    console.log(`${c.bold}${c.red}■ 매도 후보${c.reset}`);
    for (const { coin, result } of sells) {
      console.log(`  • ${coin.base} (${coin.name}) — ${result!.reasons.join(", ")}`);
    }
    console.log();
  }
  if (buys.length === 0 && sells.length === 0) {
    console.log(`${c.dim}현재 강한 매매 시그널 없음.${c.reset}`);
    console.log();
  }
}

async function saveSnapshot(rows: CoinResult[], macro: MacroContext): Promise<string> {
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(SNAPSHOT_DIR, `${ts}.json`);
  const payload = {
    timestamp: new Date().toISOString(),
    macro,
    rows: rows.map(({ coin, result, source, error }) => ({
      coin,
      holders: holdersOf(coin.base),
      source,
      result,
      error,
    })),
  };
  await fs.writeFile(file, JSON.stringify(payload, null, 2));
  return file;
}

async function main(): Promise<void> {
  const { universe, concurrency, onchain } = parseArgs();
  const coins = filterUniverse(universe);
  console.log(`📡 ${coins.length} coins · universe=${universe} · concurrency=${concurrency} · onchain=${onchain}`);

  // 1. 온체인 데이터 (DefiLlama + 매크로) — 코인 fetch 동안 같이 돌아가게 병렬
  const onchainPromise = onchain ? fetchOnchainForUniverse(coins) : Promise.resolve({ tvl: new Map(), fees: new Map() });
  const macroPromise = onchain ? fetchMacro() : Promise.resolve({ chains: {} } as MacroContext);

  const { tvl, fees } = await onchainPromise;
  const macro = await macroPromise;

  const rows = await runWithConcurrency(coins, concurrency, (c) => processCoin(c, tvl, fees));

  if (onchain) printMacro(macro);
  printTable(rows);
  summarize(rows);

  const file = await saveSnapshot(rows, macro);
  console.log(`${COLORS.dim}💾 ${path.relative(REPO_ROOT, file)}${COLORS.reset}`);

  const errs = rows.filter((r) => r.error);
  if (errs.length > 0) {
    console.log();
    console.log(`${COLORS.yellow}⚠ ${errs.length} 코인 실패:${COLORS.reset}`);
    for (const e of errs) console.log(`  - ${e.coin.base}: ${e.error?.slice(0, 120)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
