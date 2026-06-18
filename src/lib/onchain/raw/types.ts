/**
 * BTC 원장 원천 접근 — 백엔드 교체 가능(pluggable) 계약.
 *
 * 설계 문서: docs/btc-onchain-raw-source-design.md §5
 *
 * 구현체 (Phase별):
 *   - Phase 1: BigQuerySource  (bigquery-public-data.crypto_bitcoin)
 *   - Phase 3: BitcoindRpcSource (자체 풀노드 RPC)
 *
 * 인덱서/지표 계산 코드는 이 인터페이스만 알고, 백엔드를 모른다.
 */

/** 블록 높이 구간 [fromHeight, toHeight] — 양 끝 포함 */
export interface BlockRange {
  fromHeight: number;
  toHeight: number;
}

/**
 * 생성된 트랜잭션 출력 (UTXO 후보).
 * Realized Cap 계산의 원자 단위: value × price(생성 시점).
 */
export interface RawOutput {
  txid: string;
  vout: number;
  /** satoshi (최대 ~2.1e15 < 2^53 — number 안전) */
  valueSat: number;
  /** 생성 블록 높이 */
  height: number;
  /** 생성 블록 타임 (unix sec) */
  blockTime: number;
}

/**
 * 소비(spend) 이벤트 — SOPR 계산용.
 * "이 출력이 언제 만들어졌고(취득가), 언제 쓰였는가(실현가)"를 한 행으로.
 */
export interface RawSpend {
  /** 소비된 출력의 원 좌표 */
  spentTxid: string;
  spentVout: number;
  /** satoshi */
  valueSat: number;
  /** 원 출력 생성 시점 */
  createdHeight: number;
  createdBlockTime: number;
  /** 소비 시점 */
  spentHeight: number;
  spentBlockTime: number;
}

/**
 * 원천 백엔드 계약.
 *
 * stream* 메서드는 AsyncIterable — BigQuery는 페이지네이션 결과를,
 * bitcoind는 블록 walk 결과를 흘려보낸다. 인덱서는 동일하게 소비.
 */
export interface RawChainSource {
  /** 사람이 읽을 백엔드 이름 (로그/검증 리포트용) */
  readonly name: string;
  /** 현재 체인 tip 높이 */
  tipHeight(): Promise<number>;
  /** range 내 생성된 모든 출력 */
  streamOutputs(range: BlockRange): AsyncIterable<RawOutput>;
  /** range 내 발생한 모든 소비 이벤트 (원 출력 생성 정보 join 포함) */
  streamSpends(range: BlockRange): AsyncIterable<RawSpend>;
}
