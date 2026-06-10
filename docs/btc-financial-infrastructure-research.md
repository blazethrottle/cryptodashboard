# 비트코인 미래 금융 인프라 심층 리서치 — 설계 재료 보고서

> 상태: **리서치 산출물** (2026-06-10 기준 데이터)
> 목적: 온체인 데이터 파이프라인(→ `btc-onchain-raw-source-design.md`)을 장기적으로 **크립토 기반 비즈니스/수입 구조**로 발전시키기 위한 설계 재료 수집.
> 방법: 5개 축 병렬 리서치 (각 축 독립 에이전트, 13~17회 검색 + 주요 원문 fetch) → 에이전트 간 교차 검증 → 종합. 모든 주장에 출처·신뢰도 표기. **낙관·회의 양쪽 근거를 의도적으로 수집** (adversarial).

---

## 0. 경영 요약 (TL;DR)

**2026년 중반 기준, 세 가지 비트코인 미래 시나리오는 분리된 경쟁이 아니라 융합 중이다:**

> **A(디지털 금)가 자산을 공급하고, C(담보·정산 레이어)가 비즈니스 모델을 공급하고, B(결제 레일)는 달러(스테이블코인)를 실어 나르는 배관으로 생존한다.**

증거가 가장 빠르게 쌓이는 곳은 **시나리오 C** — JPMorgan BTC 담보대출, Coinbase 온체인 대출 $2.17B, Cantor $2B, IBIT 구조화 상품이 9개월 안에 모두 출현했다. 가장 중요한 프레임은:

> **"인프라는 래칫(역회전 방지 톱니), 가격·AUM은 사이클이다."**
> 2025-26 약세장(-50%)에도 법·규제·은행 레일은 한 칸도 후퇴하지 않았다.

**제품 시사점 한 줄**: 가격을 추적하는 도구는 레드오션이고, **래칫(인프라 진행도)을 추적하는 도구는 공백지**다. 우리의 원천 데이터 파이프라인은 이 공백을 메우는 기반이 된다. (상세 → §7)

---

## 1. 축 1 — 기관·국가 채택: 래칫과 사이클의 분리

### 1.1 시장 컨텍스트 (모든 수치의 배경)

BTC는 2025-10-06 사상최고 ~$126,200 → 2026년 2~6월 $60~63K 박스 (~-50%). 같은 기간 S&P 500은 +13% ([Motley Fool](https://www.fool.com/investing/2026/06/01/bitcoin-down-all-time-high-what-history-says/)). **신뢰도: 높음**

### 1.2 래칫 쪽 증거 (구조적, 비가역적 성격)

| 항목 | 내용 | 시점 | 신뢰도 |
|---|---|---|---|
| 미국 스테이블코인 법 | **GENIUS Act 서명** — 최초의 연방 스테이블코인 프레임워크, 시행규칙 2026-07-18 기한 | 2025-07-18 | 높음 |
| SEC 기조 반전 | Atkins 위원장 체제, Coinbase/Binance/Gemini 소송 종결, "Project Crypto" | 2025 | 높음 |
| 은행 레일 | **OCC 해석서한 1183/1184/1186** — 국법은행의 크립토 커스터디·매매대행·서브커스터디 허용 | 2025 | 높음 |
| BTC 담보대출 | **JPMorgan, 기관 대상 BTC/ETH 담보 인정** (제3자 커스터디), Wells Fargo·Citi도 2026 커스터디+신용 시사 | 2025년말~ | 중간 |
| 모기지 | FHFA가 Fannie/Freddie에 거래소 보유 크립토를 모기지 준비자산으로 인정 지시 (50~60% 헤어컷) | 2025-06-25 | 높음 |
| 13F 기관 | IBIT에 13F/13D/G 제출 기관 **1,683곳** (Citadel, Jane Street, Goldman 등). 하버드 기금은 IBIT $443M — **공개주식 1위 보유종목** | 2025-11 | 높음 |
| EU | MiCA 전환기간 종료, 전면 시행. CASP 185곳+ 인가 | 2026-07-01 | 높음 |
| 한국 | **2026년 현물 BTC ETF 출시 확정 + 법인 크립토 매수 허용** (경제성장전략) | 2026 | 중상 |
| 일본 | 크립토를 금융상품거래법(FIEA) 체계로 재분류 각의 결정 | 2026-04-10 | 중상 |
| 홍콩 | HKMA 최초 스테이블코인 라이선스 (HSBC, Anchorpoint) | 2026-04 | 중상 |

출처: [Congress.gov S.1582](https://www.congress.gov/bill/119/senate-bill/1582), [OCC NR 2025-42](https://www.occ.gov/news-issuances/news-releases/2025/nr-occ-2025-42.html), [CoinDesk JPMorgan](https://www.coindesk.com/markets/2025/10/24/jpmorgan-to-allow-clients-to-pledge-bitcoin-and-ether-as-collateral-bloomberg), [CNBC FHFA](https://www.cnbc.com/2025/06/25/trump-crypto-mortgage.html), [Fintel IBIT](https://fintel.io/so/us/ibit), [CoinDesk Harvard](https://www.coindesk.com/markets/2025/11/15/harvard-endowment-takes-rare-leap-into-bitcoin-with-usd443m-bet-on-blackrock-s-ibit), [ESMA MiCA](https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica), [CoinGape 한국 ETF](https://coingape.com/south-korea-confirms-spot-bitcoin-etf-launch-in-2026/)

### 1.3 사이클 쪽 증거 (회의론 — 2025-26 약세장이 노출한 것)

- **ETF AUM 왕복**: $169.5B(2025-10 정점) → **$77.6B**(2026-06-10, -54%). 누적 순유입은 ~$60B → **$53.8B**로 역류 (2026-01 한 달 -$3B+, IBIT 단독 $4.4B 환매 행진). ([99bitcoins](https://99bitcoins.com/news/bitcoin-btc/bitcoin-etf-aum-77-billion-meaning/), [Investing.com](https://www.investing.com/analysis/blackrock-ibit-sees-214m-outflow-as-redemption-streak-hits-44b-200681724)) **신뢰도: 중간** (집계사별 편차 존재)
- **트레저리 기업(DAT) 모델 위기**: 상위 100개 중 **~40%가 NAV 미만** 거래. Strategy(845,256 BTC, 평단 $66,385)는 현물가 아래 + **2022년 이후 첫 매도**(32 BTC, 우선주 배당 재원). MSTR 주가 2025-08→2026-02 **-70%**, mNAV 0.6~1.2x로 압축되어 "주식 발행→BTC 매수" 플라이휠 정지. MARA는 보유량 28%(~15,000 BTC) 매각. ([ainvest](https://www.ainvest.com/news/bitcoin-treasury-companies-crisis-40-trade-nav-2601/), [CoinDesk Strategy 매도](https://www.coindesk.com/markets/2026/06/01/strategy-sold-32-btc-for-usd2-5-million-in-late-may-filing-shows), [bitbo](https://bitbo.io/treasuries/microstrategy)) **신뢰도: 높음(8-K 기반)**
- 그럼에도 **상장사 합계 보유는 Q1 2026에 +50,351 BTC 증가, 총 ~115만 BTC (공급량 5.47%)** — 누적은 계속 증가. Metaplanet(일본)이 40,177 BTC로 3위 부상. ([Cryptopolitan](https://www.cryptopolitan.com/corporate-bitcoin-holdings-q1-2026/)) **신뢰도: 중간**
- **국가 채택은 넓지만 얕다**: 미국 SBR(행정명령 2025-03-06)은 몰수 코인 ~328K BTC 보유하나 **매입 권한 없음 + 이행 정체** (기한 도과, 시드월렛 해킹 $60M, 콜드월렛 서랍 보관 감사 적발). 실제 '매입'은 텍사스 $5M, 엘살바도르 7,676 BTC, 체코 중앙은행 $1M 테스트(공식 외환보유고 외부, 2~3년 파일럿)가 전부. ([Federal Register](https://www.federalregister.gov/documents/2025/03/11/2025-03992/establishment-of-the-strategic-bitcoin-reserve-and-united-states-digital-asset-stockpile), [crypto.news SBR](https://crypto.news/inside-the-strategic-bitcoin-reserve-promise-vs-reality/), [Texas Tribune](https://www.texastribune.org/2025/12/08/texas-crypto-currency-investment/), [CNB](https://www.cnb.cz/en/cnb-news/press-releases/The-CNB-creates-a-test-portfolio-of-digital-assets/)) **신뢰도: 높음**
- **CLARITY Act(시장구조법)는 미통과**: 하원 294-134 통과(2025-07), 상원 은행위 15-9(2026-05-14) 통과했으나 Polymarket 기준 연내 제정 확률 ~59%. 전체 친크립토 체제가 행정명령+단일 행정부 기조에 의존 → **2028년 이후 가역 리스크**. ([CNBC](https://www.cnbc.com/2026/05/14/clarity-act-congress-crypto-senate.html)) **신뢰도: 중상**

### 1.4 축 1 판정

채택은 **"가격에 대한 래칫"이 아니라 "인프라에 대한 래칫"**으로 읽어야 한다. 법(GENIUS/MiCA/FIEA), 은행 레일(OCC/JPM), 회계·모기지 통합은 -50% 폭락을 통과하며 유지됐다. 반면 플로우(ETF AUM, DAT 매수)는 철저히 사이클이다. → **제품은 래칫 지표를 측정해야 한다** (§7).

---

## 2. 축 2 — 비트코인 위 금융 레이어: 실재 vs 과장

### 2.1 트랙션 사다리 (2026-06 기준)

| 등급 | 레이어 | 핵심 수치 | 판정 |
|---|---|---|---|
| **실재·스케일** | BTC 담보 대출 | Coinbase(Morpho/Base) 누적 **$2.17B** 대출, Cantor **$2B** 가동, CeFi 미상환 $13.5B(Q1'25), 전체 크립토 담보대출 ~$73.6B(Q3'25) | "지루한 신용 상품"이 진짜 승자 |
| **실재·스케일** | Liquid RWA | TVL **$3.27B** — 단, 동력은 L-BTC 결제가 아니라 **사모신용 토큰화 $1.8B+** | RWA 정산 레일로 용도 변경 |
| **실재·정체** | Lightning | 용량 ATH **5,606 BTC(~$490M)** — 그러나 거래소(Binance/OKX) 유동성 집중의 결과. 채널 수 반토막(80K→48.7K), 노드 14.9K(피크 20.7K), **상위 10 운영자가 용량 62%**. 월 볼륨 ~$1.17B(2025-11, River). 평균 거래액 $118→**$223** = 거래소 이체화 | P2P 결제 아닌 기관 배관 |
| **반쯤 실재** | BTCFi 스테이킹 | Babylon TVL **$3.17B** (피크 $6B 대비 **-47%**, DefiLlama API 직접 조회로 교차 확인). 일드는 BTC가 아닌 **알트코인 방출**. Lombard LBTC가 LST 60% 점유. 랩트 BTC ~30만 개(~$25B): WBTC 43%(Justin Sun 논란 후 순상환), cbBTC 25%(성장 주도), BTCB 22% | 일드 원천 투명성이 관건 |
| **반쯤 실재** | sBTC/사이드체인 | Stacks sBTC $437M(Q1'26), Rootstock ~$286M, CORE ~$868M, Bitlayer ~$506M. **BTC 기반 DeFi 전체 = 글로벌 DeFi의 ~6.35%** (ETH ~68%) | 한 자릿수 점유 |
| **과장 우세** | "비트코인 L2" 롤업 | Citrea 메인넷(2026-01-27, 최초의 BTC 검증증명 ZK롤업) 등 엔지니어링 이정표는 진짜. 그러나 TVL 미미 + 대부분 멀티시그 브리지 사이드체인이 L2 라벨 착용 ([Bitcoin Magazine 비판](https://bitcoinmagazine.com/technical/bitcoin-layer2-sidechains)) | 브리지 신뢰 가정 미검증 |
| **붕괴** | Ordinals/Runes | Runes 트랜잭션 점유 81.3%(2024-04) → **3.2%**(2024-09), Ordinals 일 5,000건 미만, 대표 탐색기 Ord.io 폐쇄(2026-06-01) | 블록스페이스 수요 증발 |

출처: [The Block Coinbase 대출](https://www.theblock.co/post/373032/coinbase-tops-1-billion-in-bitcoin-backed-onchain-loans-via-morpho), [Decrypt Cantor](https://decrypt.co/322274/cantor-2-billion-bitcoin-lending-first-transactions), [Liquid TVL](https://blog.liquid.net/liquid-network-surpasses-3-27-billion-tvl-reinforcing-its-role-as-bitcoins-financial-layer/), [Yellow LN ATH](https://yellow.com/news/bitcoin-lightning-network-hits-record-5606-btc-capacity-as-exchanges-add-liquidity), [news.bitcoin.com LN 쇠퇴](https://news.bitcoin.com/data-shows-sustained-slide-in-lightning-network-capacity-channels-through-2025/), [DefiLlama Babylon](https://api.llama.fi/tvl/babylon-protocol), [Stacks Q1'26](https://www.stacks.co/blog/q1-2026-snapshot), [crypto.news Citrea](https://crypto.news/bitcoin-zk-rollup-citrea-launches-mainnet-2026/), [cointribune Runes](https://www.cointribune.com/en/why-the-bitcoin-runes-protocol-fascinates-and-already-disappoints/)

### 2.2 가장 중요한 신생 이벤트 — 달러가 비트코인 레일에 올라탔다

- **USDT on Lightning 라이브** (2026-03-21, Taproot Assets v0.7 기반, 발표 후 14개월 만) ([Tether](https://tether.io/news/tether-brings-usdt-to-bitcoins-lightning-network-ushering-in-a-new-era-of-unstoppable-technology/), [btc.network](https://btc.network/blog/usdt-live-lightning-network-taproot-assets-fee-market-2026)) **신뢰도: 높음(발표 사실), 사용량 데이터는 아직 전무**
- Tether의 다중 베팅: RGB로도 USDT 발행 발표(2025-08), RGB 정산 스타트업 Utexo $7.5M 리드(2026-03), Lightning 결제사 Speed $8M 리드, 셀프커스터디 tether.wallet 출시(2026-04)
- **Lightspark(David Marcus) Grid Global Accounts**: 비트코인/Spark 레일 위 달러 계좌, **Visa 정회원**, SoFi·Revolut·Nubank 파트너, 65개국 → 100개국 계획. Marcus: "비트코인+Lightning은 돈의 TCP/IP" ([CoinShares 인터뷰](https://coinshares.com/us/insights/the-node/interview-david-marcus/), [Bitcoin Magazine](https://bitcoinmagazine.com/news/lightspark-launches-grid-global-accounts))
- **AI 에이전트 결제**: Lightning Labs "Lightning Agent Tools"(2026-02-11) + L402 에이전트 푸시(2026-03-11) ([Lightning Labs](https://lightning.engineering/posts/2026-02-11-ln-agent-tools/))
- **회의론 병기**: USDT 연간 정산 $10T+ vs Lightning 공개 용량 ~$500M — 스케일 미스매치 거대. Tron/Solana가 여전히 지배적 USDT 레일. 채택 미검증.

### 2.3 프로토콜 거버넌스 리스크 (모니터링 대상)

- **Core vs Knots 전쟁**: Core v30(2025-10)이 OP_RETURN 한도 80B→~100KB 상향 → Knots 노드 점유 2%→**20%+** 급증 (프로토콜 정치 양극화) ([oakresearch](https://oakresearch.io/en/analyses/fundamentals/update-op-return-bitcoin-core-v30-core-knots-war))
- **CTV(BIP-119) 활성화 시도**: 최초의 구체적 파라미터 — 시그널링 2026-03-30~2027-03-30, 채굴자 90% 임계, 최속 2027-05 활성화. 합의 아닌 제안 단계. ([blockeden](https://blockeden.xyz/blog/2026/04/21/bitcoin-covenant-renaissance-op-ctv-lnhance-cat-bitvm2/)) — 통과 시 볼트/공유 UTXO 등 L2 설계 공간 확대

---

## 3. 축 3 — 결제 인프라: 실패한 소비자 결제, 승리한 스테이블코인, 배관으로의 생존

### 3.1 BTC 직접 결제는 실증적으로 실패했다

- **엘살바도르 자연실험 종료**: 2024년 국민 **92% 미사용** (사용률 25.7%'21 → 8.1%'24), IMF $1.4B 합의로 민간 수용 의무 폐지 + Chivo 매각 진행. ([Cointelegraph](https://cointelegraph.com/news/el-salvador-90-percent-dont-transact-bitcoin-survey), [CoinDesk](https://www.coindesk.com/policy/2024/12/19/el-salvador-to-shut-or-sell-chivo-crypto-wallet-as-part-of-3-5-b-imf-deal)) **신뢰도: 높음 — 가장 강력한 단일 반증**
- 전 세계 BTC 수용 가맹점 ~23,000곳 (카드 가맹점 수억 곳 대비 오차 범위) ([Coincharge/River](https://coincharge.io/en/bitcoin-acceptance-2026-river-study/))
- BitPay 결제 믹스: 스테이블코인 30%('24)→**40%**('25) — 결제 프로세서 내부에서도 BTC가 점유율 상실 ([BitPay](https://www.bitpay.com/decrypted/2025))
- **수수료 붕괴가 수요 약세의 증거**: 일평균 수수료 2.5 BTC(2026-03, **2011년 이후 최저**), 채굴 수익 중 수수료 비중 **0.5% 미만**, 멤풀 72시간 연속 1 sat/vB 바닥(2026-03) ([CryptoTimes](https://www.cryptotimes.io/2026/04/01/bitcoin-daily-transaction-fees-drop-to-13-year-low-as-demand-slows/), [Blockspace](https://blockspace.media/insight/where-did-all-the-bitcoin-transaction-fees-go/))

### 3.2 스테이블코인이 결제를 가져갔다

- 공급 **$306B**(2025년말, +49% YoY) → ~$320B(2026-04) ([Fed Note](https://www.federalreserve.gov/econres/notes/feds-notes/stablecoins-in-2025-developments-and-financial-stability-implications-20260408.html))
- 정산량: 원시 $33~47T/yr, Visa/Allium 조정 ~$10.4T — 단 **McKinsey 추정 진성 최종사용자 결제는 ~$390B**(원시의 ~1%, 그래도 YoY 2배+) ([McKinsey](https://www.mckinsey.com/industries/financial-services/our-insights/stablecoins-in-payments-what-the-raw-transaction-numbers-miss)) — **방법론별 수치 편차가 큼을 명시**
- 결제 대기업의 선택은 전부 스테이블코인: Stripe Bridge $1.1B 인수, PayPal PYUSD 70개 시장, **Western Union 자체 스테이블코인 USDPT**(2026 H1 목표)
- 국내 결제는 즉시결제 인프라가 선점: Pix $6.3T/yr, UPI 2,283억 건/yr, FedNow $245B/분기 — BTC의 국내 결제 명분 소멸

### 3.3 생존 형태 = "보이지 않는 배관"

송금 회랑(Strike 모델: 즉시환전으로 BTC 비가시화, 자가보고 $6B/'24 — **신뢰도: 중간**)과 **스테이블코인을 실은 비트코인 레일**(§2.2)이 유일하게 정합적인 결제 시나리오. 세계 평균 송금 수수료 6.36%(World Bank Q3'25) vs 스테이블코인 레일 <1%가 구조적 동인. ([World Bank RPW](https://remittanceprices.worldbank.org/sites/default/files/2026-04/RPW_main_report_and_annex_Q325.pdf))

---

## 4. 축 4 — 온체인 분석 시장: 무엇이 팔리고 무엇이 공짜가 됐나

### 4.1 시장 구조

- 시장 규모 추정: 컴플라이언스+분석 $4.41B('25) → $13.97B('30) 전망 — **신뢰도: 낮음~중간** (소형 리서치사, 컴플라이언스 묶음으로 부풀려짐). 실제 지출의 대부분은 **정부·컴플라이언스**(Chainalysis 단독 누적 조달 $538M)이며 "트레이더용 분석 SaaS"는 작은 조각.
- 주요 플레이어 가격: Glassnode 무료/$49/$999/mo, CryptoQuant 무료/$29/$109/$799/mo, Bitcoin Magazine Pro $29/mo, Messari Pro $24.99/mo
- **가격 압축이 진행 중**: Nansen $1,299→**$49/mo** (-95%), Upbit Data Lab 무료 출시(2025-04), Dune 무료 대시보드 — **원시 지표는 커머디티化 완료. 가격이 유지되는 것은 해석·라벨링·엔터프라이즈 SLA뿐.** ([Nansen 가격개편](https://academy.nansen.ai/articles/0414043-new-pricing-explained))
- 밸류에이션 현실: Chainalysis $8.6B('22) → 세컨더리 함의 ~$2.5B(-70%) ([Sacra](https://sacra.com/c/chainalysis/))

### 4.2 검증된 개인/소규모 모델

- **Checkonchain (James Check, ex-Glassnode 수석)**: 무료 주간 훅 → 유료 티어 → 기관급 프리미엄(월간 리포트+1:1 콜). 솔로 온체인 분석가의 정석 출구. ([checkonchain](https://newsletter.checkonchain.com/about))
- Substack 벤치마크: 유료 구독자 ~1,962명 ≈ **$157K/yr**. 무료→유료 전환 ~3%, 뉴스형 구독 월 이탈 5.8%(연 ~51%) — 무료 독자 1.5만~7만 명이 전제. Finance가 최고 수익 카테고리.
- 회피 대상: **시그널 판매업** (스캠 포화, 이탈률 높음, 평판 독성)

### 4.3 신규 수요 벡터 (2025-26 실증)

1. **AI 에이전트가 데이터를 사는 경제**: Coinbase x402(2025-05, HTTP 402 스테이블코인 마이크로페이먼트) — 인디 개발자들이 콜당 0.001~0.008 USDC API 운영 중. CoinGecko 공식 MCP 서버 + 해커톤, Nansen MCP, **AWS Bedrock AgentCore Payments**(Coinbase/Stripe 협업) — 클라우드 메인스트림이 "결제하는 에이전트"를 전제하기 시작. ([blockeden x402](https://blockeden.xyz/blog/2025/10/26/x402-protocol-the-http-native-payment-standard-for-autonomous-ai-commerce/), [AWS](https://aws.amazon.com/blogs/machine-learning/agents-that-transact-introducing-amazon-bedrock-agentcore-payments-built-with-coinbase-and-stripe/))
2. **DAT/mNAV 추적 마이크로 니치**: bitcointreasuries.net, mnav.com, bitcoinquant.co 등 다수 신규 진입 + NYDIG의 mNAV 방법론 비판(2025-11-30)이 **품질 격차 = 기회** 증명. Glassnode조차 DAT 커버리지로 확장. ([CoinDesk mNAV 비판](https://www.coindesk.com/business/2025/11/30/what-mnav-really-tells-you-about-bitcoin-treasury-companies-and-where-it-falls-short))
3. **한국어 해석 레이어 아비트라지**: 한국 크립토 이용자 **1,620만 명(인구 32%)**, 보유 ~₩102.6T. CryptoQuant는 한국 회사인데 영어 위주. Upbit Data Lab은 무료지만 얕음. **2026 한국 현물 ETF + 법인 매수 허용이 수요 촉매.** 리스크: 2025년 한국 이탈 자금 $110B, 국내 보유 반토막(₩60T, 2026-05) — 한국 리테일 관심은 변동성 큼. ([fintechweekly](https://www.fintechweekly.com/magazine/articles/crypto-users-in-south-korea-surpass-16-million), [CoinDesk 한국 유출](https://www.coindesk.com/business/2026/01/02/usd110-billion-in-crypto-left-south-korea-in-2025-owing-to-strict-trading-rules))
4. **인프라 비용은 제약이 아님**: BigQuery 공개 BTC 데이터셋 + 월 1TB 무료 쿼리로 ~$0-50/mo 파이프라인 가능 (이미 PR #1 설계에 반영). **제약은 유통(distribution)과 공개 검증 가능한 트랙레코드.**

---

## 5. 축 5 — 시나리오 평가 (확률 가중, 2026-06 기준)

### 시나리오 A — 디지털 금/준비자산 (**~40%, 제도화됐으나 흠집**)

**강세 근거**: ETF가 공급량 ~7% 보유, 신규 채굴의 ~2.8배 흡수('26 초). 장기 보유 누적 사상최대 ~400만 BTC. 1주 실현변동성 ~17% (사상 최저권). 체코 중앙은행 파일럿 + 총재의 "1% 배분" 발언. ARK $16T/2030 (~$730K), VanEck $2.9M/2050 베이스. 40세 미만 73~77%가 금보다 BTC 선호. ([CoinDesk LTH](https://www.coindesk.com/markets/2026/05/13/bitcoin-s-available-supply-is-shrinking-as-long-term-hoarding-hits-record-4-million-btc), [CoinDesk ARK](https://www.coindesk.com/markets/2026/05/01/institutional-demand-to-drive-bitcoin-market-cap-to-usd16-trillion-by-2030-ark-invest))

**반증**: 2025년 금 **+60%** vs BTC -50% — "지금의 디지털 금"은 기각됨. **NYDIG: 주식과의 상관계수가 평시 0.15 → 스트레스 시 0.4~0.6으로 상승** = 헤지가 필요할 때 작동 안 함. BlackRock 연구의 부분 반박: 위기 첫 10일은 금에 열위, 60일 창에서는 우위. ([NYDIG 2026 Themes](https://www.nydig.com/research/2026-themes-and-q4-2025-wrap), [Investing.com](https://www.investing.com/analysis/gold-vs-bitcoin-in-2026-which-safe-haven-is-actually-delivering-200679952))

**판정**: "이미 도달한 상태"가 아니라 **10~20년 수렴 트레이드** — 젊고 베타 높은 금.

### 시나리오 C — 담보·정산 레이어 (**~30%, 증거 축적 속도 최고**)

**강세 근거**: 9개월 내 — JPMorgan 담보 인정, IBIT 연계 구조화 노트(최소 16% 보장), Cantor $2B, Coinbase $2.17B, Ledn "10년 내 BTC 담보대출 $1T" 모델, Babylon 공유보안 $3.17B, 해시레이트 1 ZH/s 돌파(물리적 정산 보안 사상 최대). Saylor 비전: 글로벌 신용 $300T의 5~10% BTC 담보화 ($50~60T) — **프로모터 출처, 신뢰도 중간**.

**반증**: **커스터디 집중 — Coinbase가 미국 현물 ETF 자산의 80~84% 수탁** (CoinShares CEO: "단일 커스터디언 거대 집중 리스크"), "paper bitcoin" 논쟁. **담보 가치의 경기순응성**: 2026-02 급락이 마진 청산을 정확히 담보가치 하락 시점에 강제(VanEck Sigel 분석) — 변동성 70%+ 자산은 국채 대비 깊은 헤어컷 불가피. 채굴 원가 역전: 현금원가 ~$74.6K, 완전원가 ~$137.8K vs 시세 $62K. ([CoinDesk Consensus 패널](https://www.coindesk.com/business/2026/05/06/spot-bitcoin-etfs-solved-access-but-custody-advisors-and-plumbing-still-lag-panelists-say), [VanEck](https://www.vaneck.com/us/en/blogs/digital-assets/matthew-sigel-what-triggered-bitcoins-major-selloff-in-february-2026/))

**판정**: 한계 기관 자금은 이미 BTC를 "보유 자산"이 아니라 **담보**로 취급하기 시작. 가장 깨끗한 반증 테스트: **BTC 담보 대출 장부들이 Q4 2026 예상 바닥($50~55K 컨센서스)을 커스터디/재담보 사고 없이 통과하는가.**

### 시나리오 B — 결제 레일 (**~10%, 스테이블코인에 양보하고 배관으로 생존**)

§3 참조. 살아있는 강세론(Marcus, Tether)은 사실상 **"달러를 실은 C의 경제학"** — BTC-통화 결제가 아니라 BTC-레일 위 스테이블코인.

### 잔여 베어 케이스 (**~20%**)

1. **퀀텀**: 더 이상 변두리 아님 — **BIP-360(양자내성 출력) BIPs 저장소 병합(2026-02-11)**, BIP-361 마이그레이션 기한 제안(2026-04). 노출 코인 ~650~690만 BTC(공급 1/3, 사토시 추정 P2PK 170만 포함). 2032년까지 양자 키 탈취 확률 ~10% 추정, NIST PQ 전환 지평 2035. 15비트 ECC 공개 하드웨어 크랙(2026-04, PoC 수준). ([crypto.news BIP-360](https://crypto.news/bitcoin-is-going-quantum-proof-inside-bip-360-and-the-migration/), [Decrypt Q-day](https://decrypt.co/resources/what-q-day-quantum-threat-bitcoin-explained)) **신뢰도: 높음(사실), 시기는 불확실**
2. **보안 예산**: 수수료/보조금 비율 ~0.6%(2026-03, 블록 충만도 91.2%인데도) + 2028년 반감기(1.5625 BTC) — 정산 보안이 거의 전적으로 보조금+가격 상승에 의존. ([The Block](https://www.theblock.co/post/379291/bitcoin-miner-fees-fall-12-month-low-underscoring-long-term-reliance-block-subsidies))
3. **정책 가역성**: §1.3 — CLARITY 미통과 + 행정명령 의존 체제.

---

## 6. 교차 검증 노트 (정직성 장부)

| 항목 | 불일치 | 해소 |
|---|---|---|
| Babylon TVL | 한 축은 $5~6B, 다른 축은 $3.17B | **$3.17B 채택** — DefiLlama API 직접 조회(2026-06-10) + BTC 수량(5.3~6만 개 × $62K ≈ $3.3B) 산술 일치. $5-6B는 구가격 환산 추정 |
| 드로다운 % | "-41%" vs "-51%" 혼재 | % 대신 **가격 수준으로 표기** ($126.2K → $60~63K). 출처별 측정 시점 차이 |
| ETF 플로우 | 집계사(CoinGlass/Farside계) 간 수치 편차 | 신뢰도 '중간'으로 명시, 추세(왕복)는 모든 출처 일치 |
| Strike $6B, PayPal "가맹점 40%" | 자가보고/마케팅 서베이 | 신뢰도 '낮음~중간' 강등, 본문에 명시 |
| mNAV 수치 | 0.64x~1.20x (기본 vs EV 방식) | 방법론 차이로 병기 — 오히려 **방법론 표준화 부재 = 제품 기회** |
| 교차 확인된 핵심 사실 | LN 용량 ATH·쇠퇴, USDT-on-LN 라이브(2026-03), 엘살바도르 IMF, GENIUS, CNB, Strategy 845,256 BTC, 수수료 바닥 | **2~3개 독립 축에서 동일 확인 → 높음** |

---

## 7. 종합 — 제품·비즈니스 설계 재료 (이 리서치의 본론)

### 7.1 전략 프레임: "가격이 아니라 래칫을 추적하라"

모든 가격 추적 도구는 레드오션 + 커머디티(§4.1)다. 반면 이 리서치가 식별한 **구조적 공백**은:

> 비트코인의 **금융 인프라화 진행도**(래칫)를 체계적으로 측정하는 데이터 제품이 없다.
> ETF 플로우는 모두가 보지만, **담보화·커스터디 집중·새 레일 채택**은 아무도 통합적으로 안 본다.

### 7.2 시나리오 → 데이터 수요 → 제품 후보 매핑

| 시나리오 | 생기는 데이터 수요 | 제품 후보 (우리 파이프라인 위) | 증거 강도 |
|---|---|---|---|
| **C. 담보·정산** (증거 최속) | 대출 장부 건전성, 담보 청산 리스크, 커스터디 집중도, paper-BTC 리스크, 랩트 BTC 공급/점유 | **"BTC 신용 모니터"** — Coinbase/Morpho 온체인 대출 장부, 랩트 BTC 발행/상환, Babylon TVL, 커스터디 집중 지수, 담보 스트레스(MVRV 코호트 × 청산 레벨) | ★★★ |
| **A. 디지털 금** | 사이클 위치, 보유자 코호트, 변동성 체제, ETF/DAT 수급 | 기존 계획 그대로 — **자체 MVRV/NUPL/SOPR + LTH/STH 코호트** (PR #1 Phase 2) + ETF·DAT 수급 오버레이 | ★★★ |
| **B. 배관** (그린필드) | **Taproot Assets/RGB 채택 텔레메트리** — 아무도 정량 추적 안 함 | "Stablecoin-on-Bitcoin 트래커" — TA 채널/발행량, RGB 활동, L402/x402 결제 흐름. **선점 가능한 무주공산** | ★★ (신생) |
| DAT 위기 (현재진행) | mNAV 방법론 표준화, 전환사채 리파이낸싱 리스크 | **DAT/mNAV 니치 트래커** — 기존 `institutions.ts` 모듈의 자연 확장. NYDIG 비판이 지적한 방법론 격차를 품질로 공략 | ★★★ |

### 7.3 수익화 사다리 (분석 시장 증거 기반)

```
0단계  무료 한국어 주간 브리프 (유통 구축 — Checkonchain 모델의 한국어 아비트라지)
        ↳ 근거: 한국 1,620만 이용자 + 2026 현물 ETF·법인 매수 촉매 + 한국어 해석 공백
1단계  유료 티어 $15~30/mo (심층 해석 + 래칫 대시보드)
        ↳ 벤치마크: 유료 ~2,000명 ≈ $157K/yr. 이탈 연 ~50% 가정
2단계  니치 트래커 (DAT/mNAV, BTC 신용 모니터) — 무료+프리미엄 혼합
3단계  에이전트용 MCP 서버 / x402 pay-per-call API
        ↳ 지금은 콜당 0.001~0.008 USDC 소액이나, AWS AgentCore가 보여주는
          "결제하는 에이전트" 경제에 대한 한계비용 0의 옵션
```

**하지 말 것** (증거 기반): ① 원시 지표 재판매 (커머디티, Nansen -95% 가격압축이 증명) ② 시그널 판매 (스캠 오염 + `signals.ts`는 사용자 개인 룰) ③ 컴플라이언스 시장 진입 (Chainalysis $538M 자본 게임)

### 7.4 기초 공사(PR #1)와의 연결 — 설계 수정 없이 증축 경로만 추가

기존 `btc-onchain-raw-source-design.md`의 레이어드 설계는 그대로 유효하다. 이 리서치가 추가하는 것은 **Phase 2 이후의 증축 방향**:

- **Phase 2 (밸류에이션)**: 계획대로 — A 시나리오 수요와 정확히 일치. LTH/STH 코호트(UTXO Age Bands)의 우선순위를 상향 (NYDIG도 코호트 분석을 2026 테마로 지목)
- **Phase 2.5 (신설 제안) — 래칫 대시보드**: 공개 소스(ETF 플로우, 13F, DAT 공시, OCC/규제 이벤트)를 타임라인화. 원장 데이터 불필요 → 파이프라인과 병렬 개발 가능, 기존 `institutions.ts`·`macro/` 모듈의 확장
- **Phase 3 (자체 노드)**: 우선순위 유지 — Taproot Assets/RGB 텔레메트리는 **자체 노드가 있어야** 깊게 들어갈 수 있음 (B-배관 트래커의 전제)
- **Phase 4 (라벨링)**: 거래소 흐름 + **커스터디 집중도 측정**으로 목적 확장 (Coinbase 84% 집중 같은 지표의 자체 산출)

### 7.5 모니터링할 반증 지표 (이 보고서의 유통기한 관리)

| # | 관찰 대상 | 신호 | 시한 |
|---|---|---|---|
| 1 | BTC 담보 대출 장부 (JPM/Citi/Cantor/Coinbase) | Q4 2026 바닥($50~55K 컨센서스)을 사고 없이 통과하면 C 시나리오 격상 | 2026 Q4 |
| 2 | Taproot Assets/USDT-on-LN 볼륨 vs Tron | 의미 있는 점유 이동 시 B-배관 트래커 착수 | 2026~27 |
| 3 | CLARITY Act 제정 여부 (~59% 확률) | 불발 + 정권 교체 시 래칫 일부 가역화 리스크 | 2026~28 |
| 4 | CTV 시그널링 (2026-03~2027-03, 90% 임계) | 활성화 시 BTC L2 설계 공간 확대 → 레이어 재평가 | 2027-05 |
| 5 | 수수료/보조금 비율 + 2028 반감기 | 0.5% 미만 지속 시 보안 예산 담론 격화 | 상시 |
| 6 | BIP-360 채택 / 퀀텀 마일스톤 (Project Eleven 바운티) | 양자내성 주소 이행 시작 = 신규 추적 지표군 탄생 | 상시 |
| 7 | 한국 현물 ETF 출시 실행 | 출시 시 한국어 브리프(0단계) 적기 | 2026 |

---

## 8. 결론

1. **비트코인의 금융 인프라화는 진행 중인 사실**이나, 그 형태는 통화(결제)가 아니라 **자산(A) → 담보(C)** 경로다. 결제는 스테이블코인이 가져갔고, 비트코인 레일은 달러의 배관(B')으로 재정의되고 있다.
2. 2025-26 약세장은 이 논제의 가장 좋은 스트레스 테스트였다: **플로우는 무너졌지만 인프라는 무너지지 않았다.**
3. 개인 개발자에게 열린 기회는 가격 도구가 아니라 **래칫 측정 + 해석 + 한국어 유통 + 에이전트 경제 옵션**의 조합이며, 이 모든 것의 기술적 기반이 지금 설계 중인 원천 데이터 파이프라인이다.
4. 본 보고서의 시나리오 확률(A 40 / C 30 / B 10 / 베어 20)은 §7.5의 반증 지표가 움직일 때마다 갱신되어야 한다.

---

## 부록 — 축별 전체 출처

**축 1 (기관/국가)**: [Federal Register EO](https://www.federalregister.gov/documents/2025/03/11/2025-03992/establishment-of-the-strategic-bitcoin-reserve-and-united-states-digital-asset-stockpile) · [Congress S.954](https://www.congress.gov/bill/119th-congress/senate-bill/954/text) · [Congress S.1582 GENIUS](https://www.congress.gov/bill/119/senate-bill/1582) · [OCC 1183](https://www.occ.gov/topics/charters-and-licensing/interpretations-and-decisions/2025/int1183.pdf) · [SEC](https://www.sec.gov/newsroom/press-releases/2026-34) · [bitbo Strategy](https://bitbo.io/treasuries/microstrategy) · [CoinDesk Strategy 매도](https://www.coindesk.com/markets/2026/06/01/strategy-sold-32-btc-for-usd2-5-million-in-late-may-filing-shows) · [kaupr DAT 위기](https://www.kaupr.io/en/news/bitcoin-treasury-companies-in-crisis-market-values-fall-below-holdings) · [CoinDesk Metaplanet](https://www.coindesk.com/markets/2026/04/02/metaplanet-acquires-5-075-btc-jumps-to-third-largest-bitcoin-treasury-company) · [Texas Tribune](https://www.texastribune.org/2025/12/08/texas-crypto-currency-investment/) · [CNB](https://www.cnb.cz/en/cnb-news/press-releases/The-CNB-creates-a-test-portfolio-of-digital-assets/) · [CNBC CLARITY](https://www.cnbc.com/2026/05/14/clarity-act-congress-crypto-senate.html) · [Yahoo 한국 법인](https://finance.yahoo.com/news/south-korea-lets-companies-buy-120930327.html)

**축 2 (레이어)**: [Yellow LN ATH](https://yellow.com/news/bitcoin-lightning-network-hits-record-5606-btc-capacity-as-exchanges-add-liquidity) · [news.bitcoin LN 쇠퇴](https://news.bitcoin.com/data-shows-sustained-slide-in-lightning-network-capacity-channels-through-2025/) · [Tether USDT-LN](https://tether.io/news/tether-brings-usdt-to-bitcoins-lightning-network-ushering-in-a-new-era-of-unstoppable-technology/) · [Lightning Labs tapd v0.6](https://lightning.engineering/posts/2025-6-24-tapd-v0.6-launch/) · [Agent Tools](https://lightning.engineering/posts/2026-02-11-ln-agent-tools/) · [Liquid](https://blog.liquid.net/liquid-network-surpasses-3-27-billion-tvl-reinforcing-its-role-as-bitcoins-financial-layer/) · [Stacks Q1'26](https://www.stacks.co/blog/q1-2026-snapshot) · [crypto.news Citrea](https://crypto.news/bitcoin-zk-rollup-citrea-launches-mainnet-2026/) · [Bitcoin Magazine L2 비판](https://bitcoinmagazine.com/technical/bitcoin-layer2-sidechains) · [DefiLlama Babylon](https://api.llama.fi/tvl/babylon-protocol) · [Messari Babylon](https://messari.io/report/state-of-babylon-q1-2025) · [The Block Coinbase 대출](https://www.theblock.co/post/373032/coinbase-tops-1-billion-in-bitcoin-backed-onchain-loans-via-morpho) · [Decrypt Cantor](https://decrypt.co/322274/cantor-2-billion-bitcoin-lending-first-transactions) · [oakresearch Core v30](https://oakresearch.io/en/analyses/fundamentals/update-op-return-bitcoin-core-v30-core-knots-war) · [blockeden CTV](https://blockeden.xyz/blog/2026/04/21/bitcoin-covenant-renaissance-op-ctv-lnhance-cat-bitvm2/) · [Cointelegraph 대출 부활](https://cointelegraph.com/news/bitcoin-loans-back-rewriting-book-celsius-burned)

**축 3 (결제)**: [BitPay 2025](https://www.bitpay.com/decrypted/2025) · [Cointelegraph 엘살바도르](https://cointelegraph.com/news/el-salvador-90-percent-dont-transact-bitcoin-survey) · [CoinDesk IMF](https://www.coindesk.com/policy/2024/12/19/el-salvador-to-shut-or-sell-chivo-crypto-wallet-as-part-of-3-5-b-imf-deal) · [Fed 스테이블코인](https://www.federalreserve.gov/econres/notes/feds-notes/stablecoins-in-2025-developments-and-financial-stability-implications-20260408.html) · [McKinsey](https://www.mckinsey.com/industries/financial-services/our-insights/stablecoins-in-payments-what-the-raw-transaction-numbers-miss) · [Visa Onchain](https://visaonchainanalytics.com/transactions) · [World Bank RPW](https://remittanceprices.worldbank.org/sites/default/files/2026-04/RPW_main_report_and_annex_Q325.pdf) · [Chainalysis SSA](https://www.chainalysis.com/blog/subsaharan-africa-crypto-adoption-2025/) · [FXC Pix/UPI](https://www.fxcintel.com/research/analysis/upi-pix-2025-growth) · [CryptoTimes 수수료](https://www.cryptotimes.io/2026/04/01/bitcoin-daily-transaction-fees-drop-to-13-year-low-as-demand-slows/) · [Cryptonomist WU](https://en.cryptonomist.ch/2025/10/28/stablecoin-remittances-western-union/)

**축 4 (분석 시장)**: [Glassnode 가격](https://glassnode.com/pricing/studio) · [CoinDesk CryptoQuant 펀딩](https://www.coindesk.com/business/2023/07/06/cryptoquant-parent-raises-65m-round-led-by-atinum-investment) · [Nansen 가격개편](https://academy.nansen.ai/articles/0414043-new-pricing-explained) · [Sacra Chainalysis](https://sacra.com/c/chainalysis/) · [Checkonchain](https://newsletter.checkonchain.com/about) · [Backlinko Substack](https://backlinko.com/substack-users) · [Upbit Data Lab](https://datalab.upbit.com/) · [blockeden x402](https://blockeden.xyz/blog/2025/10/26/x402-protocol-the-http-native-payment-standard-for-autonomous-ai-commerce/) · [AWS AgentCore](https://aws.amazon.com/blogs/machine-learning/agents-that-transact-introducing-amazon-bedrock-agentcore-payments-built-with-coinbase-and-stripe/) · [CoinGecko MCP](https://docs.coingecko.com/docs/mcp-server) · [CoinDesk mNAV](https://www.coindesk.com/business/2025/11/30/what-mnav-really-tells-you-about-bitcoin-treasury-companies-and-where-it-falls-short) · [bitcointreasuries](https://bitcointreasuries.net/) · [retentioncheck 이탈률](https://retentioncheck.com/churn-benchmarks/news-subscriptions) · [BigQuery BTC](https://cloud.google.com/blog/topics/public-datasets/bitcoin-in-bigquery-blockchain-analytics-on-public-data)

**축 5 (시나리오)**: [NYDIG 2026 Themes](https://www.nydig.com/research/2026-themes-and-q4-2025-wrap) · [Investing.com 금 vs BTC](https://www.investing.com/analysis/gold-vs-bitcoin-in-2026-which-safe-haven-is-actually-delivering-200679952) · [CoinDesk ARK $16T](https://www.coindesk.com/markets/2026/05/01/institutional-demand-to-drive-bitcoin-market-cap-to-usd16-trillion-by-2030-ark-invest) · [CoinDesk VanEck $2.9M](https://www.coindesk.com/markets/2026/01/09/asset-manager-vaneck-explains-how-one-bitcoin-could-be-worth-usd2-9-million-by-2050) · [CoinShares Marcus](https://coinshares.com/us/insights/the-node/interview-david-marcus/) · [CoinDesk JPM 담보](https://www.coindesk.com/markets/2025/10/24/jpmorgan-to-allow-clients-to-pledge-bitcoin-and-ether-as-collateral-bloomberg) · [CoinDesk JPM 노트](https://www.coindesk.com/markets/2025/11/26/bitcoin-dip-in-2026-surge-in-2028-jpmorgan-s-ibit-linked-structured-note-fits-halving-cycles) · [Yellow Ledn $1T](https://yellow.com/research/bitcoin-backed-lending-trillion-dollar-market-2026) · [Babylon Q4'25](https://babylonlabs.io/blog/babylon-quarterly-founders-call-q4-2025-recap) · [CoinDesk 커스터디 집중](https://www.coindesk.com/business/2026/05/06/spot-bitcoin-etfs-solved-access-but-custody-advisors-and-plumbing-still-lag-panelists-say) · [VanEck 2월 급락](https://www.vaneck.com/us/en/blogs/digital-assets/matthew-sigel-what-triggered-bitcoins-major-selloff-in-february-2026/) · [crypto.news BIP-360](https://crypto.news/bitcoin-is-going-quantum-proof-inside-bip-360-and-the-migration/) · [Decrypt Q-day](https://decrypt.co/resources/what-q-day-quantum-threat-bitcoin-explained) · [The Block 보안예산](https://www.theblock.co/post/379291/bitcoin-miner-fees-fall-12-month-low-underscoring-long-term-reliance-block-subsidies) · [Fool 드로다운](https://www.fool.com/investing/2026/06/01/bitcoin-down-all-time-high-what-history-says/)
