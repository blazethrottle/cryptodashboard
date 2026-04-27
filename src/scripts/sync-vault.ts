/**
 * Snapshot → LLM-Wiki 동기화.
 *
 *   npm run sync                      # 최신 snapshot
 *   npm run sync -- --file=<path>     # 특정 snapshot
 *   npm run sync -- --commit          # 변경 자동 커밋 (push 없음)
 *   npm run sync -- --commit --push   # 커밋 + git push origin main
 *
 * 작업 순서:
 *   1. 코인 entity 갱신 (wiki/entities/<Name>.md) — markers로 자동 영역만, 사용자 본문 보존
 *   2. 기관 entity 갱신 (wiki/entities/<Institution>.md)
 *   3. daily-signals/YYYY-MM/<date>.md 생성/덮어쓰기
 *   4. daily-signals/index.md 갱신
 *   5. wiki/projects/Crypto-Dashboard.md 갱신
 *   6. log.md 항목 append
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ensureVaultStructure,
  PATHS,
  readNote,
  writeNote,
  appendNote,
  entityPath,
  dailySignalPath,
  dailySignalIndexPath,
  slugify,
} from "../lib/wiki/vault.ts";
import { applyAutoBlock } from "../lib/wiki/markers.ts";
import { buildFrontmatter, splitFrontmatter, ensureFrontmatter } from "../lib/wiki/frontmatter.ts";
import {
  coinEntityFrontmatter,
  coinEntityBaseBody,
  coinSignalAutoBlock,
  institutionEntityFrontmatter,
  institutionEntityBaseBody,
  institutionSignalAutoBlock,
  dailySignalFrontmatter,
  dailySignalBody,
  projectIndexFrontmatter,
  projectIndexBody,
  type DailySignalInputs,
} from "../lib/wiki/templates.ts";
import { commitAndPush } from "../lib/wiki/git.ts";
import type { SignalSnapshot } from "../lib/signals.ts";
import type { Coin, Institution } from "../lib/universe.ts";
import { INSTITUTIONS } from "../lib/universe.ts";
import { analyzeInstitutions } from "../lib/institutions.ts";
import type { BtcNetworkState } from "../lib/onchain/btc.ts";
import type { SolNetworkState } from "../lib/onchain/sol.ts";
import type { ChainTvl, StablecoinSnapshot } from "../lib/onchain/defillama.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SNAPSHOT_DIR = path.join(REPO_ROOT, "data", "snapshots");

interface SnapshotFile {
  timestamp: string;
  macro: {
    btc?: BtcNetworkState;
    sol?: SolNetworkState;
    chains: Record<string, ChainTvl | null>;
    stablecoins?: StablecoinSnapshot;
  };
  rows: Array<{
    coin: Coin;
    holders: Institution[];
    source?: string;
    result?: SignalSnapshot;
    error?: string;
  }>;
}

interface CliArgs {
  file?: string;
  commit: boolean;
  push: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const file = args.find((a) => a.startsWith("--file="))?.split("=")[1];
  const commit = args.includes("--commit");
  const push = args.includes("--push");
  return { file, commit, push };
}

async function findLatestSnapshot(): Promise<string> {
  const files = await fs.readdir(SNAPSHOT_DIR);
  const json = files.filter((f) => f.endsWith(".json")).sort();
  if (json.length === 0) throw new Error("No snapshots in data/snapshots/. Run `npm run snapshot` first.");
  return path.join(SNAPSHOT_DIR, json.at(-1)!);
}

function isoToShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── 동기화 단계별 함수 ─────────────────────────────────────────────────────

async function syncCoinEntity(
  coin: Coin,
  result: SignalSnapshot,
  source: string | undefined,
  date: string,
  today: string,
): Promise<void> {
  const filePath = entityPath(coin.name);
  const existing = await readNote(filePath);
  const isNew = existing == null;

  const fm = coinEntityFrontmatter(coin, today, isNew);
  const auto = coinSignalAutoBlock(coin, result, source, date);

  if (isNew) {
    // 새로 생성: frontmatter + base body + auto block
    const baseBody = coinEntityBaseBody(coin);
    const final = buildFrontmatter(fm) + baseBody + "\n## 최신 시그널 (자동)\n\n" + applyAutoBlock(null, "signal", auto, today);
    await writeNote(filePath, final);
    return;
  }

  // 기존 파일: frontmatter의 updated만 갱신, body 보존, auto block 갱신
  const split = splitFrontmatter(existing);
  const newFm = ensureFrontmatter(existing, fm).frontmatter;
  let body = split.body;

  // body에 auto block이 있으면 교체, 없으면 끝에 추가
  body = applyAutoBlock(body, "signal", auto, today,
    body.includes("CRYPTO-DASHBOARD:AUTO-START") ? undefined : body + "\n\n## 최신 시그널 (자동)\n\n",
  );
  await writeNote(filePath, newFm + body);
}

async function syncInstitutionEntity(
  name: string,
  stats: {
    name: Institution;
    totalHoldings: number;
    signaledHoldings: Array<{ base: string; level: SignalSnapshot["level"]; score: number }>;
    buyCount: number;
    sellCount: number;
    watchCount: number;
    averageScore: number;
    uniqueCoins: string[];
    overlapWithXVIP: string[];
  },
  date: string,
  today: string,
): Promise<void> {
  const filePath = entityPath(name);
  const existing = await readNote(filePath);
  const isNew = existing == null;

  const fm = institutionEntityFrontmatter(name, today, isNew);
  const auto = institutionSignalAutoBlock(stats, date);

  if (isNew) {
    const baseBody = institutionEntityBaseBody(name);
    const final = buildFrontmatter(fm) + baseBody + "\n## 최신 시그널 집계 (자동)\n\n" + applyAutoBlock(null, "institution-signal", auto, today);
    await writeNote(filePath, final);
    return;
  }

  const split = splitFrontmatter(existing);
  const newFm = ensureFrontmatter(existing, fm).frontmatter;
  let body = split.body;
  body = applyAutoBlock(body, "institution-signal", auto, today,
    body.includes("CRYPTO-DASHBOARD:AUTO-START") ? undefined : body + "\n\n## 최신 시그널 집계 (자동)\n\n",
  );
  await writeNote(filePath, newFm + body);
}

async function syncDailySignal(inputs: DailySignalInputs, today: string): Promise<string> {
  const filePath = dailySignalPath(inputs.date);
  const fm = dailySignalFrontmatter(inputs.date);
  const body = dailySignalBody(inputs);
  // daily signal은 매번 덮어쓰기 (사용자 메모는 entity 페이지에 적도록 가이드)
  await writeNote(filePath, buildFrontmatter({ ...fm, updated: today }) + body);
  return filePath;
}

async function syncDailySignalIndex(latestDate: string): Promise<void> {
  const file = dailySignalIndexPath();
  const existing = await readNote(file);
  const lines: string[] = [];

  // 모든 crypto-signal 파일 수집
  const months = await fs.readdir(PATHS.cryptoSignals).catch(() => [] as string[]);
  const allDates: string[] = [];
  for (const m of months) {
    const stat = await fs.stat(path.join(PATHS.cryptoSignals, m)).catch(() => null);
    if (!stat?.isDirectory()) continue;
    const files = await fs.readdir(path.join(PATHS.cryptoSignals, m));
    for (const f of files) {
      const match = /^(\d{4}-\d{2}-\d{2})_crypto-signals\.md$/.exec(f);
      if (match) allDates.push(match[1]);
    }
  }
  allDates.sort().reverse(); // 최신부터

  // 기존 index.md가 있으면 새 형식으로 덮어씀 (이 폴더는 우리가 만든 것이므로 안전)
  void existing;

  lines.push(buildFrontmatter({
    title: "Crypto Trading Signals — Index",
    type: "overview",
    domain: "crypto-future-finance",
    tags: ["crypto-signals", "x-vip-portfolio", "trading-signal", "index"],
  }));
  lines.push("# Crypto Trading Signals — Index");
  lines.push("");
  lines.push("> X-VIP 포트폴리오 매매 시그널 일별 카탈로그.  최신부터 정렬.  ([[Crypto-Dashboard]] 프로젝트)");
  lines.push("");
  lines.push(`- 최신: [[${latestDate}_crypto-signals]]`);
  lines.push("");
  lines.push("## 전체 목록");
  lines.push("");
  for (const d of allDates) lines.push(`- [[${d}_crypto-signals|${d}]]`);
  lines.push("");
  await writeNote(file, lines.join("\n"));
}

async function syncProjectIndex(
  snapshot: SnapshotFile,
  date: string,
  today: string,
  lastSnapshotAt: string,
): Promise<void> {
  const valid = snapshot.rows.filter((r) => r.result);
  const buys = valid.filter((r) => r.result!.level === "BUY" || r.result!.level === "BUY_STRONG");
  const sells = valid.filter((r) => r.result!.level === "SELL" || r.result!.level === "SELL_STRONG");
  const watches = valid.filter((r) => r.result!.level === "WATCH");
  const sortedByScore = valid.slice().sort((a, b) => b.result!.score - a.result!.score);

  const existing = await readNote(PATHS.projectCryptoDashboard);
  const isNew = existing == null;
  const fm = projectIndexFrontmatter(today, isNew);
  const body = projectIndexBody({
    totalCoins: valid.length,
    buys: buys.length,
    sells: sells.length,
    watches: watches.length,
    lastSnapshotAt,
    topBuy: sortedByScore[0]?.coin,
    topSell: sortedByScore.at(-1)?.coin,
    latestDate: date,
  });
  await writeNote(PATHS.projectCryptoDashboard, buildFrontmatter(fm) + body);
}

async function appendLog(date: string, snapshot: SnapshotFile): Promise<void> {
  const valid = snapshot.rows.filter((r) => r.result);
  const buys = valid.filter((r) => r.result!.level === "BUY_STRONG" || r.result!.level === "BUY").map((r) => r.coin.base);
  const sells = valid.filter((r) => r.result!.level === "SELL_STRONG" || r.result!.level === "SELL").map((r) => r.coin.base);

  const lines: string[] = [];
  lines.push("");
  lines.push(`## [${date}] sync | crypto-dashboard 시그널 동기화`);
  lines.push(`- 총 ${valid.length} 코인 분석 (X-VIP + 기관 보유)`);
  if (buys.length > 0) lines.push(`- 🟢 매수 후보: ${buys.join(", ")}`);
  if (sells.length > 0) lines.push(`- 🟡 매도 후보: ${sells.join(", ")}`);
  if (buys.length === 0 && sells.length === 0) lines.push(`- 강한 시그널 없음 (모두 NEUTRAL/WATCH)`);
  lines.push(`- 갱신: wiki/entities/ (코인+기관), wiki/crypto-signals/${date.slice(0, 7)}/${date}_crypto-signals.md, wiki/projects/Crypto-Dashboard.md`);
  lines.push("");
  await appendNote(PATHS.log, lines.join("\n"));
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();
  const snapshotPath = args.file ?? (await findLatestSnapshot());
  console.log(`📖 ${path.relative(REPO_ROOT, snapshotPath)}`);

  await ensureVaultStructure();

  const raw = await fs.readFile(snapshotPath, "utf-8");
  const snapshot = JSON.parse(raw) as SnapshotFile;
  const lastSnapshotAt = new Date(snapshot.timestamp).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const date = isoToShortDate(snapshot.timestamp);
  const today = date;

  // 1. 코인 entity
  let coinsWritten = 0;
  for (const row of snapshot.rows) {
    if (!row.result) continue;
    await syncCoinEntity(row.coin, row.result, row.source, date, today);
    coinsWritten++;
  }

  // 2. 기관 entity
  const signalsByBase = new Map<string, SignalSnapshot>();
  for (const r of snapshot.rows) if (r.result) signalsByBase.set(r.coin.base, r.result);
  const analysis = analyzeInstitutions(signalsByBase);
  for (const stats of analysis.byInstitution) {
    await syncInstitutionEntity(stats.name, stats, date, today);
  }

  // 3. daily-signals
  const dsPath = await syncDailySignal(
    {
      date,
      rows: snapshot.rows,
      macro: snapshot.macro,
      institutionAnalysis: analysis,
    },
    today,
  );

  // 4. daily-signals/index
  await syncDailySignalIndex(date);

  // 5. project index
  await syncProjectIndex(snapshot, date, today, lastSnapshotAt);

  // 6. log.md 추가
  await appendLog(date, snapshot);

  console.log(`✅ ${coinsWritten} coin entities, ${Object.keys(INSTITUTIONS).length} institution entities, crypto-signals/${date.slice(0, 7)}/${date}_crypto-signals.md, projects/Crypto-Dashboard.md, log.md updated.`);
  console.log(`   Vault: ${path.relative(process.env.HOME ?? "", PATHS.root)}`);

  if (args.commit) {
    console.log();
    console.log(`🔀 git commit/push...`);
    const summary = await commitAndPush(PATHS.root, `signal: crypto-dashboard sync ${date}`, args.push);
    if (summary) console.log(`   ${summary}`);
  } else {
    console.log();
    console.log(`💡 git commit하려면 \`npm run sync -- --commit\` 또는 \`--commit --push\` 사용`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
