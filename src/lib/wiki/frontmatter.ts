/**
 * YAML 프론트매터 빌더 — LLM-Wiki 규격.
 *
 * 모든 wiki 페이지는 다음 형식으로 시작:
 *   ---
 *   title: 페이지 제목
 *   type: entity | concept | domain | comparison | source | overview | daily-signal | project
 *   domain: ai-mastery | crypto-future-finance | brand-authority | income-pipelines | frontier-tech
 *   tags: [태그1, 태그2]
 *   sources: [원본 파일명 목록]
 *   created: YYYY-MM-DD
 *   updated: YYYY-MM-DD
 *   ---
 */

export type WikiType =
  | "entity"
  | "concept"
  | "domain"
  | "comparison"
  | "source"
  | "overview"
  | "daily-signal"
  | "project";

export type Domain =
  | "ai-mastery"
  | "crypto-future-finance"
  | "brand-authority"
  | "income-pipelines"
  | "frontier-tech";

export interface Frontmatter {
  title: string;
  type: WikiType;
  domain?: Domain | Domain[];
  tags?: string[];
  sources?: string[];
  created?: string;
  updated?: string;
}

export function buildFrontmatter(fm: Frontmatter): string {
  const lines: string[] = ["---"];
  lines.push(`title: ${escapeYaml(fm.title)}`);
  lines.push(`type: ${fm.type}`);
  if (fm.domain) {
    if (Array.isArray(fm.domain)) {
      lines.push(`domain: [${fm.domain.join(", ")}]`);
    } else {
      lines.push(`domain: ${fm.domain}`);
    }
  }
  if (fm.tags && fm.tags.length > 0) {
    lines.push(`tags: [${fm.tags.map(escapeYamlInList).join(", ")}]`);
  }
  if (fm.sources && fm.sources.length > 0) {
    lines.push(`sources: [${fm.sources.map(escapeYamlInList).join(", ")}]`);
  }
  if (fm.created) lines.push(`created: ${fm.created}`);
  if (fm.updated) lines.push(`updated: ${fm.updated}`);
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

function escapeYaml(v: string): string {
  if (v.includes(":") || v.includes("#")) return `"${v.replace(/"/g, '\\"')}"`;
  return v;
}

function escapeYamlInList(v: string): string {
  if (v.includes(",") || v.includes(":")) return `"${v.replace(/"/g, '\\"')}"`;
  return v;
}

/**
 * 기존 노트에서 frontmatter 분리. 없으면 null.
 */
export function splitFrontmatter(content: string): { frontmatter: string | null; body: string } {
  if (!content.startsWith("---\n")) return { frontmatter: null, body: content };
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) return { frontmatter: null, body: content };
  return {
    frontmatter: content.slice(0, end + 5),
    body: content.slice(end + 5),
  };
}

/**
 * 기존 frontmatter의 `updated` 필드만 갱신, 나머지 보존.
 * frontmatter 없으면 새로 추가.
 */
export function ensureFrontmatter(existing: string | null, defaults: Frontmatter): {
  frontmatter: string;
  body: string;
} {
  if (existing == null) {
    return { frontmatter: buildFrontmatter(defaults), body: "" };
  }
  const split = splitFrontmatter(existing);
  if (split.frontmatter) {
    // updated 갱신만
    if (defaults.updated) {
      const newFm = split.frontmatter.replace(/^updated:.*$/m, `updated: ${defaults.updated}`);
      // updated 필드가 없으면 끝 ---줄 앞에 추가
      const updated = newFm.includes("\nupdated:")
        ? newFm
        : newFm.replace(/^---\n$/m, `updated: ${defaults.updated}\n---\n`);
      return { frontmatter: updated, body: split.body };
    }
    return { frontmatter: split.frontmatter, body: split.body };
  }
  return { frontmatter: buildFrontmatter(defaults), body: split.body };
}
