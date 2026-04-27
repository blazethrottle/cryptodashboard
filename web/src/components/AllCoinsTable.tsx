import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import type { Row, SignalLevel } from "../types";
import { fmtPrice, fmtPct, fmtNum, levelColor, levelEmoji } from "../lib/format";

interface Props {
  rows: Row[];
}

const order: Record<SignalLevel, number> = { BUY_STRONG: 0, BUY: 1, WATCH: 2, NEUTRAL: 3, SELL: 4, SELL_STRONG: 5 };

type SortKey = "signal" | "rsiDaily" | "rsiWeekly" | "priceVs200" | "tvl30d" | "score";

export function AllCoinsTable({ rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("signal");
  const [sortDesc, setSortDesc] = useState(false);
  const [filter, setFilter] = useState<"all" | "priority" | "actionable">("priority");

  const valid = rows.filter((r) => r.result);
  const filtered = valid.filter((r) => {
    if (filter === "all") return true;
    if (filter === "priority") return r.coin.priority;
    if (filter === "actionable") return r.result!.level !== "NEUTRAL";
    return true;
  });

  const sorted = filtered.slice().sort((a, b) => {
    const ar = a.result!;
    const br = b.result!;
    let av: number, bv: number;
    switch (sortKey) {
      case "signal":
        av = order[ar.level];
        bv = order[br.level];
        break;
      case "rsiDaily":
        av = ar.rsiDaily;
        bv = br.rsiDaily;
        break;
      case "rsiWeekly":
        av = ar.rsiWeekly;
        bv = br.rsiWeekly;
        break;
      case "priceVs200":
        av = ar.priceVs200;
        bv = br.priceVs200;
        break;
      case "tvl30d":
        av = ar.onchain?.tvl?.tvl30dChange ?? -Infinity;
        bv = br.onchain?.tvl?.tvl30dChange ?? -Infinity;
        break;
      case "score":
        av = ar.score;
        bv = br.score;
        break;
    }
    return sortDesc ? bv - av : av - bv;
  });

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDesc(!sortDesc);
    else {
      setSortKey(k);
      setSortDesc(k === "score" || k === "rsiWeekly");
    }
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <header className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-text">전체 분포</h2>
        <div className="flex gap-1 text-xs">
          {(["actionable", "priority", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 rounded border transition ${
                filter === f
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border text-muted hover:text-text"
              }`}
            >
              {f === "actionable" ? "시그널 발동" : f === "priority" ? "★ Priority" : "전체"}
            </button>
          ))}
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted text-xs uppercase tracking-wider border-b border-border">
              <Th>Coin</Th>
              <Th sort onClick={() => toggleSort("signal")} active={sortKey === "signal"}>
                Signal
              </Th>
              <Th>Price</Th>
              <Th sort onClick={() => toggleSort("rsiDaily")} active={sortKey === "rsiDaily"}>
                D-RSI
              </Th>
              <Th sort onClick={() => toggleSort("rsiWeekly")} active={sortKey === "rsiWeekly"}>
                W-RSI
              </Th>
              <Th sort onClick={() => toggleSort("priceVs200")} active={sortKey === "priceVs200"}>
                vs MA200
              </Th>
              <Th sort onClick={() => toggleSort("tvl30d")} active={sortKey === "tvl30d"}>
                TVL 30d
              </Th>
              <Th>Holders</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.coin.base} className="border-b border-border/50 hover:bg-surface2 transition">
                <td className="py-2.5 pr-3">
                  <div className="flex items-baseline gap-1.5">
                    {r.coin.priority && <span className="text-warn text-xs">★</span>}
                    <span className="font-semibold">{r.coin.base}</span>
                    <span className="text-xs text-muted">{r.coin.name}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-3">
                  <span className={`px-2 py-0.5 text-xs rounded border font-medium ${levelColor(r.result!.level)}`}>
                    {levelEmoji(r.result!.level)} {r.result!.level}
                  </span>
                </td>
                <td className="py-2.5 pr-3 font-mono text-xs">{fmtPrice(r.result!.price)}</td>
                <td className="py-2.5 pr-3 font-mono text-xs">{fmtNum(r.result!.rsiDaily)}</td>
                <td className="py-2.5 pr-3 font-mono text-xs">{fmtNum(r.result!.rsiWeekly)}</td>
                <td
                  className={`py-2.5 pr-3 font-mono text-xs ${
                    r.result!.priceVs200 >= 0 ? "text-buy" : "text-sell"
                  }`}
                >
                  {fmtPct(r.result!.priceVs200)}
                </td>
                <td className="py-2.5 pr-3 font-mono text-xs">
                  {r.result!.onchain?.tvl &&
                  Math.abs(r.result!.onchain.tvl.tvl30dChange) < 0.9 ? (
                    <span
                      className={
                        r.result!.onchain.tvl.tvl30dChange >= 0 ? "text-buy" : "text-sell"
                      }
                    >
                      {fmtPct(r.result!.onchain.tvl.tvl30dChange)}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="py-2.5 text-xs text-muted">
                  {r.holders.length > 0 ? `${r.holders.length} 기관` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length === 0 && <p className="text-center text-muted py-8 text-sm">표시할 코인 없음</p>}
    </section>
  );
}

function Th({
  children,
  sort,
  onClick,
  active,
}: {
  children: React.ReactNode;
  sort?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <th
      onClick={onClick}
      className={`py-2 pr-3 font-medium ${sort ? "cursor-pointer select-none hover:text-text" : ""} ${active ? "text-accent" : ""}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sort && <ArrowUpDown className="w-3 h-3 opacity-50" />}
      </span>
    </th>
  );
}
