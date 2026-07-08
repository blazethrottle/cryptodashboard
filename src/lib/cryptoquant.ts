/**
 * CryptoQuant — 유료 온체인 분석 API (Professional $99/mo).
 * 거래소 유출입 · 고래 비율 · 장기보유자(LTH) SOPR · CDD.
 * CRYPTOQUANT_API_KEY 미설정 시 undefined 반환 (선택적 기능, snapshot 파이프라인 안 깨짐).
 *
 * Docs: https://docs.cryptoquant.com/api-reference
 */

const BASE = "https://api.cryptoquant.com/v1";

function apiKey(): string | undefined {
  return process.env.CRYPTOQUANT_API_KEY;
}

interface CqEnvelope<T> {
  status: { code: number; message: string };
  result: { window: string; data: T[] };
}

interface CqPoint {
  date?: string;
  datetime?: string;
}

async function fetchCqSeries<T extends CqPoint>(path: string, params: Record<string, string> = {}): Promise<T[]> {
  const key = apiKey();
  if (!key) throw new Error("CRYPTOQUANT_API_KEY not set");
  const qs = new URLSearchParams({ window: "day", limit: "3", ...params });
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`CryptoQuant ${res.status}: ${res.statusText} (${path})`);
  const body = (await res.json()) as CqEnvelope<T>;
  return body.result.data
    .slice()
    .sort((a, b) => (a.date ?? a.datetime ?? "").localeCompare(b.date ?? b.datetime ?? ""));
}

interface NetflowPoint extends CqPoint {
  netflow_total: number | null;
}
export interface ExchangeNetflow {
  date: string;
  btc: number;
}
export async function fetchExchangeNetflow(exchange = "all_exchange"): Promise<ExchangeNetflow | null> {
  const series = await fetchCqSeries<NetflowPoint>("/btc/exchange-flows/netflow", { exchange });
  const last = series.at(-1);
  if (!last || last.netflow_total == null) return null;
  return { date: (last.date ?? last.datetime)!, btc: last.netflow_total };
}

interface WhaleRatioPoint extends CqPoint {
  exchange_whale_ratio: number | null;
}
export interface ExchangeWhaleRatio {
  date: string;
  ratio: number;
}
export async function fetchExchangeWhaleRatio(exchange = "all_exchange"): Promise<ExchangeWhaleRatio | null> {
  const series = await fetchCqSeries<WhaleRatioPoint>("/btc/flow-indicator/exchange-whale-ratio", { exchange });
  const last = series.at(-1);
  if (!last || last.exchange_whale_ratio == null) return null;
  return { date: (last.date ?? last.datetime)!, ratio: last.exchange_whale_ratio };
}

interface SoprPoint extends CqPoint {
  sopr: number | null;
  sth_sopr: number | null;
  lth_sopr: number | null;
}
export interface SoprSnapshot {
  date: string;
  sopr: number;
  sthSopr: number;
  lthSopr: number;
}
export async function fetchSopr(): Promise<SoprSnapshot | null> {
  const series = await fetchCqSeries<SoprPoint>("/btc/market-indicator/sopr");
  const last = series.at(-1);
  if (!last || last.sopr == null) return null;
  return {
    date: (last.date ?? last.datetime)!,
    sopr: last.sopr,
    sthSopr: last.sth_sopr ?? last.sopr,
    lthSopr: last.lth_sopr ?? last.sopr,
  };
}

interface CddPoint extends CqPoint {
  sa_cdd: number | null;
  average_sa_cdd: number | null;
  binary_cdd: number | null;
}
export interface CddSnapshot {
  date: string;
  saCdd: number;
  aboveAverage: boolean;
}
export async function fetchCdd(): Promise<CddSnapshot | null> {
  const series = await fetchCqSeries<CddPoint>("/btc/network-indicator/cdd");
  const last = series.at(-1);
  if (!last || last.sa_cdd == null) return null;
  return { date: (last.date ?? last.datetime)!, saCdd: last.sa_cdd, aboveAverage: last.binary_cdd === 1 };
}

export interface CryptoQuantSnapshot {
  exchangeNetflow: ExchangeNetflow | null;
  exchangeWhaleRatio: ExchangeWhaleRatio | null;
  sopr: SoprSnapshot | null;
  cdd: CddSnapshot | null;
}

/** API 키 없으면 undefined — 파이프라인은 이 기능 없이도 정상 동작 */
export async function fetchCryptoQuantSnapshot(): Promise<CryptoQuantSnapshot | undefined> {
  if (!apiKey()) return undefined;
  const [netflow, whaleRatio, sopr, cdd] = await Promise.allSettled([
    fetchExchangeNetflow(),
    fetchExchangeWhaleRatio(),
    fetchSopr(),
    fetchCdd(),
  ]);
  return {
    exchangeNetflow: netflow.status === "fulfilled" ? netflow.value : null,
    exchangeWhaleRatio: whaleRatio.status === "fulfilled" ? whaleRatio.value : null,
    sopr: sopr.status === "fulfilled" ? sopr.value : null,
    cdd: cdd.status === "fulfilled" ? cdd.value : null,
  };
}

/** 고래·장기보유자 행동 해석 — 표시 전용, 매매 시그널(signals.ts)에는 미반영 */
export function cryptoQuantReasons(snap: CryptoQuantSnapshot): string[] {
  const reasons: string[] = [];
  if (snap.exchangeWhaleRatio && snap.exchangeWhaleRatio.ratio >= 0.5) {
    reasons.push(
      `거래소 고래 비율 ${snap.exchangeWhaleRatio.ratio.toFixed(2)} (상위 10개 입금이 유입 절반 이상 — 대형 이탈 주시)`,
    );
  }
  if (snap.exchangeNetflow) {
    const dir = snap.exchangeNetflow.btc > 0 ? "유입 (잠재 매도압력)" : "유출 (보유 성향)";
    reasons.push(`거래소 순유입 ${snap.exchangeNetflow.btc.toFixed(0)} BTC — ${dir}`);
  }
  if (snap.sopr && snap.sopr.lthSopr < 1) {
    reasons.push(`LTH-SOPR ${snap.sopr.lthSopr.toFixed(2)} (<1, 장기보유자 손실 실현 — 드문 항복 신호)`);
  }
  if (snap.cdd?.aboveAverage) {
    reasons.push(`CDD 평균 상회 — 오래된 코인 이동 증가 (분산·매도 주시)`);
  }
  return reasons;
}
