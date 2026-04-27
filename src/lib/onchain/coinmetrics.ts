/**
 * CoinMetrics Community API — 무료, 키 불필요.
 * BTC MVRV-Z 자체 계산용 (Glassnode Advanced 무료 대안 ~90% 일치).
 *
 * Docs: https://docs.coinmetrics.io/api/v4
 * Community assets: BTC, ETH, SOL, XRP 등 주요 코인 일부 metric 무료
 */

const BASE = "https://community-api.coinmetrics.io/v4";

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": "crypto-dashboard/0.1" } });
  if (!res.ok) throw new Error(`CoinMetrics ${res.status}: ${res.statusText}`);
  return res.json();
}

interface AssetMetric {
  asset: string;
  time: string;
  [k: string]: string;
}

interface AssetMetricsResp {
  data: AssetMetric[];
  next_page_token?: string;
}

/**
 * BTC 일별 metric 시계열 가져오기.
 * 사용 metric:
 *   - CapMrktCurUSD     — Current Market Cap USD
 *   - CapRealUSD        — Realized Cap USD
 *   - PriceUSD          — BTC price
 */
export async function fetchBtcMetrics(days = 365): Promise<{
  date: string;
  marketCap: number;
  realizedCap: number;
  price: number;
}[]> {
  const now = new Date();
  const start = new Date(now.getTime() - days * 86400 * 1000);
  const startStr = start.toISOString().slice(0, 10);
  const url = `${BASE}/timeseries/asset-metrics?assets=btc&metrics=CapMrktCurUSD,CapRealUSD,PriceUSD&frequency=1d&start_time=${startStr}&page_size=10000`;

  const raw = (await fetchJSON(url)) as AssetMetricsResp;
  return raw.data.map((d) => ({
    date: d.time.slice(0, 10),
    marketCap: parseFloat(d.CapMrktCurUSD),
    realizedCap: parseFloat(d.CapRealUSD),
    price: parseFloat(d.PriceUSD),
  }));
}

/**
 * MVRV ratio = Market Cap / Realized Cap.
 * MVRV-Z = (Market Cap - Realized Cap) / std(Market Cap).
 *
 * 해석:
 *  - MVRV-Z > 7  : 사이클 정점 신호 (역사적 매도)
 *  - MVRV-Z > 3  : 과열
 *  - MVRV-Z < 0  : 사이클 바닥 신호 (역사적 매수)
 *  - MVRV-Z < -1 : 극단 저평가
 */
export interface MvrvZ {
  date: string;
  mvrv: number;
  mvrvZ: number;
  price: number;
}

export function computeMvrvZ(series: { date: string; marketCap: number; realizedCap: number; price: number }[]): MvrvZ[] {
  if (series.length === 0) return [];
  // std deviation of marketCap (rolling 전체 — 단순 구현. 정식은 4년 rolling)
  const mcs = series.map((d) => d.marketCap).filter((n) => Number.isFinite(n));
  const mean = mcs.reduce((s, x) => s + x, 0) / mcs.length;
  const variance = mcs.reduce((s, x) => s + (x - mean) ** 2, 0) / mcs.length;
  const std = Math.sqrt(variance);

  return series.map((d) => ({
    date: d.date,
    mvrv: d.realizedCap > 0 ? d.marketCap / d.realizedCap : 0,
    mvrvZ: std > 0 ? (d.marketCap - d.realizedCap) / std : 0,
    price: d.price,
  }));
}

export interface BtcCycleSnapshot {
  current: MvrvZ;
  yesterday?: MvrvZ;
  weekAgo?: MvrvZ;
  monthAgo?: MvrvZ;
  series365d: MvrvZ[];   // for chart
  cycleState: "cycle-bottom" | "accumulation" | "growth" | "euphoria" | "cycle-top";
}

export async function fetchBtcCycle(days = 365): Promise<BtcCycleSnapshot> {
  const series = await fetchBtcMetrics(days);
  const z = computeMvrvZ(series);
  const sorted = z.sort((a, b) => a.date.localeCompare(b.date));
  const current = sorted.at(-1)!;
  const yesterday = sorted.at(-2);
  const weekAgo = sorted.at(-8);
  const monthAgo = sorted.at(-31);

  let cycleState: BtcCycleSnapshot["cycleState"];
  if (current.mvrvZ >= 7) cycleState = "cycle-top";
  else if (current.mvrvZ >= 3) cycleState = "euphoria";
  else if (current.mvrvZ >= 1) cycleState = "growth";
  else if (current.mvrvZ >= 0) cycleState = "accumulation";
  else cycleState = "cycle-bottom";

  return { current, yesterday, weekAgo, monthAgo, series365d: sorted, cycleState };
}

/** BTC 사이클 시그널 점수 — Track 1 (장기 보유) 핵심 */
export function btcCycleScore(snap: BtcCycleSnapshot): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const z = snap.current.mvrvZ;
  const mvrv = snap.current.mvrv;

  if (z <= -1) {
    reasons.push(`MVRV-Z ${z.toFixed(2)} (역사적 바닥 — 강한 매수)`);
    score += 4;
  } else if (z <= 0) {
    reasons.push(`MVRV-Z ${z.toFixed(2)} (사이클 바닥)`);
    score += 2;
  } else if (z >= 7) {
    reasons.push(`MVRV-Z ${z.toFixed(2)} (사이클 정점 — 강한 매도)`);
    score -= 4;
  } else if (z >= 3) {
    reasons.push(`MVRV-Z ${z.toFixed(2)} (과열)`);
    score -= 2;
  }

  if (mvrv < 1) {
    reasons.push(`MVRV ${mvrv.toFixed(2)} (실현가 < 시가 — 미실현 손실 보유자 우세)`);
  } else if (mvrv > 3.7) {
    reasons.push(`MVRV ${mvrv.toFixed(2)} (역사적 정점 영역)`);
  }

  return { score, reasons };
}
