/**
 * 인덱스 저장소 — 지표 계산 결과(일별 집계)의 영속화 추상화.
 *
 * 설계 문서: docs/btc-onchain-raw-source-design.md §5, §6.1
 *
 * 저장 단계 구분:
 *  - Phase 1 (BigQuery 백엔드): 무거운 UTXO 집계는 BigQuery SQL 안에서 끝나고,
 *    로컬에는 "일별 집계 행"만 남는다 (~수천 행) → JSON 파일로 충분 (JsonIndexStore).
 *  - Phase 3 (bitcoind 백엔드): UTXO 단위 로컬 인덱스(수억 행)가 필요해지는 시점에
 *    동일한 IndexStore 계약 뒤에 DuckDB 구현을 추가한다.
 *
 * 저장 위치: data/onchain/ (gitignore — 산출 시계열만 timeseries.json에 합류)
 */

import fs from "node:fs/promises";
import path from "node:path";

/**
 * 일별 집계 행 — 모든 밸류에이션 지표의 모체.
 *  - realizedCapUsd:  Σ UTXO(value × 생성시점 가격)   → MVRV/NUPL/Realized Price
 *  - supplySat:       유통량 (satoshi)                → Realized Price 분모
 *  - soprRealizedUsd: 당일 소비 출력의 실현가치 Σ      → SOPR 분자
 *  - soprCreatedUsd:  당일 소비 출력의 생성가치 Σ      → SOPR 분모
 */
export interface DailyAggregateRow {
  /** "YYYY-MM-DD" (UTC) */
  date: string;
  realizedCapUsd: number;
  supplySat: number;
  soprRealizedUsd: number;
  soprCreatedUsd: number;
}

/** 증분 갱신 상태 — "어디까지 인덱싱했나" */
export interface IndexMeta {
  /** 마지막으로 반영된 블록 높이 (미구축이면 null) */
  lastIndexedHeight: number | null;
  /** 데이터를 만든 백엔드 이름 (RawChainSource.name) */
  source: string | null;
  updatedAt: string;
}

export interface IndexStore {
  getMeta(): Promise<IndexMeta>;
  setMeta(meta: IndexMeta): Promise<void>;
  /** date 기준 upsert (재실행 멱등성) */
  upsertDaily(rows: DailyAggregateRow[]): Promise<void>;
  /** 전체 일별 시계열, date 오름차순 */
  getDailySeries(): Promise<DailyAggregateRow[]>;
  close(): Promise<void>;
}

interface JsonStoreFile {
  meta: IndexMeta;
  daily: Record<string, DailyAggregateRow>;   // date → row
}

const EMPTY_FILE: JsonStoreFile = {
  meta: { lastIndexedHeight: null, source: null, updatedAt: new Date(0).toISOString() },
  daily: {},
};

/**
 * JSON 파일 기반 구현 — 일별 집계(소규모) 전용.
 * 단순함 우선: 전체 로드 → 메모리 변경 → 전체 저장. 수천 행 규모에서 충분.
 */
export class JsonIndexStore implements IndexStore {
  private readonly file: string;
  private cache: JsonStoreFile | null = null;

  constructor(rootDir: string, fileName = "btc-daily.json") {
    this.file = path.join(rootDir, "data", "onchain", fileName);
  }

  private async load(): Promise<JsonStoreFile> {
    if (this.cache) return this.cache;
    try {
      const raw = await fs.readFile(this.file, "utf-8");
      this.cache = JSON.parse(raw) as JsonStoreFile;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      this.cache = structuredClone(EMPTY_FILE);
    }
    return this.cache;
  }

  private async save(): Promise<void> {
    if (!this.cache) return;
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(this.cache, null, 2));
  }

  async getMeta(): Promise<IndexMeta> {
    return (await this.load()).meta;
  }

  async setMeta(meta: IndexMeta): Promise<void> {
    const data = await this.load();
    data.meta = meta;
    await this.save();
  }

  async upsertDaily(rows: DailyAggregateRow[]): Promise<void> {
    const data = await this.load();
    for (const row of rows) data.daily[row.date] = row;
    await this.save();
  }

  async getDailySeries(): Promise<DailyAggregateRow[]> {
    const data = await this.load();
    return Object.values(data.daily).sort((a, b) => a.date.localeCompare(b.date));
  }

  async close(): Promise<void> {
    this.cache = null;
  }

  /** selftest 정리용 — 저장 파일 삭제 */
  async destroy(): Promise<void> {
    this.cache = null;
    await fs.rm(this.file, { force: true });
  }
}
