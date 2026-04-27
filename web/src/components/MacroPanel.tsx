import { Activity, Coins, Layers, Wallet } from "lucide-react";
import type { Macro } from "../types";
import { fmtUsd, fmtPct } from "../lib/format";

interface Props {
  macro: Macro;
}

export function MacroPanel({ macro }: Props) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {macro.btc && (
        <Card title="Bitcoin 네트워크" icon={<Coins className="w-4 h-4 text-warn" />}>
          <Stat label="블록" value={macro.btc.blockHeight.toLocaleString()} />
          <Stat label="해시레이트" value={`${macro.btc.hashrate24hEhs.toFixed(0)} EH/s`} />
          <Stat
            label="난이도"
            value={`${macro.btc.difficultyChangePct >= 0 ? "+" : ""}${macro.btc.difficultyChangePct.toFixed(1)}%`}
            tone={macro.btc.difficultyChangePct >= 0 ? "buy" : "sell"}
          />
          <Stat label="수수료" value={`${macro.btc.feesSatPerVb.fastest} sat/vB`} />
          <Stat label="Mempool" value={`${macro.btc.mempoolVsizeMB.toFixed(0)} MB`} />
        </Card>
      )}

      {macro.sol && (
        <Card title="Solana 네트워크" icon={<Activity className="w-4 h-4 text-accent" />}>
          <Stat label="Epoch" value={`${macro.sol.epoch} (${(macro.sol.epochProgress * 100).toFixed(0)}%)`} />
          <Stat label="TPS (5min)" value={macro.sol.tps5min.toFixed(0)} />
          <Stat label="Inflation" value={`${(macro.sol.inflationRate * 100).toFixed(2)}%/yr`} />
          <Stat label="Slot" value={macro.sol.slot.toLocaleString()} />
        </Card>
      )}

      <Card title="체인 TVL" icon={<Layers className="w-4 h-4 text-accent" />}>
        {Object.entries(macro.chains)
          .filter(([, c]) => c)
          .map(([name, c]) => (
            <Stat
              key={name}
              label={name}
              value={fmtUsd(c!.tvl)}
              detail={
                <span className={c!.tvl7dChange >= 0 ? "text-buy" : "text-sell"}>
                  {fmtPct(c!.tvl7dChange)} / 7d
                </span>
              }
            />
          ))}
      </Card>

      {macro.stablecoins && (
        <Card title="Stablecoin Supply" icon={<Wallet className="w-4 h-4 text-buy" />}>
          <Stat label="총 공급" value={fmtUsd(macro.stablecoins.totalUsd)} />
          <Stat
            label="7d"
            value={fmtPct(macro.stablecoins.change7dPct)}
            tone={macro.stablecoins.change7dPct >= 0 ? "buy" : "sell"}
          />
          <Stat
            label="30d"
            value={fmtPct(macro.stablecoins.change30dPct)}
            tone={macro.stablecoins.change30dPct >= 0 ? "buy" : "sell"}
          />
          <p className="text-xs text-muted mt-2">매수 대기 자금 프록시</p>
        </Card>
      )}
    </section>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <header className="flex items-center gap-2 text-sm font-semibold text-text mb-3">
        {icon}
        <span>{title}</span>
      </header>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: React.ReactNode;
  tone?: "buy" | "sell" | "watch";
}) {
  const toneClass =
    tone === "buy" ? "text-buy" : tone === "sell" ? "text-sell" : tone === "watch" ? "text-watch" : "text-text";
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-mono">
        <span className={toneClass}>{value}</span>
        {detail && <span className="text-xs text-muted ml-2">{detail}</span>}
      </span>
    </div>
  );
}
