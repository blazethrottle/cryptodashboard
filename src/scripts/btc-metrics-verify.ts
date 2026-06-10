/**
 * 자체 계산 Realized Cap vs CoinMetrics CapRealUSD 회귀 대조.
 *
 *   npm run btc:verify                      # 기본 합격선: 중앙값 2% / 최대 5%
 *   npm run btc:verify -- --median=0.03 --max=0.08
 *
 * 설계 문서 §8: CoinMetrics를 ground-truth로 강등하고, 우리 인덱스가
 * 일별 상대오차 합격선 안에 드는지 상시 검증한다. 벗어나면 가격 오라클
 * 기준(거래소/시각) 또는 UTXO 처리 누락을 의심.
 *
 * 현재 상태: 비교 로직은 구현 완료. 로컬 인덱스(Phase 1 산출물)가 생기는
 * 즉시 작동한다. 인덱스 미구축 시 안내 후 exit 1.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { JsonIndexStore } from "../lib/onchain/raw/store.ts";
import { fetchBtcMetrics } from "../lib/onchain/coinmetrics.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

interface CliArgs {
  medianThreshold: number;   // 상대오차 중앙값 합격선 (기본 0.02)
  maxThreshold: number;      // 상대오차 최대값 합격선 (기본 0.05)
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const get = (key: string): string | undefined =>
    args.find((a) => a.startsWith(`--${key}=`))?.split("=")[1];
  return {
    medianThreshold: Number(get("median") ?? 0.02),
    maxThreshold: Number(get("max") ?? 0.05),
  };
}

function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

async function main(): Promise<void> {
  const { medianThreshold, maxThreshold } = parseArgs();

  const store = new JsonIndexStore(REPO_ROOT);
  const ours = await store.getDailySeries();
  await store.close();

  if (ours.length === 0) {
    console.error(
      [
        "btc:verify — 로컬 인덱스가 비어 있습니다.",
        "먼저 인덱스를 구축하세요 (Phase 1: npm run btc:index).",
        "설계: docs/btc-onchain-raw-source-design.md §8",
      ].join("\n"),
    );
    process.exit(1);
  }

  // ground truth — 우리 시계열 범위를 덮는 CoinMetrics CapRealUSD
  const firstDate = ours[0].date;
  const daysBack = Math.ceil((Date.now() - Date.parse(`${firstDate}T00:00:00Z`)) / 86400000) + 7;
  const cm = await fetchBtcMetrics(daysBack);
  const cmByDate = new Map(cm.map((m) => [m.date, m.realizedCap]));

  const errors: Array<{ date: string; relErr: number }> = [];
  let skipped = 0;
  for (const row of ours) {
    const truth = cmByDate.get(row.date);
    if (truth === undefined || !Number.isFinite(truth) || truth <= 0) {
      skipped++;
      continue;
    }
    errors.push({ date: row.date, relErr: Math.abs(row.realizedCapUsd - truth) / truth });
  }

  if (errors.length === 0) {
    console.error("btc:verify — 비교 가능한 일자가 없습니다 (CoinMetrics 데이터 범위 확인 필요).");
    process.exit(1);
  }

  const relErrs = errors.map((e) => e.relErr);
  const med = median(relErrs);
  const worst = errors.reduce((a, b) => (a.relErr >= b.relErr ? a : b));
  const pass = med <= medianThreshold && worst.relErr <= maxThreshold;

  console.log("━━━ Realized Cap 회귀 대조 (자체 vs CoinMetrics) ━━━");
  console.log(`  비교 일수        : ${errors.length} (skip ${skipped})`);
  console.log(`  상대오차 중앙값  : ${(med * 100).toFixed(2)}%  (합격선 ${(medianThreshold * 100).toFixed(1)}%)`);
  console.log(`  상대오차 최대    : ${(worst.relErr * 100).toFixed(2)}% @ ${worst.date}  (합격선 ${(maxThreshold * 100).toFixed(1)}%)`);
  console.log(`  판정             : ${pass ? "✅ PASS" : "❌ FAIL"}`);

  if (!pass) {
    console.error("\n원인 후보: 가격 오라클 기준 차이 / UTXO 처리 누락 / 공급량 불일치 — 설계 §8, §10 참조.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
