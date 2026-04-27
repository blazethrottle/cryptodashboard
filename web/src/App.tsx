import { useEffect, useState } from "react";
import { Activity, Clock, RefreshCcw, AlertTriangle, ExternalLink, Bitcoin, Rocket, BarChart3 } from "lucide-react";
import type { SnapshotFile } from "./types";
import { fmtKR } from "./lib/format";
import { MacroPanel } from "./components/MacroPanel";
import { SignalCards } from "./components/SignalCards";
import { AllCoinsTable } from "./components/AllCoinsTable";
import { InstitutionMatrix } from "./components/InstitutionMatrix";
import { BtcTrack } from "./components/BtcTrack";
import { AltTrack } from "./components/AltTrack";

const DATA_URL = `${import.meta.env.BASE_URL}data/snapshot.json`;

type Track = "overview" | "btc" | "alt";

export default function App() {
  const [data, setData] = useState<SnapshotFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [track, setTrack] = useState<Track>("overview");

  const load = () => {
    setLoading(true);
    fetch(`${DATA_URL}?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setData(json);
        setError(null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 lg:px-12 max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text flex items-center gap-2">
            <Activity className="w-7 h-7 text-accent" />
            Crypto Dashboard
          </h1>
          <p className="text-sm text-muted mt-1">
            X-VIP 포트폴리오 + 7개 기관 보유 코인 · BTC 장기 + 알트 멀티배거 hybrid
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          {data && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {fmtKR(data.timestamp)}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border hover:border-accent hover:text-accent transition disabled:opacity-50"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </button>
        </div>
      </header>

      {/* 트랙 토글 */}
      <nav className="flex items-center gap-2 mb-6 border-b border-border pb-3">
        <TrackBtn active={track === "overview"} onClick={() => setTrack("overview")} icon={<BarChart3 className="w-4 h-4" />}>
          Overview
        </TrackBtn>
        <TrackBtn active={track === "btc"} onClick={() => setTrack("btc")} icon={<Bitcoin className="w-4 h-4 text-warn" />}>
          BTC 장기
        </TrackBtn>
        <TrackBtn active={track === "alt"} onClick={() => setTrack("alt")} icon={<Rocket className="w-4 h-4 text-buy" />}>
          알트 멀티배거
        </TrackBtn>
      </nav>

      {error && (
        <div className="rounded-xl border border-sell/40 bg-sell/10 text-sell p-4 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">데이터 불러오기 실패</p>
            <p className="text-xs mt-1 opacity-80">{error}</p>
            <p className="text-xs mt-2 opacity-70">
              GitHub Actions가 30분마다 자동 갱신합니다. Settings → Pages 활성화 후 첫 workflow 실행되면 자동 표시됩니다.
            </p>
          </div>
        </div>
      )}

      {loading && !data && (
        <div className="text-center text-muted py-16">
          <RefreshCcw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50" />
          <p>시그널 데이터 불러오는 중…</p>
        </div>
      )}

      {data && (
        <>
          {track === "overview" && (
            <div className="space-y-6">
              <MacroPanel macro={data.macro} />
              <SignalCards rows={data.rows} />
              <InstitutionMatrix rows={data.rows} />
              <AllCoinsTable rows={data.rows} />
            </div>
          )}
          {track === "btc" && <BtcTrack macro={data.macro} rows={data.rows} />}
          {track === "alt" && <AltTrack macro={data.macro} rows={data.rows} />}
          <Footer data={data} />
        </>
      )}
    </main>
  );
}

function TrackBtn({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition ${
        active
          ? "bg-surface border border-b-transparent border-border text-text"
          : "text-muted hover:text-text"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Footer({ data }: { data: SnapshotFile }) {
  const valid = data.rows.filter((r) => r.result).length;
  const errs = data.rows.filter((r) => r.error).length;
  return (
    <footer className="text-xs text-muted border-t border-border pt-4 mt-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-between">
        <span>
          {valid} 코인 분석 · {errs} 실패 · 60초 자동 새로고침
        </span>
        <span className="flex items-center gap-3">
          <a
            href="https://github.com/blazethrottle/cryptodashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-accent transition"
          >
            GitHub <ExternalLink className="w-3 h-3" />
          </a>
        </span>
      </div>
      <p className="mt-2 opacity-60">
        BTC 장기: 사이클 정점/바닥 회피 (MVRV-Z, 200WMA, 사이클 위치) · 알트: 100~1000% 멀티배거 발굴 (6 체크리스트 + Contrarian)
      </p>
    </footer>
  );
}
