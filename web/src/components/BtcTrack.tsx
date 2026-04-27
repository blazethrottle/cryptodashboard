import { useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { Bitcoin, Gauge } from "lucide-react";
import type { Macro, Row } from "../types";
import { fmtPrice, fmtPct } from "../lib/format";
import { CoinChart } from "./CoinChart";

interface Props {
  macro: Macro;
  rows: Row[];
}

const STATE_LABEL: Record<string, { label: string; color: string; advice: string }> = {
  "cycle-bottom": { label: "사이클 바닥", color: "text-buy", advice: "강한 매수 — 역사적 저점 영역. 분할 매수." },
  accumulation: { label: "축적 단계", color: "text-buy", advice: "매수 — 사이클 회복 중. 신중한 분할 진입." },
  growth: { label: "성장 단계", color: "text-watch", advice: "보유 — 강세장 본격. 큰 이익 실현 보류." },
  euphoria: { label: "과열 단계", color: "text-warn", advice: "주의 — 일부 익절. 새 진입 보류." },
  "cycle-top": { label: "사이클 정점", color: "text-sell", advice: "강한 매도 — 역사적 고점 영역. 적극 청산." },
};

export function BtcTrack({ macro, rows }: Props) {
  const [showChart, setShowChart] = useState(false);
  const btcRow = rows.find((r) => r.coin.base === "BTC");
  const cycle = macro.btcCycle;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bitcoin className="w-6 h-6 text-warn" />
          BTC 장기 트랙
        </h2>
        <p className="text-sm text-muted mt-1">
          큰 사이클(2-4년)에서 정점 회피 / 바닥 매수. MVRV-Z + 200일선 + 사이클 위치.
        </p>
      </header>

      {/* MVRV-Z 게이지 + 차트 */}
      {cycle && (
        <section className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-accent" />
              <h3 className="font-semibold">MVRV-Z 사이클 위치</h3>
            </div>
            <span className={`text-xs px-2 py-1 rounded border ${STATE_LABEL[cycle.cycleState].color}`}>
              {STATE_LABEL[cycle.cycleState].label}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Stat label="MVRV-Z" value={cycle.current.mvrvZ.toFixed(2)} hint={`MVRV ${cycle.current.mvrv.toFixed(2)}`} big />
            <Stat label="BTC Price" value={fmtPrice(cycle.current.price)} hint={cycle.current.date} big />
            <Stat
              label="권고"
              value={STATE_LABEL[cycle.cycleState].label}
              hint={STATE_LABEL[cycle.cycleState].advice}
              big
              tone={cycle.cycleState === "cycle-bottom" || cycle.cycleState === "accumulation" ? "buy" : cycle.cycleState === "cycle-top" || cycle.cycleState === "euphoria" ? "sell" : "watch"}
            />
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={cycle.series365d.slice(-365)}>
              <XAxis dataKey="date" stroke="#6c7686" fontSize={11} interval="preserveStartEnd" minTickGap={50} />
              <YAxis stroke="#6c7686" fontSize={11} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "#11161e", border: "1px solid #262e3b", borderRadius: 8, fontSize: 12 }}
                formatter={(v, n) => [Number(v).toFixed(2), n]}
              />
              <ReferenceLine y={0} stroke="#22c55e" strokeDasharray="3 3" label={{ value: "0", fill: "#22c55e", fontSize: 10 }} />
              <ReferenceLine y={3} stroke="#eab308" strokeDasharray="3 3" label={{ value: "3 (과열)", fill: "#eab308", fontSize: 10 }} />
              <ReferenceLine y={7} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "7 (정점)", fill: "#ef4444", fontSize: 10 }} />
              <Line type="monotone" dataKey="mvrvZ" stroke="#7c8aff" strokeWidth={1.5} dot={false} name="MVRV-Z" />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* BTC 현재 시그널 */}
      {btcRow && btcRow.result && (
        <section className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">BTC 현재 시그널</h3>
            <button
              onClick={() => setShowChart(true)}
              className="text-xs px-3 py-1.5 rounded border border-border hover:border-accent hover:text-accent transition"
            >
              가격·RSI·MA 차트 보기
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="가격" value={fmtPrice(btcRow.result.price)} />
            <Stat label="일봉 RSI" value={btcRow.result.rsiDaily.toFixed(1)} />
            <Stat label="주봉 RSI" value={btcRow.result.rsiWeekly.toFixed(1)} />
            <Stat
              label="vs MA200"
              value={fmtPct(btcRow.result.priceVs200)}
              tone={btcRow.result.priceVs200 >= 0 ? "buy" : "sell"}
            />
          </div>
          {btcRow.result.reasons.length > 0 && (
            <p className="text-xs text-muted mt-3">{btcRow.result.reasons.join(" · ")}</p>
          )}
        </section>
      )}

      {/* 알트 시즌 */}
      {macro.altSeason && macro.global && (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold mb-2">알트 시즌 시그널</h3>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold">{(macro.global.btcDominance * 100).toFixed(1)}%</span>
            <span className="text-sm text-muted">BTC dominance</span>
          </div>
          <p className="text-sm mt-2">{macro.altSeason.comment}</p>
        </section>
      )}

      {showChart && <CoinChart base="BTC" onClose={() => setShowChart(false)} />}
    </div>
  );
}

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
  tone?: "buy" | "sell" | "watch";
}) {
  const toneClass =
    tone === "buy" ? "text-buy" : tone === "sell" ? "text-sell" : tone === "watch" ? "text-watch" : "text-text";
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`font-mono ${big ? "text-2xl" : "text-base"} ${toneClass}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted mt-0.5">{hint}</p>}
    </div>
  );
}
