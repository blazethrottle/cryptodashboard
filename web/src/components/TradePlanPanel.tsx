import { useEffect, useState } from "react";
import { Target, AlertTriangle, TrendingUp, ChevronDown, ChevronRight } from "lucide-react";
import type { PlansFile, TradePlanEvaluation } from "../types";
import { fmtPrice, fmtPct, fmtKR } from "../lib/format";

const PLANS_URL = `${import.meta.env.BASE_URL}data/plans.json`;

export function TradePlanPanel() {
  const [data, setData] = useState<PlansFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`${PLANS_URL}?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError((err as Error).message));
    const id = setInterval(() => {
      fetch(`${PLANS_URL}?t=${Date.now()}`)
        .then((res) => res.ok && res.json())
        .then((d) => d && setData(d))
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  if (error) {
    return (
      <section className="rounded-xl border border-border bg-surface p-5">
        <header className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-accent" />
          <h2 className="font-semibold">Trade Plans</h2>
        </header>
        <p className="text-sm text-muted">
          plans.json 없음 — `npm run snapshot` 실행 후 자동 생성됩니다.
        </p>
      </section>
    );
  }

  if (!data) return null;

  if (data.evaluations.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-surface p-5">
        <header className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-accent" />
          <h2 className="font-semibold">Trade Plans</h2>
        </header>
        <div className="text-center py-6 text-muted">
          <p className="text-sm mb-2">활성 plan 없음.</p>
          <p className="text-xs font-mono bg-bg/60 px-3 py-2 rounded inline-block text-left">
            npm run plan add BTC --entry=77000 --size=3000 \<br />
            &nbsp;&nbsp;--stop=70000 --target=120000,170000 \<br />
            &nbsp;&nbsp;--rationale="..." --horizon=long --narrative="..."
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <header className="flex items-baseline justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-accent" />
          <h2 className="font-semibold">Trade Plans ({data.evaluations.length})</h2>
        </div>
        <span className="text-xs text-muted">갱신 {fmtKR(data.timestamp)}</span>
      </header>
      <ul className="space-y-3">
        {data.evaluations.map((e) => (
          <PlanCard
            key={e.plan.id}
            evaluation={e}
            expanded={expanded.has(e.plan.id)}
            onToggle={() => {
              const ne = new Set(expanded);
              if (ne.has(e.plan.id)) ne.delete(e.plan.id);
              else ne.add(e.plan.id);
              setExpanded(ne);
            }}
          />
        ))}
      </ul>
    </section>
  );
}

function PlanCard({
  evaluation,
  expanded,
  onToggle,
}: {
  evaluation: TradePlanEvaluation;
  expanded: boolean;
  onToggle: () => void;
}) {
  const e = evaluation;
  const p = e.plan;
  const pnlColor = e.pnlPct >= 0 ? "text-buy" : "text-sell";
  const triggered = e.triggers.length > 0;

  // 진행률 게이지 — 진입가 기준 손절 ~ 첫 익절 사이에서 현재 위치
  const stopPrice = p.stopLoss.price;
  const firstTp = p.takeProfit.find((t) => !t.triggered)?.price ?? p.takeProfit[0]?.price ?? p.entry.actualPrice;
  const range = firstTp - stopPrice;
  const positionFromStop = e.currentPrice - stopPrice;
  const progressPct = range > 0 ? Math.max(0, Math.min(100, (positionFromStop / range) * 100)) : 50;

  return (
    <li className={`rounded-lg border p-3 transition ${triggered ? "border-warn bg-warn/5" : "border-border bg-bg/40"}`}>
      <button onClick={onToggle} className="w-full flex items-baseline justify-between gap-2 text-left">
        <div className="flex items-baseline gap-2">
          {expanded ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
          <span className="font-semibold">{p.coin}</span>
          <span className="text-xs text-muted">{p.thesis.timeHorizon}</span>
          {triggered && (
            <span className="ml-2 text-xs text-warn flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              트리거 도달 {e.triggers.length}
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="font-mono text-sm">{fmtPrice(e.currentPrice)}</span>
          <span className={`ml-2 font-mono text-sm ${pnlColor}`}>{fmtPct(e.pnlPct)}</span>
        </div>
      </button>

      {/* 진행률 바 — 손절 ←——● 현재가 ——→ 첫 익절 */}
      <div className="mt-2.5">
        <div className="relative h-2 bg-surface2 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-gradient-to-r from-sell via-warn to-buy"
            style={{ width: `${progressPct}%` }}
          />
          {/* 진입가 마커 */}
          {p.entry.actualPrice > stopPrice && p.entry.actualPrice < firstTp && (
            <div
              className="absolute top-0 h-2 w-0.5 bg-text"
              style={{ left: `${((p.entry.actualPrice - stopPrice) / range) * 100}%` }}
              title={`진입 ${fmtPrice(p.entry.actualPrice)}`}
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-muted mt-1 font-mono">
          <span className="text-sell">손절 {fmtPrice(stopPrice)}</span>
          <span className="text-text">진입 {fmtPrice(p.entry.actualPrice)}</span>
          <span className="text-buy">목표 {fmtPrice(firstTp)}</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Field label="진입" value={fmtPrice(p.entry.actualPrice)} hint={fmtKR(p.entry.enteredAt)} />
            <Field label="크기" value={`${fmtPrice(p.entry.sizeUsd)}`} hint={`${p.entry.sizeCoin.toFixed(6)} ${p.coin}`} />
            <Field label="손절" value={fmtPrice(p.stopLoss.price)} hint={fmtPct((p.stopLoss.price - p.entry.actualPrice) / p.entry.actualPrice)} />
            <Field
              label="PnL"
              value={`${e.pnlUsd >= 0 ? "+" : ""}${fmtPrice(e.pnlUsd)}`}
              hint={fmtPct(e.pnlPct)}
              tone={e.pnlPct >= 0 ? "buy" : "sell"}
            />
          </div>

          <div>
            <p className="font-semibold text-muted mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              익절 분할
            </p>
            <ul className="space-y-1 ml-4">
              {p.takeProfit.map((tp, i) => (
                <li key={i} className="flex items-baseline justify-between font-mono">
                  <span>
                    {tp.triggered ? "✓" : "○"} TP{i + 1} {fmtPrice(tp.price)} ({fmtPct((tp.price - p.entry.actualPrice) / p.entry.actualPrice)})
                  </span>
                  <span className="text-muted">× {(tp.fraction * 100).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          </div>

          {p.entry.rationale && (
            <p className="text-muted">
              <span className="text-text font-semibold">진입 사유:</span> {p.entry.rationale}
            </p>
          )}
          <p className="text-muted">
            <span className="text-text font-semibold">Thesis:</span> {p.thesis.narrative}
          </p>

          {e.triggers.length > 0 && (
            <div className="rounded border border-warn/40 bg-warn/10 p-2 mt-2">
              <p className="font-semibold text-warn mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                즉시 실행 필요
              </p>
              {e.triggers.map((t, i) => (
                <p key={i} className="text-xs">
                  {t.type === "stopLoss" ? "🚨 손절" : "🎯 익절"} {fmtPrice(t.price)} 도달 — × {(t.fraction * 100).toFixed(0)}% 청산
                </p>
              ))}
              <p className="text-[11px] text-muted mt-1 font-mono">
                npm run plan close {p.id} --price=&lt;실제&gt;
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Field({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "buy" | "sell";
}) {
  const toneClass = tone === "buy" ? "text-buy" : tone === "sell" ? "text-sell" : "text-text";
  return (
    <div>
      <p className="text-[10px] text-muted">{label}</p>
      <p className={`font-mono ${toneClass}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted mt-0.5">{hint}</p>}
    </div>
  );
}
