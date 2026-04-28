import { useState } from "react";
import { Building2, Award, ChevronDown, ChevronRight, Eye, Zap } from "lucide-react";
import type { Row, Institution } from "../types";
import { fmtPrice, fmtPct, fmtNum, levelEmoji, levelColor } from "../lib/format";

interface Props {
  rows: Row[];
}

const INSTITUTIONS: Array<{
  name: Institution;
  fullName: string;
  category: string;
  description: string;
  url: string;
}> = [
  {
    name: "Grayscale",
    fullName: "Grayscale Investments",
    category: "기관 운용사 (44개+ 보유)",
    description: "최대 디지털 자산 운용사. ETF·신탁 기반. 신규 편입에 시장 반응 큼.",
    url: "https://www.grayscale.com/funds",
  },
  {
    name: "Bitwise",
    fullName: "Bitwise Asset Management",
    category: "지수형 펀드 (10개)",
    description: "Top 10 Crypto Index. 우량 자산 위주.",
    url: "https://bitwiseinvestments.com/",
  },
  {
    name: "21Shares",
    fullName: "21Shares",
    category: "ETP 발행사 (5개)",
    description: "유럽 대표 크립토 ETP. 메이저 5개 보수적 운용.",
    url: "https://21shares.com/",
  },
  {
    name: "CoinShares",
    fullName: "CoinShares",
    category: "유럽 운용사 (16개)",
    description: "Weekly Fund Flow 리포트로 시장 자금 흐름의 핵심 지표.",
    url: "https://coinshares.com/",
  },
  {
    name: "Pantera",
    fullName: "Pantera Capital",
    category: "VC + 트레이딩 (12개)",
    description: "초기 BTC 투자 + 알트 적극. 펀드 vs 액티브 투자 양면.",
    url: "https://panteracapital.com/",
  },
  {
    name: "Galaxy Digital",
    fullName: "Galaxy Digital",
    category: "다이버시파이드 (7개)",
    description: "Mike Novogratz. AI·Mining·Trading 멀티 비즈니스.",
    url: "https://galaxy.com/",
  },
  {
    name: "Paradigm",
    fullName: "Paradigm",
    category: "토픽 VC (4개)",
    description: "초기 단계 + 인프라 집중. ETH 중심.",
    url: "https://www.paradigm.xyz/",
  },
];

export function InstitutionsSection({ rows }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["Grayscale"]));

  const valid = rows.filter((r) => r.result);

  const toggle = (name: string) => {
    const ne = new Set(expanded);
    if (ne.has(name)) ne.delete(name);
    else ne.add(name);
    setExpanded(ne);
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-accent" />
          Institutions — 7개 기관 포트폴리오
        </h2>
        <p className="text-sm text-muted mt-1">
          공개된 보유 코인 + 시그널 분포 + X-VIP 비교. 클릭하면 펼침.
        </p>
      </header>

      {/* 빠른 비교 표 — 한눈에 */}
      <section className="rounded-xl border border-border bg-surface p-4 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-muted text-xs uppercase tracking-wider border-b border-border">
              <th className="py-2 pr-3 text-left font-medium">기관</th>
              <th className="py-2 pr-3 font-medium">보유</th>
              <th className="py-2 pr-3 font-medium text-buy">🟢 BUY</th>
              <th className="py-2 pr-3 font-medium text-watch">🔵 WATCH</th>
              <th className="py-2 pr-3 font-medium text-sell">🟡 SELL</th>
              <th className="py-2 pr-3 font-medium">avg score</th>
              <th className="py-2 font-medium text-left">상위 시그널</th>
            </tr>
          </thead>
          <tbody>
            {INSTITUTIONS.map((inst) => {
              const stat = computeStats(inst.name, valid);
              return (
                <tr
                  key={inst.name}
                  className={`border-b border-border/50 hover:bg-surface2 cursor-pointer transition ${expanded.has(inst.name) ? "bg-surface2/40" : ""}`}
                  onClick={() => toggle(inst.name)}
                >
                  <td className="py-2.5 pr-3 font-semibold">{inst.name}</td>
                  <td className="py-2.5 pr-3 text-muted text-center">{stat.totalHoldings}</td>
                  <td className="py-2.5 pr-3 text-buy text-center font-mono">{stat.buyCount}</td>
                  <td className="py-2.5 pr-3 text-watch text-center font-mono">{stat.watchCount}</td>
                  <td className="py-2.5 pr-3 text-sell text-center font-mono">{stat.sellCount}</td>
                  <td className={`py-2.5 pr-3 text-center font-mono text-xs ${stat.averageScore > 0 ? "text-buy" : stat.averageScore < 0 ? "text-sell" : "text-muted"}`}>
                    {stat.averageScore.toFixed(2)}
                  </td>
                  <td className="py-2.5 text-xs text-muted">{stat.topSignals.slice(0, 4).join(" · ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* 기관별 상세 카드 (확장 가능) */}
      <section className="space-y-3">
        {INSTITUTIONS.map((inst) => (
          <InstitutionCard
            key={inst.name}
            meta={inst}
            rows={valid}
            expanded={expanded.has(inst.name)}
            onToggle={() => toggle(inst.name)}
          />
        ))}
      </section>

      {/* X-VIP vs 기관 매트릭스 */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Award className="w-5 h-5 text-warn" />
          X-VIP vs 기관 매트릭스
        </h3>
        <CrossMatrix rows={valid} />
      </section>
    </div>
  );
}

interface Stat {
  totalHoldings: number;
  buyCount: number;
  watchCount: number;
  sellCount: number;
  averageScore: number;
  topSignals: string[];
  holdings: Row[];
}

function computeStats(institution: Institution, valid: Row[]): Stat {
  const holdings = valid.filter((r) => r.holders.includes(institution));
  const buyCount = holdings.filter((r) => r.result!.level === "BUY_STRONG" || r.result!.level === "BUY").length;
  const watchCount = holdings.filter((r) => r.result!.level === "WATCH").length;
  const sellCount = holdings.filter((r) => r.result!.level === "SELL_STRONG" || r.result!.level === "SELL").length;
  const totalScore = holdings.reduce((s, r) => s + (r.result?.score ?? 0), 0);
  const averageScore = holdings.length > 0 ? totalScore / holdings.length : 0;
  const topSignals = holdings
    .slice()
    .sort((a, b) => Math.abs(b.result!.score) - Math.abs(a.result!.score))
    .slice(0, 6)
    .map((r) => `${levelEmoji(r.result!.level)}${r.coin.base}`);
  return { totalHoldings: holdings.length, buyCount, watchCount, sellCount, averageScore, topSignals, holdings };
}

function InstitutionCard({
  meta,
  rows,
  expanded,
  onToggle,
}: {
  meta: typeof INSTITUTIONS[number];
  rows: Row[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const stat = computeStats(meta.name, rows);
  return (
    <article className="rounded-xl border border-border bg-surface overflow-hidden">
      <button onClick={onToggle} className="w-full p-4 flex items-baseline justify-between hover:bg-surface2 transition text-left">
        <div className="flex items-baseline gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-muted shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted shrink-0" />}
          <div>
            <h3 className="font-semibold text-text">{meta.fullName}</h3>
            <p className="text-xs text-muted mt-0.5">{meta.category} · {meta.description}</p>
          </div>
        </div>
        <div className="flex items-baseline gap-3 text-xs font-mono">
          <span className="text-buy">B{stat.buyCount}</span>
          <span className="text-watch">W{stat.watchCount}</span>
          <span className="text-sell">S{stat.sellCount}</span>
          <span className={stat.averageScore > 0 ? "text-buy" : "text-sell"}>{stat.averageScore.toFixed(2)}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          <div className="text-xs text-muted">
            <a href={meta.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent underline-offset-2 hover:underline">
              공식 → {meta.url}
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[480px]">
              <thead>
                <tr className="text-muted border-b border-border/50">
                  <th className="py-2 pr-3 text-left font-medium">코인</th>
                  <th className="py-2 pr-3 font-medium">시그널</th>
                  <th className="py-2 pr-3 font-medium">가격</th>
                  <th className="py-2 pr-3 font-medium">D-RSI</th>
                  <th className="py-2 pr-3 font-medium">W-RSI</th>
                  <th className="py-2 font-medium">vs MA200</th>
                </tr>
              </thead>
              <tbody>
                {stat.holdings
                  .slice()
                  .sort((a, b) => (b.result?.score ?? 0) - (a.result?.score ?? 0))
                  .map((r) => (
                    <tr key={r.coin.base} className="border-b border-border/30 hover:bg-bg/40">
                      <td className="py-1.5 pr-3 font-mono">
                        <span className="font-semibold">{r.coin.base}</span>
                        <span className="text-muted ml-1.5">{r.coin.name}</span>
                      </td>
                      <td className={`py-1.5 pr-3 ${levelColor(r.result!.level)} text-center rounded text-[11px]`}>
                        {levelEmoji(r.result!.level)} {r.result!.level}
                      </td>
                      <td className="py-1.5 pr-3 font-mono">{fmtPrice(r.result!.price)}</td>
                      <td className="py-1.5 pr-3 font-mono">{fmtNum(r.result!.rsiDaily)}</td>
                      <td className="py-1.5 pr-3 font-mono">{fmtNum(r.result!.rsiWeekly)}</td>
                      <td className={`py-1.5 font-mono ${r.result!.priceVs200 >= 0 ? "text-buy" : "text-sell"}`}>
                        {fmtPct(r.result!.priceVs200)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </article>
  );
}

function CrossMatrix({ rows }: { rows: Row[] }) {
  // 보유 기관 수 카운트
  const holderCount = new Map<string, number>();
  for (const r of rows) {
    if (r.holders.length > 0) holderCount.set(r.coin.base, r.holders.length);
  }
  const consensus: Row[] = [];
  const xvipPriorityNoInst: Row[] = [];
  const multiInst: Row[] = [];
  for (const r of rows) {
    const cnt = holderCount.get(r.coin.base) ?? 0;
    if (cnt >= 7) consensus.push(r);
    else if (r.coin.priority && cnt === 0) xvipPriorityNoInst.push(r);
    else if (cnt >= 3) multiInst.push(r);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
      <div>
        <h4 className="font-semibold text-buy flex items-center gap-1.5 mb-2">
          <Award className="w-4 h-4" /> Consensus (7개 모두)
        </h4>
        {consensus.length === 0 ? (
          <p className="text-xs text-muted">없음</p>
        ) : (
          <ul className="text-xs space-y-1">
            {consensus.map((r) => (
              <li key={r.coin.base} className="font-mono">
                {levelEmoji(r.result!.level)} <span className="font-semibold">{r.coin.base}</span> {r.coin.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h4 className="font-semibold text-watch flex items-center gap-1.5 mb-2">
          <Zap className="w-4 h-4" /> 다수 기관 (3+)
        </h4>
        <ul className="text-xs space-y-1">
          {multiInst.slice(0, 12).map((r) => (
            <li key={r.coin.base} className="font-mono flex items-baseline gap-1.5">
              <span>{levelEmoji(r.result!.level)}</span>
              <span className="font-semibold">{r.coin.base}</span>
              <span className="text-muted">({holderCount.get(r.coin.base)}개)</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-warn flex items-center gap-1.5 mb-2">
          <Eye className="w-4 h-4" /> X-VIP 단독 (기관 0)
        </h4>
        <ul className="text-xs space-y-1">
          {xvipPriorityNoInst.slice(0, 12).map((r) => (
            <li key={r.coin.base} className="font-mono">
              ★ <span className="font-semibold">{r.coin.base}</span> {r.coin.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
