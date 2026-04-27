/**
 * 자동/수동 영역 분리 markers.
 *
 *   <!-- CRYPTO-DASHBOARD:AUTO-START key=... -->
 *   ... 매번 덮어쓰는 자동 영역 ...
 *   <!-- CRYPTO-DASHBOARD:AUTO-END -->
 *
 * Markers 사이만 갱신. 외부의 사용자 메모는 절대 보존됨.
 */

export const AUTO_START_PREFIX = "<!-- CRYPTO-DASHBOARD:AUTO-START";
export const AUTO_END = "<!-- CRYPTO-DASHBOARD:AUTO-END -->";

export interface NoteSections {
  preamble: string;     // marker 이전 (사용자 메모)
  auto: string | null;  // marker 사이 (자동 갱신)
  postamble: string;    // marker 이후 (사용자 메모)
  hadMarkers: boolean;
}

export function splitByMarkers(text: string): NoteSections {
  const start = text.indexOf(AUTO_START_PREFIX);
  if (start === -1) {
    return { preamble: text, auto: null, postamble: "", hadMarkers: false };
  }
  const startEnd = text.indexOf("-->", start);
  if (startEnd === -1) return { preamble: text, auto: null, postamble: "", hadMarkers: false };
  const startLineEnd = text.indexOf("\n", startEnd);
  const autoBegin = startLineEnd === -1 ? startEnd + 3 : startLineEnd + 1;

  const end = text.indexOf(AUTO_END, autoBegin);
  if (end === -1) {
    // marker 깨진 경우 — 보수적으로 모두 사용자 메모로 취급
    return { preamble: text, auto: null, postamble: "", hadMarkers: false };
  }
  const endLineEnd = text.indexOf("\n", end);
  const postStart = endLineEnd === -1 ? end + AUTO_END.length : endLineEnd + 1;

  return {
    preamble: text.slice(0, start),
    auto: text.slice(autoBegin, end),
    postamble: text.slice(postStart),
    hadMarkers: true,
  };
}

export function buildAutoBlock(key: string, content: string, updatedAt: string): string {
  return [
    `${AUTO_START_PREFIX} key=${key} updated=${updatedAt} -->`,
    "",
    content.trim(),
    "",
    AUTO_END,
  ].join("\n");
}

/**
 * 노트 갱신: marker 영역은 새 자동 콘텐츠로 교체, 사용자 영역은 그대로 보존.
 * marker 없으면 노트 끝에 추가 (사용자 본문 보존).
 */
export function applyAutoBlock(
  existing: string | null,
  key: string,
  newAuto: string,
  updatedAt: string,
  template?: string,
): string {
  const block = buildAutoBlock(key, newAuto, updatedAt);

  if (!existing) {
    if (template) {
      return template.includes(AUTO_START_PREFIX)
        ? template.replace(/<!-- CRYPTO-DASHBOARD:AUTO-START[\s\S]*?CRYPTO-DASHBOARD:AUTO-END -->/, block)
        : `${template.trimEnd()}\n\n${block}\n`;
    }
    return `${block}\n`;
  }

  const sections = splitByMarkers(existing);
  if (sections.hadMarkers) {
    return `${sections.preamble}${block}\n${sections.postamble}`;
  }
  // marker가 없는 기존 사용자 노트 — 끝에 자동 영역 추가
  const sep = existing.endsWith("\n") ? "" : "\n";
  return `${existing}${sep}\n${block}\n`;
}
