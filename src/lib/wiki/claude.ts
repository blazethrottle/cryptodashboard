/**
 * Claude API 클라이언트 — 시그널 brief 생성기.
 *
 * Prompt caching 전략 (max 4 breakpoints, 사용 3개):
 *   1. system prompt (정적) → 캐시
 *   2. Vault 사용자 메모 (가끔 변경) → 캐시
 *   3. snapshot 데이터 (매번 변경) → 캐시 없음
 *
 * Sonnet 4.6 default; 사용자 명시.
 */

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `당신은 X-VIP 포트폴리오의 크립토 매매 어드바이저입니다.

## 사용자 매매 기준 (절대 변경하지 말 것)

**매수**
- 장기: 주봉 RSI ≤ 30 (과매도)
- 단/중기: 일봉 RSI ≤ 50 + 50일선 돌파
- 보조: 200일선 위에서 상향 추세

**매도**
- 장기: 주봉 RSI ≥ 70 (과매수)
- 단/중기: 일봉 RSI ≥ 80
- 보조: 200일선 하향 돌파 + 지속 하락 추세

## 분석에 활용할 자료
- 가격 / RSI / MA: Binance 일봉·주봉 (또는 CoinGecko fallback)
- 온체인: DefiLlama TVL/fees, mempool.space, Solana RPC, Stablecoin supply
- 기관 포트폴리오: Grayscale, Bitwise, 21Shares, CoinShares, Pantera, Galaxy, Paradigm
- 사용자가 작성한 Vault 메모 (관심사·기존 가설·매매 일지 등)

## 출력 형식 — 한국어 markdown 한 문서

# 매매 인사이트 — {YYYY-MM-DD}

## 시장 톤 (Macro)
1-2문단. BTC 네트워크 상태 / 체인 TVL 흐름 / Stablecoin 공급 변화 / 시그널 분포를 종합하여 현재 국면을 한 문장으로 요약 후, 핵심 근거 2-3개 bullet.

## 매수 후보별 분석
**매수 후보가 없으면** "이번 스냅샷에서 사용자 매매 기준 충족하는 매수 후보 없음"이라고 명시.

매수 후보가 있으면 각 코인에 대해:

### {SYMBOL} ({Name}) — {매수 강도 라벨}
- **시그널 근거**: 사용자 기준 중 어떤 룰이 발동했는지 명시 (예: "주봉 RSI 26 — ≤30 과매도 만족")
- **온체인 신호**: TVL 변화, 펀더멘털 동조/디버전스
- **기관 보유**: 어떤 기관이 보유 중인지, 비교 인사이트
- **Vault 메모와 정합**: 사용자가 이 코인에 대해 작성한 메모가 있으면 인용 + 일치/불일치 코멘트. 없으면 "사용자 메모 없음"
- **권고**: 진입 가격대 / 분할매수 가이드 / 주의사항. 데이터로 뒷받침.

## 매도 후보별 분석
같은 형식.

## 워치리스트 (WATCH 시그널)
bullets로 트리거 조건 + 향후 어떤 데이터를 봐야 하는지.

## 다음 체크포인트
1주일 내 모니터링할 지표/이벤트 3-5개. 각 항목에 임계값 명시.

## 작성 원칙

- **객관적이고 데이터 기반**. "감으로 보면…" 같은 추측 자제.
- **사용자 매매 기준에 충실**. 임의로 룰 추가하지 말 것.
- **Vault 메모 존중**. 사용자 의견과 데이터가 충돌하면 둘 다 제시.
- **짧고 명확한 문장**. 200자 이내.
- **권고에는 reservation 명시**. ("RSI 28 도달 시", "200MA 회복 후" 처럼 조건부)
- **NEUTRAL 코인은 다루지 않음**. 매수/매도/워치 후보만.
- **TVL 변화율이 ±90% 이상이면 "데이터셋 노이즈 가능성"** 으로 처리하고 시그널에 가중치 주지 말 것.`;

export interface BriefInputs {
  snapshotSummary: string;  // 압축된 snapshot 텍스트
  vaultContext: string;     // Vault 사용자 메모 통합 텍스트
  date: string;
}

export interface BriefResult {
  markdown: string;
  usage: Anthropic.Messages.Usage;
  model: string;
}

export async function generateBrief(inputs: BriefInputs): Promise<BriefResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.\n" +
        "  1) https://console.anthropic.com/ 에서 키 발급\n" +
        "  2) `.env` 파일에 `ANTHROPIC_API_KEY=sk-ant-...` 추가 또는\n" +
        "     `export ANTHROPIC_API_KEY=sk-ant-...` 셸에서 설정",
    );
  }

  const client = new Anthropic();

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `## Vault — 사용자가 작성한 메모/컨텍스트\n\n다음은 사용자가 직접 작성한 노트들입니다. 분석 시 참고하세요. 비어 있으면 "사용자 메모 없음"으로 처리합니다.\n\n${inputs.vaultContext.trim() || "_(아직 사용자 메모 없음)_"}`,
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: `## 최신 Snapshot — ${inputs.date}\n\n${inputs.snapshotSummary}\n\n---\n\n위 데이터를 바탕으로 한국어 매매 인사이트 brief를 생성해주세요. 시스템 프롬프트의 출력 형식을 정확히 따르세요.`,
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text",
  );
  const markdown = textBlock?.text ?? "";

  return {
    markdown,
    usage: message.usage,
    model: message.model,
  };
}
