# apps/saas/ — Crypto Signal Dashboard SaaS

> **본질**: 본 cryptodashboard 본인용 자산을 한국 솔로 트레이더 향 SaaS化. 사용자 본인 운영 dashboard와 분리·통합 폴더.

## 본 폴더 vs 본인용 dashboard

| 영역 | 위치 | 사용자 |
|------|------|--------|
| 본인 운영 dashboard | `src/`·`web/` (변경 금지) | 사용자 본인 |
| **SaaS 빌드 자료** (본 폴더) | `apps/saas/` | 외부 솔로 트레이더 |

→ `src/lib/`의 signals.ts·multibagger.ts·institutions.ts·tradeplan.ts·onchain·exchanges 모든 모듈을 **변경 없이 재활용** (사용자 메모리 명시 "변경 금지").

## 현재 자료

| 파일 | 내용 |
|------|------|
| `PROJECT-INDEX.md` | 프로젝트 인덱스 (5 Phase plan·tech stack·cost·5 user 인터뷰 plan) |
| `MVP-BLUEPRINT.md` | saas-swarm 7-agent 산출 청사진 (Research·PM·UX·Frontend·Backend·QA·Launch + 3 Showstoppers) |

## Phase 상태

**Phase 0 (현재)**: 아키텍쳐 기획·repo 구축 (1주)

5 Phase 전체 plan은 PROJECT-INDEX.md 참조.

## 3 Showstoppers (Phase 2 해결 의무)

| # | 위험 | 시간 |
|---|------|------|
| 1 | 한국 FSC 투자자문업 license (5년 징역·₩200M 벌금) | 45~60일 |
| 2 | Sonnet 환각 fact-check loop + citation 강제 | 2주 |
| 3 | 13F filing 135일 lag 명시 | 1주 |

상세는 MVP-BLUEPRINT.md "3 Showstoppers" 섹션 참조.

## 다음 step (Phase 0 → Phase 1)

1. Brand 확정 (후보: SignalKit·KoreaTrader·CryptoSignal Korea)
2. 도메인 등록 (예: signalkit.kr·koreatrader.io)
3. `apps/saas/` 폴더 sub-structure 설계 (frontend·backend·docs)
4. Phase 1 Core MVP 빌드 시작 (4 main coins, Free tier)

## 관련 LLM-Wiki 지식 자산

빌드 자체는 본 폴더, 지식·인사이트는 LLM-Wiki:

- [[Sairahul-Kimi-Agent-Swarm-7-Agents-SaaS-2026-05]] (saas-swarm inspiration)
- [[Kimi-Agent-Swarm]] (concept)
- [[Moonshot-AI]] (entity)
- [[Karpathy-LLM-Coding-Guidelines-4]] (specialization 원칙)
- [[Five-Class-AI-Economy]] (Operators → Leverage Users 패러다임)
- `wiki/templates/saas-swarm-prompt.md` (재사용 prompt template)
- `~/.claude/skills/saas-swarm/SKILL.md` (Personal skill 본체)

LLM-Wiki 경로: `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/llm-wiki/`

## 운영 원칙

- **본 폴더 변경** = SaaS 빌드 진행 시
- **`src/` · `web/` 변경 금지** (본인 운영 dashboard 영역)
- main protected. dev branch에서 Claude 자동 작업
- 사용자 메모리 `project_crypto_dashboard.md` 정합

## Inspired by

- Rahul (@sairahul1) "7 specialized agents로 SaaS MVP 1 afternoon" (2026-05-28)
- Kimi Agent Swarm (Moonshot AI K2.5/K2.6)
- saas-swarm Skill (사용자 Personal skill 첫 시범)
