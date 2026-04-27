/**
 * snapshot JSON → LLM 친화적 텍스트 요약.
 * NEUTRAL 코인은 한 줄로 압축, 매수/매도/워치 후보는 자세히.
 */

import type { SignalSnapshot } from "../signals.ts";
import type { Coin, Institution } from "../universe.ts";
import type { BtcNetworkState } from "../onchain/btc.ts";
import type { SolNetworkState } from "../onchain/sol.ts";
import type { ChainTvl, StablecoinSnapshot } from "../onchain/defillama.ts";

export interface SnapshotFile {
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

const fmtUsd = (n: number | undefined | null): string => {
  if (n == null || !Number.isFinite(n)) return "-";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

const fmtPct = (n: number | undefined | null): string => {
  if (n == null || !Number.isFinite(n)) return "-";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(1)}%`;
};

const fmtNum = (n: number, digits = 2): string => {
  if (!Number.isFinite(n)) return "-";
  if (Math.abs(n) >= 10000) return n.toFixed(0);
  return n.toFixed(digits);
};

export function summarizeSnapshot(s: SnapshotFile): string {
  const lines: string[] = [];

  // Macro
  lines.push("### Macro Context");
  if (s.macro.btc) {
    const b = s.macro.btc;
    lines.push(`- BTC network: block ${b.blockHeight}, hashrate ${b.hashrate24hEhs.toFixed(0)} EH/s, difficulty ${b.difficultyChangePct >= 0 ? "+" : ""}${b.difficultyChangePct.toFixed(1)}%, fee ${b.feesSatPerVb.fastest} sat/vB, mempool ${b.mempoolVsizeMB.toFixed(0)}MB`);
  }
  if (s.macro.sol) {
    const sn = s.macro.sol;
    lines.push(`- SOL network: epoch ${sn.epoch} (${(sn.epochProgress * 100).toFixed(0)}%), TPS ${sn.tps5min.toFixed(0)}, inflation ${(sn.inflationRate * 100).toFixed(1)}%/yr`);
  }
  const chainEntries = Object.entries(s.macro.chains).filter(([, c]) => c);
  if (chainEntries.length > 0) {
    const parts = chainEntries.map(([n, c]) => `${n} ${fmtUsd(c!.tvl)} (${fmtPct(c!.tvl7dChange)}/7d, ${fmtPct(c!.tvl30dChange)}/30d)`);
    lines.push(`- Chain TVL: ${parts.join(" | ")}`);
  }
  if (s.macro.stablecoins) {
    const st = s.macro.stablecoins;
    lines.push(`- Stablecoin supply: ${fmtUsd(st.totalUsd)}, 7d ${fmtPct(st.change7dPct)}, 30d ${fmtPct(st.change30dPct)}`);
  }
  lines.push("");

  // Categorize
  const order = { BUY_STRONG: 0, BUY: 1, WATCH: 2, NEUTRAL: 3, SELL: 4, SELL_STRONG: 5 } as const;
  const valid = s.rows.filter((r) => r.result).sort((a, b) => order[a.result!.level] - order[b.result!.level]);

  const buys = valid.filter((r) => r.result!.level === "BUY_STRONG" || r.result!.level === "BUY");
  const watches = valid.filter((r) => r.result!.level === "WATCH");
  const sells = valid.filter((r) => r.result!.level === "SELL_STRONG" || r.result!.level === "SELL");
  const neutrals = valid.filter((r) => r.result!.level === "NEUTRAL");

  const writeRow = (r: SnapshotFile["rows"][number]): string => {
    const res = r.result!;
    const tvl = res.onchain?.tvl ? `, TVL ${fmtUsd(res.onchain.tvl.tvlUsd)} (${fmtPct(res.onchain.tvl.tvl7dChange)}/7d, ${fmtPct(res.onchain.tvl.tvl30dChange)}/30d)` : "";
    const fees = res.onchain?.fees?.total7d ? `, 7d fees ${fmtUsd(res.onchain.fees.total7d)}` : "";
    const star = r.coin.priority ? "★" : "";
    const holders = r.holders.length > 0 ? ` [기관: ${r.holders.join(", ")}]` : "";
    const reasons = res.reasons.length > 0 ? ` 사유: ${res.reasons.join(" | ")}` : "";
    const groups = r.coin.groups.join("/");
    return `- ${star}${r.coin.base} (${r.coin.name}, ${groups}): 가격 ${fmtUsd(res.price)}, 일봉 RSI ${fmtNum(res.rsiDaily)}, 주봉 RSI ${fmtNum(res.rsiWeekly)}, vs MA200 ${fmtPct(res.priceVs200)}${tvl}${fees}${holders}.${reasons}`;
  };

  lines.push(`### 매수 후보 (${buys.length})`);
  if (buys.length === 0) lines.push("- (없음)");
  for (const r of buys) lines.push(writeRow(r));
  lines.push("");

  lines.push(`### 워치 (${watches.length})`);
  if (watches.length === 0) lines.push("- (없음)");
  for (const r of watches) lines.push(writeRow(r));
  lines.push("");

  lines.push(`### 매도 후보 (${sells.length})`);
  if (sells.length === 0) lines.push("- (없음)");
  for (const r of sells) lines.push(writeRow(r));
  lines.push("");

  lines.push(`### NEUTRAL 코인 분포 (${neutrals.length})`);
  // 압축: priority + 주봉 RSI 30대 (과매도 근접) 만 자세히, 나머지는 한 줄 요약
  const neutralStandouts = neutrals.filter((r) => {
    if (!r.result) return false;
    return r.coin.priority || r.result.rsiWeekly <= 40 || r.result.rsiWeekly >= 60;
  });
  for (const r of neutralStandouts) {
    const res = r.result!;
    const star = r.coin.priority ? "★" : "";
    lines.push(`- ${star}${r.coin.base}: 일봉 RSI ${fmtNum(res.rsiDaily)}, 주봉 RSI ${fmtNum(res.rsiWeekly)}, vs MA200 ${fmtPct(res.priceVs200)}`);
  }
  const remaining = neutrals.length - neutralStandouts.length;
  if (remaining > 0) lines.push(`- (그외 ${remaining}개 NEUTRAL — RSI 40-60 구간, 시그널 없음)`);

  return lines.join("\n");
}
