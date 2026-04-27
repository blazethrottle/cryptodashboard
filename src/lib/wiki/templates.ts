/**
 * LLM-Wiki 노트 템플릿 — 전체 재작성.
 * entity / daily-signal / project / source 형식.
 */

import type { SignalSnapshot } from "../signals.ts";
import type { Coin, Institution } from "../universe.ts";
import { holdersOf } from "../universe.ts";
import type { ProtocolTvlMetrics, FeesSummary, ChainTvl, StablecoinSnapshot } from "../onchain/defillama.ts";
import type { BtcNetworkState } from "../onchain/btc.ts";
import type { SolNetworkState } from "../onchain/sol.ts";
import type { InstitutionStats, CrossAnalysis } from "../institutions.ts";
import { INSTITUTIONS } from "../universe.ts";
import { slugify } from "./vault.ts";
import { buildFrontmatter, type Frontmatter } from "./frontmatter.ts";

// ── 포맷 헬퍼 ──────────────────────────────────────────────────────────────
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

const levelKR: Record<SignalSnapshot["level"], string> = {
  BUY_STRONG: "🟢🟢 강한 매수",
  BUY: "🟢 매수",
  WATCH: "🔵 워치",
  NEUTRAL: "⚪ 중립",
  SELL: "🟡 매도",
  SELL_STRONG: "🔴 강한 매도",
};

// ── Coin Entity ───────────────────────────────────────────────────────────

export function coinEntityFrontmatter(coin: Coin, today: string, isNew: boolean): Frontmatter {
  const tags = ["crypto", ...coin.groups, ...(coin.priority ? ["x-vip-priority"] : []), coin.base];
  return {
    title: coin.name,
    type: "entity",
    domain: "crypto-future-finance",
    tags,
    created: isNew ? today : undefined,
    updated: today,
  };
}

export function coinEntityBaseBody(coin: Coin): string {
  const lines: string[] = [];
  lines.push(`# ${coin.name} (${coin.base})`);
  lines.push("");
  const groups = coin.groups.join(" · ");
  const priority = coin.priority ? " · ★ X-VIP priority" : "";
  const notes = coin.notes ? ` · ${coin.notes}` : "";
  lines.push(`> ${groups}${priority}${notes}`);
  if (coin.chain) lines.push(`> Chain: ${coin.chain}`);
  lines.push("");
  lines.push("## 요약");
  lines.push("");
  lines.push(`*(LLM이 ingest 또는 brief 작성 시 보강)*`);
  lines.push("");
  lines.push("## 관련 자료");
  lines.push("");
  const holders = holdersOf(coin.base);
  if (holders.length > 0) {
    lines.push(`- 보유 기관: ${holders.map((h) => `[[${slugify(h)}]]`).join(", ")}`);
  }
  lines.push(`- 도메인: [[crypto-future-finance]]`);
  lines.push(`- 프로젝트: [[Crypto-Dashboard]]`);
  lines.push("");
  return lines.join("\n");
}

export function coinSignalAutoBlock(coin: Coin, result: SignalSnapshot, source: string | undefined, dateStr: string): string {
  const lines: string[] = [];
  lines.push(`> 🤖 가장 최근 시그널 스냅샷. \`npm run sync\` 시 갱신됨. (자세한 일별 데이터는 [[${dateStr}_crypto-signals]])`);
  lines.push("");
  lines.push(`### ${levelKR[result.level]}  (score: ${result.score})`);
  lines.push("");
  lines.push("| 지표 | 값 |");
  lines.push("|---|---|");
  lines.push(`| 가격 | ${fmtUsd(result.price)} |`);
  lines.push(`| 일봉 RSI(14) | ${fmtNum(result.rsiDaily)} |`);
  lines.push(`| 주봉 RSI(14) | ${fmtNum(result.rsiWeekly)} |`);
  lines.push(`| MA50 | ${fmtUsd(result.ma50)} (${fmtPct(result.priceVs50)}) |`);
  lines.push(`| MA200 | ${fmtUsd(result.ma200)} (${fmtPct(result.priceVs200)}) |`);
  if (Number.isFinite(result.ma200Slope)) {
    lines.push(`| MA200 기울기 | ${result.ma200Slope >= 0 ? "↑" : "↓"} (${result.ma200Slope.toFixed(4)}) |`);
  }
  if (source) lines.push(`| 데이터 출처 | ${source} |`);
  lines.push("");

  if (result.reasons.length > 0) {
    lines.push("**시그널 근거**");
    for (const r of result.reasons) lines.push(`- ${r}`);
    lines.push("");
  }
  if (result.onchain?.tvl) {
    const t = result.onchain.tvl;
    lines.push(`**TVL** (DefiLlama): ${fmtUsd(t.tvlUsd)} · 7d ${fmtPct(t.tvl7dChange)} · 30d ${fmtPct(t.tvl30dChange)} · 90d ${fmtPct(t.tvl90dChange)}`);
    lines.push("");
  }
  if (result.onchain?.fees) {
    const f = result.onchain.fees;
    lines.push(`**Fees**: 24h ${fmtUsd(f.total24h)} · 7d ${fmtUsd(f.total7d)} · 30d ${fmtUsd(f.total30d)}`);
    lines.push("");
  }

  return lines.join("\n");
}

// ── Institution Entity ────────────────────────────────────────────────────

export function institutionEntityFrontmatter(name: string, today: string, isNew: boolean): Frontmatter {
  return {
    title: name,
    type: "entity",
    domain: "crypto-future-finance",
    tags: ["기관-포트폴리오", "x-vip-tracking", slugify(name)],
    created: isNew ? today : undefined,
    updated: today,
  };
}

export function institutionEntityBaseBody(name: string): string {
  const holdings = INSTITUTIONS[name as keyof typeof INSTITUTIONS] ?? [];
  const lines: string[] = [];
  lines.push(`# ${name}`);
  lines.push("");
  lines.push(`> 크립토 자산 운용·투자 기관. X-VIP 포트폴리오 추적용.`);
  lines.push("");
  lines.push("## 요약");
  lines.push("");
  lines.push(`*(LLM이 ingest 또는 brief 작성 시 보강)*`);
  lines.push("");
  lines.push("## 보유 코인 (Static)");
  lines.push("");
  lines.push(holdings.map((b) => `[[${b}]]`).join(", "));
  lines.push("");
  lines.push("## 관련 자료");
  lines.push("");
  lines.push(`- 도메인: [[crypto-future-finance]]`);
  lines.push(`- 프로젝트: [[Crypto-Dashboard]]`);
  lines.push("");
  return lines.join("\n");
}

export function institutionSignalAutoBlock(stats: InstitutionStats, dateStr: string): string {
  const lines: string[] = [];
  lines.push(`> 🤖 시그널 집계 자동 갱신. (자세한 일별 데이터는 [[${dateStr}_crypto-signals]])`);
  lines.push("");
  lines.push(`### 시그널 집계`);
  lines.push("");
  lines.push("| 항목 | 값 |");
  lines.push("|---|---|");
  lines.push(`| 총 보유 코인 | ${stats.totalHoldings} |`);
  lines.push(`| 🟢 매수 시그널 | ${stats.buyCount} |`);
  lines.push(`| 🔵 워치 | ${stats.watchCount} |`);
  lines.push(`| 🟡 매도 시그널 | ${stats.sellCount} |`);
  lines.push(`| 평균 score | ${stats.averageScore.toFixed(2)} |`);
  lines.push("");
  if (stats.signaledHoldings.length > 0) {
    lines.push(`### 보유 코인별 최신 시그널 (score 정렬)`);
    lines.push("");
    lines.push("| 코인 | 시그널 | score |");
    lines.push("|---|---|---|");
    for (const h of stats.signaledHoldings.slice(0, 20)) {
      lines.push(`| [[${h.base}]] | ${levelKR[h.level]} | ${h.score} |`);
    }
    if (stats.signaledHoldings.length > 20) lines.push(`| _… +${stats.signaledHoldings.length - 20} more_ | | |`);
    lines.push("");
  }
  if (stats.uniqueCoins.length > 0) {
    lines.push(`### 이 기관만 보유 (다른 6개 기관 미보유)`);
    lines.push("");
    lines.push(stats.uniqueCoins.map((b) => `[[${b}]]`).join(", "));
    lines.push("");
  }
  return lines.join("\n");
}

// ── Daily Signal (날짜별 시그널 종합) ──────────────────────────────────────

export interface DailySignalInputs {
  date: string;
  rows: Array<{
    coin: Coin;
    holders: Institution[];
    source?: string;
    result?: SignalSnapshot;
    error?: string;
  }>;
  macro: {
    btc?: BtcNetworkState;
    sol?: SolNetworkState;
    chains: Record<string, ChainTvl | null>;
    stablecoins?: StablecoinSnapshot;
  };
  institutionAnalysis?: CrossAnalysis;
}

export function dailySignalFrontmatter(date: string): Frontmatter {
  return {
    title: `Crypto Trading Signals ${date}`,
    type: "daily-signal",
    domain: "crypto-future-finance",
    tags: ["x-vip-portfolio", "trading-signal", "RSI", "MA200", "TVL", "기관-포트폴리오"],
    created: date,
  };
}

export function dailySignalBody(inputs: DailySignalInputs): string {
  const { date, rows, macro, institutionAnalysis } = inputs;
  const lines: string[] = [];

  lines.push(`# Crypto Trading Signals — ${date}`);
  lines.push("");
  lines.push(`> X-VIP 포트폴리오 + 기관 보유 코인 매매 시그널 자동 분석.  매매 기준: 주봉 RSI ≤30/≥70, 일봉 RSI ≤50/≥80 + 50일선 돌파, 200일선 추세.`);
  lines.push("");

  // TL;DR
  const valid = rows.filter((r) => r.result);
  const buys = valid.filter((r) => r.result!.level === "BUY_STRONG" || r.result!.level === "BUY");
  const watches = valid.filter((r) => r.result!.level === "WATCH");
  const sells = valid.filter((r) => r.result!.level === "SELL_STRONG" || r.result!.level === "SELL");

  lines.push("## TL;DR");
  lines.push("");
  if (buys.length === 0 && sells.length === 0) {
    lines.push("- **강한 매매 시그널 없음** — 시장 중립 국면.");
  }
  if (buys.length > 0) {
    const top = buys.map((r) => `[[${r.coin.name}|${r.coin.base}]]`).join(", ");
    lines.push(`- **🟢 매수 후보 ${buys.length}**: ${top}`);
  }
  if (sells.length > 0) {
    const top = sells.map((r) => `[[${r.coin.name}|${r.coin.base}]]`).join(", ");
    lines.push(`- **🟡 매도 후보 ${sells.length}**: ${top}`);
  }
  if (watches.length > 0) {
    lines.push(`- **🔵 워치 ${watches.length}**: ${watches.map((r) => `[[${r.coin.name}|${r.coin.base}]]`).join(", ")}`);
  }
  lines.push("");

  // Macro
  lines.push("## Macro Context");
  lines.push("");
  if (macro.btc) {
    const b = macro.btc;
    lines.push(`### ₿ Bitcoin 네트워크 (mempool.space)`);
    lines.push("");
    lines.push(`- 블록 ${b.blockHeight.toLocaleString()} · 24h 해시레이트 ${b.hashrate24hEhs.toFixed(0)} EH/s · 난이도 ${b.difficultyChangePct >= 0 ? "+" : ""}${b.difficultyChangePct.toFixed(1)}%`);
    lines.push(`- 수수료 (sat/vB): fastest ${b.feesSatPerVb.fastest} · 30분 ${b.feesSatPerVb.halfHour} · 1h ${b.feesSatPerVb.hour}`);
    lines.push(`- Mempool: ${b.mempoolCount.toLocaleString()} txs / ${b.mempoolVsizeMB.toFixed(0)} MB`);
    lines.push("");
  }
  if (macro.sol) {
    const sn = macro.sol;
    lines.push(`### ◎ Solana 네트워크 (RPC)`);
    lines.push("");
    lines.push(`- Slot ${sn.slot.toLocaleString()} · Epoch ${sn.epoch} (${(sn.epochProgress * 100).toFixed(0)}%) · TPS ${sn.tps5min.toFixed(0)} · inflation ${(sn.inflationRate * 100).toFixed(2)}%/yr`);
    lines.push("");
  }
  const chainEntries = Object.entries(macro.chains).filter(([, c]) => c);
  if (chainEntries.length > 0) {
    lines.push(`### ⛓ 체인 TVL (DefiLlama)`);
    lines.push("");
    lines.push("| 체인 | TVL | 7d | 30d |");
    lines.push("|---|---|---|---|");
    for (const [name, c] of chainEntries) {
      lines.push(`| ${name} | ${fmtUsd(c!.tvl)} | ${fmtPct(c!.tvl7dChange)} | ${fmtPct(c!.tvl30dChange)} |`);
    }
    lines.push("");
  }
  if (macro.stablecoins) {
    const s = macro.stablecoins;
    lines.push(`### 💵 Stablecoin Supply (매수 대기 자금)`);
    lines.push("");
    lines.push(`- 총 ${fmtUsd(s.totalUsd)} · 7d ${fmtPct(s.change7dPct)} · 30d ${fmtPct(s.change30dPct)}`);
    if (s.change30dPct > 0.02) lines.push(`- 💡 30d +2% 이상 — 자금 누적 중. 매수 압력 잠재.`);
    else if (s.change30dPct < -0.02) lines.push(`- 💡 30d -2% 이상 — 자금 유출. 디레버리지 진행.`);
    lines.push("");
  }

  // Buy candidates
  lines.push("## 🟢 매수 후보");
  lines.push("");
  if (buys.length === 0) lines.push("- 없음");
  else {
    lines.push("| 코인 | 가격 | 일봉 RSI | 주봉 RSI | vs MA200 | 기관 | 사유 |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const r of buys) {
      const inst = r.holders.length > 0 ? r.holders.map((h) => `[[${slugify(h)}\\|${h}]]`).join(", ") : "-";
      lines.push(
        `| [[${r.coin.name}\\|${r.coin.base}]] (${levelKR[r.result!.level]}) | ${fmtUsd(r.result!.price)} | ${fmtNum(r.result!.rsiDaily)} | ${fmtNum(r.result!.rsiWeekly)} | ${fmtPct(r.result!.priceVs200)} | ${inst} | ${r.result!.reasons.join(" · ")} |`,
      );
    }
  }
  lines.push("");

  // Watch
  lines.push("## 🔵 워치");
  lines.push("");
  if (watches.length === 0) lines.push("- 없음");
  else {
    lines.push("| 코인 | 가격 | 일봉 RSI | 주봉 RSI | vs MA200 | 사유 |");
    lines.push("|---|---|---|---|---|---|");
    for (const r of watches) {
      lines.push(`| [[${r.coin.name}\\|${r.coin.base}]] | ${fmtUsd(r.result!.price)} | ${fmtNum(r.result!.rsiDaily)} | ${fmtNum(r.result!.rsiWeekly)} | ${fmtPct(r.result!.priceVs200)} | ${r.result!.reasons.join(" · ")} |`);
    }
  }
  lines.push("");

  // Sell
  lines.push("## 🟡 매도 후보");
  lines.push("");
  if (sells.length === 0) lines.push("- 없음");
  else {
    lines.push("| 코인 | 가격 | 일봉 RSI | 주봉 RSI | vs MA200 | TVL 30d | 사유 |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const r of sells) {
      const tvl30 = r.result!.onchain?.tvl?.tvl30dChange;
      lines.push(`| [[${r.coin.name}\\|${r.coin.base}]] (${levelKR[r.result!.level]}) | ${fmtUsd(r.result!.price)} | ${fmtNum(r.result!.rsiDaily)} | ${fmtNum(r.result!.rsiWeekly)} | ${fmtPct(r.result!.priceVs200)} | ${fmtPct(tvl30)} | ${r.result!.reasons.join(" · ")} |`);
    }
  }
  lines.push("");

  // Institutional analysis (간략)
  if (institutionAnalysis) {
    lines.push("## 기관 포트폴리오 동향");
    lines.push("");
    lines.push("| 기관 | 보유 | 🟢 BUY | 🔵 WATCH | 🟡 SELL | avg score |");
    lines.push("|---|---|---|---|---|---|");
    for (const s of institutionAnalysis.byInstitution) {
      lines.push(`| [[${slugify(s.name)}\\|${s.name}]] | ${s.totalHoldings} | ${s.buyCount} | ${s.watchCount} | ${s.sellCount} | ${s.averageScore.toFixed(2)} |`);
    }
    lines.push("");
    if (institutionAnalysis.consensus.length > 0) {
      lines.push(`**Consensus (모든 7개 기관 보유)**: ${institutionAnalysis.consensus.map((b) => `[[${b}]]`).join(", ")}`);
      lines.push("");
    }
  }

  // Full table (NEUTRAL 압축)
  lines.push("## 전체 코인 분포");
  lines.push("");
  lines.push("| 코인 | 시그널 | 가격 | 일봉 RSI | 주봉 RSI | vs MA200 |");
  lines.push("|---|---|---|---|---|---|");
  const order = { BUY_STRONG: 0, BUY: 1, WATCH: 2, NEUTRAL: 3, SELL: 4, SELL_STRONG: 5 } as const;
  const sorted = valid.slice().sort((a, b) => order[a.result!.level] - order[b.result!.level]);
  for (const r of sorted) {
    const star = r.coin.priority ? "★" : "";
    lines.push(
      `| ${star}[[${r.coin.name}\\|${r.coin.base}]] | ${levelKR[r.result!.level]} | ${fmtUsd(r.result!.price)} | ${fmtNum(r.result!.rsiDaily)} | ${fmtNum(r.result!.rsiWeekly)} | ${fmtPct(r.result!.priceVs200)} |`,
    );
  }
  lines.push("");

  // Errors
  const errs = rows.filter((r) => r.error);
  if (errs.length > 0) {
    lines.push("## 데이터 수집 실패");
    lines.push("");
    for (const e of errs) lines.push(`- ${e.coin.base}: ${e.error?.slice(0, 100)}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("**관련 자료**: [[Crypto-Dashboard]] · [[crypto-future-finance]]");
  lines.push("");

  return lines.join("\n");
}

// ── Project Index (Crypto-Dashboard.md) ────────────────────────────────────

export function projectIndexFrontmatter(today: string, isNew: boolean): Frontmatter {
  return {
    title: "Crypto-Dashboard",
    type: "project",
    domain: "crypto-future-finance",
    tags: ["x-vip-portfolio", "trading-signal", "RSI", "MA200", "기관-포트폴리오", "automation", "active"],
    created: isNew ? today : undefined,
    updated: today,
  };
}

export interface ProjectIndexInputs {
  totalCoins: number;
  buys: number;
  watches: number;
  sells: number;
  lastSnapshotAt: string;
  topBuy?: Coin;
  topSell?: Coin;
  latestDate: string;
}

export function projectIndexBody(p: ProjectIndexInputs): string {
  const lines: string[] = [];
  lines.push(`# Crypto-Dashboard`);
  lines.push("");
  lines.push(`> X-VIP 포트폴리오 매매 시그널 + 온체인 데이터 + 기관 포트폴리오 통합 시스템.`);
  lines.push(`> 사용자가 직접 정의한 매매 기준 (주봉 RSI ≤30/≥70, 일봉 RSI ≤50/≥80 + 50일선 돌파, 200일선 추세) 기반 자동 분석.`);
  lines.push("");
  lines.push("## 상태");
  lines.push("");
  lines.push(`- **활성** · 마지막 갱신: ${p.lastSnapshotAt}`);
  lines.push(`- 총 추적 코인: ${p.totalCoins}`);
  lines.push(`- 🟢 매수: ${p.buys} · 🔵 워치: ${p.watches} · 🟡 매도: ${p.sells}`);
  if (p.topBuy) lines.push(`- 최강 매수: [[${p.topBuy.name}|${p.topBuy.base}]] (${p.topBuy.name})`);
  if (p.topSell) lines.push(`- 최강 매도: [[${p.topSell.name}|${p.topSell.base}]] (${p.topSell.name})`);
  lines.push("");
  lines.push("## 시스템 구성");
  lines.push("");
  lines.push("**데이터 소스 (Tier 1, 무료, 키 불필요)**");
  lines.push("- Binance Public API — 일봉/주봉 캔들");
  lines.push("- CoinGecko Public API — Binance 미상장 코인 fallback");
  lines.push("- DefiLlama — 프로토콜 TVL/fees, 체인 TVL, 스테이블코인 supply");
  lines.push("- mempool.space — BTC 네트워크 상태");
  lines.push("- Solana RPC (mainnet) — TPS, epoch, inflation");
  lines.push("");
  lines.push("**시그널 엔진** — RSI(14) Wilder + MA50/200 + 50일선 돌파 + 200일선 기울기 + DefiLlama TVL 가중치");
  lines.push("**LLM brief** — Claude Sonnet 4.6 + prompt caching, Vault context 입력 → `wiki/sources/<date>_Crypto-Signal-Brief.md` 출력");
  lines.push("");
  lines.push("## 빠른 이동");
  lines.push("");
  lines.push(`- [[${p.latestDate}_crypto-signals|최신 일별 시그널]]`);
  lines.push(`- 매수/매도 후보 entity는 위 일별 시그널 표 위키링크로 이동`);
  lines.push("- 도메인: [[crypto-future-finance]]");
  lines.push("- 기관: [[Grayscale]] · [[Bitwise]] · [[21Shares]] · [[CoinShares]] · [[Pantera]] · [[Galaxy-Digital]] · [[Paradigm]]");
  lines.push("");
  lines.push("## 매매 기준 (사용자 정의 — 변경 금지)");
  lines.push("");
  lines.push("**매수**: 장기 주봉 RSI ≤ 30 (과매도) | 단/중기 일봉 RSI ≤ 50 + 50일선 돌파 | 보조 200일선 위 + 상향 추세");
  lines.push("**매도**: 장기 주봉 RSI ≥ 70 (과매수) | 단/중기 일봉 RSI ≥ 80 | 보조 200일선 하향 돌파 + 지속 하락");
  lines.push("");
  lines.push("## 운영 명령어");
  lines.push("```bash");
  lines.push("npm run snapshot         # 시그널 + 매크로 + TVL 수집");
  lines.push("npm run institutions     # 기관 분석");
  lines.push("npm run sync             # snapshot → llm-wiki 동기화");
  lines.push("npm run brief            # Sonnet 4.6 인사이트 brief");
  lines.push("npm run all              # snapshot → institutions → sync → brief");
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}

// ── Source brief (LLM brief 저장) ──────────────────────────────────────────

export function briefSourceFrontmatter(date: string): Frontmatter {
  return {
    title: `Crypto Signal Brief ${date}`,
    type: "source",
    domain: "crypto-future-finance",
    tags: ["LLM-brief", "trading-signal", "x-vip-portfolio", "Claude-Sonnet-4-6"],
    created: date,
  };
}
