# Crypto Dashboard — Project Rules

## Git 워크플로우 (필수 준수)

**Repo**: https://github.com/blazethrottle/cryptodashboard

**브랜치 정책**:
- `main` — protected. 사용자가 직접 또는 PR로만 머지. **Claude는 main에 직접 push 금지**.
- `dev` — Claude의 자동 작업 브랜치. 코드 변경 후 자동 commit + push.

**자동 commit/push (사용자 명시 동의)**:
- 의미 있는 변경 단위 (새 기능, 중요한 fix 등) 마다 자동 처리
- `git add . && git commit -m "..." && git push origin dev`
- 매 응답마다는 X. "작업 단위 완료" 시.
- main에 직접 push 시도 금지 (시스템 BLOCK rule + 사용자 정책)

**커밋 메시지 규격**:
- 한 줄 요약: `feat:`/`fix:`/`docs:`/`refactor:`/`chore:` prefix
- 본문은 한국어 OK (이 프로젝트는 한국어 작업)
- Co-Authored-By trailer 포함

## llm-wiki sync는 별도

`npm run sync -- --commit --push`는 **llm-wiki repo**에 push (cryptodashboard와 다른 repo).
사용자가 명시적으로 `--push` 플래그 사용 시에만. main 브랜치 push이지만 사용자 운영 중인 기존 패턴.

## 코드 변경 후 체크리스트

1. `npm run typecheck` 통과 확인
2. 새 명령어 추가 시 `package.json scripts`에 등록 + README 업데이트
3. 의미 단위 변경이면: `git add . && git commit && git push origin dev`
4. README/CLAUDE.md에 영향 있으면 함께 업데이트

## 모듈 책임

- `src/lib/exchanges/` — Binance + CoinGecko (절대 secret 하드코딩 X)
- `src/lib/onchain/` — DefiLlama, mempool.space, Solana RPC
- `src/lib/indicators.ts` — RSI/SMA 등 순수 함수, I/O 없음
- `src/lib/signals.ts` — 사용자 매매 룰 (변경 금지: RSI 30/70, 일봉 50/80 + 50일선, 200일선)
- `src/lib/wiki/` — llm-wiki 동기화 (~/.../iCloud~md~obsidian/Documents/llm-wiki)
- `src/scripts/` — CLI entrypoints

## llm-wiki 인터랙션

- `wiki/entities/` — 코인·기관 엔티티 (markers 패턴, 사용자 본문 보존)
- `wiki/crypto-signals/YYYY-MM/YYYY-MM-DD_crypto-signals.md` — 일별 시그널 (덮어쓰기)
- `wiki/sources/<date>_Crypto-Signal-Brief.md` — LLM brief
- `wiki/projects/Crypto-Dashboard.md` — 프로젝트 인덱스
- `log.md` — sync 항목 append
- **wiki/daily-signals/는 Agent Treasury 프로젝트 폴더 — 절대 수정 X**

## 보안

- ANTHROPIC_API_KEY는 .env (gitignored)에서만
- node_modules, data/snapshots, data/institutions 모두 gitignore
- .claude/settings.local.json도 gitignore (사용자별 권한 설정)
