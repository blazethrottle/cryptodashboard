---
title: Crypto Signal Dashboard SaaS MVP Blueprint (한국 솔로 트레이더 우선, saas-swarm 7-agent 첫 시범, 2026-05-28)
type: source
domain: [crypto-future-finance, income-pipelines, ai-mastery]
tags: [saas-swarm, 7-agents, Crypto-Dashboard-SaaS化, 한국-FSC-규제, 투자자문업-license, RSI-MA-시그널, 5종-데이터-통합, 7-기관-추적, Sonnet-환각-방지, MVP-blueprint, showstopper-3, B축-P0]
sources: [project_crypto_dashboard.md, Sairahul-Kimi-Agent-Swarm-7-Agents-SaaS-2026-05]
priority: P0
tier: 1
created: 2026-05-28
updated: 2026-05-28
ingest_mode: saas-swarm
note: 본 blueprint = MVP 청사진. NOT production SaaS. FSC 법무 확인·환각 fact-check·13F lag 명시 3 showstopper 해결 전 launch ❌.
---

# Crypto Signal Dashboard SaaS MVP Blueprint

> **본질**: 사용자 본인 운영 Crypto-Dashboard (github.com/blazethrottle/cryptodashboard)를 한국 솔로 트레이더 향 SaaS化 청사진. 7-agent saas-swarm Skill 첫 시범 산출.
> **정직 명시**: MVP blueprint ≠ production. 3 showstopper 해결 전 launch 금지.
> Inspiration: [[Sairahul-Kimi-Agent-Swarm-7-Agents-SaaS-2026-05]] · [[Kimi-Agent-Swarm]] · [[Karpathy-LLM-Coding-Guidelines-4]]

## 1. Research Agent (시장·고객·경쟁자)

### 4 Customer Groups

| Segment | Profile | Pain Point | Willingness to Pay |
|---------|---------|-----------|-------|
| 한국 솔로 트레이더 (Core) | 30~40대, 자산 $50K~$500K, 5~10 거래소·앱 분산 | 통합 없음·영어 약함·Bloomberg $24K/년 비쌈 | $20~50/월 ⭐⭐⭐⭐ |
| 한국 알트 헌터 | 20~30대 멀티배거 추구, 신생 코인 빠른 진입 | 데이터 source 신뢰성·기관 진입 신호 부재 | $30~70/월 ⭐⭐⭐⭐ |
| 한국 기관 자금 추적 fan | 30~40대 distressed 진입·whale 따라가기 | 13F filing 한국어 분석 부재·실시간 ❌ | $50~100/월 ⭐⭐⭐ |
| 일본·동남아 영어 약함 | 동일 pain point + 언어 추가 | KR 한국어 우선 + JP·ID 다국어 확장 | $20~40/월 ⭐⭐ |

### Top 3 Competitors

| 도구 | Strength | Weakness | Pricing |
|------|----------|----------|---------|
| **Bloomberg Terminal** | 종합 데이터·기관 신뢰 | $24K/년·영어·복잡 | $24K/년 |
| **TradingView** | 차트·indicator·커뮤니티 | 매수매도 시그널 자동 ❌·기관 추적 ❌ | $0~$60/월 |
| **CryptoQuant** | 온체인 데이터·X-VIP 신뢰 | 영어·기관 추적 분산·한국 사용자 UI 비친화 | $0~$799/월 |

### Top 5 Use Cases

1. 솔로 트레이더가 **아침 첫 30분** 16 코인 시그널·기관 동향·매수매도 알림 통합 확인
2. 알트 헌터가 **신생 코인 multibagger score + 기관 진입 시그널** 자동 추적
3. 한국 사용자가 **영어 13F filing → 한국어 brief** 자동 변환 받음
4. Telegram·macOS 알림으로 **거래소 앱 켜기 전** 시장 sentiment 파악
5. 매주 사용자가 **갭·반복 키워드 → 다음 SaaS thesis** 도출 (사용자 본인 패턴)

### Key Insight (Sairahul "audit IS sales weapon" 패턴 정합)

**시그널 ≠ product. 시그널 = 한국 솔로 트레이더가 영어 Bloomberg를 넘어서는 가성비 도구. 통합·한국어·자동 = 3 sales weapon**.

### Positioning (1 line)

"한국 솔로 트레이더의 첫 Bloomberg Terminal: 통합·한국어·자동"

## 2. Product Manager Agent (MVP scope·feature·pricing)

### MVP Scope (5 screens only, ruthlessly cut)

1. **Login/Signup** (Google OAuth + email)
2. **Coin Universe Selector** (사용자 16 코인 선택, fixed 16 default)
3. **Signal Dashboard** (Top: Fear&Greed + BTC·ETH·SOL·XRP 4 main / Middle: 16 코인 시그널 / Bottom: 기관 자금 흐름)
4. **Brief View** (한국어 LLM brief, 매일 1회 자동 + 사용자 요청 시)
5. **Settings + Alerts** (Telegram·macOS·email 알림 설정)

### NO (cut ruthlessly)
- Team accounts · billing detail · CRM · API access · marketplace · browser extension · backtest 도구 · 자동 매매 (legal 위험)

### Core 10 Features

| # | Feature | Why |
|---|---------|-----|
| 1 | 5종 무료 데이터 source 통합 (Binance·CoinGecko·DefiLlama·DexScreener·mempool) | 핵심 가치 |
| 2 | 16 코인 RSI·MA 시그널 매수매도 | 핵심 가치 |
| 3 | 7 기관 13F + **"Filing date·lag 135일 명시"** | QA #5 mitigation |
| 4 | 한국어 LLM brief (Sonnet 4.6 + **fact-check loop + citation 강제**) | QA #12 mitigation |
| 5 | Telegram + macOS + email 알림 | 한국 시장 친화 |
| 6 | Fear & Greed Index + CoinGecko Global | 매크로 |
| 7 | Multibagger Score (사용자 본인 logic) | 알트 헌터 |
| 8 | Trade Plan view (X-VIP 십계명) | 사용자 thesis 차별화 |
| 9 | Alert frequency 조절 (QA #14 fatigue 방지) | UX |
| 10 | **"This is NOT investment advice" disclaimer 매 화면** | QA #9 mitigation |

### Pricing Model (3-tier freemium)

- **Free**: 4 main 코인 (BTC·ETH·SOL·XRP) + 일별 brief 1회
- **Pro ₩29,000/월 (~$22)**: 16 코인 + 무제한 brief + 알림
- **Pro Plus ₩59,000/월 (~$45)**: + 기관 7 추적 + multibagger score + custom universe

(원화 결제 = Korea 사용자 진입 장벽 ↓)

### Success Metric (1)

**Activation = 가입 후 7일 내 알림 5+ 받고 1+ 시그널 액션 (사용자 cited "useful" survey 응답)**.

## 3. UX Agent (user flow·dashboard·report layout)

### 5-Step User Journey

1. **랜딩** → "30일 무료" CTA + 1 screenshot (Korean Bloomberg-like dashboard)
2. **가입** (Google OAuth 30초)
3. **온보딩** = 16 코인 default + 알림 채널 선택 + 한국어 brief sample 1회
4. **첫 시그널 알림** (24시간 내, 알림 5+ 보장 위해 RSI 임계 조정)
5. **Pro 전환** (Day 14 trial 만료 알림 + 알림 5+ 받은 사용자 conversion rate ↑)

### Dashboard Layout

- **Top (Hero, 매크로)**: Fear & Greed 큰 숫자 + BTC·ETH·SOL·XRP 4 핵심 카드 (24h 변동 + RSI 시그널 색)
- **Middle (시그널 핵심)**: 16 코인 grid (코인·현재가·RSI·매수매도·기관 동향 1줄)
- **Bottom (기관 + brief)**: 7 기관 자금 흐름 graph (45일 lag 명시) + 한국어 brief 요약 1단락 + "전체 보기"

### Brief Layout (한국어, client-friendly)

```
━━━ 2026-05-28 한국어 시그널 Brief ━━━

📊 매크로: Fear & Greed 26 (극도 공포). 매크로 사이클 후반 진입 신호.

🟢 매수 신호 (오늘 8개)
- SOL: 일봉 RSI 28, 200일선 위 (X-VIP 십계명 #6)
- XRP: 주봉 RSI 30, 매수 영역
- ...

🔴 매도 신호 (오늘 2개)
- AAVE: 일봉 RSI 82 (과매수)
- ...

🏛️ 기관 자금 흐름 (Q1 2026, 45일 lag)
- Bitwise: 평균 매수 1.71 (가장 적극)
- Grayscale: ETH 7개 기관 모두 보유 (컨센서스)

⚠️ 본 brief는 투자 자문 아님. 데이터 출처·날짜 명시. 시그널 = 참고 자료.

[데이터 출처: Binance·CoinGecko·SEC 13F filings. Filing date 2026-02-15 (103일 지남)]
━━━
```

→ 사용자 한국인 30초 안에 이해. **출처·날짜·면책 명시 매번**.

## 4. Frontend Agent (UI plan·components)

### Hero Section (랜딩)

- **Headline (한국어)**: "한국 솔로 트레이더의 첫 Bloomberg Terminal"
- **Subheadline**: "5종 데이터·16 코인·기관 추적·한국어 brief. 무료 30일."
- **CTA**: "30일 무료 시작" (Google OAuth)

### Input Card (Coin Selector)

- 16 default coins (사용자 universe)
- Pro Plus = "코인 추가" (drag-and-drop)
- 거래소 선택 (Binance·Upbit·Bithumb·Bybit·OKX)
- 알림 채널 (Telegram·macOS·email)

### Results Dashboard Component List (10)

| Component | Purpose |
|-----------|---------|
| `<FearGreedIndex>` | Top 매크로 큰 숫자 |
| `<CoreCoinCard>` | BTC·ETH·SOL·XRP 4 main |
| `<SignalGrid>` | 16 코인 grid |
| `<RSISignalBadge>` | 매수·매도·hold 색 코딩 (green·red·gray) |
| `<InstitutionFlowChart>` | 기관 자금 흐름 + **"Filing date lag" label** |
| `<KoreanBriefCard>` | 한국어 brief 요약 + "전체 보기" |
| `<AlertSettings>` | 채널·빈도 조절 (fatigue 방지) |
| `<MultibaggerScore>` | Pro Plus 알트 헌터용 |
| `<DisclaimerBanner>` | 매 화면 상단 "투자 자문 아님" |
| `<DataSourceLagBadge>` | 모든 component에 데이터 출처·날짜·lag 명시 |

→ 디자인 = clean·info-dense·Korean-friendly. Bloomberg 모방 ❌, 한국 가성비 정렬 ✅.

## 5. Backend Agent (scoring·API·data)

### Scoring System (사용자 본인 logic 재활용, 100점 5 category)

| Category | 배점 | 사용 모듈 |
|---------|------|-----------|
| **RSI·MA 매수매도** | 30 | `src/lib/signals.ts` (변경 금지) |
| **Multibagger Score** | 20 | `src/lib/multibagger.ts` |
| **기관 자금 흐름 momentum** | 20 | `src/lib/institutions.ts` + filing date weighted |
| **온체인 health** (BTC·SOL) | 15 | `src/lib/onchain/btc.ts` + Solana RPC |
| **매크로 sentiment** (Fear & Greed) | 15 | CoinGecko Global |

### API Endpoints (5 max, REST)

| Endpoint | INPUT | OUTPUT |
|----------|-------|--------|
| `POST /signal/scan` | coin list, user_id | signal grid (16 coins) |
| `GET /brief/:date` | user_id, lang=ko | 한국어 brief markdown |
| `POST /alert/config` | channels, frequency | alert subscription |
| `GET /institution/:slug` | grayscale·bitwise·... | 13F filing + lag label |
| `GET /multibagger/scan` | universe | sorted multibagger candidates |

### Data Model (3 entities max)

| Entity | Fields |
|--------|--------|
| `User` | id, email, plan (free·pro·proplus), universe[16], alert_config |
| `Signal` | id, coin, timestamp, rsi_d, rsi_w, ma_50, ma_200, signal_type (buy·sell·hold), source_lag_days |
| `Brief` | id, date, lang, content_markdown, sources[], confidence_score |

### Score Explainability (QA #12 mitigation 의무)

**black-box "AI score" feels fake** (Sairahul 명시). 각 시그널 = specific reasons:
- "SOL: 일봉 RSI 28 (과매도). 200일선 위. 7일 후 평균 +12% 반등 (백테스트 2024+)"
- 신호 카드 expand 시 = 데이터 출처·계산 logic·과거 정확도 표시

## 6. QA Agent 결과 (요약, [원문 별도 보존])

### Top 16 Attack Vectors (압축)

1. Binance·CoinGecko API limit·schema 변경 → silent fail
2. Korean IP geofencing (Binance July 2024 차단)
3. mempool.space 300 req/hr → BTC 변동 시 8분 만에 소진
4. **13F filing 135일 lag = "Institutional" misleading**
5. **RSI 30/70 = 2017 cycle, 2025+ AI 헤지펀드·기관 환경 부적합**
6. 16 코인 universe = 사용자 사고 싶은 코인 부재
7. MA period 미명시 → 3x 다른 시그널
8. **한국 FSC 투자자문업 license = 5년 징역·₩200M 벌금**
9. 자본시장법 자동매매 = 미등록 = 불법
10. 한국 소비자보호법 = 사용자 손실 → 손해배상 소송
11. **Sonnet 환각 (15-25% 수치 환각·8-12% 출처 위조)**
12. Brief 출처·날짜 미표시 = 신뢰 붕괴 + 법적 문제
13. 알림 폭주 → 사용자 ignore 학습 → 진짜 시그널 놓침
14. 모바일 알림 갭 (KakaoTalk 없음, 한국 retail 40% 모바일 우선)
15. False positive cascade → Reddit/Twitter 부정 후기
16. **무료 데이터 source TOS 위반 (Binance·CoinGecko 상업 사용 금지 가능)**

### 7 Failure Modes (압축)

| Mode | Detection | Recovery | Severity |
|------|-----------|----------|----------|
| API 다운 | 30분 update ❌ | cache fallback + 사용자 알림 | P1 |
| RSI NaN propagation | "null" 값 시그널 | 자동 차단 + 수동 검토 | **P0** |
| 13F lag misleading | 사용자 confusion | "Filing date" label 강제 | P2 |
| Sonnet 환각 | 사용자 신고 | rate-limit + fact-check + citation 강제 | **P0** |
| 한국 FSC cease-and-desist | 공식 letter | 즉시 shut down + 법무 + 환불 | **P0** |
| 사용자 손실 chargeback | Stripe claim | 매번 manual review + 법무 ₩50M+ | **P0** |
| Telegram API deprecated | 알림 send ❌ | native app 재engineering | P1 |

### Human Review Gate (4)

1. Sonnet brief 표시 전 = 주 1회 sampling fact-check (1 out of 10)
2. 7일 내 false signal 3+ = signal 자동 일시 정지 + recalibrate 알림
3. 신규 국가 launch 전 = 법무 review (FSC·FCA·CFTC)
4. 사용자 10x median 거래 = warning "Are you sure? 집중 위험"

## 7. Launch Agent (positioning·copy)

### Positioning (1 line, magnetic)

**"한국 솔로 트레이더의 첫 Bloomberg Terminal: 통합·한국어·자동"**

→ Bloomberg = 권위. "첫" = 신규. 한국어 = 차별. 통합·한국어·자동 = 3 value.

### Landing Page Structure

- **Headline**: 한국 솔로 트레이더의 첫 Bloomberg Terminal
- **Subheadline**: 5종 데이터 통합 · 16 코인 자동 시그널 · 한국어 brief · 30일 무료
- **3 Value Lines**:
  - 5종 무료 데이터를 30초 안에 통합. Binance·CoinGecko·DefiLlama·DexScreener·mempool
  - 16 코인 RSI·MA 시그널을 매일 자동. Telegram·macOS 알림
  - 영어 13F filing을 한국어 brief로. 출처·날짜·면책 명시

### X Launch Post (한국어, 280자)

**Short**:
```
한국 솔로 트레이더용 시그널 대시보드를 만들었습니다.

5종 데이터 통합 · 16 코인 시그널 · 기관 자금 추적 · 한국어 brief · Telegram 알림.

30일 무료. ₩29,000/월.

Bloomberg 너무 비싸고, 무료 도구는 분산. 그 갭을 메웁니다.

⚠️ 투자 자문 아님. 시그널 = 참고.
```

**Long thread (5 tweets)**: omitted for brevity, 위 short 확장.

### Cold Email Template (한국 알트·기관 트래커 향)

```
제목: [실명] 그래스케일이 어제 매수한 알트 코인 1개, RSI 시그널 동시 발생

본문:
안녕하세요 [실명]님,

Bitwise·Grayscale 13F filing (2026-02-15 기준) 분석 결과,
사용자님 X 게시글에서 언급하신 [코인]에 두 기관 모두 진입했습니다.

오늘 오전 [코인] 일봉 RSI = 28 (과매도). 매수 시그널입니다.

본 데이터·시그널 + 한국어 매일 brief를 7일 무료로 받아보시려면 ↓
https://[domain].com/trial?ref=[user_handle]

본 메일은 투자 자문 아닙니다. 시그널 = 참고 자료.

감사합니다.
```

### CTA (single)

**"30일 무료 시작"** (Google OAuth, 카드 정보 ❌)

## 사용자 정직 명시 (Sairahul 패턴, 필수)

**This is a strong MVP blueprint. NOT a production SaaS.**

여전히 필요:
- ✅ FSC 법무 확인 (45-60일, **showstopper #1**)
- ✅ Sonnet fact-check loop + citation 강제 (2주, **showstopper #2**)
- ✅ 13F lag 명시 + "Institutional flows" 재정의 (1주, **showstopper #3**)
- Production code (Vite + Tailwind + Node.js 기존 + auth·결제·subscription 추가)
- Real users (Test with 5 real users 우선, Sairahul 명시)
- Payments (Stripe 한국 통합 또는 Toss·Iamport)
- Hosting (현 GitHub Pages → Vercel·Fly.io 사용자 traffic 대비)
- Error handling, customer support, distribution
- Manual QA 빌드 전후

→ "Press button, become rich ❌". First 70% 정리. **founder = taste·judgment·shipping·distribution 소유**.

## Top 3 Showstoppers (해결 전 launch ❌)

### 🔴 #1: Korean FSC 투자자문업 License (P0, 5년 징역·₩200M 벌금)

- **상태**: License 없음. 시그널 = advice 해석 가능
- **조치**: FSC 공식 letter 보내기 "본 dashboard가 투자자문업 등록 필요한가?"
- **Timeline**: 45-60일
- **Decision Gate**:
  - YES → License 취득 또는 산업 pivot ("정보 제공 only", "시그널" 단어 제거)
  - NO → 명확한 법무 문서 + 진행
  - UNCLEAR → 한국 차단 + 미국·일본 사용자만 (한국 시장 핵심 가치 손실)
- **Mitigation 우선**: 모든 UI에 "투자 자문 아님" disclaimer + "시그널 = 참고 자료" 명시

### 🔴 #2: Sonnet 환각 fact-check loop (P0, 사용자 손실 → 법적 책임)

- **상태**: Brief = Sonnet 4.6 자동 생성. 출처·fact-check ❌
- **조치**:
  - Citation 강제 (출처 없으면 brief 생성 ❌)
  - Temperature 0.3 (정확성 우선)
  - 주 1회 sampling audit (1 out of 10)
  - Brief 금지: 수치·예측·매수매도 추천 (factual summary만)
  - Display: "Data lag·This is NOT advice" 매번
- **Timeline**: 2주

### 🔴 #3: 13F Filing Lag 명시 (P0, 사용자 신뢰 + 법적)

- **상태**: "Institutional flows" 표시. 13F = 분기 1회 + 45일 후 filing = 최대 135일 lag
- **조치**:
  - 대시보드 매번 "Last filing: 2026-02-15 (103일 지남)" 표시
  - 또는 feature rename: "Historical Institutional Positioning" (실시간 아님 명시)
  - 또는 daily fund flows API 추가 (Grayscale·Bitwise 직접 공시)
- **Timeline**: 1주

## D3 #7 측정 후보 (saas-swarm 첫 시범 효과)

- W-1: saas-swarm 사용 전 (현 manual 사용자 의사결정 방식)
- W+1: saas-swarm 적용 후 (본 청사진 + 사용자 후속 작업)
- 정성 지표 시범:
  - blueprint 완성도 (현재 = 7 layer 풀 + QA 16 vectors + 3 showstoppers)
  - 시간 절약 (사용자 manual 빌드 = 1-2주 vs saas-swarm = 1 afternoon)
  - 실제 빌드 진행률 (1개월 후 측정)
  - 사용자 액션 결정 가능 (옵션 매트릭스 vs blank page)

## 사용자 정합 매트릭스

| 사용자 목표 | 정합 |
|---------|------|
| #3 암호화폐·미래 금융 전문가 | ⭐⭐⭐⭐⭐ (Crypto-Dashboard 활성 프로젝트 직결) |
| 자동 수입 파이프라인 | ⭐⭐⭐⭐ (SaaS = 자동 수입 후보 #1) |
| #2 AI 활용 전문가 | ⭐⭐⭐⭐ (saas-swarm Skill 첫 실증) |
| #1 독보적 영역·브랜드 | ⭐⭐⭐ (한국 솔로 트레이더 차별화) |

## 사용자 결정 옵션 매트릭스 (다음 step)

| 옵션 | Trade-off | 권장 |
|------|-----------|------|
| **A. Test with 5 real users 우선** (Sairahul 명시) | 시장 검증 + showstopper 해결 시간 확보 + 1루타 정합 | **⭐⭐⭐⭐⭐ 추천** |
| B. Production code 시작 | 빌드 우선 + 3 showstopper 동시 진행 위험 | ⭐⭐⭐ |
| C. FSC 법무 확인만 진행 + 빌드 보류 | 안전 우선 + 60일 지연 | ⭐⭐⭐⭐ |
| D. SaaS 화 포기 + 본인용 dashboard 보강 | 법적 안전 + 자동 수입 ❌ | ⭐⭐ |

**A 추천 사유 (1루타 정합)**:
1. Sairahul 본인 명시: "Test with 5 real users before adding anything else"
2. 5 사용자 = 한국 솔로 트레이더 + 알트 헌터 + 기관 추적 fan 골고루
3. 사용자 인터뷰로 false signal·실제 가치·pricing 검증
4. FSC 법무 확인 (45-60일) 동시 진행 = 시간 효율
5. "X 안 될 때 먼저 정의" 원칙 = QA 16 vectors + 3 showstoppers 미해결 상태에서 production code ❌
6. 사용자 비개발자 = 빌드 cost vs 인터뷰 cost = 인터뷰 압도적 낮음

## Contrarian 경계 (본 blueprint 자체)

1. **사용자 본인 Crypto-Dashboard = SaaS化 vs 본인용 도구 본질 다름** (외부 사용자 = 다른 needs)
2. **사용자 비개발자** = Production code 빌드 = Claude가 거의 100% 직접 수행 필요
3. **3 showstoppers 모두 해결 시간 + cost** = MVP launch까지 최소 2~3개월
4. **한국 솔로 트레이더 시장 크기 측정 ❌** (TAM·SAM·SOM 추정 부족)
5. **경쟁자 진입 위험** (TradingView 한국어 확장 등)
6. **사용자 본인 thesis "다음 프로덕트 발굴 인프라" vs SaaS化 = 목적 충돌 가능** (SaaS 운영 = 사용자 시간 소모)

## 관련

- [[Sairahul-Kimi-Agent-Swarm-7-Agents-SaaS-2026-05]] (7-agent 패턴 inspiration)
- [[Kimi-Agent-Swarm]] · [[Karpathy-LLM-Coding-Guidelines-4]] · [[Five-Class-AI-Economy]]
- [[Crypto-Dashboard]] project (사용자 활성 자산 = 본 SaaS의 기반)
- [[Anthropic-Security-Guidance-Plugin-2026-05]] (보안 자동 검토 직결)
- [[D3-Effect-Measurement]] (D3 #7 후보)
- 메모리: `project_crypto_dashboard.md` (사용자 활성 프로젝트)
- 메모리: `user_goals.md` (#3 + 자동 수입 파이프라인)
