# Crypto Signal Dashboard SaaS — Next Steps (2026-06-01)

> **세션 인계 노트**: 본 세션 (5-28 ~ 6-01) 종료. 다음 SaaS 빌드 세션에서 즉시 이어 작업.

## Phase 1 진행률 (50% 완료)

| Module | 상태 | 검증 |
|--------|------|------|
| Auth (Google OAuth PKCE + JWT RS256 + Supabase RLS) | ✅ | typecheck OK · /health 200 · audit 0 |
| Subscription (Toss + Stripe webhook + 자동 tier 변경) | ✅ | /subscription/pricing 200 |
| DB schema (6 table + RLS + 멱등성) | ✅ design | Supabase 적용 미진행 |
| **Frontend (React + Vite + Tailwind + 5 screens)** | ❌ **다음 작업** | - |
| Signal API (RSI·MA + 5 데이터 source) | ❌ | Phase 2 |
| Brief (Sonnet 4.6 + fact-check + citation) | ❌ | Phase 2 |
| Alert (Telegram·email·web push) | ❌ | Phase 2 |

## 다음 세션 즉시 시작 작업: B Frontend

### 위치

```
apps/saas/frontend/   # 신설
```

본인 운영 `web/`는 변경 ❌ (cron + 사용자 본인 도구 보호).

### Stack (사용자 본인 web/와 동일)

- Vite (빌드)
- React (UI)
- Tailwind (CSS)
- React Router (라우팅)
- Zod (입력 검증)
- @supabase/supabase-js (Auth session)

### 5 Screens MVP

1. `/` **Landing** — "한국 솔로 트레이더의 첫 Bloomberg Terminal" + 가격 + CTA
2. `/login` **Login** — Google OAuth 버튼 + 한국어 disclaimer 3개 동의
3. `/dashboard` **Signal Dashboard** — Top: Fear&Greed + 4 main coins / Middle: 16 grid / Bottom: 기관 흐름 + brief
4. `/brief` **Brief View** — 한국어 LLM brief 전체 + 출처·날짜·면책 매번
5. `/settings` **Settings** — coin universe + 알림 채널 + 결제 (Toss·Stripe checkout)

### 빌드 순서 (9 step)

1. package.json + tsconfig + vite.config + tailwind.config + index.html
2. src/main.tsx + App.tsx (라우터)
3. src/lib/api.ts (Backend `:8080` 호출 wrapper)
4. src/lib/auth.ts (Supabase session 관리)
5. src/lib/types.ts (User·Signal·Brief 타입 = backend types 정합)
6. src/pages/Landing.tsx (가장 단순)
7. src/components/DisclaimerBanner.tsx (매 화면 의무 컴포넌트)
8. src/pages/Login·Dashboard·Brief·Settings.tsx
9. typecheck + npm run dev + 브라우저 검증

### 폴더 구조 (예상)

```
apps/saas/frontend/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/{Landing,Login,Dashboard,Brief,Settings}.tsx
│   ├── components/{DisclaimerBanner,CoinCard,SignalGrid,BriefCard,FearGreedIndex,DataSourceLagBadge}.tsx
│   └── lib/{api,auth,types}.ts
└── public/
```

### 예상 산출

- 파일: 15~25
- 라인: 1500~2500
- Token cost: 80K~150K
- 빌드 시간: 1~2 turn

### 검증 (사용자 직접 확인 가능)

```bash
cd apps/saas/frontend
npm install
npm run dev
# http://localhost:5173 자동 열림
```

5 screens 직접 클릭 + Network 탭에서 Backend 호출 확인.

## 본인 운영 보호 (절대 변경 ❌)

- `src/lib/signals.ts·multibagger.ts·institutions.ts·tradeplan.ts·backtest.ts·timeseries.ts`
- `src/lib/onchain/·exchanges/`
- `web/` (본인 dashboard)

→ PreToolUse hook 자동 차단 활성 (사용자 메모리 `feedback_repo_routing_matrix.md`).

## 마지막 commits (dev branch)

| commit | 내용 |
|--------|------|
| `ed15e85` | Phase 1 Subscription module + DB schema 확장 |
| `7dca324` | npm audit fix (@fastify/jwt 제거) |
| `9a625b5` | Phase 1 Auth production code |
| `7e6ed46` | Phase 1 Auth module 설계 (902 lines) |
| `14634fe` | apps/saas/ 폴더 신설 |

## 3 Showstoppers (Phase 2, 병렬 진행 가능)

| # | 위험 | 시간 | 누가 |
|---|------|------|------|
| 1 | 한국 FSC 투자자문업 license | 45~60일 | 사용자 + 법무 |
| 2 | Sonnet 환각 fact-check loop | 2주 | Claude 빌드 (Backend) |
| 3 | 13F filing 135일 lag 명시 | 1주 | Claude 빌드 (Backend) |

→ Frontend 작업과 무관 (Backend 영역).

## 다음 세션 시작 1 문장

"Crypto Dashboard SaaS 세션 시작. Phase 1 Subscription 완료. apps/saas/frontend/ 빌드 시작 (React + Vite + Tailwind + 5 screens)."

## 참조

- `PROJECT-INDEX.md` (5 Phase plan 상세)
- `MVP-BLUEPRINT.md` (saas-swarm 7-agent 산출)
- `AUTH-MODULE-DESIGN.md` (902 lines, Auth 설계 + Mermaid)
- `backend/src/` (완료 코드, types·models 정합 참조)
- `backend/.env.example` (환경변수 template)
- 사용자 메모리: `session_handoff_cryptodashboard_saas_2026-06-01.md`
