/**
 * 기관 포트폴리오 분석 — 콘솔 출력 + history JSON.
 * LLM-Wiki entity 페이지 발행은 sync-vault.ts에서 처리.
 *
 *   npm run institutions
 *
 * 출력:
 *   - 콘솔: 기관별 시그널 집계 + consensus + 편입 후보
 *   - data/institutions/<TIMESTAMP>.json (이력, 다음 실행 시 변경 감지)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { analyzeInstitutions, type CrossAnalysis } from "../lib/institutions.ts";
import { INSTITUTIONS, type Institution } from "../lib/universe.ts";
import type { SignalSnapshot } from "../lib/signals.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SNAPSHOT_DIR = path.join(REPO_ROOT, "data", "snapshots");
const HISTORY_DIR = path.join(REPO_ROOT, "data", "institutions");

interface SnapshotFileLite {
  timestamp: string;
  rows: Array<{ coin: { base: string }; result?: SignalSnapshot }>;
}

async function findLatestSnapshot(): Promise<string> {
  const files = await fs.readdir(SNAPSHOT_DIR);
  const json = files.filter((f) => f.endsWith(".json")).sort();
  if (json.length === 0) throw new Error("No snapshots. Run `npm run snapshot` first.");
  return path.join(SNAPSHOT_DIR, json.at(-1)!);
}

const COLORS = { reset: "\x1b[0m", dim: "\x1b[2m", green: "\x1b[32m", red: "\x1b[31m", cyan: "\x1b[36m", bold: "\x1b[1m", yellow: "\x1b[33m" };

function levelEmoji(l: SignalSnapshot["level"]): string {
  switch (l) {
    case "BUY_STRONG": return "🟢🟢";
    case "BUY": return "🟢";
    case "WATCH": return "🔵";
    case "NEUTRAL": return "⚪";
    case "SELL": return "🟡";
    case "SELL_STRONG": return "🔴";
  }
}

function printConsole(a: CrossAnalysis): void {
  const c = COLORS;
  console.log();
  console.log(`${c.bold}━━━ 기관 포트폴리오 분석 ━━━${c.reset}`);
  console.log();
  console.log(`${c.bold}■ 기관별 시그널 집계 (avg score 기준 정렬)${c.reset}`);
  console.log(`${c.dim}${"기관".padEnd(18)} ${"보유".padStart(4)} ${"BUY".padStart(4)} ${"WATCH".padStart(5)} ${"SELL".padStart(4)} ${"avg".padStart(5)}  주요 시그널${c.reset}`);
  for (const s of a.byInstitution) {
    const top = s.signaledHoldings.slice(0, 3).map((h) => `${levelEmoji(h.level)}${h.base}`).join(" ");
    console.log(`${s.name.padEnd(18)} ${String(s.totalHoldings).padStart(4)} ${c.green}${String(s.buyCount).padStart(4)}${c.reset} ${c.cyan}${String(s.watchCount).padStart(5)}${c.reset} ${c.yellow}${String(s.sellCount).padStart(4)}${c.reset} ${s.averageScore.toFixed(2).padStart(5)}  ${c.dim}${top}${c.reset}`);
  }

  console.log();
  console.log(`${c.bold}■ Consensus (모든 기관 보유): ${c.reset}${a.consensus.length === 0 ? c.dim + "(없음)" + c.reset : a.consensus.join(", ")}`);
  console.log(`${c.bold}■ X-VIP 독자 픽 (기관 미보유): ${c.reset}${c.dim}${a.xvipOnly.slice(0, 20).join(", ")}${a.xvipOnly.length > 20 ? ` … +${a.xvipOnly.length - 20}` : ""}${c.reset}`);
  console.log(`${c.bold}■ 기관 보유, X-VIP 미포함 (편입 후보): ${c.reset}`);
  // holderCount 기준으로 강한 후보 (2+ 기관 보유) 강조
  const sorted = [...a.holderCount.entries()]
    .filter(([base, count]) => count >= 2 && a.institutionOnly.includes(base))
    .sort(([, a1], [, a2]) => a2 - a1);
  for (const [base, count] of sorted.slice(0, 10)) {
    const holders = (Object.entries(INSTITUTIONS) as Array<[Institution, readonly string[]]>)
      .filter(([, list]) => (list as readonly string[]).includes(base))
      .map(([name]) => name);
    console.log(`  ${c.bold}${base}${c.reset} (${count}개 기관) ${c.dim}— ${holders.join(", ")}${c.reset}`);
  }
}

// ── History tracking ───────────────────────────────────────────────────────

interface HistoryEntry {
  timestamp: string;
  institutions: Record<string, readonly string[]>;
}

async function loadPreviousHistory(): Promise<HistoryEntry | null> {
  try {
    const files = (await fs.readdir(HISTORY_DIR)).filter((f) => f.endsWith(".json")).sort();
    if (files.length === 0) return null;
    const last = files.at(-1)!;
    const raw = await fs.readFile(path.join(HISTORY_DIR, last), "utf-8");
    return JSON.parse(raw) as HistoryEntry;
  } catch {
    return null;
  }
}

async function saveHistory(): Promise<{ added: Record<string, string[]>; removed: Record<string, string[]> }> {
  await fs.mkdir(HISTORY_DIR, { recursive: true });
  const previous = await loadPreviousHistory();

  const current: HistoryEntry = {
    timestamp: new Date().toISOString(),
    institutions: { ...INSTITUTIONS } as Record<string, readonly string[]>,
  };

  const added: Record<string, string[]> = {};
  const removed: Record<string, string[]> = {};

  if (previous) {
    for (const [inst, list] of Object.entries(INSTITUTIONS)) {
      const prevList: readonly string[] = previous.institutions[inst] ?? [];
      const prevSet = new Set<string>(prevList);
      const currSet = new Set<string>(list as readonly string[]);
      const a = (list as readonly string[]).filter((b) => !prevSet.has(b));
      const r = prevList.filter((b) => !currSet.has(b));
      if (a.length > 0) added[inst] = a;
      if (r.length > 0) removed[inst] = r;
    }
  }

  const fname = current.timestamp.replace(/[:.]/g, "-") + ".json";
  await fs.writeFile(path.join(HISTORY_DIR, fname), JSON.stringify(current, null, 2));
  return { added, removed };
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const snapshotPath = await findLatestSnapshot();
  console.log(`📖 Snapshot: ${path.relative(REPO_ROOT, snapshotPath)}`);

  const raw = await fs.readFile(snapshotPath, "utf-8");
  const snapshot = JSON.parse(raw) as SnapshotFileLite;
  const signalsByBase = new Map<string, SignalSnapshot>();
  for (const r of snapshot.rows) if (r.result) signalsByBase.set(r.coin.base, r.result);

  const analysis = analyzeInstitutions(signalsByBase);

  printConsole(analysis);

  // History (포트폴리오 변경 추적)
  const { added, removed } = await saveHistory();
  console.log();
  if (Object.keys(added).length === 0 && Object.keys(removed).length === 0) {
    console.log(`${COLORS.dim}📑 History: 이전 대비 변경 없음 (또는 첫 실행)${COLORS.reset}`);
  } else {
    console.log(`${COLORS.bold}📑 기관 포트폴리오 변경${COLORS.reset}`);
    for (const [inst, coins] of Object.entries(added)) console.log(`  ${COLORS.green}+ ${inst}: ${coins.join(", ")}${COLORS.reset}`);
    for (const [inst, coins] of Object.entries(removed)) console.log(`  ${COLORS.red}- ${inst}: ${coins.join(", ")}${COLORS.reset}`);
  }

  console.log();
  console.log(`${COLORS.dim}💡 LLM-Wiki 발행은 \`npm run sync\`에서 처리됩니다 (entities/<기관명>.md).${COLORS.reset}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
