/**
 * BTC network state — mempool.space (free, no key).
 * Docs: https://mempool.space/docs/api
 */

const BASE = "https://mempool.space/api";

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": "crypto-dashboard/0.1" } });
  if (!res.ok) throw new Error(`mempool.space ${res.status}: ${res.statusText} (${url})`);
  return res.json();
}

export interface BtcNetworkState {
  blockHeight: number;
  feesSatPerVb: { fastest: number; halfHour: number; hour: number; minimum: number };
  hashrate24hEhs: number;       // Exahashes/sec
  difficulty: number;
  difficultyChangePct: number;
  mempoolCount: number;
  mempoolVsizeMB: number;
}

interface FeeEstimate {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

interface HashrateResp {
  currentHashrate: number;       // hashes / sec
  currentDifficulty: number;
}

interface DifficultyAdj {
  difficultyChange: number;
}

interface MempoolStat {
  count: number;
  vsize: number;
  total_fee: number;
}

export async function fetchBtcNetwork(): Promise<BtcNetworkState> {
  const [height, fees, hashrate, diffAdj, mempool] = await Promise.all([
    fetchJSON(`${BASE}/blocks/tip/height`),
    fetchJSON(`${BASE}/v1/fees/recommended`),
    fetchJSON(`${BASE}/v1/mining/hashrate/24h`),
    fetchJSON(`${BASE}/v1/difficulty-adjustment`),
    fetchJSON(`${BASE}/mempool`),
  ]);

  const f = fees as FeeEstimate;
  const h = hashrate as HashrateResp;
  const d = diffAdj as DifficultyAdj;
  const m = mempool as MempoolStat;

  return {
    blockHeight: Number(height),
    feesSatPerVb: {
      fastest: f.fastestFee,
      halfHour: f.halfHourFee,
      hour: f.hourFee,
      minimum: f.minimumFee,
    },
    hashrate24hEhs: h.currentHashrate / 1e18,
    difficulty: h.currentDifficulty,
    difficultyChangePct: d.difficultyChange,
    mempoolCount: m.count,
    mempoolVsizeMB: m.vsize / (1024 * 1024),
  };
}
