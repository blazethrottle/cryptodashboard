/**
 * LLM-Wiki 클라이언트.
 *
 * 위치: ~/.../iCloud~md~obsidian/Documents/llm-wiki
 * 구조 (CLAUDE.md 참조):
 *   raw/         원본 자료, 절대 수정 X
 *   wiki/        LLM이 작성·유지하는 구조화된 지식
 *     entities/   인물·기업·프로젝트·프로토콜 (코인 + 기관)
 *     concepts/   개념·프레임워크
 *     domains/    5대 도메인 (crypto-future-finance 등)
 *     comparisons/ 비교 분석
 *     sources/    원본 1:1 요약 (LLM brief 저장 위치)
 *     projects/   프로젝트 인덱스 (Crypto-Dashboard.md)
 *     daily-signals/YYYY-MM/  일별 시그널
 *     briefings/  주간/이벤트 단위 종합 브리프
 *
 * 안전 규칙:
 *   - raw/는 절대 쓰지 않음 (불변)
 *   - 기존 entity 파일이 있으면 markers 영역만 갱신, 본문 보존
 *   - "1 ingest = 1 commit = 1 push" 원칙은 git.ts에서 별도 옵션으로 제공
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export const VAULT_ROOT = path.join(
  os.homedir(),
  "Library/Mobile Documents/iCloud~md~obsidian/Documents/llm-wiki",
);

const WIKI = path.join(VAULT_ROOT, "wiki");

export const PATHS = {
  root: VAULT_ROOT,
  wiki: WIKI,
  entities: path.join(WIKI, "entities"),
  concepts: path.join(WIKI, "concepts"),
  domains: path.join(WIKI, "domains"),
  sources: path.join(WIKI, "sources"),
  projects: path.join(WIKI, "projects"),
  comparisons: path.join(WIKI, "comparisons"),
  /**
   * Crypto-Dashboard 전용 일별 시그널 폴더.
   * `wiki/daily-signals/`는 Agent Treasury 프로젝트가 사용 중이므로 별도 분리.
   */
  cryptoSignals: path.join(WIKI, "crypto-signals"),
  briefings: path.join(WIKI, "briefings"),
  index: path.join(WIKI, "index.md"),
  log: path.join(VAULT_ROOT, "log.md"),
  domainCryptoFinance: path.join(WIKI, "domains", "crypto-future-finance.md"),
  projectCryptoDashboard: path.join(WIKI, "projects", "Crypto-Dashboard.md"),
};

export async function ensureVaultStructure(): Promise<void> {
  try {
    await fs.access(VAULT_ROOT);
  } catch {
    throw new Error(
      `LLM-Wiki not found at ${VAULT_ROOT}.\n` +
        `iCloud Drive 동기화 또는 .obsidian 설정을 확인하세요.`,
    );
  }
  // 폴더만 ensure (파일은 만들지 않음)
  for (const key of ["entities", "concepts", "domains", "sources", "projects", "comparisons", "cryptoSignals", "briefings"] as const) {
    await fs.mkdir(PATHS[key], { recursive: true });
  }
}

export async function readNote(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function writeNote(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
}

export async function appendNote(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, content, "utf-8");
}

export async function listNotes(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * 사용자가 작성한 영역만 추출 (LLM context 용).
 * markers 외부 + entities 본문 등.
 */
export async function readUserNotes(dir: string, max = 50): Promise<{ filename: string; content: string }[]> {
  const names = await listNotes(dir);
  const out: { filename: string; content: string }[] = [];
  for (const name of names.slice(0, max)) {
    const text = await readNote(path.join(dir, name));
    if (text) out.push({ filename: name, content: text });
  }
  return out;
}

// ── 파일명 헬퍼 ────────────────────────────────────────────────────────────

/** "Cat in a dogs world" → "Cat-in-a-dogs-world" */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function entityPath(name: string): string {
  return path.join(PATHS.entities, `${slugify(name)}.md`);
}

export function dailySignalPath(date: string): string {
  // date = YYYY-MM-DD → wiki/crypto-signals/YYYY-MM/YYYY-MM-DD_crypto-signals.md
  // suffix를 붙여 다른 시스템 (Agent Treasury daily-signals 등)과 wikilink 충돌 방지
  const yyyymm = date.slice(0, 7);
  return path.join(PATHS.cryptoSignals, yyyymm, `${date}_crypto-signals.md`);
}

export function dailySignalNoteName(date: string): string {
  return `${date}_crypto-signals`;
}

export function dailySignalIndexPath(): string {
  return path.join(PATHS.cryptoSignals, "index.md");
}

export function sourceBriefPath(date: string): string {
  return path.join(PATHS.sources, `${date}_Crypto-Signal-Brief.md`);
}
