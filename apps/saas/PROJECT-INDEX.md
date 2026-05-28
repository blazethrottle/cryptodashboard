---
title: Crypto Signal Dashboard SaaS (활성, 2026-05-28~)
type: project
domain: [crypto-future-finance, income-pipelines, ai-mastery]
tags: [활성-프로젝트, SaaS化, 한국-솔로-트레이더, multi-tenant, Google-OAuth, Toss-결제, Sonnet-4.6, Telegram-bot, 3-showstopper-mitigation, saas-swarm-실증]
status: active
phase: 아키텍쳐 기획·구축 (Phase 0)
sources: [Crypto-Signal-Dashboard-SaaS-MVP-Blueprint-2026-05, Sairahul-Kimi-Agent-Swarm-7-Agents-SaaS-2026-05]
created: 2026-05-28
updated: 2026-05-28
predecessor: Crypto-Dashboard (사용자 본인용 운영, github.com/blazethrottle/cryptodashboard)
---

# Crypto Signal Dashboard SaaS

> **본질**: 사용자 본인용 Crypto-Dashboard를 한국 솔로 트레이더 향 SaaS化. saas-swarm Skill 첫 실증 산출. 사용자 결정 = A (아키텍쳐 기획·구축부터 시작, 5 user 인터뷰 후순위).

## 프로젝트 상태

| 항목 | 상태 |
|------|------|
| 시작일 | 2026-05-28 |
| Phase | **Phase 0**: 아키텍쳐 기획·구축 |
| Predecessor | Crypto-Dashboard (본인 운영 중) |
| Owner | 사용자 (cobainiankim@gmail.com) |
| 사용자 역할 | 비개발자, 빌드 = Claude 직접 수행 |
| Skill 사용 | saas-swarm (첫 실증) |

## Phase 계획 (5 Phases)

| Phase | 목적 | 기간 | Gate |
|-------|------|------|------|
| **Phase 0 (현재)** | 아키텍쳐 기획·repo 구축 | 1주 | 아키텍쳐 문서 + 빌드 환경 |
| Phase 1 | Core MVP 빌드 (4 main coins, free tier만) | 3주 | Localhost 동작 |
| Phase 2 | 3 Showstoppers 해결 | 6주 | FSC 법무 + Sonnet fact-check + 13F lag |
| Phase 3 | 5 real users 인터뷰 + Pricing 검증 | 2주 | 5 user 인터뷰 완료 |
| Phase 4 | Pro tier 빌드 + Launch | 4주 | 첫 유료 사용자 |

→ 총 **~4개월 ~ launch**. Phase 2의 FSC 법무 (45-60일)이 critical path.

## System Architecture (전체)

```
┌─────────────────────────────────────────────────────────┐
│ FRONTEND (Vercel)                                       │
│  React + Vite + Tailwind                                │
│  - Login (Google OAuth)                                 │
│  - Dashboard (16 코인 grid)                              │
│  - Brief View (Korean)                                  │
│  - Settings + Alerts                                    │
└─────────────┬───────────────────────────────────────────┘
              │ HTTPS + JWT
┌─────────────▼───────────────────────────────────────────┐
│ BACKEND API (Railway/Fly.io)                            │
│  Node.js + TypeScript + Fastify                         │
│  - /auth (Google OAuth callback)                        │
│  - /signal/scan (RSI·MA 계산)                            │
│  - /brief/:date (Sonnet 4.6 + fact-check)               │
│  - /alert/config                                        │
│  - /institution/:slug (13F + lag label)                 │
│  - /subscription (Toss webhook)                         │
└─────┬───────┬───────────┬─────────────┬──────────────────┘
      │       │           │             │
      ▼       ▼           ▼             ▼
┌──────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐
│ DB   │ │ Cache  │ │ External │ │ LLM Layer    │
│ Post │ │ Redis  │ │ Data 5종 │ │ Sonnet 4.6   │
│ gres │ │ (rate  │ │ Binance· │ │ + fact-check │
│      │ │ limit) │ │ CoinG·   │ │ + citation   │
│      │ │        │ │ DefiL·   │ │ + temp 0.3   │
│      │ │        │ │ Dexscr·  │ │              │
│      │ │        │ │ mempool  │ │              │
└──────┘ └────────┘ └──────────┘ └──────────────┘

┌─────────────────────────────────────────────────────────┐
│ NOTIFICATION                                            │
│  - Telegram Bot API (사용자별 chat_id)                   │
│  - Email (Postmark·Resend transactional)                │
│  - macOS push (PWA web push)                            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ PAYMENT (한국 친화)                                       │
│  - Toss Payments (KRW 우선)                              │
│  - Stripe (international, USD)                          │
│  - Webhook → Backend /subscription                      │
└─────────────────────────────────────────────────────────┘
```

## Data Flow (5종 데이터 → 시그널 → brief → 알림)

```
[1] 30분 cron (GitHub Actions 또는 Backend scheduler)
    ↓
[2] Fetch 5종 데이터 (Binance·CoinGecko·DefiLlama·DexScreener·mempool)
    ↓ rate limit·fallback cache
[3] Calculate RSI·MA·Multibagger·Onchain Health·Macro (signals.ts 재활용)
    ↓
[4] DB upsert (Signal entity)
    ↓
[5a] Frontend pull (사용자 dashboard 새로고침)
[5b] Alert trigger (사용자별 universe + frequency 매칭 → Telegram·email·web push)
    ↓
[6] 매일 1회 한국어 brief 생성 (Sonnet 4.6 + fact-check + citation + temp 0.3)
    ↓
[7] DB upsert (Brief entity) + 사용자 알림
```

## Module 분리 (사용자 자산 재활용 100%)

### 재활용 (변경 금지)

| 사용자 본인 모듈 | SaaS 활용 |
|---------------|----------|
| `src/lib/signals.ts` | 매수매도 시그널 logic (변경 금지) |
| `src/lib/multibagger.ts` | 알트 헌터 score |
| `src/lib/institutions.ts` | 7 기관 13F 추적 |
| `src/lib/tradeplan.ts` | X-VIP 십계명 trade plan |
| `src/lib/backtest.ts` | 룰 검증 (Pro Plus only) |
| `src/lib/timeseries.ts` | BTC·SOL·ETH 차트 |
| `src/lib/onchain/btc.ts` | BTC onchain |
| `src/lib/exchanges/` | 5종 데이터 source 통합 |
| `src/lib/notify/telegram.ts` · `macos.ts` | 알림 (사용자별 확장 필요) |
| `src/lib/wiki/` | LLM brief 생성 (fact-check layer 추가) |

→ **SaaS 빌드 cost 50%+ 절감** (사용자 자산 검증된 모듈).

### 신규 모듈 (SaaS 전용)

| 모듈 | 위치 | 용도 |
|------|------|------|
| `src/auth/google-oauth.ts` | Google OAuth 2.0 callback |
| `src/auth/jwt.ts` | JWT issuance·verification |
| `src/db/schema.ts` | Postgres schema (User·Signal·Brief·Subscription) |
| `src/db/multitenancy.ts` | 사용자별 데이터 격리 (row-level security) |
| `src/subscription/toss.ts` | Toss Payments 통합 |
| `src/subscription/stripe.ts` | Stripe 국제 사용자 |
| `src/subscription/webhook.ts` | Toss·Stripe webhook 핸들러 |
| `src/cache/redis.ts` | 데이터 source rate limit·fallback |
| `src/llm/fact-check.ts` | **Sonnet brief fact-check loop** (showstopper #2) |
| `src/llm/citation.ts` | **Citation 강제** (출처 없으면 brief ❌) |
| `src/legal/disclaimer.ts` | "투자 자문 아님" disclaimer 매 화면 |
| `src/legal/data-lag.ts` | 13F lag·source date 강제 표시 (showstopper #3) |
| `src/alert/scheduler.ts` | 사용자별 frequency 조절 (fatigue 방지) |

## Tech Stack 결정 (선택 사유)

| Layer | 기술 | Why |
|-------|------|-----|
| Frontend | **React + Vite + Tailwind** | 사용자 본인 stack 동일 (학습 cost 0) |
| Backend | **Node.js + TypeScript + Fastify** | 사용자 본인 stack 동일 |
| DB | **PostgreSQL (Supabase)** | row-level security multi-tenant + 한국 사용자 EU 데이터센터 가능 |
| Cache | **Redis (Upstash serverless)** | rate limit + 데이터 fallback |
| LLM | **Anthropic Claude Sonnet 4.6** | 사용자 본인 Max 플랜 활용 + 한국어 최강 |
| Payment KR | **Toss Payments** | 한국 솔로 트레이더 결제 친화 + KRW |
| Payment Global | **Stripe** | 국제 사용자 확장 후보 |
| Hosting Frontend | **Vercel** | Free tier + 자동 deploy |
| Hosting Backend | **Railway 또는 Fly.io** | Korea·Asia 리전 (latency ↓) |
| Auth | **Google OAuth + Supabase Auth** | 가입 30초 + Multi-tenant 내장 |
| Notification | **Telegram Bot + Resend + Web Push** | 한국·일본 사용자 친화 |
| Monitoring | **Sentry + Posthog** | error + product analytics |

## 3 Showstoppers Built-in Mitigation

### Showstopper #1: 한국 FSC 투자자문업 license

**아키텍쳐 차원 mitigation**:
- 모든 시그널 표시 = `<DisclaimerBanner>` 의무 + "투자 자문 아님" 매번
- "매수 신호" 단어 회피, "RSI 30 이하" 객관적 사실만 표시
- "정보 제공 서비스" 약관 (Terms of Service) + privacy policy
- 자동 매매 기능 ❌ (사용자가 수동 거래만)
- Telegram bot = 알림만, API 자동 매매 ❌

**병렬 작업**:
- Phase 2 시작 시 FSC 공식 문의 letter 작성·발송 (사용자 + 법무)
- 답변 대기 동안 frontend·backend 빌드 진행 (45-60일 활용)

### Showstopper #2: Sonnet 환각 fact-check loop

**아키텍쳐 차원**:
- `src/llm/fact-check.ts` 강제 layer
- Brief 생성 시:
  1. Sonnet 4.6 호출 (temp 0.3)
  2. 출처·날짜 추출 (regex + structured output)
  3. 실제 데이터 source 대조 (Binance·CoinGecko 가격, SEC 13F)
  4. 불일치 시 brief 생성 ❌, fallback "데이터 검증 중" 표시
- 주 1회 sampling audit (자동 1 out of 10 → 사용자 검토 queue)
- Brief 출력 = **사실 요약만**: 수치·예측·매수매도 추천 ❌

### Showstopper #3: 13F filing 135일 lag 명시

**아키텍쳐 차원**:
- `src/legal/data-lag.ts` 모든 institutional data 출력 시 강제 호출
- 출력 형식: "Last filing: 2026-02-15 (103일 지남)" 매번
- Feature rename 후보: "Historical Institutional Positioning" (실시간 ❌ 명시)
- 또는 daily fund flows API 추가 (Grayscale·Bitwise 직접 공시, 분기 13F와 별도)

## 데이터 source 통합 + Rate Limit + Fallback

| Source | Rate Limit | Fallback |
|--------|-----------|----------|
| Binance | 1200 req/min IP | Redis cache 5min |
| CoinGecko | 50 req/min Free | 30 req/min Pro 사용자 분배 |
| DefiLlama | 무제한 | Redis cache 10min |
| DexScreener | ~300 req/min | Redis cache 5min |
| mempool.space | 300 req/hr Free | Redis cache 30min |
| SEC 13F (실시간 ❌) | quarterly | 정적 DB 저장 |

→ **Critical**: 모든 source 다운 시 dashboard = "데이터 일시 불가" + last update timestamp 명시.

## Subscription Tier 구현

| Tier | 가격 | 데이터 source | LLM brief | 알림 | 코인 |
|------|------|------------|----------|------|------|
| Free | ₩0 | 4 main (BTC·ETH·SOL·XRP) | 일 1회 한국어 | Email | 4 |
| Pro | ₩29,000/월 | 16 coins | 무제한 | + Telegram + Web Push | 16 |
| Pro Plus | ₩59,000/월 | + 기관 7 + multibagger + custom universe | + audit log + citation 풀 | + priority | unlimited |

## Repository 구조 결정

### 옵션 A: Mono-repo (사용자 본인 cryptodashboard 확장)

```
cryptodashboard/
├── src/lib/          # 본인 자산 (변경 ❌)
├── src/saas/         # 신규 SaaS layer
│   ├── auth/
│   ├── db/
│   ├── subscription/
│   ├── llm/
│   ├── legal/
│   └── alert/
├── apps/dashboard/   # 본인용 (현 운영)
└── apps/saas/        # SaaS 신규
```

**장점**: 본인 모듈 직접 import + 동기화 비용 0
**단점**: 본인 dashboard·SaaS 의존성 결합

### 옵션 B: 별도 repo (cryptodashboard-saas 신설)

```
cryptodashboard-saas/   # 신규
└── src/
    └── lib/            # cryptodashboard npm package 의존성 import
```

**장점**: 본인 자산 npm 패키지化 → 명확 분리
**단점**: npm publish + version 관리 cost

### 권장: **옵션 A (Mono-repo + apps/ 분리)**

사용자 비개발자 + 시간 효율 = mono-repo 압도적 유리. 단 `apps/dashboard/` (본인) vs `apps/saas/` (외부) 폴더 명확 분리.

## Brand Policy + Domain (사용자 결정 영역)

- 도메인 후보: `signalkit.kr` · `koreatrader.io` · `cryptosignal.kr` (사용자 결정)
- 브랜드 톤: 한국 가성비·Bloomberg 권위 결합
- 영문명: SignalKit · KoreaTrader · CryptoSignal Korea

## Cost 추정 (월 운영비, Phase 1+)

| 항목 | 월 비용 (USD) | 비고 |
|------|------------|------|
| Vercel | $0 (Free tier 초기) | Hobby 무제한 |
| Railway (Backend) | $5~$20 | 사용량 기반 |
| Supabase Postgres | $0 (Free tier) → $25 (Pro 8GB) | 500MB Free |
| Upstash Redis | $0 → $10 | 10K commands/day Free |
| Anthropic Sonnet 4.6 | **사용자 Max 플랜 활용 (별도 cost ❌)** | brief 일 1회 ~ Free·Pro 분배 |
| Toss Payments | 2.9% + ₩100/건 | 사용자 결제 시 |
| Stripe | 2.9% + $0.30 | 국제 |
| Domain | $10/년 | KR/COM |
| Sentry · Posthog | $0 (Free tier) | 개발 단계 무료 |
| **합계** | **$15~$80/월** | 100 user 기준 |

→ **₩29,000/월 Pro × 10명 = $250+/월 매출 vs $80 운영비 = 손익분기 10명**.

## 첫 5 Real Users 인터뷰 plan (Phase 3)

**Phase 0~2 빌드 완료 후 진행**.

| 사용자 segment | 인터뷰 수 |
|---------------|---------|
| 한국 솔로 트레이더 30~40대 | 2 |
| 한국 알트 헌터 20~30대 | 1 |
| 한국 기관 자금 추적 fan | 1 |
| 일본·동남아 솔로 트레이더 | 1 |

**인터뷰 질문 (10)**:
1. 현재 어떤 도구 (Bloomberg·TradingView·CryptoQuant·Upbit·Bithumb)?
2. 매일 시그널 체크에 얼마나 시간 쓰나?
3. 영어 정보 접근 어떻게?
4. 기관 자금 흐름 추적하나?
5. ₩29,000/월 Pro 살 의사 있나? 이유는?
6. RSI·MA 시그널 신뢰 정도?
7. 한국어 brief 가장 가치 있는 정보?
8. Telegram·Email·Web Push 선호?
9. 무료 30일 trial 후 결제 결정 요인?
10. "투자 자문 아님" disclaimer 받아들일 수 있나?

## 사용자 결정 영역 (Phase 0 다음 step)

| 옵션 | Trade-off | 권장 |
|------|-----------|------|
| **A1. Mono-repo (apps/ 분리) + 신규 brand SignalKit** | 시간 효율 + 명확 분리 | **⭐⭐⭐⭐⭐** |
| A2. Mono-repo + 동일 brand | 시간 효율 + brand 혼란 | ⭐⭐⭐ |
| B. 별도 repo (cryptodashboard-saas) | 분리 명확 + cost ↑ | ⭐⭐ |
| C. 결정 보류 (먼저 도메인·brand만) | 안전 + 진행 지연 | ⭐⭐ |

**A1 추천 사유**:
1. 본인 모듈 직접 import = 빌드 cost 50%+ 절감
2. `apps/dashboard/` (본인) vs `apps/saas/` (외부) 명확 분리 = 결합 위험 없음
3. 신규 brand "SignalKit" = SaaS 정체성 명확 + 본인 dashboard 영향 ❌
4. Phase 1 빌드 즉시 시작 가능

## D3 #7 측정 후보

본 프로젝트 = saas-swarm Skill 첫 실증. Phase 1 완료 시 측정:
- W-1: saas-swarm 적용 전 (이전 사용자 manual 빌드 방식, 예: BotBooks·Agent Treasury 빌드 cost)
- W+1: saas-swarm 적용 후 (본 프로젝트 Phase 1 완료 시)
- 정성: blueprint 완성도·빌드 진행률·시간 절약·법적 안전성

## 관련

- [[Crypto-Signal-Dashboard-SaaS-MVP-Blueprint-2026-05]] (MVP blueprint 원본 source)
- [[Sairahul-Kimi-Agent-Swarm-7-Agents-SaaS-2026-05]] (saas-swarm inspiration)
- [[Kimi-Agent-Swarm]] · [[Karpathy-LLM-Coding-Guidelines-4]] · [[Five-Class-AI-Economy]]
- [[Anthropic-Security-Guidance-Plugin-2026-05]] (빌드 시 자동 보안 검토 활성)
- 메모리: `project_crypto_dashboard.md` (predecessor, 사용자 활성 본인용)
- 메모리: `user_goals.md` (#3 + 자동 수입 파이프라인)
- ~/.claude/skills/saas-swarm/SKILL.md (Skill 본체)
