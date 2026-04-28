import { useState } from "react";
import { Coins, Activity, Zap, Layers, BarChart3 } from "lucide-react";
import type { Macro, Row } from "../types";
import { fmtUsd, fmtPrice, fmtPct, fmtNum, levelEmoji } from "../lib/format";
import { CoinChart } from "./CoinChart";

interface Props {
  macro: Macro;
  rows: Row[];
}

type Coin = "BTC" | "ETH" | "SOL" | "XRP";

const COIN_META: Record<Coin, { fullName: string; chain: string; description: string; ticker: string }> = {
  BTC: {
    fullName: "Bitcoin",
    chain: "Bitcoin",
    description: "디지털 금. 가치 저장의 절대 표준. 사이클 구조에서 핵심.",
    ticker: "BTC",
  },
  ETH: {
    fullName: "Ethereum",
    chain: "Ethereum",
    description: "스마트 컨트랙트 플랫폼 1위. DeFi·RWA·L2의 기반 자산.",
    ticker: "ETH",
  },
  SOL: {
    fullName: "Solana",
    chain: "Solana",
    description: "고성능 모놀리식 L1. AI·DePIN·Meme 활성. 가장 빠른 네트워크.",
    ticker: "SOL",
  },
  XRP: {
    fullName: "XRP",
    chain: "XRP Ledger",
    description: "결제·송금 특화 L1. 기관 채택 + 규제 명확성.",
    ticker: "XRP",
  },
};

export function OnchainSection({ macro, rows }: Props) {
  const [active, setActive] = useState<Coin>("BTC");
  const [showChart, setShowChart] = useState(false);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-accent" />
          Onchain — BTC · ETH · SOL · XRP 개별 분석
        </h2>
        <p className="text-sm text-muted mt-1">
          메이저 4개 코인의 온체인 데이터·가격·시그널을 개별 비교.
        </p>
      </header>

      {/* 코인 탭 */}
      <nav className="flex gap-2 flex-wrap border-b border-border pb-3">
        {(["BTC", "ETH", "SOL", "XRP"] as Coin[]).map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
              active === c
                ? "bg-surface border border-b-transparent border-border text-text"
                : "text-muted hover:text-text"
            }`}
          >
            {c} {COIN_META[c].fullName}
          </button>
        ))}
      </nav>

      <CoinPanel
        coin={active}
        macro={macro}
        rows={rows}
        onShowChart={() => setShowChart(true)}
      />

      {showChart && <CoinChart base={active} onClose={() => setShowChart(false)} />}
    </div>
  );
}

function CoinPanel({
  coin,
  macro,
  rows,
  onShowChart,
}: {
  coin: Coin;
  macro: Macro;
  rows: Row[];
  onShowChart: () => void;
}) {
  const meta = COIN_META[coin];
  const row = rows.find((r) => r.coin.base === coin);

  return (
    <div className="space-y-4">
      {/* 헤더 — 가격 + 시그널 */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-3">
          <div>
            <h3 className="text-2xl font-bold flex items-baseline gap-2">
              {meta.fullName} <span className="text-base text-muted font-mono">{meta.ticker}</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">{meta.chain} · {meta.description}</p>
          </div>
          <button
            onClick={onShowChart}
            className="text-xs px-3 py-1.5 rounded border border-border hover:border-accent hover:text-accent transition"
          >
            가격·RSI·MA 차트 보기
          </button>
        </div>
        {row?.result ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Stat label="가격" value={fmtPrice(row.result.price)} big />
            <Stat label="시그널" value={`${levelEmoji(row.result.level)} ${row.result.level}`} />
            <Stat label="일봉 RSI" value={fmtNum(row.result.rsiDaily)} />
            <Stat label="주봉 RSI" value={fmtNum(row.result.rsiWeekly)} />
            <Stat
              label="vs MA200"
              value={fmtPct(row.result.priceVs200)}
              tone={row.result.priceVs200 >= 0 ? "buy" : "sell"}
            />
          </div>
        ) : (
          <p className="text-sm text-muted">데이터 없음</p>
        )}
        {row?.result && row.result.reasons.length > 0 && (
          <p className="text-xs text-muted mt-3">{row.result.reasons.join(" · ")}</p>
        )}
      </section>

      {/* 코인별 specific 온체인 데이터 */}
      {coin === "BTC" && <BtcOnchain macro={macro} />}
      {coin === "ETH" && <EthOnchain macro={macro} row={row} />}
      {coin === "SOL" && <SolOnchain macro={macro} />}
      {coin === "XRP" && <XrpOnchain row={row} />}

      {/* 매크로 컨텍스트 (모든 코인 공통) */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h4 className="font-semibold mb-3 text-sm">현재 매크로 컨텍스트 ({coin}에 영향)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {macro.fearGreed && (
            <Stat
              label="Fear & Greed"
              value={String(macro.fearGreed.current.value)}
              hint={macro.fearGreed.current.classification}
              tone={macro.fearGreed.current.value <= 25 ? "buy" : macro.fearGreed.current.value >= 75 ? "sell" : undefined}
            />
          )}
          {macro.global && (
            <Stat
              label="BTC Dominance"
              value={`${(macro.global.btcDominance * 100).toFixed(1)}%`}
              hint={macro.altSeason?.state}
            />
          )}
          {macro.stablecoins && (
            <Stat
              label="Stable Supply 30d"
              value={fmtPct(macro.stablecoins.change30dPct)}
              hint={fmtUsd(macro.stablecoins.totalUsd)}
              tone={macro.stablecoins.change30dPct >= 0 ? "buy" : "sell"}
            />
          )}
          {macro.btcCycle && (
            <Stat
              label="BTC MVRV-Z"
              value={macro.btcCycle.current.mvrvZ.toFixed(2)}
              hint={macro.btcCycle.cycleState}
            />
          )}
        </div>
      </section>
    </div>
  );
}

// ── Coin-specific Onchain Panels ──────────────────────────────────────────

function BtcOnchain({ macro }: { macro: Macro }) {
  if (!macro.btc) return null;
  const b = macro.btc;
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
        <Coins className="w-4 h-4 text-warn" />
        Bitcoin 네트워크 상태 (mempool.space)
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <Stat label="블록 높이" value={b.blockHeight.toLocaleString()} />
        <Stat
          label="24h 해시레이트"
          value={`${b.hashrate24hEhs.toFixed(0)} EH/s`}
          hint="네트워크 보안 규모"
        />
        <Stat
          label="난이도 변화"
          value={`${b.difficultyChangePct >= 0 ? "+" : ""}${b.difficultyChangePct.toFixed(2)}%`}
          tone={b.difficultyChangePct >= 0 ? "buy" : "sell"}
        />
        <Stat label="추천 수수료" value={`${b.feesSatPerVb.fastest} sat/vB`} hint="fastest" />
        <Stat label="30분 수수료" value={`${b.feesSatPerVb.halfHour} sat/vB`} />
        <Stat label="1h 수수료" value={`${b.feesSatPerVb.hour} sat/vB`} />
        <Stat
          label="Mempool"
          value={`${b.mempoolVsizeMB.toFixed(0)} MB`}
          hint={`${b.mempoolCount.toLocaleString()} txs`}
        />
        <Stat label="Difficulty" value={`${(b.difficulty / 1e12).toFixed(1)} T`} hint="hash unit" />
      </div>
      {macro.btcCycle && (
        <div className="mt-4 pt-4 border-t border-border/40">
          <h5 className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">사이클 위치</h5>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Stat label="MVRV" value={macro.btcCycle.current.mvrv.toFixed(2)} hint="시가/실현가" />
            <Stat label="MVRV-Z" value={macro.btcCycle.current.mvrvZ.toFixed(2)} />
            <Stat label="State" value={macro.btcCycle.cycleState} />
          </div>
        </div>
      )}
    </section>
  );
}

function EthOnchain({ macro, row }: { macro: Macro; row: Row | undefined }) {
  const ethTvl = macro.chains?.Ethereum;
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
        <Layers className="w-4 h-4 text-accent" />
        Ethereum 네트워크 상태
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {ethTvl && (
          <>
            <Stat
              label="DeFi TVL"
              value={fmtUsd(ethTvl.tvl)}
              hint="DefiLlama"
            />
            <Stat
              label="TVL 7d"
              value={fmtPct(ethTvl.tvl7dChange)}
              tone={ethTvl.tvl7dChange >= 0 ? "buy" : "sell"}
            />
            <Stat
              label="TVL 30d"
              value={fmtPct(ethTvl.tvl30dChange)}
              tone={ethTvl.tvl30dChange >= 0 ? "buy" : "sell"}
            />
          </>
        )}
        {macro.global && (
          <Stat
            label="ETH Dominance"
            value={`${(macro.global.ethDominance * 100).toFixed(1)}%`}
          />
        )}
        {row?.result && (
          <>
            <Stat label="MA50" value={fmtPrice(row.result.ma50)} hint={fmtPct(row.result.priceVs50)} />
            <Stat label="MA200" value={fmtPrice(row.result.ma200)} hint={fmtPct(row.result.priceVs200)} />
            <Stat
              label="MA200 기울기"
              value={`${row.result.ma200Slope >= 0 ? "↑" : "↓"} ${row.result.ma200Slope.toFixed(4)}`}
              tone={row.result.ma200Slope >= 0 ? "buy" : "sell"}
            />
          </>
        )}
      </div>
      <p className="text-xs text-muted mt-3 italic">
        💡 ETH 전용 데이터 (gas, staking, ETF flow)는 추후 추가 예정. 현재는 가격·MA·DeFi TVL 기반.
      </p>
    </section>
  );
}

function SolOnchain({ macro }: { macro: Macro }) {
  const solTvl = macro.chains?.Solana;
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
        <Activity className="w-4 h-4 text-cyan-400" />
        Solana 네트워크 상태 (mainnet RPC)
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {macro.sol && (
          <>
            <Stat label="Slot" value={macro.sol.slot.toLocaleString()} />
            <Stat
              label="Epoch"
              value={`${macro.sol.epoch}`}
              hint={`${(macro.sol.epochProgress * 100).toFixed(0)}% 진행`}
            />
            <Stat label="TPS (5min)" value={macro.sol.tps5min.toFixed(0)} hint="non-vote" />
            <Stat label="Inflation" value={`${(macro.sol.inflationRate * 100).toFixed(2)}%`} hint="annualized" />
            <Stat
              label="Total Supply"
              value={`${(macro.sol.totalStakeSol / 1e6).toFixed(2)}M SOL`}
            />
          </>
        )}
        {solTvl && (
          <>
            <Stat label="DeFi TVL" value={fmtUsd(solTvl.tvl)} />
            <Stat
              label="TVL 7d"
              value={fmtPct(solTvl.tvl7dChange)}
              tone={solTvl.tvl7dChange >= 0 ? "buy" : "sell"}
            />
            <Stat
              label="TVL 30d"
              value={fmtPct(solTvl.tvl30dChange)}
              tone={solTvl.tvl30dChange >= 0 ? "buy" : "sell"}
            />
          </>
        )}
      </div>
    </section>
  );
}

function XrpOnchain({ row }: { row: Row | undefined }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
        <Zap className="w-4 h-4 text-blue-400" />
        XRP Ledger 상태
      </h4>
      {row?.result && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat label="가격" value={fmtPrice(row.result.price)} />
          <Stat label="MA50" value={fmtPrice(row.result.ma50)} hint={fmtPct(row.result.priceVs50)} />
          <Stat label="MA200" value={fmtPrice(row.result.ma200)} hint={fmtPct(row.result.priceVs200)} />
          <Stat
            label="MA200 기울기"
            value={`${row.result.ma200Slope >= 0 ? "↑" : "↓"} ${row.result.ma200Slope.toFixed(4)}`}
            tone={row.result.ma200Slope >= 0 ? "buy" : "sell"}
          />
        </div>
      )}
      <p className="text-xs text-muted mt-3 italic">
        💡 XRP Ledger 전용 데이터 (ledger close time, transactions/sec, validator)는 추후 XRPL API 통합 예정.
        현재는 가격·MA 기반 + 매크로 컨텍스트.
      </p>
    </section>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  hint,
  big,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  big?: boolean;
  tone?: "buy" | "sell";
}) {
  const toneClass = tone === "buy" ? "text-buy" : tone === "sell" ? "text-sell" : "text-text";
  return (
    <div>
      <p className="text-[11px] text-muted uppercase tracking-wider">{label}</p>
      <p className={`font-mono ${big ? "text-xl" : "text-base"} ${toneClass}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted mt-0.5">{hint}</p>}
    </div>
  );
}
