import { useEffect, useState } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  Legend,
} from "recharts";
import { X } from "lucide-react";
import type { CandleFile } from "../types";
import { rsi, sma } from "../lib/indicators";
import { fmtPrice } from "../lib/format";

interface Props {
  base: string;
  onClose: () => void;
}

const DATA_BASE = `${import.meta.env.BASE_URL}data/candles`;

export function CoinChart({ base, onClose }: Props) {
  const [data, setData] = useState<CandleFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${DATA_BASE}/${base}.json?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`${base} 차트 데이터 없음 (HTTP ${res.status})`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError((err as Error).message));
  }, [base]);

  // ESC 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (error) {
    return (
      <Modal onClose={onClose} title={`${base} 차트`}>
        <p className="text-sm text-muted">{error}</p>
        <p className="text-xs text-muted mt-2">
          이 코인은 priority 또는 시그널 발동 코인이 아니라 차트 데이터가 아직 없습니다. 다음 snapshot 갱신 시 시그널 발동되면 자동 생성됩니다.
        </p>
      </Modal>
    );
  }

  if (!data) {
    return (
      <Modal onClose={onClose} title={`${base} 차트 로딩 중…`}>
        <div className="h-96 animate-pulse bg-surface2 rounded" />
      </Modal>
    );
  }

  const closes = data.candles.map((c) => c.close);
  const rsiSeries = rsi(closes, 14);
  const ma50Series = sma(closes, 50);
  const ma200Series = sma(closes, 200);

  const series = data.candles.map((c, i) => ({
    date: new Date(c.openTime).toISOString().slice(0, 10),
    price: c.close,
    high: c.high,
    low: c.low,
    rsi: Number.isFinite(rsiSeries[i]) ? rsiSeries[i] : null,
    ma50: Number.isFinite(ma50Series[i]) ? ma50Series[i] : null,
    ma200: Number.isFinite(ma200Series[i]) ? ma200Series[i] : null,
  }));

  return (
    <Modal onClose={onClose} title={`${data.name} (${base}) — 1년 차트`}>
      <div className="space-y-4">
        {/* 가격 + MA50 + MA200 */}
        <div>
          <h3 className="text-sm font-semibold text-text mb-2">가격 · MA50 · MA200</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c8aff" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#7c8aff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#6c7686" fontSize={11} tick={{ fill: "#6c7686" }} interval="preserveStartEnd" minTickGap={60} />
              <YAxis stroke="#6c7686" fontSize={11} tick={{ fill: "#6c7686" }} domain={["auto", "auto"]} tickFormatter={(v) => fmtPrice(v as number)} />
              <Tooltip
                contentStyle={{ background: "#11161e", border: "1px solid #262e3b", borderRadius: 8, fontSize: 12 }}
                formatter={(value, name) => [fmtPrice(Number(value)), name]}
                labelStyle={{ color: "#d8dde6" }}
              />
              <Area type="monotone" dataKey="price" stroke="#7c8aff" fill="url(#priceGradient)" strokeWidth={2} name="가격" />
              <Line type="monotone" dataKey="ma50" stroke="#22c55e" strokeWidth={1} dot={false} name="MA50" />
              <Line type="monotone" dataKey="ma200" stroke="#eab308" strokeWidth={1.5} dot={false} name="MA200" />
              <Legend wrapperStyle={{ fontSize: 11, color: "#6c7686" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* RSI */}
        <div>
          <h3 className="text-sm font-semibold text-text mb-2">RSI(14)</h3>
          <ResponsiveContainer width="100%" height={140}>
            <ComposedChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" stroke="#6c7686" fontSize={11} tick={{ fill: "#6c7686" }} interval="preserveStartEnd" minTickGap={60} />
              <YAxis stroke="#6c7686" fontSize={11} tick={{ fill: "#6c7686" }} domain={[0, 100]} ticks={[0, 30, 50, 70, 100]} />
              <Tooltip
                contentStyle={{ background: "#11161e", border: "1px solid #262e3b", borderRadius: 8, fontSize: 12 }}
                formatter={(value) => [Number(value).toFixed(1), "RSI"]}
              />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "70 (과매수)", fill: "#ef4444", fontSize: 10, position: "right" }} />
              <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" label={{ value: "30 (과매도)", fill: "#22c55e", fontSize: 10, position: "right" }} />
              <Line type="monotone" dataKey="rsi" stroke="#7c8aff" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-muted">
          최근 365일 일봉 (Binance 또는 CoinGecko fallback). 매수 기준: RSI ≤30 또는 200일선 위 + 상향. 매도 기준: RSI ≥70 또는 200일선 하향 돌파.
        </p>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-text transition" aria-label="닫기">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
