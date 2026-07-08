/**
 * 메인 실행 스크립트.
 *   npm run snapshot                          # priority 코인만 (기본)
 *   npm run snapshot -- --universe=core
 *   npm run snapshot -- --universe=xvip
 *   npm run snapshot -- --universe=all
 *   npm run snapshot -- --no-onchain          # 온체인 데이터 fetch 끄기
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchCandlesWithFallback, type Source } from "../lib/exchanges/aggregator.ts";
import { evaluate, type SignalSnapshot } from "../lib/signals.ts";
import { filterUniverse, holdersOf, thesisStrength, type Coin } from "../lib/universe.ts";
import { fetchProtocolTvl, fetchProtocolFees, fetchChainTvl, fetchStablecoinSupply, type ProtocolTvlMetrics, type FeesSummary, type ChainTvl, type StablecoinSnapshot } from "../lib/onchain/defillama.ts";
import { fetchBtcNetwork, type BtcNetworkState } from "../lib/onchain/btc.ts";
import { fetchSolNetwork, type SolNetworkState } from "../lib/onchain/sol.ts";
import { fetchFearGreed, type FearGreedSnapshot } from "../lib/macro/fear-greed.ts";
import { fetchGlobalMarket, fetchCategories, altSeasonSignal, type GlobalMarket, type CategoryStat } from "../lib/macro/coingecko-global.ts";
import { fetchBtcCycle, btcCycleScore, type BtcCycleSnapshot } from "../lib/onchain/coinmetrics.ts";
import { fetchCryptoQuantSnapshot, cryptoQuantReasons, type CryptoQuantSnapshot } from "../lib/cryptoquant.ts";
import { fetchPerpSnapshot, type PerpSnapshot } from "../lib/exchanges/binance-futures.ts";
import { computeMultibaggerScore, type MultibaggerScore } from "../lib/multibagger.ts";
import { loadActivePlans, evaluatePlan } from "../lib/tradeplan.ts";
import { notifyAll, diffSignals, type PriorSnapshotMap } from "../lib/notify/index.ts";
import { loadTimeseries, saveTimeseries, appendPoint, METRIC_DEFINITIONS } from "../lib/timeseries.ts";

/** universe groups → CoinGecko category id 매핑 (가능한 것만, 없으면 null) */
const GROUP_TO_CG_CATEGORY: Record<string, string> = {
  ai: "artificial-intelligence",
  rwa_defi: "real-world-assets-rwa",
  meme: "meme-token",
  privacy: "privacy-coins",
  layer1: "layer-1",
  layer1_2: "layer-2",
};

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
  multibagger?: MultibaggerScore;
  /** 차트 raw — saveCandles에서만 사용 후 메모리 해제 (snapshot.json엔 미포함) */
  rawDaily?: import("../lib/exchanges/binance.ts").Candle[];
  error?: string;
}

interface MacroContext {
  btc?: BtcNetworkState;
  sol?: SolNetworkState;
  chains: Record<string, ChainTvl | null>;
  stablecoins?: StablecoinSnapshot;
  fearGreed?: FearGreedSnapshot;
  global?: GlobalMarket;
  categories?: CategoryStat[];
  altSeason?: ReturnType<typeof altSeasonSignal>;
  btcCycle?: BtcCycleSnapshot;
  cryptoQuant?: CryptoQuantSnapshot;
}

async function processCoin(
  coin: Coin,
  tvlByBase: Map<string, ProtocolTvlMetrics | null>,
  feesByBase: Map<string, FeesSummary | null>,
  perpByBase: Map<string, PerpSnapshot | null>,
  macro: MacroContext,
): Promise<CoinResult> {
  try {
    const [daily, weekly] = await Promise.all([
      fetchCandlesWithFallback(coin, "1d", 400),
      fetchCandlesWithFallback(coin, "1w", 200),
    ]);

    // 카테고리 매핑 — coin의 첫 그룹 → CG category id → categories에서 30d 변화율
    let categoryChange30d: number | null = null;
    const groupId = coin.groups[0];
    const cgId = groupId ? GROUP_TO_CG_CATEGORY[groupId] : undefined;
    if (cgId && macro.categories) {
      const cat = macro.categories.find((c) => c.id === cgId);
      if (cat) categoryChange30d = cat.change24hPct; // 30d 정확한 데이터는 별도 endpoint 필요. 24h로 우선
    }

    // 거래량 7일 평균 대비 ratio (십계명 #4)
    let volumeRatio7d: number | undefined;
    if (daily.candles.length >= 8) {
      const last = daily.candles.at(-1)!;
      const prev7 = daily.candles.slice(-8, -1);
      const avg7 = prev7.reduce((s, c) => s + c.volume, 0) / 7;
      if (avg7 > 0) volumeRatio7d = last.volume / avg7;
    }

    // 30일 실현 변동성 (일별 수익률 std × sqrt(365)) (십계명 #3)
    let volatility30d: number | undefined;
    if (daily.candles.length >= 31) {
      const closes = daily.candles.slice(-31).map((c) => c.close);
      const returns: number[] = [];
      for (let i = 1; i < closes.length; i++) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
      const mean = returns.reduce((s, x) => s + x, 0) / returns.length;
      const variance = returns.reduce((s, x) => s + (x - mean) ** 2, 0) / returns.length;
      volatility30d = Math.sqrt(variance);
    }

    const result = evaluate({
      base: coin.base,
      symbol: daily.symbol,
      daily: daily.candles,
      weekly: weekly.candles,
      onchain: {
        tvl: tvlByBase.get(coin.base) ?? null,
        fees: feesByBase.get(coin.base) ?? null,
        perp: perpByBase.get(coin.base) ?? null,
        fearGreed: macro.fearGreed?.current.value ?? null,
        btcDominance: macro.global?.btcDominance ?? null,
        categoryChange30d,
        thesisStrength: thesisStrength(coin),
        volumeRatio7d,
        volatility30d,
      },
    });
    const source = daily.source === weekly.source ? daily.source : `${daily.source}/${weekly.source}`;

    // Multibagger Score (BTC 제외)
    let multibagger: MultibaggerScore | undefined;
    if (coin.base !== "BTC") {
      multibagger = computeMultibaggerScore({ coin, signal: result, marketCapUsd: null });
    }

    return { coin, result, source, multibagger, rawDaily: daily.candles };
  } catch (err) {
    return { coin, error: (err as Error).message };
  }
}

/**
 * priority + 시그널 발동 코인의 일봉 candles를 web/public/data/candles/<base>.json 으로 저장.
 * 차트용 raw 데이터. snapshot.json에는 미포함.
 */
/**
 * 직전 snapshot의 시그널 레벨 맵 — 변경 감지용. data/.prior-signals.json
 */
async function loadPriorSnapshotMap(): Promise<PriorSnapshotMap> {
  const file = path.join(REPO_ROOT, "data", ".prior-signals.json");
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as PriorSnapshotMap;
  } catch {
    return {};
  }
}
async function savePriorSnapshotMap(rows: CoinResult[]): Promise<void> {
  const file = path.join(REPO_ROOT, "data", ".prior-signals.json");
  const map: PriorSnapshotMap = {};
  for (const r of rows) {
    if (r.result) map[r.coin.base] = r.result.level;
  }
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(map, null, 2));
}

async function saveCandles(rows: CoinResult[]): Promise<number> {
  const dir = path.join(REPO_ROOT, "web", "public", "data", "candles");
  await fs.mkdir(dir, { recursive: true });
  const targets = rows.filter(
    (r) => r.rawDaily && (r.coin.priority || (r.result && r.result.level !== "NEUTRAL")),
  );
  let count = 0;
  for (const r of targets) {
    const file = path.join(dir, `${r.coin.base}.json`);
    const payload = {
      base: r.coin.base,
      name: r.coin.name,
      candles: r.rawDaily!.slice(-365), // 1년치만
    };
    await fs.writeFile(file, JSON.stringify(payload));
    count++;
  }
  return count;
}

async function fetchOnchainForUniverse(coins: Coin[]): Promise<{
  tvl: Map<string, ProtocolTvlMetrics | null>;
  fees: Map<string, FeesSummary | null>;
  perp: Map<string, PerpSnapshot | null>;
}> {
  const tvl = new Map<string, ProtocolTvlMetrics | null>();
  const fees = new Map<string, FeesSummary | null>();
  const perp = new Map<string, PerpSnapshot | null>();
  const slugged = coins.filter((c) => c.defillamaSlug);

  await Promise.all([
    // DefiLlama TVL/fees
    ...slugged.map(async (c) => {
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
    // Binance Futures perp (모든 코인 시도, 실패 시 null)
    ...coins.map(async (c) => {
      try {
        const p = await fetchPerpSnapshot(c.base);
        perp.set(c.base, p);
      } catch {
        perp.set(c.base, null);
      }
    }),
  ]);

  return { tvl, fees, perp };
}

async function fetchMacro(): Promise<MacroContext> {
  const [btcRes, solRes, chainsRes, stableRes, fgRes, globalRes, catsRes, cycleRes, cqRes] = await Promise.allSettled([
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
    fetchFearGreed(),
    fetchGlobalMarket(),
    fetchCategories(),
    fetchBtcCycle(365),
    fetchCryptoQuantSnapshot(),
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
  const global = globalRes.status === "fulfilled" ? globalRes.value : undefined;
  return {
    btc: btcRes.status === "fulfilled" ? btcRes.value : undefined,
    sol: solRes.status === "fulfilled" ? solRes.value : undefined,
    chains,
    stablecoins: stableRes.status === "fulfilled" ? (stableRes.value ?? undefined) : undefined,
    fearGreed: fgRes.status === "fulfilled" ? fgRes.value : undefined,
    global,
    categories: catsRes.status === "fulfilled" ? catsRes.value : undefined,
    altSeason: global ? altSeasonSignal(global.btcDominance) : undefined,
    btcCycle: cycleRes.status === "fulfilled" ? cycleRes.value : undefined,
    cryptoQuant: cqRes.status === "fulfilled" ? cqRes.value : undefined,
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
  // F&G + BTC dominance + alt season
  if (macro.fearGreed) {
    const fg = macro.fearGreed.current;
    const fgColor = fg.value <= 25 ? c.red : fg.value >= 75 ? c.green : c.dim;
    console.log(`  ${c.yellow}😨${c.reset}  Fear & Greed ${fgColor}${fg.value}${c.reset} (${fg.classification})`);
  }
  if (macro.global) {
    const dom = (macro.global.btcDominance * 100).toFixed(1);
    const altText = macro.altSeason?.comment ?? "";
    console.log(`  ${c.yellow}₿${c.reset}  BTC dominance ${c.bold}${dom}%${c.reset}  ${c.dim}${altText}${c.reset}`);
  }
  // BTC 사이클 (MVRV-Z) — Track 1 핵심
  if (macro.btcCycle) {
    const z = macro.btcCycle.current.mvrvZ;
    const state = macro.btcCycle.cycleState;
    const stateLabel: Record<string, string> = {
      "cycle-bottom": `${c.green}바닥 (강한 매수)${c.reset}`,
      accumulation: `${c.green}축적${c.reset}`,
      growth: `${c.cyan}성장${c.reset}`,
      euphoria: `${c.yellow}과열${c.reset}`,
      "cycle-top": `${c.red}정점 (강한 매도)${c.reset}`,
    };
    const score = btcCycleScore(macro.btcCycle);
    console.log(`  ${c.yellow}🔆${c.reset}  BTC MVRV-Z ${c.bold}${z.toFixed(2)}${c.reset}  ${stateLabel[state]} ${c.dim}score ${score.score >= 0 ? "+" : ""}${score.score}${c.reset}`);
    if (score.reasons.length > 0) {
      for (const r of score.reasons) console.log(`     ${c.dim}↳ ${r}${c.reset}`);
    }
  }
  // CryptoQuant — 거래소 유출입·고래·LTH 행동 (API 키 없으면 생략)
  if (macro.cryptoQuant) {
    const cq = macro.cryptoQuant;
    console.log(`  ${c.yellow}🐋${c.reset}  CryptoQuant`);
    const reasons = cryptoQuantReasons(cq);
    if (reasons.length > 0) {
      for (const r of reasons) console.log(`     ${c.dim}↳ ${r}${c.reset}`);
    } else {
      console.log(`     ${c.dim}↳ 특이 신호 없음${c.reset}`);
    }
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
    rows: rows.map(({ coin, result, source, multibagger, error }) => ({
      coin,
      holders: holdersOf(coin.base),
      source,
      result,
      multibagger,
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
  const onchainPromise = onchain
    ? fetchOnchainForUniverse(coins)
    : Promise.resolve({ tvl: new Map(), fees: new Map(), perp: new Map() });
  const macroPromise = onchain ? fetchMacro() : Promise.resolve({ chains: {} } as MacroContext);

  const { tvl, fees, perp } = await onchainPromise;
  const macro = await macroPromise;

  const rows = await runWithConcurrency(coins, concurrency, (c) => processCoin(c, tvl, fees, perp, macro));

  if (onchain) printMacro(macro);
  printTable(rows);
  summarize(rows);

  const file = await saveSnapshot(rows, macro);
  console.log(`${COLORS.dim}💾 ${path.relative(REPO_ROOT, file)}${COLORS.reset}`);

  const candleCount = await saveCandles(rows);
  console.log(`${COLORS.dim}📈 ${candleCount} 코인 candles → web/public/data/candles/${COLORS.reset}`);

  // 시계열 누적 (data/timeseries.json) — 매 cycle 핵심 metric append
  const ts = await loadTimeseries(REPO_ROOT);
  const safeAppend = (key: keyof typeof METRIC_DEFINITIONS, value: number | undefined | null) => {
    if (value == null || !Number.isFinite(value)) return;
    appendPoint(ts, key, value, METRIC_DEFINITIONS[key]);
  };
  if (macro.btc) {
    safeAppend("btc-hashrate-ehs", macro.btc.hashrate24hEhs);
    safeAppend("btc-fee-fastest", macro.btc.feesSatPerVb.fastest);
    safeAppend("btc-mempool-mb", macro.btc.mempoolVsizeMB);
    safeAppend("btc-difficulty-change-pct", macro.btc.difficultyChangePct);
  }
  if (macro.btcCycle) {
    safeAppend("btc-mvrv-z", macro.btcCycle.current.mvrvZ);
    safeAppend("btc-mvrv", macro.btcCycle.current.mvrv);
    safeAppend("btc-price", macro.btcCycle.current.price);
  }
  if (macro.sol) {
    safeAppend("sol-tps", macro.sol.tps5min);
    safeAppend("sol-epoch-progress", macro.sol.epochProgress * 100);
  }
  if (macro.chains?.Ethereum) safeAppend("eth-tvl-usd", macro.chains.Ethereum.tvl);
  if (macro.chains?.Solana) safeAppend("sol-tvl-usd", macro.chains.Solana.tvl);
  if (macro.global) {
    safeAppend("btc-dominance", macro.global.btcDominance * 100);
    safeAppend("eth-dominance", macro.global.ethDominance * 100);
  }
  if (macro.fearGreed) safeAppend("fear-greed", macro.fearGreed.current.value);
  if (macro.stablecoins) safeAppend("stable-supply-usd", macro.stablecoins.totalUsd);
  // CryptoQuant metric은 timeseries.ts(변경 금지 파일) 수정 없이 appendPoint 직접 호출로 등록
  if (macro.cryptoQuant?.exchangeWhaleRatio) {
    appendPoint(ts, "btc-cq-exchange-whale-ratio", macro.cryptoQuant.exchangeWhaleRatio.ratio, {
      unit: "ratio",
      description: "BTC CryptoQuant Exchange Whale Ratio",
    });
  }
  if (macro.cryptoQuant?.exchangeNetflow) {
    appendPoint(ts, "btc-cq-exchange-netflow", macro.cryptoQuant.exchangeNetflow.btc, {
      unit: "BTC",
      description: "BTC CryptoQuant 거래소 순유입",
    });
  }
  if (macro.cryptoQuant?.sopr) {
    appendPoint(ts, "btc-cq-lth-sopr", macro.cryptoQuant.sopr.lthSopr, {
      unit: "ratio",
      description: "BTC CryptoQuant LTH-SOPR",
    });
  }
  await saveTimeseries(REPO_ROOT, ts);
  // web에도 복사 (정적 page에서 fetch)
  const tsWebFile = path.join(REPO_ROOT, "web", "public", "data", "timeseries.json");
  await fs.mkdir(path.dirname(tsWebFile), { recursive: true });
  await fs.writeFile(tsWebFile, JSON.stringify(ts, null, 2));
  console.log(`${COLORS.dim}📊 timeseries: ${Object.keys(ts.series).length} metric × ${Object.values(ts.series)[0]?.points.length ?? 0} points${COLORS.reset}`);

  // Trade Plan 자동 평가 (X-VIP 십계명 #5, #7) + 알림 + web export
  const plans = await loadActivePlans(REPO_ROOT);
  const planAlerts: Array<{ plan: typeof plans[number]; trigger: ReturnType<typeof evaluatePlan>["triggers"][number]; price: number; pnlPct: number }> = [];
  const planEvaluations: Array<{ plan: typeof plans[number]; currentPrice: number; pnlUsd: number; pnlPct: number; triggers: ReturnType<typeof evaluatePlan>["triggers"] }> = [];
  if (plans.length > 0) {
    console.log();
    console.log(`${COLORS.bold}🎯 Trade Plan 자동 평가 (${plans.length}개 active)${COLORS.reset}`);
    for (const plan of plans) {
      const row = rows.find((r) => r.coin.base === plan.coin && r.result);
      if (!row?.result) continue;
      const evalRes = evaluatePlan(plan, row.result.price);
      planEvaluations.push({
        plan,
        currentPrice: row.result.price,
        pnlUsd: evalRes.currentPnLUsd,
        pnlPct: evalRes.currentPnLPct,
        triggers: evalRes.triggers,
      });
      if (evalRes.triggers.length > 0) {
        for (const t of evalRes.triggers) {
          const color = t.type === "stopLoss" ? COLORS.red : COLORS.green;
          const label = t.type === "stopLoss" ? "🚨 손절 트리거" : "🎯 익절 트리거";
          console.log(`  ${color}${COLORS.bold}${label}${COLORS.reset}  ${plan.coin} @ ${fmt(row.result.price)} (${pct(evalRes.currentPnLPct)})`);
          console.log(`    Plan: ${plan.id}  ·  trigger ${fmt(t.price)} × ${(t.fraction * 100).toFixed(0)}%`);
          console.log(`    → 거래소에서 즉시 실행 후 \`npm run plan close ${plan.id} --price=<실제>\``);
          planAlerts.push({ plan, trigger: t, price: row.result.price, pnlPct: evalRes.currentPnLPct });
        }
      }
    }
    if (planAlerts.length === 0) console.log(`  ${COLORS.dim}모든 plan 정상 — 트리거 도달 없음${COLORS.reset}`);
  }

  // Plan 평가 결과를 web에 export (UI 표시용)
  const plansWebFile = path.join(REPO_ROOT, "web", "public", "data", "plans.json");
  await fs.mkdir(path.dirname(plansWebFile), { recursive: true });
  await fs.writeFile(
    plansWebFile,
    JSON.stringify({ timestamp: new Date().toISOString(), evaluations: planEvaluations }, null, 2),
  );

  // 시그널 변경 감지 + 알림 (직전 snapshot 비교)
  const priorMap = await loadPriorSnapshotMap();
  const diff = diffSignals(priorMap, rows);
  await savePriorSnapshotMap(rows);

  if (process.env.TELEGRAM_CHAT_ID || diff.newBuys.length || diff.newSells.length || planAlerts.length) {
    console.log();
    console.log(`${COLORS.bold}📢 알림 발송${COLORS.reset}`);

    // 신규 매수
    if (diff.newBuys.length > 0) {
      const tickers = diff.newBuys.map((r) => r.coin.base).join(", ");
      const details = diff.newBuys.slice(0, 5).map((r) => `${r.coin.base}: ${r.result!.reasons.slice(0, 2).join(" · ")}`);
      const res = await notifyAll({
        category: "signal-new-buy",
        title: `신규 매수 시그널 ${diff.newBuys.length}개`,
        message: tickers,
        details,
      });
      console.log(`  매수: TG=${res.telegram ? "✓" : "✗"} mac=${res.macos ? "✓" : "✗"} ${res.errors.join(" / ")}`);
    }

    // 신규 매도
    if (diff.newSells.length > 0) {
      const tickers = diff.newSells.map((r) => r.coin.base).join(", ");
      const details = diff.newSells.slice(0, 5).map((r) => `${r.coin.base}: ${r.result!.reasons.slice(0, 2).join(" · ")}`);
      const res = await notifyAll({
        category: "signal-new-sell",
        title: `신규 매도 시그널 ${diff.newSells.length}개`,
        message: tickers,
        details,
      });
      console.log(`  매도: TG=${res.telegram ? "✓" : "✗"} mac=${res.macos ? "✓" : "✗"} ${res.errors.join(" / ")}`);
    }

    // Trade Plan 트리거
    for (const a of planAlerts) {
      const isStop = a.trigger.type === "stopLoss";
      const res = await notifyAll({
        category: isStop ? "plan-stop-loss" : "plan-take-profit",
        title: `${isStop ? "손절" : "익절"} 트리거 — ${a.plan.coin}`,
        message: `${fmt(a.price)} 도달 (${pct(a.pnlPct)})`,
        details: [
          `Plan: ${a.plan.id}`,
          `Trigger: ${fmt(a.trigger.price)} × ${(a.trigger.fraction * 100).toFixed(0)}%`,
          `즉시 거래소 실행 후 close 명령`,
        ],
      });
      console.log(`  ${a.plan.coin}: TG=${res.telegram ? "✓" : "✗"} mac=${res.macos ? "✓" : "✗"} ${res.errors.join(" / ")}`);
    }

    if (diff.newBuys.length === 0 && diff.newSells.length === 0 && planAlerts.length === 0) {
      console.log(`  ${COLORS.dim}전송할 알림 없음 (시그널 변경 없음 + plan 트리거 없음)${COLORS.reset}`);
    }
  }

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
