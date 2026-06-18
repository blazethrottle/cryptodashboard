/**
 * BTC 원장 인덱스 — 과거 전체 일괄 구축 (배치, 1회성).
 *
 *   npm run btc:index                       # Phase 1에서 BigQuery 일괄 구축
 *   npm run btc:index -- --selftest         # Phase 0 스캐폴딩 검증 (더미 왕복)
 *
 * 현재 상태: Phase 0 — RawChainSource 구현체(BigQuerySource) 미구현.
 * 설계: docs/btc-onchain-raw-source-design.md §7 Phase 1
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { JsonIndexStore, type DailyAggregateRow } from "../lib/onchain/raw/store.ts";
import { DailyPriceOracle } from "../lib/onchain/raw/price-oracle.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`selftest 실패 — ${label}\n  expected: ${e}\n  actual:   ${a}`);
}

/** Phase 0 수락 기준: 더미 데이터가 store/oracle 계약을 왕복하는지 */
async function selftest(): Promise<void> {
  console.log("━━━ Phase 0 selftest — store/oracle 더미 왕복 ━━━\n");

  // 1. JsonIndexStore 왕복
  const store = new JsonIndexStore(REPO_ROOT, ".selftest.json");
  try {
    const rows: DailyAggregateRow[] = [
      { date: "2026-01-01", realizedCapUsd: 1e12, supplySat: 1.97e15, soprRealizedUsd: 5e9, soprCreatedUsd: 4.8e9 },
      { date: "2026-01-02", realizedCapUsd: 1.01e12, supplySat: 1.97e15, soprRealizedUsd: 6e9, soprCreatedUsd: 6.2e9 },
    ];
    await store.upsertDaily(rows);
    // upsert 멱등성: 같은 date 재기록 시 덮어쓰기
    await store.upsertDaily([{ ...rows[1], realizedCapUsd: 1.02e12 }]);
    await store.setMeta({ lastIndexedHeight: 900000, source: "selftest", updatedAt: new Date().toISOString() });

    const series = await store.getDailySeries();
    assertEqual(series.length, 2, "daily 행 수");
    assertEqual(series[0].date, "2026-01-01", "date 정렬");
    assertEqual(series[1].realizedCapUsd, 1.02e12, "upsert 덮어쓰기");
    const meta = await store.getMeta();
    assertEqual(meta.lastIndexedHeight, 900000, "meta 왕복");
    console.log("  ✓ JsonIndexStore: upsert/정렬/멱등성/meta 왕복");
  } finally {
    await store.destroy();
  }

  // 2. DailyPriceOracle 정책 (carry-forward / clamp / before-first)
  const oracle = new DailyPriceOracle([
    { date: "2026-01-01", priceUsd: 100 },
    { date: "2026-01-03", priceUsd: 120 },   // 01-02 결손 — carry-forward 검증
  ]);
  const sec = (d: string): number => Date.parse(`${d}T12:00:00Z`) / 1000;
  assertEqual(oracle.priceAt(sec("2026-01-01")), 100, "당일 조회");
  assertEqual(oracle.priceAt(sec("2026-01-02")), 100, "결손일 carry-forward");
  assertEqual(oracle.priceAt(sec("2026-01-03")), 120, "다음 데이터일");
  assertEqual(oracle.priceAt(sec("2026-02-01")), 120, "끝단 clamp");
  assertEqual(oracle.priceAt(sec("2009-01-03")), 0, "시장 이전 zero 정책");
  const clamped = new DailyPriceOracle([{ date: "2026-01-01", priceUsd: 100 }], { beforeFirst: "clamp" });
  assertEqual(clamped.priceAt(sec("2009-01-03")), 100, "before-first clamp 정책");
  console.log("  ✓ DailyPriceOracle: carry-forward / clamp / before-first 정책");

  console.log("\n✅ selftest PASS — Phase 0 계약 정상\n");
}

async function main(): Promise<void> {
  if (process.argv.includes("--selftest")) {
    await selftest();
    return;
  }

  console.error(
    [
      "btc:index — 아직 구현 전 (Phase 1).",
      "",
      "이 명령은 BigQuerySource(bigquery-public-data.crypto_bitcoin)로",
      "과거 전체 Realized Cap 일별 시계열을 구축할 예정입니다.",
      "설계: docs/btc-onchain-raw-source-design.md §7",
      "",
      "스캐폴딩 검증: npm run btc:index -- --selftest",
    ].join("\n"),
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
