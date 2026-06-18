# BTC 온체인 데이터 — 원천 소스 직접 접근 아키텍처 설계 (기초 공사 기획)

> 상태: **설계 / 리서치** (구현 전)
> 작성 동기: CryptoQuant AI 문답 분석 — "비트코인 온체인 지표의 원천 소스는 비트코인 블록체인 자체(블록/트랜잭션/UTXO)"라는 결론에 따라, 현재 **CoinMetrics Community API**(가공된 3rd-party 지표)에 의존하는 구조를 **원장 원천 데이터를 직접 읽어 지표를 산출**하는 구조로 전환하기 위한 기초 공사 설계.
> 관련 문서: **`btc-financial-infrastructure-research.md`** — 본 파이프라인이 장기적으로 어떤 비즈니스/수입 구조에 연결되는지(시나리오·시장·수익화 사다리)에 대한 심층 리서치. 그 §7.4가 본 문서의 Phase 2 이후 증축 방향(래칫 대시보드, Taproot Assets 텔레메트리, DAT/mNAV 트래커)을 정의한다.

---

## 0. 한 줄 요약

지금 `src/lib/onchain/coinmetrics.ts`는 **이미 계산된 MVRV/Realized Cap을 남이 떠먹여 주는** 구조다.
이 문서는 그 의존을 끊고 **비트코인 원장(UTXO) → 우리 인덱스 → 지표** 파이프라인을 직접 짓기 위한 레이어드 아키텍처와 단계별 로드맵을 정의한다. 핵심 설계 결정은 **"원천 접근 백엔드를 교체 가능하게(pluggable) 추상화"** 하여, **BigQuery 공개 원장으로 빠르게 가치를 내고 → 자체 `bitcoind` 풀노드로 주권(sovereignty)을 확보**하는 2단 전략이다.

---

## 1. 배경 & 현황 진단

### 1.1 현재 구조 (as-is)

| 모듈 | 소스 | 데이터 성격 | 비고 |
|---|---|---|---|
| `onchain/btc.ts` | mempool.space REST | **네트워크 상태** (블록높이/수수료/해시레이트/멤풀) | 원천에 가까움. 단, 남의 노드 |
| `onchain/coinmetrics.ts` | CoinMetrics Community API | **가공 지표** (`CapMrktCurUSD`, `CapRealUSD`, `PriceUSD`) → MVRV/MVRV-Z | ⚠️ **Realized Cap을 직접 계산하지 않고 받아옴** |
| `onchain/defillama.ts` | DefiLlama | DeFi TVL/Fees/Stablecoin | BTC 밸류에이션과 무관 |
| `onchain/sol.ts` | Solana RPC | SOL 네트워크 상태 | — |

`snapshot.ts` → `fetchBtcCycle()`(coinmetrics) → `btcCycleScore()` → `printMacro()` + `timeseries.json(btc-mvrv-z, btc-mvrv)` + web export.

### 1.2 문제점

1. **원천이 아니다.** Realized Cap·MVRV는 CoinMetrics가 *자기 노드·자기 라벨링·자기 가격 기준*으로 계산한 결과물이다. 우리는 그 가정/방법론을 통제하지 못한다.
2. **확장 불가.** NUPL, SOPR, Realized Price, UTXO Age Bands, 거래소 흐름 등 CryptoQuant가 보여주는 핵심 지표는 Community API 무료 범위에 없거나(SOPR/NUPL은 없음), 유료/제한적이다.
3. **블랙박스.** "왜 이 값인가"를 우리가 재현·검증할 수 없다. 사용자 매매 룰(`signals.ts`)의 입력으로 쓰기엔 신뢰 추적성이 약하다.

### 1.3 목표 (to-be)

- 비트코인 **원장 원천 데이터(블록·트랜잭션·UTXO)** 에 직접 접근.
- 그 위에서 **Realized Cap → MVRV / MVRV-Z / NUPL / SOPR / Realized Price**를 **우리 코드로 재현 가능하게** 계산.
- 기존 `coinmetrics.ts`는 **검증용 ground-truth**로 강등(폐기 X) — 우리가 계산한 Realized Cap이 CoinMetrics와 ±몇 % 안에 드는지 자동 회귀 테스트.
- 기존 snapshot/timeseries/web 파이프라인에 **드롭인 교체** 가능하도록 인터페이스 유지.

---

## 2. "원천 소스"의 정확한 정의 — 중요한 전제

> **핵심 사실 1 — 온체인 ≠ 가격.**
> Realized Cap/MVRV/NUPL/SOPR는 **"온체인 수량 × 오프체인 가격"** 의 곱이다.
> UTXO가 *언제* 생성/소비됐는지는 원장(온체인)에서 나오지만, *그 시점의 USD 가격*은 **거래소 데이터(오프체인)** 다.
> → **가격 오라클(price oracle)** 은 별도 1급 컴포넌트로 설계해야 하고, 어떤 거래소/어떤 시각(UTC 종가 vs VWAP)을 쓰느냐가 **모든 지표 값에 직접 영향**을 준다. (CoinMetrics/Glassnode와 값을 맞추려면 그들의 가격 기준에 근접시켜야 함.)

> **핵심 사실 2 — 일부 지표는 "추정"이다.**
> 거래소 보유량(Exchange Reserve)·Netflow는 원장만으로 불가능하다. **"이 주소가 바이낸스 콜드월렛"** 이라는 **라벨링/클러스터링(common-input-ownership heuristic 등)** 이 필요하며 이는 본질적으로 **추정**이다. → 본 설계에서 **별도 하위 시스템(Phase 4)** 으로 분리하고, 정확도/한계를 명시한다.

순수 원장만으로 계산 가능 vs 외부 입력 필요를 명확히 구분:

| 지표 | 온체인 원장 | 가격 오라클 | 주소 라벨링 |
|---|:---:|:---:|:---:|
| Realized Cap / Realized Price | ✅ | ✅ | — |
| MVRV / MVRV-Z | ✅ | ✅ | — |
| NUPL | ✅ | ✅ | — |
| SOPR (및 aSOPR) | ✅ | ✅ | — |
| UTXO Age Bands (HODL Waves) | ✅ | (밸류 가중 시) ✅ | — |
| **Exchange Reserve / Netflow** | ✅ | ✅(USD 환산 시) | ⚠️ **필수 (추정)** |
| Coinbase Premium | (가격만) | ✅ | — (거래소별 가격) |

---

## 3. 지표별 입력·산식 명세

모두 **"UTXO 단위 cost-basis"** 라는 한 가지 원시 데이터에서 파생된다. 따라서 기초 공사의 본질은
**"모든 UTXO에 대해 (수량, 생성 블록높이, 생성 시점 USD 가격)을 인덱싱하는 것"** 이다.

### 3.1 Realized Cap
```
Realized Cap = Σ_over_UTXO( value_BTC(u) × price_USD(생성시점 블록타임(u)) )
```
- UTXO 체인에서 "마지막 이동 시점" = **출력 생성 시점**(생성 후 미사용이므로).
- 현재 미사용(UTXO set) 출력만 합산.
- 의미: **전체 보유자의 평균 취득원가 총합** ≈ 네트워크의 "장부가".

### 3.2 Realized Price
```
Realized Price = Realized Cap / Circulating Supply
```

### 3.3 MVRV / MVRV-Z
```
Market Cap   = price_now × circulating_supply
MVRV         = Market Cap / Realized Cap
MVRV-Z       = (Market Cap − Realized Cap) / stddev(Market Cap)   # rolling, 정식은 전체기간 std
```
- 현재 `coinmetrics.ts:computeMvrvZ()`가 쓰는 산식과 동일 → **그대로 재사용 가능** (입력만 우리 Realized Cap으로 교체).
- 사용자 매매 룰의 임계값(`MVRV-Z > 7 정점`, `< 0 바닥` 등)은 **변경 금지** (CLAUDE.md `signals.ts` 보존 규칙 정신 준수).

### 3.4 NUPL (Net Unrealized Profit/Loss)
```
NUPL = (Market Cap − Realized Cap) / Market Cap
```
- 0 초과 = 네트워크 순이익 상태, 0 미만 = 순손실. ±극단일수록 천장/바닥.

### 3.5 SOPR (Spent Output Profit Ratio)
```
일별 SOPR = Σ(소비된 출력의 USD 실현가치) / Σ(그 출력들의 USD 생성가치)
          = Σ( value × price_spent ) / Σ( value × price_created )   (당일 소비분)
```
- `> 1` = 평균 이익 실현(매도), `< 1` = 손실 실현. `= 1`은 심리적 지지/저항.
- **aSOPR**(adjusted): 1시간 미만 생애 출력 제외(거래소 내부 이동 노이즈 제거) → 별도 변형으로 둠.
- ⚠️ Realized Cap과 달리 **소비된(spent) 출력**을 다룬다 → 인덱서가 **spent-output 저널**(소비 시점 + 생성 시점 가격 둘 다)을 남겨야 함.

### 3.6 (확장) UTXO Age Bands / HODL Waves
- 각 UTXO의 (생성높이, value)로 연령 분포 → 단기/장기 보유자 코호트. SOPR/NUPL을 코호트별(STH/LTH)로 쪼갤 때 필요.

---

## 4. 원천 데이터 접근 옵션 비교

| 옵션 | "원천성" | 초기 비용/노력 | 운영 | 과거 일괄계산 | 실시간 증분 | 주소질의 | 추천 단계 |
|---|---|---|---|---|---|---|---|
| **A. `bitcoind` 풀노드 + 자체 인덱서** | ★★★ (진짜 원장, 자기 검증) | 높음 (동기화 수일, SSD 1TB) | 노드 상시 운영 | 가능(수일 배치) | 우수 | electrs/Fulcrum 추가 필요 | **Phase 2 (주권)** |
| **B. Google BigQuery `bigquery-public-data.crypto_bitcoin`** | ★★ (디코딩된 원장 전체, 구글 호스팅·무수정) | 낮음 (SQL만) | 없음 (서버리스) | **탁월** (SQL 한 방) | ~10분 지연 갱신 | 가능(SQL) | **Phase 1 (빠른 가치)** |
| C. Esplora / electrs (자체 or mempool.space) | ★★ | 중 | 중 | REST 반복은 비현실적 | 좋음 | 우수 | 보조 (주소질의) |
| D. mempool.space / Blockchair REST | ★ (남의 가공 노드) | 최저 | 없음 | 불가(rate limit) | 단건만 | 제한적 | 현행 유지(네트워크 상태) |

### 4.1 권장: B → A 2단 전략

- **Phase 1 = BigQuery.** `crypto_bitcoin` 데이터셋은 `blocks / transactions / inputs / outputs` 테이블로 **디코딩된 원장 전체**(satoshi 단위, ~10분마다 갱신)를 제공. 인프라 0으로 **Realized Cap 과거 전체를 SQL 한 번에 재구성** 가능. `block_timestamp_month` 파티션 + 컬럼 프루닝으로 스캔량/비용 통제.
  - 비용: 온디맨드 쿼리 **월 1 TiB 무료**, 초과분 약 **$6.25/TiB(US)**. 증분(최근 블록만) 쿼리는 파티션 프루닝으로 스캔량 수십 MB~수 GB 수준.
  - "내 노드는 아니지만" 가공 지표가 아니라 **무수정 원장**이라는 점에서 CoinMetrics 의존과는 질적으로 다름.
- **Phase 2 = 자체 `bitcoind`.** 진짜 주권. `txindex=1`(+선택 `coinstatsindex=1`)로 RPC 풀노드 운영, 블록을 직접 walk하여 동일 인덱스 산출. BigQuery 백엔드와 **동일 인터페이스** 뒤에 꽂아 교체.
  - 하드웨어: 아카이벌 ~600GB–1TB SSD(+연 50–80GB 증가), RAM 8–16GB. electrs(경량 인덱스) 또는 Fulcrum(풀 주소 인덱스, +60–100GB)로 주소질의 확장.

---

## 5. 권장 아키텍처 (레이어드, pluggable)

```
┌─────────────────────────────────────────────────────────────┐
│ 5. 통합 레이어  snapshot.ts / timeseries / web                 │
│    fetchBtcCycle() 시그니처 유지 → 내부 구현만 교체            │
├─────────────────────────────────────────────────────────────┤
│ 4. 지표 계산 (순수 함수, I/O 없음)  indicators 스타일          │
│    realizedCap · mvrv · mvrvZ · nupl · sopr · realizedPrice    │
├─────────────────────────────────────────────────────────────┤
│ 3. 인덱스/상태 저장소  "UTXO cost-basis index"                 │
│    DuckDB/Parquet (분석)  ·  utxo(value,height,price)          │
│    spent-output 저널  ·  일별 집계 (realized_cap, sopr_num/den)│
├──────────────────────┬──────────────────────────────────────┤
│ 2a. RawChainSource     │ 2b. PriceOracle (오프체인 1급 컴포넌트)│
│  interface (교체 가능)  │  BTC/USD 일별·시간별 (기존 exchanges 재활용)│
│   ├ BigQuerySource     │  기준 명시: UTC 종가 / VWAP            │
│   └ BitcoindRpcSource  │                                       │
├──────────────────────┴──────────────────────────────────────┤
│ 1. 원천  BigQuery public dataset  |  자체 bitcoind 풀노드       │
└─────────────────────────────────────────────────────────────┘
```

핵심 추상화 — **`RawChainSource`** 인터페이스 하나로 BigQuery/bitcoind를 갈아끼운다:

```ts
// src/lib/onchain/raw/types.ts
export interface BlockRange { fromHeight: number; toHeight: number; }

export interface RawOutput {     // 생성된 출력 (UTXO 후보)
  txid: string; vout: number;
  valueSat: number;
  height: number; blockTime: number;   // 생성 시점
  // address?: string;  // Phase 4 (라벨링)에서만
}
export interface RawSpend {       // 소비 이벤트 (SOPR용)
  spentTxid: string; spentVout: number; // 어떤 출력을 썼는지
  valueSat: number;
  createdHeight: number; createdBlockTime: number; // 원 출력 생성 시점
  spentHeight: number; spentBlockTime: number;     // 소비 시점
}

export interface RawChainSource {
  tipHeight(): Promise<number>;
  streamOutputs(range: BlockRange): AsyncIterable<RawOutput>;
  streamSpends(range: BlockRange): AsyncIterable<RawSpend>;
}
```

> `streamSpends`는 BigQuery에선 `inputs JOIN outputs`(생성↔소비) 한 쿼리, bitcoind에선 각 input의 prevout 조회로 구현. 인덱서는 백엔드를 모른다.

**`PriceOracle`** 도 1급:
```ts
// src/lib/onchain/raw/price-oracle.ts
export interface PriceOracle {
  priceAt(unixSec: number): number;   // 블록타임 → 해당일 USD (보간/종가 정책 내장)
}
```

---

## 6. 디렉토리 / 모듈 구조 (repo 컨벤션 준수)

기존 패턴(`fetchJSON` 헬퍼 + 타입 인터페이스 + 순수 계산 분리)을 그대로 따른다.

```
src/lib/onchain/
├── btc.ts                      # (유지) mempool.space 네트워크 상태
├── coinmetrics.ts              # (유지·강등) ground-truth 검증용으로만
├── raw/
│   ├── types.ts                # RawChainSource / RawOutput / RawSpend
│   ├── price-oracle.ts         # PriceOracle (exchanges 재활용)
│   ├── source-bigquery.ts      # Phase 1 백엔드
│   ├── source-bitcoind.ts      # Phase 2 백엔드 (RPC)
│   ├── indexer.ts              # 원천 → 인덱스(DuckDB) 적재·증분 갱신
│   └── store.ts                # 인덱스 저장소 추상화 (DuckDB)
├── metrics/
│   ├── realized-cap.ts         # Realized Cap / Realized Price (순수)
│   ├── valuation.ts            # MVRV / MVRV-Z / NUPL (순수)
│   └── sopr.ts                 # SOPR / aSOPR (순수)
└── labeling/                   # Phase 4 (추정 — 분리)
    ├── clustering.ts           # common-input-ownership heuristic
    └── exchange-flows.ts       # Reserve / Netflow

src/scripts/
├── btc-index-build.ts          # 과거 전체 인덱스 일괄 구축 (배치)
├── btc-index-update.ts         # tip까지 증분 갱신 (cron/Actions)
└── btc-metrics-verify.ts       # 자체계산 vs CoinMetrics 회귀 대조

data/onchain/                   # (gitignore) 인덱스 DB/parquet — Solana RPC처럼 무겁게 커밋 X
```

`package.json` scripts 추가: `btc:index`, `btc:update`, `btc:verify` (CLAUDE.md 체크리스트 #2 준수).

### 6.1 저장소 선택 — **DuckDB 권장**
- 단일 파일 임베디드, 컬럼 지향, Parquet 네이티브 → 수억 행 UTXO 집계에 적합하고 Node에서 `@duckdb/node-api`로 사용. SQLite보다 분석 쿼리 10–100배 빠르고, Postgres 같은 별도 서버 불필요.
- 인덱스 산출물(일별 `realized_cap`, `sopr_num`, `sopr_den`, `supply`)은 작아서 → 최종 시계열만 `data/timeseries.json`에 합류시켜 web에 노출.

---

## 7. 단계별 로드맵 (기초 공사 → 확장)

| Phase | 목표 | 산출물 | 검증 | 대략 난이도 |
|---|---|---|---|---|
| **0. 스캐폴딩** | 인터페이스·디렉토리·타입 확정, PriceOracle(기존 거래소 데이터 래핑), DuckDB store 골격 | `raw/types.ts`, `price-oracle.ts`, `store.ts`, 빈 스크립트 3종, `typecheck` 통과 | 컴파일 + 더미 데이터 왕복 | 낮음 |
| **1. BigQuery로 Realized Cap** | `BigQuerySource` + `indexer` + `realized-cap.ts`. 과거 전체 Realized Cap/Price 재구성 | `btc-index-build` 1회 실행 → DuckDB에 일별 시계열 | **CoinMetrics `CapRealUSD`와 일별 ±2~3% 일치** (회귀 테스트) | 중 |
| **2. MVRV/NUPL/SOPR** | `valuation.ts`(MVRV/MVRV-Z/NUPL) + `sopr.ts`. `fetchBtcCycle()` 내부를 자체계산으로 교체 | snapshot/timeseries/web에 NUPL·SOPR 신규 노출 | MVRV-Z: CoinMetrics 대조 / SOPR: 1 근방·부호 sanity | 중 |
| **3. 자체 노드 백엔드** | `BitcoindRpcSource` 구현, 동일 인터페이스로 교체. 증분 갱신 cron화 | 주권형 파이프라인 (외부 의존 제거) | BigQuery 백엔드와 동일 값 산출 대조 | 높음 (인프라) |
| **4. 거래소 흐름 (추정)** | 주소 라벨링/클러스터링 → Exchange Reserve/Netflow | 별도 지표군 | 알려진 거래소 주소 대조 + 한계 명시 | 높음 (정확도 한계) |

> **기초 공사 = Phase 0 + 1.** 이걸로 "원천 직접 접근 + Realized Cap 자체 산출 + 검증 루프"가 선다. 2~4는 그 위 증축.

---

## 8. 검증 전략 (이게 핵심 — 공짜 ground truth가 이미 있다)

repo는 이미 `coinmetrics.ts`로 `CapRealUSD`(Realized Cap)·`CapMrktCurUSD`를 받아온다.
→ **우리가 계산한 Realized Cap을 CoinMetrics 값과 일별 비교**하는 회귀 테스트(`btc-metrics-verify.ts`)를 Phase 1부터 상시 가동.
- 합격 기준 예: 일별 상대오차 중앙값 < 2%, 최대 < 5%. 벗어나면 가격 오라클 기준(거래소/시각)·UTXO 처리 누락 의심.
- 이 대조 루프가 있으면 "원천 직접 계산"의 정확도를 **객관적으로 보증**하면서 점진 개선 가능.

---

## 9. 비용 · 운영 · 하드웨어

- **Phase 1 (BigQuery):** 과거 전체 1회 구축 시 수~수십 GB 스캔(파티션/컬럼 프루닝 적용), 이후 증분은 미미. **월 1 TiB 무료 한도 내 운영 현실적.** GCP 프로젝트 + 서비스계정 키(.env, gitignore) 필요. GitHub Actions에서 cron 갱신 가능(현 30분 cron 정책과 호환).
- **Phase 3 (자체 노드):** 1TB NVMe SSD, 8–16GB RAM, 상시 가동. 초기 IBD(전체 동기화) 수 시간~수일. 전기/대역폭 고려. → **선택적 주권 업그레이드**, 필수는 아님.
- 인덱스 DB(`data/onchain/*.duckdb`)는 `node_modules`·`data/snapshots`처럼 **gitignore** (CLAUDE.md 보안 규칙 일관).

---

## 10. 리스크 & 한계 (정직하게)

1. **가격 오라클이 값을 좌우.** 거래소/시각 선택으로 MVRV·SOPR가 수 % 흔들림. → 기준을 문서화하고 CoinMetrics에 근접하도록 캘리브레이션.
2. **거래소 흐름은 추정(Phase 4).** common-input-ownership heuristic + 라벨셋(공개 데이터/휴리스틱)으로 클러스터링하나, **거짓양성·CoinJoin·라벨 노후화**로 오차 불가피. CryptoQuant/Glassnode와도 정확히 일치 안 함이 정상.
3. **과거 일괄계산 무거움.** 제네시스~tip 전체 출력 순회는 무겁다 → 증분 설계 필수, 일괄은 배치 1회.
4. **분실 코인.** 2010년 이전 미이동 코인 등은 Realized Cap에 옛 저가로 반영(설계 의도). 코호트 보정(adjusted 계열)은 Phase 4+.
5. **`signals.ts` 임계값 보존.** 새 지표를 매매 룰에 넣되, 기존 RSI 30/70·MVRV-Z 임계값은 CLAUDE.md상 변경 금지.

---

## 11. 비범위 (이번 기초 공사 밖)

- ETH 등 계정기반 체인(잔액 모델 다름) — 별도 설계.
- 파생(Funding/OI)·Coinbase Premium은 거래소 데이터라 이미 `binance-futures.ts` 라인에서 다룸. 본 문서는 **원장 기반 밸류에이션**에 집중.
- 실시간(블록 단위) 스트리밍 알림 — 일별 집계 우선.

---

## 12. 즉시 다음 액션 (제안)

1. **Phase 0 스캐폴딩 PR** — `raw/types.ts`, `price-oracle.ts`(기존 거래소 데이터 래핑), DuckDB `store.ts` 골격 + `typecheck` 통과. (구현 가벼움, 위험 낮음)
2. **Phase 1 PoC** — BigQuery로 최근 N일 Realized Cap만 계산 → CoinMetrics 대조로 오차 측정(가격 오라클 기준 확정).
3. PoC 오차 합격 시 → 과거 전체 구축 + MVRV/NUPL/SOPR 확장(Phase 2).

---

## 부록 A. 출처 (방법론 근거)

- Realized Cap 방법론 — [Coin Metrics: Introducing Realized Capitalization](https://coinmetrics.io/general-research/realized-capitalization/), [Coin Metrics Docs: Market Capitalization](https://gitbook-docs.coinmetrics.io/network-data/network-data-overview/market/market-capitalization), [Glassnode: Realized Capitalization](https://docs.glassnode.com/guides-and-tutorials/metric-guides/realized-capitalization)
- SOPR — [Glassnode: SOPR](https://docs.glassnode.com/guides-and-tutorials/metric-guides/sopr/sopr-spent-output-profit-ratio)
- NUPL — [Glassnode: NUPL](https://docs.glassnode.com/guides-and-tutorials/metric-guides/unrealized-profit-loss/nupl-net-unrealized-profit-loss)
- Bitcoin Core 인덱스 — [bitcoincore.org: gettxoutsetinfo / coinstatsindex](https://bitcoincore.org/en/doc/22.0.0/rpc/blockchain/gettxoutsetinfo/)
- BigQuery 공개 원장 — [Google Cloud: Bitcoin in BigQuery](https://cloud.google.com/blog/topics/public-datasets/bitcoin-in-bigquery-blockchain-analytics-on-public-data), [Full relational diagram for Bitcoin public data on BigQuery](https://medium.com/google-cloud/full-relational-diagram-for-bitcoin-public-data-on-google-bigquery-3c4772af6325)
- 주소 클러스터링/라벨링 — [ORBITAAL (arXiv 2408.14147)](https://arxiv.org/pdf/2408.14147), [Cryptocurrency Address Clustering and Labeling (arXiv 2003.13399)](https://arxiv.org/pdf/2003.13399)
- 풀노드/인덱서 사이징 — [Bitcoin Wiki: Full node](https://en.bitcoin.it/wiki/Full_node), [RaspiBolt: Fulcrum](https://raspibolt.org/guide/bonus/bitcoin/fulcrum.html)
