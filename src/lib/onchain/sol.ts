/**
 * Solana network state — public mainnet RPC.
 * Free, no key. Rate-limited; for heavy use switch to Helius/Triton.
 */

const RPC = "https://api.mainnet-beta.solana.com";

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "crypto-dashboard/0.1" },
    body,
  });
  if (!res.ok) throw new Error(`Solana RPC ${res.status}: ${res.statusText}`);
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(`Solana RPC error: ${json.error.message}`);
  return json.result as T;
}

export interface SolNetworkState {
  slot: number;
  epoch: number;
  epochProgress: number;        // 0..1
  tps5min: number;              // average TPS over recent samples
  inflationRate: number;        // current annual %
  totalStakeSol: number;        // approximate from supply
}

interface EpochInfo {
  absoluteSlot: number;
  blockHeight: number;
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
}

interface PerfSample {
  slot: number;
  numTransactions: number;
  numNonVoteTransactions?: number;
  numSlots: number;
  samplePeriodSecs: number;
}

interface Inflation {
  total: number;
  validator: number;
  foundation: number;
  epoch: number;
}

interface Supply {
  total: number; // lamports
  circulating: number;
  nonCirculating: number;
}

const LAMPORTS_PER_SOL = 1e9;

export async function fetchSolNetwork(): Promise<SolNetworkState> {
  const [epoch, perf, inflation, supplyResp] = await Promise.all([
    rpc<EpochInfo>("getEpochInfo"),
    rpc<PerfSample[]>("getRecentPerformanceSamples", [10]), // last 10 minutes (60s samples)
    rpc<Inflation>("getInflationRate"),
    rpc<{ value: Supply }>("getSupply", [{ commitment: "finalized", excludeNonCirculatingAccountsList: true }]),
  ]);

  // Filter for non-vote TPS (real user transactions) when available
  const useNonVote = perf.some((p) => typeof p.numNonVoteTransactions === "number");
  const totalTx = perf.reduce(
    (s, p) => s + (useNonVote ? (p.numNonVoteTransactions ?? 0) : p.numTransactions),
    0,
  );
  const totalSecs = perf.reduce((s, p) => s + p.samplePeriodSecs, 0);
  const tps = totalSecs > 0 ? totalTx / totalSecs : 0;

  return {
    slot: epoch.absoluteSlot,
    epoch: epoch.epoch,
    epochProgress: epoch.slotIndex / epoch.slotsInEpoch,
    tps5min: tps,
    inflationRate: inflation.total,
    totalStakeSol: supplyResp.value.total / LAMPORTS_PER_SOL,
  };
}
