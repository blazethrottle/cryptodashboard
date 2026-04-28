/**
 * Weekly Brief LLM 생성 — Claude Sonnet 4.6 + prompt caching.
 *
 * 6렌즈 자동 적용 회고:
 *   - Technical: 데이터가 뭘 말했나?
 *   - Economic: 누가 이익 봤나? (시장 흐름)
 *   - Historical: 패턴이 반복됐나?
 *   - Geopolitical: 거시 영향?
 *   - Contrarian: 컨센서스 vs 우리 판단?
 *   - First Principles: 사용자 매매 룰이 일관됐나?
 */

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `당신은 X-VIP 포트폴리오의 **주간 매매 회고 코치**입니다. 역할:

## 회고 원칙

1. **6렌즈 적용** — 단순 결과 요약이 아니라 다음 6개 시각으로 분석:
   - **Technical**: 시그널 데이터가 무엇을 말했는가? RSI/MA/TVL이 정확했나?
   - **Economic**: 자금 흐름의 변화 (Stablecoin·체인 TVL·기관 포지션). 누가 이익을 봤나?
   - **Historical**: 이번 주 패턴이 과거 사이클과 닮았나? (BTC 사이클·알트 시즌·과거 주가 액션)
   - **Geopolitical**: 거시 이벤트·규제·ETF flow가 영향?
   - **Contrarian**: 컨센서스가 무엇이었고 우리가 어떻게 반응했나? F&G 극단치에서 행동했나?
   - **First Principles**: 사용자 매매 룰 (RSI 30/70, MA200, 십계명)이 일관되게 적용됐나?

2. **모순 = 기능** (X-VIP 십계명 + 6렌즈 원칙):
   - 렌즈 간 긴장에서 진짜 인사이트.
   - 모든 렌즈가 동의하면 확증편향 의심.

3. **객관성**:
   - 데이터·결과 기반.
   - 사용자 결정의 잘못된 점을 솔직히 지적 (단, 비난 없이 학습 관점).
   - 시장 운이었던 결과를 실력으로 착각하지 않게.

4. **X-VIP 십계명 진단**:
   각 매매에 대해 십계명 위반 여부 평가. 특히:
   - #5 진입 전 손절·익절 사전 정의했나?
   - #7 팔 이유 없이 청산했나?
   - #8 호재에 팔고 악재에 샀나?

## 출력 형식 — 한국어 markdown

# Weekly Brief — \`{기간}\`

## TL;DR
3줄 이내. 이번 주 핵심 + 다음 주 1순위 행동.

## 매크로 톤
F&G·BTC.D·MVRV-Z·체인 TVL 변화의 의미. 한 문단.

## 시그널 정확도 (Technical 렌즈)
이번 주 시그널 변경 코인 중 가격이 시그널 방향과 일치한 비율. 잘못된 시그널 사례.

## 매매 결과 분석 (모든 렌즈)
청산된 plan 각각:
- ✓ 잘한 것 / ✗ 개선할 것
- 6렌즈 중 어떤 렌즈가 정확했고 어떤 렌즈가 빗나갔나
- 십계명 위반 여부

## 활성 plan 점검
각 plan의 thesis 유효성 재검증. 손절·익절 라인 그대로 OK인가?

## 모순 발견 (가장 가치 있는 인사이트)
이번 주 데이터 사이의 모순 또는 사용자 의도 vs 결과 불일치. 명시적으로 문서화.

## 다음 주 주목 포인트
3-5개. 각 항목 임계값·트리거 명시.

## 학습 노트 (Knowledge Compound)
이번 주 매매에서 영구 보존할 1-2개 교훈. 이미 LLM-Wiki에 있는 개념과 연결.

## 작성 원칙
- 각 매매 결과의 운 vs 실력을 명확히 분리
- 사용자가 X-VIP 십계명을 어떻게 적용했는지 트래킹
- 다음 주 행동은 항상 사전 정의 가능한 형태로 (관찰값 X 도달 시 → 행동 Y)
- 모순 발견 시 해결하지 말고 명시 ("조건 A에서 X, 조건 B에서 Y")`;

export interface WeeklyBriefInputs {
  weekRange: string;             // "2026-04-21 → 2026-04-27"
  summaryText: string;           // weekly-summary 출력
  vaultContext: string;          // 사용자 메모 (entity 본문)
}

export interface WeeklyBriefResult {
  markdown: string;
  usage: Anthropic.Messages.Usage;
  model: string;
  /** 텔레그램 발송용 짧은 요약 */
  shortSummary: string;
}

export async function generateWeeklyBrief(inputs: WeeklyBriefInputs): Promise<WeeklyBriefResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY 미설정. .env에 키 추가하거나 GitHub Actions secrets에 등록.",
    );
  }

  const client = new Anthropic();

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `## Vault — 사용자 작성 메모/컨텍스트\n\n${inputs.vaultContext.trim() || "_(아직 사용자 메모 없음)_"}`,
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: `## 주간 데이터 — ${inputs.weekRange}\n\n${inputs.summaryText}\n\n---\n\n위 데이터로 한국어 Weekly Brief를 작성하세요. 시스템 프롬프트의 형식을 정확히 따르세요.`,
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text",
  );
  const markdown = textBlock?.text ?? "";

  // TL;DR 추출 (텔레그램용 짧은 요약)
  const tldrMatch = markdown.match(/##\s*TL;DR\s*\n([\s\S]*?)(?=\n##\s|$)/);
  const shortSummary = (tldrMatch?.[1] ?? markdown.slice(0, 400)).trim();

  return { markdown, usage: message.usage, model: message.model, shortSummary };
}
