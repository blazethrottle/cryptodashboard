/**
 * 시계열 차트 — Recharts AreaChart, 컴팩트.
 * data/timeseries.json 의 단일 metric을 표시.
 */

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { TimeseriesFile } from "../types";

interface Props {
  metric: string;
  title: string;
  height?: number;
  format?: "default" | "usd-short" | "pct" | "number";
  color?: string;
}

const TIMESERIES_URL = `${import.meta.env.BASE_URL}data/timeseries.json`;

let cachedFile: TimeseriesFile | null = null;
let cachedAt = 0;

async function loadFile(): Promise<TimeseriesFile | null> {
  if (cachedFile && Date.now() - cachedAt < 30_000) return cachedFile;
  try {
    const res = await fetch(`${TIMESERIES_URL}?t=${Date.now()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as TimeseriesFile;
    cachedFile = data;
    cachedAt = Date.now();
    return data;
  } catch {
    return null;
  }
}

function formatValue(v: number, fmt: Props["format"]): string {
  if (!Number.isFinite(v)) return "—";
  switch (fmt) {
    case "usd-short":
      if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
      if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
      if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
      return `$${v.toFixed(0)}`;
    case "pct":
      return `${v.toFixed(2)}%`;
    case "number":
      return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
    default:
      return v.toFixed(2);
  }
}

export function TimeseriesChart({ metric, title, height = 100, format = "default", color = "#7c8aff" }: Props) {
  const [data, setData] = useState<{ t: number; v: number }[] | null>(null);
  const [unit, setUnit] = useState<string>("");

  useEffect(() => {
    loadFile().then((file) => {
      if (!file || !file.series[metric]) {
        setData([]);
        return;
      }
      setData(file.series[metric].points);
      setUnit(file.series[metric].unit);
    });
  }, [metric]);

  if (data === null) return <div className="text-xs text-muted py-2">로딩 중…</div>;
  if (data.length === 0) {
    return (
      <div className="text-xs text-muted py-2 italic">
        데이터 누적 중 — 첫 30분 cycle 후 표시됨
      </div>
    );
  }

  const chartData = data.map((p) => ({
    date: new Date(p.t).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
    fullDate: new Date(p.t).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
    value: p.v,
  }));

  const last = chartData.at(-1)!;
  const first = chartData[0];
  const change = ((last.value - first.value) / first.value) * 100;
  const changeColor = change >= 0 ? "text-buy" : "text-sell";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-xs text-muted">{title}</p>
        <div className="text-xs font-mono">
          <span className="text-text">{formatValue(last.value, format)} {unit && unit !== "USD" && unit !== "%" ? unit : ""}</span>
          <span className={`ml-2 ${changeColor}`}>
            {change >= 0 ? "+" : ""}{change.toFixed(1)}%
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#11161e", border: "1px solid #262e3b", borderRadius: 8, fontSize: 11 }}
            formatter={(value: number) => [formatValue(value, format), title]}
            labelFormatter={(label, payload) => {
              const p = payload?.[0]?.payload as { fullDate?: string };
              return p?.fullDate ?? label;
            }}
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#grad-${metric})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
