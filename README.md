# Crypto Dashboard

X-VIP 포트폴리오 + 기관 포트폴리오 매매 시그널 대시보드.

## 매매 기준

**매수**
- 장기: 주봉 RSI ≤ 30 (과매도)
- 단/중기: 일봉 RSI ≤ 50 + 50일선 돌파
- 보조: 가격이 200일선 위에서 상향 추세

**매도**
- 장기: 주봉 RSI ≥ 70 (과매수)
- 단/중기: 일봉 RSI ≥ 80
- 보조: 200일선 하향 돌파 + 지속 하락 추세

## 코인 유니버스

- **Core**: BTC, ETH, SOL, XRP
- **X-VIP**: 위 + LINK, SUI, XLM, ADA, AVAX, ARB, ALGO, DOT, LTC, ONDO, UNI, AAVE, TON, COMP, RENDER, BITTENSOR, DOGE, SHIB, ZEC, XMR
- **기관 추적**: Grayscale / Bitwise / 21Shares / CoinShares / Pantera / Galaxy / Paradigm

## 사용법

```bash
npm install
npm run snapshot              # 전체 유니버스 (priority 기본)
npm run snapshot:core         # BTC/ETH/SOL/XRP만
npm run institutions          # 기관 포트폴리오 분석
npm run sync                  # snapshot → llm-wiki 동기화
npm run sync -- --commit --push  # 동기화 후 llm-wiki에 자동 commit·push
npm run brief                 # Claude Sonnet 4.6 + Vault context로 LLM brief
npm run all                   # snapshot → institutions → sync → brief
```

## 웹 대시보드 (GitHub Pages)

배포 URL (Actions 첫 실행 후): **https://blazethrottle.github.io/cryptodashboard/**

**자동화 정책**:
- 30분마다 GitHub Actions가 자동 실행 → Binance/CoinGecko/DefiLlama 데이터 수집 → Pages 재배포
- 사용자는 URL만 열면 항상 최신 시그널 (60초 자동 새로고침)
- 페이지 1분 이내 새로고침으로 매크로/매수후보/기관 매트릭스/전체 분포 확인

**최초 1회 셋업** (사용자 직접):
1. https://github.com/blazethrottle/cryptodashboard/settings/pages 접속
2. "Build and deployment" 섹션 → Source: **GitHub Actions** 선택
3. 저장 → 첫 workflow는 다음 30분 cron 또는 https://github.com/blazethrottle/cryptodashboard/actions 에서 "Run workflow" 수동 실행

**로컬 개발/미리보기**:
```bash
npm run web:install      # 1회
npm run web:snapshot     # 백엔드 snapshot → web/public/data/ 복사
npm run web:dev          # http://localhost:5173 으로 미리보기
```

## Git 워크플로우

**Repo**: https://github.com/blazethrottle/cryptodashboard

- `main` — 보호된 기본 브랜치. PR로만 머지.
- `dev` — Claude 자동 작업 브랜치. `git push origin dev` 자동화 적용.

**최초 셋업 (사용자가 1회 직접 실행 필요)**:
```bash
git push -u origin main
```
이후 Claude는 `dev` 브랜치에 자동 commit/push, 사용자는 적당한 시점에 PR로 main에 머지.

자세한 작업 룰은 `.claude/CLAUDE.md` 참조.

결과는 콘솔 표 + `data/snapshots/<timestamp>.json`에 저장.

## 구조

```
src/
├── lib/
│   ├── binance.ts       # 캔들 데이터 fetcher
│   ├── indicators.ts    # RSI, MA 계산
│   ├── signals.ts       # 매수·매도 판정
│   └── universe.ts      # 코인 + 기관 포트폴리오
├── data/
│   └── institutions.json
└── scripts/
    └── snapshot.ts      # 메인 실행 스크립트
```
