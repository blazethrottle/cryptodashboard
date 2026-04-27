/**
 * DefiLlama API smoke test.
 */

import { fetchProtocolTvl, fetchProtocolFees, fetchChainTvl, fetchStablecoinSupply } from "../lib/onchain/defillama.ts";

const fmt = (n: number | undefined) => {
  if (n === undefined) return "-";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
};
const pct = (n: number | undefined) => {
  if (n === undefined || Number.isNaN(n)) return "-";
  const sign = n >= 0 ? "+" : "";
  // DefiLlama already returns fractions like 0.034 for change_*; convert.
  const v = Math.abs(n) > 1 ? n : n * 100;
  return `${sign}${v.toFixed(1)}%`;
};

async function main(): Promise<void> {
  console.log("\n━━━ DefiLlama smoke test ━━━\n");

  const slugs = ["uniswap", "aave", "compound-finance", "ondo-finance", "morpho-blue", "pendle", "jupiter-aggregator", "hyperliquid"];

  console.log("📊 Protocol TVL:");
  for (const slug of slugs) {
    try {
      const m = await fetchProtocolTvl(slug);
      if (!m) {
        console.log(`  ${slug.padEnd(25)} — no data`);
        continue;
      }
      console.log(`  ${slug.padEnd(25)} TVL=${fmt(m.tvlUsd).padStart(10)}  7d=${pct(m.tvl7dChange).padStart(7)}  30d=${pct(m.tvl30dChange).padStart(7)}  90d=${pct(m.tvl90dChange).padStart(7)}`);
    } catch (err) {
      console.log(`  ${slug.padEnd(25)} ERR: ${(err as Error).message}`);
    }
  }

  console.log("\n💰 Protocol fees (7d):");
  for (const slug of slugs) {
    try {
      const f = await fetchProtocolFees(slug);
      if (!f) {
        console.log(`  ${slug.padEnd(25)} — no fee data`);
        continue;
      }
      console.log(`  ${slug.padEnd(25)} 24h=${fmt(f.total24h).padStart(10)}  7d=${fmt(f.total7d).padStart(10)}  Δ7d=${pct(f.change_7d).padStart(7)}`);
    } catch (err) {
      console.log(`  ${slug.padEnd(25)} ERR: ${(err as Error).message}`);
    }
  }

  console.log("\n⛓ Chain TVL:");
  for (const chain of ["Ethereum", "Solana", "Sui", "Arbitrum", "Base"]) {
    const c = await fetchChainTvl(chain);
    if (!c) {
      console.log(`  ${chain.padEnd(15)} — no data`);
      continue;
    }
    console.log(`  ${chain.padEnd(15)} TVL=${fmt(c.tvl).padStart(10)}  7d=${pct(c.tvl7dChange).padStart(7)}  30d=${pct(c.tvl30dChange).padStart(7)}`);
  }

  console.log("\n💵 Stablecoin supply (proxy for 'dry powder'):");
  const stable = await fetchStablecoinSupply();
  console.log(`  total: ${fmt(stable?.totalUsd)}`);
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
