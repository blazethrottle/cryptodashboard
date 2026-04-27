/**
 * Onchain network state smoke test.
 */

import { fetchBtcNetwork } from "../lib/onchain/btc.ts";
import { fetchSolNetwork } from "../lib/onchain/sol.ts";

async function main(): Promise<void> {
  console.log("\n━━━ Onchain network state ━━━\n");

  console.log("₿  BTC (mempool.space):");
  try {
    const btc = await fetchBtcNetwork();
    console.log(`   block height        : ${btc.blockHeight.toLocaleString()}`);
    console.log(`   hashrate (24h)      : ${btc.hashrate24hEhs.toFixed(2)} EH/s`);
    console.log(`   difficulty change   : ${btc.difficultyChangePct >= 0 ? "+" : ""}${btc.difficultyChangePct.toFixed(2)}%`);
    console.log(`   fees (sat/vB)       : fastest=${btc.feesSatPerVb.fastest}  30min=${btc.feesSatPerVb.halfHour}  1h=${btc.feesSatPerVb.hour}  min=${btc.feesSatPerVb.minimum}`);
    console.log(`   mempool             : ${btc.mempoolCount.toLocaleString()} txs / ${btc.mempoolVsizeMB.toFixed(1)} MB`);
  } catch (err) {
    console.log(`   ERR: ${(err as Error).message}`);
  }

  console.log("\n◎  SOL (mainnet RPC):");
  try {
    const sol = await fetchSolNetwork();
    console.log(`   slot                : ${sol.slot.toLocaleString()}`);
    console.log(`   epoch               : ${sol.epoch} (${(sol.epochProgress * 100).toFixed(1)}% complete)`);
    console.log(`   non-vote TPS (5min) : ${sol.tps5min.toFixed(0)}`);
    console.log(`   inflation rate      : ${(sol.inflationRate * 100).toFixed(2)}% / yr`);
    console.log(`   total supply        : ${(sol.totalStakeSol / 1e6).toFixed(2)}M SOL`);
  } catch (err) {
    console.log(`   ERR: ${(err as Error).message}`);
  }

  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
