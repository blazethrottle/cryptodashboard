/**
 * BTC 원장 인덱스 — tip까지 증분 갱신 (cron/Actions 용).
 *
 *   npm run btc:update
 *
 * 동작 (Phase 1 구현 예정):
 *   1. store.getMeta().lastIndexedHeight 조회
 *   2. source.tipHeight()와 비교 → 미반영 구간만 streamOutputs/streamSpends
 *   3. 일별 집계 upsert + meta 갱신
 *
 * 현재 상태: Phase 0 — 스캐폴딩. store 상태 리포트만 수행.
 * 설계: docs/btc-onchain-raw-source-design.md §7 Phase 1
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { JsonIndexStore } from "../lib/onchain/raw/store.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

async function main(): Promise<void> {
  const store = new JsonIndexStore(REPO_ROOT);
  const meta = await store.getMeta();
  const series = await store.getDailySeries();
  await store.close();

  console.log("━━━ BTC 인덱스 상태 ━━━");
  console.log(`  source            : ${meta.source ?? "(없음)"}`);
  console.log(`  lastIndexedHeight : ${meta.lastIndexedHeight ?? "(미구축)"}`);
  console.log(`  daily rows        : ${series.length}`);
  console.log(`  updatedAt         : ${meta.updatedAt}`);

  if (meta.lastIndexedHeight === null) {
    console.error("\nbtc:update — 인덱스 미구축. 먼저 일괄 구축이 필요합니다 (Phase 1: npm run btc:index).");
    process.exit(1);
  }

  console.error("\nbtc:update — 증분 갱신은 Phase 1에서 구현됩니다 (docs/btc-onchain-raw-source-design.md §7).");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
