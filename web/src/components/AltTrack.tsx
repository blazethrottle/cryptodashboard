import { useState } from "react";
import { Rocket, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import type { Macro, Row } from "../types";
import { fmtPrice, fmtPct, levelEmoji, fmtNum } from "../lib/format";
import { CoinChart } from "./CoinChart";

interface Props {
  macro: Macro;
  rows: Row[];
}

export function AltTrack({ macro, rows }: Props) {
  const [chartCoin, setChartCoin] = useState<string | null>(null);

  // BTC 제외 + multibagger score 정렬
  const altsWithScore = rows
    .filter((r) => r.coin.base !== "BTC" && r.multibagger)
    .sort((a, b) => (b.multibagger!.total - a.multibagger!.total) || (b.result?.score ?? 0) - (a.result?.score ?? 0));

  const candidates = altsWithScore.filter((r) => r.multibagger!.rating === "candidate");
  const watches = altsWithScore.filter((r) => r.multibagger!.rating === "watch");

  // 카테고리 핫/콜드
  const cats = (macro.categories ?? []).filter((c) => c.marketCapUsd > 100_000_000);
  const hotCats = cats.slice().sort((a, b) => b.change24hPct - a.change24hPct).slice(0, 5);
  const coldCats = cats.slice().sort((a, b) => a.change24hPct - b.change24hPct).slice(0, 5);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Rocket className="w-6 h-6 text-buy" />
          알트 멀티배거 트랙
        </h2>
        <p className="text-sm text-muted mt-1">
          단/중기 100~1000% 수익률 추구. 6 체크리스트 (TVL · 카테고리 · Funding · RSI · F&G · 시총) 기반.
        </p>
      </header>

      {/* Fear & Greed + 알트 시즌 status */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {macro.fearGreed && (
          <Card title="Fear & Greed" emoji="😨" tone={macro.fearGreed.current.value <= 25 ? "buy" : macro.fearGreed.current.value >= 75 ? "sell" : "neutral"}>
            <p className="text-3xl font-bold">{macro.fearGreed.current.value}</p>
            <p className="text-sm text-muted mt-1">{macro.fearGreed.current.classification}</p>
            {macro.fearGreed.current.value <= 25 && (
              <p className="text-xs text-buy mt-2">💡 Contrarian 매수 기회</p>
            )}
            {macro.fearGreed.current.value >= 75 && (
              <p className="text-xs text-sell mt-2">⚠️ 일부 익절 검토</p>
            )}
          </Card>
        )}
        {macro.global && (
          <Card title="BTC Dominance" emoji="₿" tone={macro.global.btcDominance < 0.5 ? "buy" : "neutral"}>
            <p className="text-3xl font-bold">{(macro.global.btcDominance * 100).toFixed(1)}%</p>
            <p className="text-xs text-muted mt-1">{macro.altSeason?.comment ?? ""}</p>
          </Card>
        )}
        {macro.stablecoins && (
          <Card title="Stablecoin 공급" emoji="💵" tone={macro.stablecoins.change30dPct > 0.02 ? "buy" : "neutral"}>
            <p className="text-3xl font-bold">${(macro.stablecoins.totalUsd / 1e9).toFixed(0)}B</p>
            <p className="text-xs text-muted mt-1">
              30d <span className={macro.stablecoins.change30dPct >= 0 ? "text-buy" : "text-sell"}>{fmtPct(macro.stablecoins.change30dPct)}</span>
            </p>
          </Card>
        )}
      </section>

      {/* Multibagger candidates */}
      <section className="rounded-xl border border-buy/40 bg-buy/5 p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-3 text-buy">
          <Sparkles className="w-5 h-5" />
          Multibagger 후보 ({candidates.length}) — 6 체크리스트 4개 이상
        </h3>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted">현재 4개 이상 충족 코인 없음. Watch 단계 후보를 모니터링.</p>
        ) : (
          <ul className="space-y-2">
            {candidates.slice(0, 10).map((r) => (
              <MultibaggerRow key={r.coin.base} row={r} onChart={() => setChartCoin(r.coin.base)} />
            ))}
          </ul>
        )}
      </section>

      {/* Watch */}
      {watches.length > 0 && (
        <section className="rounded-xl border border-watch/40 bg-watch/5 p-5">
          <h3 className="font-semibold mb-3 text-watch">Watch ({watches.length}) — 2-3개 체크리스트 충족</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {watches.slice(0, 12).map((r) => (
              <MultibaggerRow key={r.coin.base} row={r} onChart={() => setChartCoin(r.coin.base)} compact />
            ))}
          </div>
        </section>
      )}

      {/* 카테고리 히트맵 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3 text-buy">
            <TrendingUp className="w-5 h-5" />
            Hot Categories (24h)
          </h3>
          <ul className="space-y-1.5 text-sm">
            {hotCats.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between">
                <span>{c.name}</span>
                <span className={c.change24hPct >= 0 ? "text-buy font-mono" : "text-sell font-mono"}>{fmtPct(c.change24hPct)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3 text-sell">
            <TrendingDown className="w-5 h-5" />
            Cold Categories (Contrarian 진입 후보)
          </h3>
          <ul className="space-y-1.5 text-sm">
            {coldCats.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between">
                <span>{c.name}</span>
                <span className="text-sell font-mono">{fmtPct(c.change24hPct)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {chartCoin && <CoinChart base={chartCoin} onClose={() => setChartCoin(null)} />}
    </div>
  );
}

function Card({
  title,
  emoji,
  tone,
  children,
}: {
  title: string;
  emoji: string;
  tone?: "buy" | "sell" | "neutral";
  children: React.ReactNode;
}) {
  const border = tone === "buy" ? "border-buy/40" : tone === "sell" ? "border-sell/40" : "border-border";
  return (
    <div className={`rounded-xl border ${border} bg-surface p-5`}>
      <header className="text-sm font-semibold text-muted mb-2">
        {emoji} {title}
      </header>
      {children}
    </div>
  );
}

function MultibaggerRow({ row, onChart, compact }: { row: Row; onChart: () => void; compact?: boolean }) {
  const m = row.multibagger!;
  const r = row.result;
  return (
    <li className="rounded border border-border bg-surface px-3 py-2 hover:border-accent transition cursor-pointer" onClick={onChart}>
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold">{row.coin.base}</span>
          <span className="text-xs text-muted">{row.coin.name}</span>
          {r && <span className="text-xs">{levelEmoji(r.level)}</span>}
        </div>
        <span className="text-xs">
          <span className="font-mono text-buy font-semibold">{m.total}/6</span>
          {!compact && r && <span className="text-muted ml-2">{fmtPrice(r.price)}</span>}
        </span>
      </div>
      {!compact && (
        <>
          <div className="flex items-center gap-2 text-[11px] text-muted mt-1 font-mono">
            <span>D-RSI {fmtNum(r?.rsiDaily ?? 0)}</span>
            <span>·</span>
            <span>W-RSI {fmtNum(r?.rsiWeekly ?? 0)}</span>
            <span>·</span>
            <span className={(r?.priceVs200 ?? 0) >= 0 ? "text-buy" : "text-sell"}>
              vs MA200 {fmtPct(r?.priceVs200)}
            </span>
          </div>
          {m.reasons.length > 0 && (
            <p className="text-[11px] text-muted mt-1">{m.reasons.join(" · ")}</p>
          )}
        </>
      )}
    </li>
  );
}
