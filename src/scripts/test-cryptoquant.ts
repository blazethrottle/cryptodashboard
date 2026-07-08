/**
 * CryptoQuant API smoke test — CRYPTOQUANT_API_KEY 등록 후 연동 확인용.
 */

import "dotenv/config";
import {
  fetchExchangeNetflow,
  fetchExchangeWhaleRatio,
  fetchSopr,
  fetchCdd,
  fetchCryptoQuantSnapshot,
  cryptoQuantReasons,
} from "../lib/cryptoquant.ts";

async function main(): Promise<void> {
  console.log("\n━━━ CryptoQuant API smoke test ━━━\n");

  if (!process.env.CRYPTOQUANT_API_KEY) {
    console.log("CRYPTOQUANT_API_KEY not set in .env — nothing to test.");
    console.log("가입: https://cryptoquant.com/ → Professional 플랜 → 계정 설정에서 키 발급 → .env에 추가\n");
    return;
  }

  console.log("🐋 Exchange Whale Ratio:");
  try {
    console.log(`   ${JSON.stringify(await fetchExchangeWhaleRatio())}`);
  } catch (err) {
    console.log(`   ERR: ${(err as Error).message}`);
  }

  console.log("\n💧 Exchange Netflow:");
  try {
    console.log(`   ${JSON.stringify(await fetchExchangeNetflow())}`);
  } catch (err) {
    console.log(`   ERR: ${(err as Error).message}`);
  }

  console.log("\n📊 SOPR (LTH/STH):");
  try {
    console.log(`   ${JSON.stringify(await fetchSopr())}`);
  } catch (err) {
    console.log(`   ERR: ${(err as Error).message}`);
  }

  console.log("\n⏳ CDD:");
  try {
    console.log(`   ${JSON.stringify(await fetchCdd())}`);
  } catch (err) {
    console.log(`   ERR: ${(err as Error).message}`);
  }

  console.log("\n🧭 종합 스냅샷 + 해석:");
  const snap = await fetchCryptoQuantSnapshot();
  if (snap) {
    for (const r of cryptoQuantReasons(snap)) console.log(`   ↳ ${r}`);
    if (cryptoQuantReasons(snap).length === 0) console.log("   특이 신호 없음");
  }

  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
