import { Building2 } from "lucide-react";
import type { Row, Institution, SignalLevel } from "../types";
import { levelEmoji } from "../lib/format";

interface Props {
  rows: Row[];
}

const INSTITUTIONS: Institution[] = [
  "Grayscale",
  "Bitwise",
  "21Shares",
  "CoinShares",
  "Pantera",
  "Galaxy Digital",
  "Paradigm",
];

export function InstitutionMatrix({ rows }: Props) {
  const valid = rows.filter((r) => r.result);

  // 기관별 시그널 집계
  const stats = INSTITUTIONS.map((inst) => {
    const holdings = valid.filter((r) => r.holders.includes(inst));
    const buys = holdings.filter((r) => r.result!.level === "BUY_STRONG" || r.result!.level === "BUY").length;
    const watches = holdings.filter((r) => r.result!.level === "WATCH").length;
    const sells = holdings.filter((r) => r.result!.level === "SELL_STRONG" || r.result!.level === "SELL").length;
    const avg =
      holdings.length > 0 ? holdings.reduce((s, r) => s + r.result!.score, 0) / holdings.length : 0;
    return { name: inst, total: holdings.length, buys, watches, sells, avg, holdings };
  });

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <header className="flex items-center gap-2 mb-3">
        <Building2 className="w-5 h-5 text-accent" />
        <h2 className="font-semibold text-text">기관 포트폴리오 매트릭스</h2>
        <span className="text-xs text-muted">7개 기관 보유 코인의 시그널 집계</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted text-xs uppercase tracking-wider border-b border-border">
              <th className="py-2 pr-3 font-medium">기관</th>
              <th className="py-2 pr-3 font-medium">보유</th>
              <th className="py-2 pr-3 font-medium text-buy">🟢 매수</th>
              <th className="py-2 pr-3 font-medium text-watch">🔵 워치</th>
              <th className="py-2 pr-3 font-medium text-sell">🟡 매도</th>
              <th className="py-2 pr-3 font-medium">평균 score</th>
              <th className="py-2 font-medium">상위 시그널</th>
            </tr>
          </thead>
          <tbody>
            {stats
              .slice()
              .sort((a, b) => b.avg - a.avg)
              .map((s) => {
                const top = s.holdings
                  .slice()
                  .sort((a, b) => b.result!.score - a.result!.score)
                  .slice(0, 4)
                  .map((r) => `${levelEmoji(r.result!.level)}${r.coin.base}`)
                  .join(" ");
                return (
                  <tr key={s.name} className="border-b border-border/50 hover:bg-surface2 transition">
                    <td className="py-2.5 pr-3 font-semibold">{s.name}</td>
                    <td className="py-2.5 pr-3 text-muted">{s.total}</td>
                    <td className="py-2.5 pr-3 font-mono text-buy">{s.buys}</td>
                    <td className="py-2.5 pr-3 font-mono text-watch">{s.watches}</td>
                    <td className="py-2.5 pr-3 font-mono text-sell">{s.sells}</td>
                    <td
                      className={`py-2.5 pr-3 font-mono text-xs ${
                        s.avg > 0 ? "text-buy" : s.avg < 0 ? "text-sell" : "text-muted"
                      }`}
                    >
                      {s.avg.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-xs text-muted">{top || "—"}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// not used directly but kept for completeness
export type { SignalLevel };
