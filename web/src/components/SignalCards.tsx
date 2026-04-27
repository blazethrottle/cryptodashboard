import { TrendingUp, TrendingDown, Eye, ArrowRight } from "lucide-react";
import type { Row } from "../types";
import { fmtPrice, fmtPct, fmtNum, levelColor } from "../lib/format";

interface Props {
  rows: Row[];
}

export function SignalCards({ rows }: Props) {
  const valid = rows.filter((r) => r.result);
  const buys = valid.filter((r) => r.result!.level === "BUY_STRONG" || r.result!.level === "BUY");
  const watches = valid.filter((r) => r.result!.level === "WATCH");
  const sells = valid.filter((r) => r.result!.level === "SELL_STRONG" || r.result!.level === "SELL");

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Group title="매수 후보" icon={<TrendingUp className="w-5 h-5" />} tone="buy" rows={buys} emptyText="시그널 없음" />
      <Group title="워치" icon={<Eye className="w-5 h-5" />} tone="watch" rows={watches} emptyText="없음" />
      <Group title="매도 후보" icon={<TrendingDown className="w-5 h-5" />} tone="sell" rows={sells} emptyText="시그널 없음" />
    </section>
  );
}

function Group({
  title,
  icon,
  tone,
  rows,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "buy" | "sell" | "watch";
  rows: Row[];
  emptyText: string;
}) {
  const toneClass =
    tone === "buy" ? "text-buy" : tone === "sell" ? "text-sell" : "text-watch";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <header className={`flex items-center gap-2 mb-3 ${toneClass}`}>
        {icon}
        <h2 className="font-semibold">
          {title} <span className="text-muted text-sm font-normal">({rows.length})</span>
        </h2>
      </header>
      {rows.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <SignalRow key={r.coin.base} row={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SignalRow({ row }: { row: Row }) {
  const r = row.result!;
  const tvl30 = r.onchain?.tvl?.tvl30dChange;
  return (
    <li className={`rounded-lg border px-3 py-2.5 transition hover:bg-surface2 ${levelColor(r.level)}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          {row.coin.priority && <span className="text-warn text-xs">★</span>}
          <span className="font-semibold text-base">{row.coin.base}</span>
          <span className="text-xs text-muted">{row.coin.name}</span>
        </div>
        <span className="text-xs font-mono text-muted">{fmtPrice(r.price)}</span>
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-xs font-mono text-muted">
        <span>D-RSI <span className="text-text">{fmtNum(r.rsiDaily)}</span></span>
        <span>·</span>
        <span>W-RSI <span className="text-text">{fmtNum(r.rsiWeekly)}</span></span>
        <span>·</span>
        <span>vs MA200 <span className={r.priceVs200 >= 0 ? "text-buy" : "text-sell"}>{fmtPct(r.priceVs200)}</span></span>
        {tvl30 != null && Math.abs(tvl30) < 0.9 && (
          <>
            <span>·</span>
            <span>TVL30d <span className={tvl30 >= 0 ? "text-buy" : "text-sell"}>{fmtPct(tvl30)}</span></span>
          </>
        )}
      </div>
      {r.reasons.length > 0 && (
        <p className="mt-1.5 text-[11px] text-muted leading-relaxed flex items-start gap-1">
          <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{r.reasons.slice(0, 3).join(" · ")}</span>
        </p>
      )}
      {row.holders.length > 0 && (
        <p className="mt-1 text-[10px] text-muted/70">
          기관: {row.holders.join(", ")}
        </p>
      )}
    </li>
  );
}
