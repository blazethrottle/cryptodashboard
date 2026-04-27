/**
 * Curated Universe — Scenario X X-VIP + Grayscale Crypto Sector 정렬.
 *
 * 큐레이션 원칙 (사용자 First Principles):
 *   1. 미래 금융 인프라와 직접 연관
 *   2. 폭발적 성장 / 상승 내러티브
 *   3. Scenario X (유튜버) 또는 Grayscale의 thesis로 검증
 *
 * 88개 → 50개로 정리. 각 코인에 thesis 필드 의무화.
 *
 * 분류:
 *   - xvipRank: "core" (Scenario X 빨간색 강조) / "secondary" (X-VIP 일반) / null
 *   - grayscaleStatus: "in-suite" (Grayscale 보유) / "consideration" (검토 중) / null
 *   - narrative: 코인의 thesis 카테고리
 */

export type Narrative =
  | "currency"                  // 화폐 (Grayscale Currencies sector)
  | "smart-contract-platform"   // L1/L2 (Grayscale SCP sector)
  | "layer2-infrastructure"     // 레이어 2, oracles 등
  | "rwa"                       // Real World Assets
  | "defi"                      // DeFi (lending, DEX, perp 등)
  | "ai"                        // AI x Crypto
  | "meme"                      // Meme
  | "privacy";                  // Privacy

export type Group =
  | "core" | "layer1" | "layer1_2" | "rwa_defi" | "ai" | "meme" | "privacy" | "institution_only";

export interface Thesis {
  narrative: Narrative;
  /** Scenario X X-VIP 등급. "core" = 빨간색 강조, "secondary" = 일반, null = 추적만 */
  xvipRank: "core" | "secondary" | null;
  /** Grayscale 상태. "in-suite" = 보유, "consideration" = 검토 중 (편입 가능성 높음), null = 미관련 */
  grayscaleStatus: "in-suite" | "consideration" | null;
  /** 한국어 한 줄 — 왜 이 코인을 추적하는가 */
  investmentReason: string;
  /** 핵심 위험 — 매수 전 반드시 인지 */
  risks: string[];
}

export interface Coin {
  base: string;
  name: string;
  groups: Group[];
  priority: boolean;            // 호환성 유지 — xvipRank === "core"
  coingeckoId?: string;
  defillamaSlug?: string;
  chain?: "ethereum" | "solana" | "sui" | "bitcoin" | "ton" | "cardano" | "avalanche" | "polkadot" | "near" | "polygon" | "arbitrum" | "optimism" | "base" | "tron" | "bsc" | "other";
  notes?: string;
  thesis?: Thesis;
}

export const CORE_COINS = ["BTC", "ETH", "SOL", "XRP"] as const;

/**
 * Curated Universe — Scenario X X-VIP (ver 2026.04) + Grayscale Crypto Sector.
 *
 * 빨간색 강조 = xvipRank "core"
 * Grayscale Currently in Suite = grayscaleStatus "in-suite"
 * Grayscale Under Consideration = grayscaleStatus "consideration"
 */
export const XVIP_UNIVERSE: Coin[] = [
  // ── 필수 자산 (X-VIP "필수 자산" 빨간색) ────────────────────────────
  {
    base: "BTC", name: "Bitcoin", groups: ["core"], priority: true,
    coingeckoId: "bitcoin", chain: "bitcoin",
    thesis: {
      narrative: "currency",
      xvipRank: "core",
      grayscaleStatus: "in-suite",
      investmentReason: "디지털 금. 가치 저장의 절대 표준. ETF 자금 1차 수혜. 장기 보유 트랙의 중심.",
      risks: ["사이클 정점에서 -70% 가능", "단기 변동성 극심"],
    },
  },
  {
    base: "ETH", name: "Ethereum", groups: ["core"], priority: true,
    coingeckoId: "ethereum", chain: "ethereum",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: "core",
      grayscaleStatus: "in-suite",
      investmentReason: "스마트 컨트랙트 표준. DeFi/RWA/Stablecoin 인프라 기축. ETF 두 번째 수혜.",
      risks: ["L2 fragmentation", "SOL 등 경쟁자 점유율 잠식"],
    },
  },
  {
    base: "SOL", name: "Solana", groups: ["core"], priority: true,
    coingeckoId: "solana", chain: "solana",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: "core",
      grayscaleStatus: "in-suite",
      investmentReason: "고성능 L1. Agent 경제·DePIN·meme 본거지. 알트 사이클의 핵심 베타.",
      risks: ["네트워크 정지 이력", "토큰 unlock 매도 압력"],
    },
  },
  {
    base: "XRP", name: "XRP", groups: ["core"], priority: true,
    coingeckoId: "ripple", chain: "other",
    thesis: {
      narrative: "currency",
      xvipRank: "core",
      grayscaleStatus: "in-suite",
      investmentReason: "기관 결제 인프라. SEC 소송 마무리 + ETF 진입 가능성. Currency sector 핵심.",
      risks: ["대규모 보유자 매도 (Ripple Labs)", "효용 외 투기 비중 높음"],
    },
  },

  // ── 핵심 레이어1 (X-VIP "핵심 레이어1") ──────────────────────────────
  {
    base: "LINK", name: "Chainlink", groups: ["layer1"], priority: true,
    coingeckoId: "chainlink", chain: "ethereum",
    thesis: {
      narrative: "layer2-infrastructure",
      xvipRank: "core",
      grayscaleStatus: "in-suite",
      investmentReason: "오라클 표준. CCIP 크로스체인 + 기관 토큰화 핵심 미들웨어. RWA 시대 필수.",
      risks: ["인플레 토큰", "오라클 경쟁자 등장"],
    },
  },
  {
    base: "SUI", name: "Sui", groups: ["layer1"], priority: true,
    coingeckoId: "sui", chain: "sui",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: "core",
      grayscaleStatus: "in-suite",
      investmentReason: "Move 언어 차세대 L1. 고속 + 오브젝트 모델. DeepBook·Walrus 생태계 성장.",
      risks: ["VC 비중 높음", "토큰 unlock 압력"],
    },
  },
  {
    base: "XLM", name: "Stellar", groups: ["layer1"], priority: false,
    coingeckoId: "stellar", chain: "other",
    thesis: {
      narrative: "currency",
      xvipRank: "secondary",
      grayscaleStatus: "in-suite",
      investmentReason: "결제 인프라. MoneyGram·USDC 통합. 금융 기관 쪽 채택 안정.",
      risks: ["성장 모멘텀 약함"],
    },
  },
  {
    base: "ADA", name: "Cardano", groups: ["layer1"], priority: false,
    coingeckoId: "cardano", chain: "cardano",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: "secondary",
      grayscaleStatus: "in-suite",
      investmentReason: "학술 기반 L1. 안정성 ↑. Grayscale Currencies sector 보유.",
      risks: ["DeFi 생태계 부족", "기술 진척 느림"],
    },
  },

  // ── 레이어 1/2 (X-VIP "레이어1/2") ────────────────────────────────────
  {
    base: "AVAX", name: "Avalanche", groups: ["layer1_2"], priority: true,
    coingeckoId: "avalanche-2", chain: "avalanche",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: "core",
      grayscaleStatus: "in-suite",
      investmentReason: "기관 서브넷 (JPM, GS, Citi 파일럿). RWA 네트워크. 안정적 L1.",
      risks: ["서브넷 채택 속도", "토큰 unlock"],
    },
  },
  {
    base: "ARB", name: "Arbitrum", groups: ["layer1_2"], priority: false,
    coingeckoId: "arbitrum", chain: "arbitrum",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: "secondary",
      grayscaleStatus: "in-suite",
      investmentReason: "ETH L2 1위 TVL. 인프라 안정. DeFi 활성도 높음.",
      risks: ["토큰 가치 capture 약함", "L2 경쟁 격화"],
    },
  },
  {
    base: "ALGO", name: "Algorand", groups: ["layer1_2"], priority: false,
    coingeckoId: "algorand", chain: "other",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: "secondary",
      grayscaleStatus: null,
      investmentReason: "Pure PoS L1. 금융 기관 RWA 채택 일부.",
      risks: ["내러티브 약함"],
    },
  },
  {
    base: "DOT", name: "Polkadot", groups: ["layer1_2"], priority: false,
    coingeckoId: "polkadot", chain: "polkadot",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: "secondary",
      grayscaleStatus: "in-suite",
      investmentReason: "멀티체인 인프라. parachain 모델. 기관 시각 유지.",
      risks: ["내러티브 정체"],
    },
  },
  {
    base: "LTC", name: "Litecoin", groups: ["layer1_2"], priority: false,
    coingeckoId: "litecoin", chain: "other",
    thesis: {
      narrative: "currency",
      xvipRank: "secondary",
      grayscaleStatus: "in-suite",
      investmentReason: "BTC 사촌. ETF 가능성. Currency sector 안정.",
      risks: ["성장 동력 부족"],
    },
  },

  // ── RWA / DeFi (X-VIP) ──────────────────────────────────────────────
  {
    base: "ONDO", name: "Ondo Finance", groups: ["rwa_defi"], priority: true,
    coingeckoId: "ondo-finance", defillamaSlug: "ondo-finance", chain: "ethereum",
    thesis: {
      narrative: "rwa",
      xvipRank: "core",
      grayscaleStatus: "in-suite",
      investmentReason: "RWA 1위. BlackRock BUIDL 통합. 미국 국채 토큰화 표준 후보.",
      risks: ["규제 변동", "기관 직접 발행 경쟁"],
    },
  },
  {
    base: "UNI", name: "Uniswap", groups: ["rwa_defi"], priority: true,
    coingeckoId: "uniswap", defillamaSlug: "uniswap", chain: "ethereum",
    thesis: {
      narrative: "defi",
      xvipRank: "core",
      grayscaleStatus: "in-suite",
      investmentReason: "DEX 표준. fee switch 활성화 시 토큰 가치 capture. DeFi 인프라 핵심.",
      risks: ["v4 hook 채택 불확실", "L2 분산"],
    },
  },
  {
    base: "AAVE", name: "Aave", groups: ["rwa_defi"], priority: true,
    coingeckoId: "aave", defillamaSlug: "aave", chain: "ethereum",
    thesis: {
      narrative: "defi",
      xvipRank: "core",
      grayscaleStatus: "in-suite",
      investmentReason: "Lending 1위. GHO 스테이블 + RWA Horizon. 안정 수익.",
      risks: ["TVL 감소 추세", "lending 경쟁"],
    },
  },
  {
    base: "CC", name: "Canton Network", groups: ["rwa_defi"], priority: true,
    coingeckoId: undefined, chain: "other",
    thesis: {
      narrative: "rwa",
      xvipRank: "core",
      grayscaleStatus: "consideration",
      investmentReason: "Digital Asset의 RWA 인프라. 기관 토큰화 핵심. Grayscale 검토 중. 출시 시 선점 가치.",
      risks: ["토큰 출시 일정 미정", "기관 전용 폐쇄성"],
    },
    notes: "토큰 미출시 — Grayscale Consideration 모니터링용",
  },
  {
    base: "COMP", name: "Compound", groups: ["rwa_defi"], priority: true,
    coingeckoId: "compound-governance-token", defillamaSlug: "compound-finance", chain: "ethereum",
    thesis: {
      narrative: "defi",
      xvipRank: "core",
      grayscaleStatus: null,
      investmentReason: "DeFi lending 원조. 안정 운영 + 기관 통합 가능성.",
      risks: ["AAVE에 점유율 추월", "혁신 정체"],
    },
  },

  // ── ETH 기반 RWA/DeFi (X-VIP 일반) ──────────────────────────────────
  {
    base: "MORPHO", name: "Morpho", groups: ["rwa_defi"], priority: false,
    coingeckoId: "morpho", defillamaSlug: "morpho-blue", chain: "ethereum",
    thesis: {
      narrative: "defi",
      xvipRank: "secondary",
      grayscaleStatus: "in-suite",
      investmentReason: "차세대 lending (모듈러). Coinbase 통합. Grayscale 보유.",
      risks: ["복잡성 ↑", "신규 프로토콜"],
    },
  },
  {
    base: "PENDLE", name: "Pendle", groups: ["rwa_defi"], priority: false,
    coingeckoId: "pendle", defillamaSlug: "pendle", chain: "ethereum",
    thesis: {
      narrative: "defi",
      xvipRank: "secondary",
      grayscaleStatus: "in-suite",
      investmentReason: "Yield tokenization. Real Yield 시대 핵심. Grayscale 보유.",
      risks: ["TVL 변동성 큼", "veToken lock-up"],
    },
  },
  {
    base: "MNT", name: "Mantle", groups: ["rwa_defi"], priority: false,
    coingeckoId: "mantle", chain: "ethereum",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: "secondary",
      grayscaleStatus: "consideration",
      investmentReason: "BitDAO 후신. ETH L2 + 자체 자금 보유. Grayscale 검토 중.",
      risks: ["채택 속도", "BitDAO 레거시"],
    },
  },

  // ── SOL 기반 (X-VIP) ────────────────────────────────────────────────
  {
    base: "JUP", name: "Jupiter", groups: ["rwa_defi"], priority: false,
    coingeckoId: "jupiter-exchange-solana", defillamaSlug: "jupiter-aggregator", chain: "solana",
    thesis: {
      narrative: "defi",
      xvipRank: "secondary",
      grayscaleStatus: "in-suite",
      investmentReason: "Solana DEX 어그리게이터 1위. SOL 생태계 베타.",
      risks: ["meme 의존성"],
    },
  },
  {
    base: "JTO", name: "Jito", groups: ["rwa_defi"], priority: false,
    coingeckoId: "jito-governance-token", defillamaSlug: "jito", chain: "solana",
    thesis: {
      narrative: "defi",
      xvipRank: "secondary",
      grayscaleStatus: null,
      investmentReason: "Solana Liquid Staking 1위. MEV 수익.",
      risks: ["LST 경쟁"],
    },
  },
  {
    base: "INJ", name: "Injective", groups: ["rwa_defi"], priority: false,
    coingeckoId: "injective-protocol", chain: "other",
    thesis: {
      narrative: "defi",
      xvipRank: "secondary",
      grayscaleStatus: null,
      investmentReason: "DeFi 전용 L1. perp DEX + RWA.",
      risks: ["alt L1 경쟁"],
    },
  },
  {
    base: "ORCA", name: "Orca", groups: ["rwa_defi"], priority: false,
    coingeckoId: "orca", defillamaSlug: "orca", chain: "solana",
    thesis: {
      narrative: "defi", xvipRank: "secondary", grayscaleStatus: null,
      investmentReason: "Solana DEX 2위. AMM 안정.",
      risks: ["JUP에 점유율 잠식"],
    },
  },
  {
    base: "DRIFT", name: "Drift", groups: ["rwa_defi"], priority: false,
    coingeckoId: "drift-protocol", defillamaSlug: "drift-trade", chain: "solana",
    thesis: {
      narrative: "defi", xvipRank: "secondary", grayscaleStatus: null,
      investmentReason: "Solana perp DEX. 거래량 증가 추세.",
      risks: ["Hyperliquid 등 경쟁"],
    },
  },

  // ── Sui 기반 ────────────────────────────────────────────────────────
  {
    base: "DEEP", name: "DeepBook", groups: ["rwa_defi"], priority: false,
    coingeckoId: "deep", defillamaSlug: "deepbook", chain: "sui",
    thesis: {
      narrative: "defi", xvipRank: "secondary", grayscaleStatus: null,
      investmentReason: "Sui 네이티브 orderbook DEX. 기관 친화 구조.",
      risks: ["Sui 생태계 의존"],
    },
  },
  {
    base: "WAL", name: "Walrus", groups: ["rwa_defi"], priority: false,
    coingeckoId: "walrus-2", chain: "sui",
    thesis: {
      narrative: "rwa", xvipRank: "secondary", grayscaleStatus: null,
      investmentReason: "Sui 분산 스토리지. AI 데이터 + RWA 보관.",
      risks: ["신생 프로토콜", "토큰 unlock 압력"],
    },
  },
  {
    base: "HYPE", name: "Hyperliquid", groups: ["rwa_defi"], priority: false,
    coingeckoId: "hyperliquid", defillamaSlug: "hyperliquid", chain: "other",
    thesis: {
      narrative: "defi",
      xvipRank: "secondary",
      grayscaleStatus: "in-suite",
      investmentReason: "Onchain perp 1위. CEX 수준 UX. Grayscale 보유.",
      risks: ["고평가 (FDV)", "중앙화 우려"],
    },
  },

  // ── AI (X-VIP) ──────────────────────────────────────────────────────
  {
    base: "RENDER", name: "Render", groups: ["ai"], priority: true,
    coingeckoId: "render-token", chain: "solana",
    thesis: {
      narrative: "ai",
      xvipRank: "core",
      grayscaleStatus: "in-suite",
      investmentReason: "분산 GPU 1위 (DePIN + AI). AI 컴퓨트 수요 베타.",
      risks: ["GPU 수요 vs 공급", "기관 클라우드와 경쟁"],
    },
  },
  {
    base: "TAO", name: "Bittensor", groups: ["ai"], priority: true,
    coingeckoId: "bittensor", chain: "other",
    thesis: {
      narrative: "ai",
      xvipRank: "core",
      grayscaleStatus: "in-suite",
      investmentReason: "탈중앙 AI 모델 인센티브. 서브넷 생태계. Grayscale 보유.",
      risks: ["복잡한 토크노믹스", "기술 검증 진행 중"],
    },
  },
  {
    base: "ATH", name: "Aethir", groups: ["ai"], priority: false,
    coingeckoId: "aethir", chain: "other",
    thesis: {
      narrative: "ai",
      xvipRank: "secondary",
      grayscaleStatus: null,
      investmentReason: "분산 GPU 클라우드. RNDR 경쟁자. Scenario X X-VIP AI 카테고리.",
      risks: ["RNDR과 직접 경쟁", "토큰 unlock"],
    },
    notes: "Scenario X '에이셔'",
  },
  {
    base: "AKT", name: "Akash Network", groups: ["ai"], priority: false,
    coingeckoId: "akash-network", chain: "other",
    thesis: {
      narrative: "ai", xvipRank: "secondary", grayscaleStatus: null,
      investmentReason: "분산 컴퓨트 마켓플레이스. AI 추론 인프라.",
      risks: ["수요 검증 부족"],
    },
  },
  {
    base: "VIRTUAL", name: "Virtuals Protocol", groups: ["ai"], priority: false,
    coingeckoId: "virtual-protocol", chain: "base",
    thesis: {
      narrative: "ai", xvipRank: "secondary", grayscaleStatus: null,
      investmentReason: "AI 에이전트 토큰화 플랫폼. Base 생태계 1위.",
      risks: ["agent meme 사이클 의존"],
    },
  },
  {
    base: "NEAR", name: "Near Protocol", groups: ["ai"], priority: false,
    coingeckoId: "near", chain: "near",
    thesis: {
      narrative: "ai", xvipRank: "secondary", grayscaleStatus: null,
      investmentReason: "AI 친화 L1. Chain Signatures + Account Abstraction.",
      risks: ["alt L1 경쟁"],
    },
  },
  {
    base: "IP", name: "Story", groups: ["ai"], priority: false,
    coingeckoId: "story-2", chain: "other",
    thesis: {
      narrative: "ai", xvipRank: "secondary", grayscaleStatus: null,
      investmentReason: "AI 시대 IP 토큰화. a16z 투자.",
      risks: ["신규 카테고리 검증 중"],
    },
  },

  // ── Meme (X-VIP) ────────────────────────────────────────────────────
  {
    base: "DOGE", name: "Dogecoin", groups: ["meme"], priority: true,
    coingeckoId: "dogecoin", chain: "other",
    thesis: {
      narrative: "meme",
      xvipRank: "core",
      grayscaleStatus: null,
      investmentReason: "Meme 1위 + ETF 가능성. 사이클 후반 베타.",
      risks: ["상승장 후반 의존", "fundamentals 부재"],
    },
  },
  {
    base: "SHIB", name: "Shiba Inu", groups: ["meme"], priority: true,
    coingeckoId: "shiba-inu", chain: "ethereum",
    thesis: {
      narrative: "meme",
      xvipRank: "core",
      grayscaleStatus: null,
      investmentReason: "Meme 2위. Shibarium L2. 커뮤니티 강함.",
      risks: ["DOGE에 비해 모멘텀 약함"],
    },
  },
  {
    base: "PEPE", name: "Pepe", groups: ["meme"], priority: false,
    coingeckoId: "pepe", chain: "ethereum",
    thesis: {
      narrative: "meme", xvipRank: "secondary", grayscaleStatus: null,
      investmentReason: "ETH meme 1위. 변동성 베타.",
      risks: ["심한 변동성"],
    },
  },
  {
    base: "BONK", name: "Bonk", groups: ["meme"], priority: false,
    coingeckoId: "bonk", chain: "solana",
    thesis: {
      narrative: "meme",
      xvipRank: "secondary",
      grayscaleStatus: "in-suite",
      investmentReason: "Solana meme 1위. SOL 생태계 sentiment 지표.",
      risks: ["meme 사이클 의존"],
    },
  },
  {
    base: "PENGU", name: "Pudgy Penguins", groups: ["meme"], priority: false,
    coingeckoId: "pudgy-penguins", chain: "solana",
    thesis: {
      narrative: "meme", xvipRank: "secondary", grayscaleStatus: null,
      investmentReason: "NFT 브랜드 → 토큰화. 컨슈머 진입 후보.",
      risks: ["신생 카테고리"],
    },
  },
  {
    base: "MEW", name: "Cat in a dogs world", groups: ["meme"], priority: false,
    coingeckoId: "cat-in-a-dogs-world", chain: "solana",
    thesis: {
      narrative: "meme", xvipRank: "secondary", grayscaleStatus: null,
      investmentReason: "Solana meme. SOL 베타.",
      risks: ["순수 meme"],
    },
  },

  // ── Privacy (X-VIP) ─────────────────────────────────────────────────
  {
    base: "ZEC", name: "Zcash", groups: ["privacy"], priority: true,
    coingeckoId: "zcash", chain: "other",
    thesis: {
      narrative: "privacy",
      xvipRank: "core",
      grayscaleStatus: "in-suite",
      investmentReason: "Privacy + Currency sector. Grayscale Currencies 노란색 강조 (편입 강화 신호).",
      risks: ["규제 압박 가능", "거래소 delisting 사례"],
    },
  },
  {
    base: "XMR", name: "Monero", groups: ["privacy"], priority: false,
    coingeckoId: "monero", chain: "other",
    thesis: {
      narrative: "privacy", xvipRank: "secondary", grayscaleStatus: null,
      investmentReason: "Privacy 표준. 강한 커뮤니티.",
      risks: ["주요 거래소 delisting", "기관 진입 막힘"],
    },
  },

  // ── Grayscale Smart Contract Platforms — In Suite (신규 추가) ──────
  {
    base: "BNB", name: "BNB Chain", groups: ["layer1"], priority: false,
    coingeckoId: "binancecoin", chain: "bsc",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: null,
      grayscaleStatus: "in-suite",
      investmentReason: "Binance 생태계 토큰. 거래량 베타. Grayscale 보유.",
      risks: ["CEX 의존", "중앙화"],
    },
  },
  {
    base: "ETC", name: "Ethereum Classic", groups: ["layer1"], priority: false,
    coingeckoId: "ethereum-classic", chain: "other",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: null,
      grayscaleStatus: "in-suite",
      investmentReason: "ETH 분기 체인. PoW 유지. Grayscale Currencies 인접.",
      risks: ["내러티브 약함"],
    },
  },
  {
    base: "BCH", name: "Bitcoin Cash", groups: ["layer1"], priority: false,
    coingeckoId: "bitcoin-cash", chain: "other",
    thesis: {
      narrative: "currency",
      xvipRank: null,
      grayscaleStatus: "in-suite",
      investmentReason: "BTC 분기. Currency sector. Grayscale 보유.",
      risks: ["성장 모멘텀 약함"],
    },
  },

  // ── Grayscale "Under Consideration" — 신규 편입 후보 (선점) ────────
  {
    base: "MON", name: "Monad", groups: ["layer1"], priority: false,
    coingeckoId: undefined, chain: "other",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: null,
      grayscaleStatus: "consideration",
      investmentReason: "EVM 호환 차세대 L1. Grayscale 빨간 동그라미 (강한 편입 후보).",
      risks: ["미출시 또는 신생", "토큰 unlock"],
    },
    notes: "Grayscale Consideration 빨간 강조",
  },
  {
    base: "CELO", name: "Celo", groups: ["layer1"], priority: false,
    coingeckoId: "celo", chain: "other",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: null,
      grayscaleStatus: "consideration",
      investmentReason: "모바일 네이티브 L1. ETH L2 전환. Grayscale 검토.",
      risks: ["채택 정체"],
    },
  },
  {
    base: "TON", name: "Toncoin", groups: ["layer1"], priority: false,
    coingeckoId: "the-open-network", chain: "ton",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: null,
      grayscaleStatus: "consideration",
      investmentReason: "Telegram 통합 L1. mass adoption 잠재. Grayscale 검토.",
      risks: ["Telegram 의존", "생태계 신생"],
    },
  },
  {
    base: "TRX", name: "Tron", groups: ["layer1"], priority: false,
    coingeckoId: "tron", chain: "tron",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: null,
      grayscaleStatus: "consideration",
      investmentReason: "USDT 발행 1위 체인. 결제 인프라. Grayscale 검토.",
      risks: ["중앙화", "Justin Sun 리스크"],
    },
  },

  // ── Grayscale "In Suite" 추가 (우리 universe 신규) ─────────────────
  {
    base: "HBAR", name: "Hedera", groups: ["layer1"], priority: false,
    coingeckoId: "hedera-hashgraph", chain: "other",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: null,
      grayscaleStatus: "in-suite",
      investmentReason: "Enterprise DLT. 기관 거버넌스. Grayscale SCP 보유.",
      risks: ["대중 채택 약함"],
    },
  },
  {
    base: "STX", name: "Stacks", groups: ["layer1"], priority: false,
    coingeckoId: "blockstack", chain: "other",
    thesis: {
      narrative: "smart-contract-platform",
      xvipRank: null,
      grayscaleStatus: "in-suite",
      investmentReason: "BTC 위 스마트 컨트랙트. BTC L2 카테고리.",
      risks: ["BTC L2 경쟁 격화"],
    },
  },
];

/**
 * 7개 기관 보유 코인. (Grayscale은 X-VIP에 통합되었으니 여기 별도 없음)
 * 기관 추적용으로 유지 — universe와 별개 데이터.
 */
export const INSTITUTIONS = {
  Grayscale: ["BTC", "ETH", "ETC", "LTC", "BCH", "XLM", "ZEC", "ZEN", "SOL", "ADA", "AVAX", "DOT", "POL", "LINK", "UNI", "AAVE", "MKR", "FIL", "APT", "ARB", "BNB", "CELO", "MNT", "TRX", "ENA", "EUL", "HYPE", "JUP", "MORPHO", "PENDLE", "BONK", "PLAY", "ARIA", "RENDER", "FET", "OCEAN", "TAO", "ONDO", "CFG", "POLYX", "ZRO", "GRASS", "KAITO", "2Z"],
  Bitwise: ["BTC", "ETH", "XRP", "SOL", "ADA", "LINK", "AVAX", "LTC", "DOT", "SUI"],
  "21Shares": ["BTC", "ETH", "XRP", "BNB", "SOL"],
  CoinShares: ["BTC", "ETH", "SOL", "XRP", "ADA", "AVAX", "DOT", "BNB", "UNI", "LTC", "TON", "ATOM", "POL", "ALGO", "XTZ", "SEI"],
  Pantera: ["BTC", "ETH", "XRP", "ZEC", "TON", "DOT", "NEAR", "ONDO", "MORPHO", "ENA", "ATOM", "FIL"],
  "Galaxy Digital": ["BTC", "ETH", "AVAX", "POL", "XMR", "TIA", "AXL"],
  Paradigm: ["ETH", "UNI", "OP", "ARB"],
} as const;

export type Institution = keyof typeof INSTITUTIONS;

/**
 * 기관에서만 보유하고 Curated Universe에는 없는 코인 — 기관 비교용 데이터로만.
 * 시그널 추적은 안 함 (universe.ts의 thesis 없는 코인).
 */
function institutionOnlyCoins(): Coin[] {
  const xvipBases = new Set(XVIP_UNIVERSE.map((c) => c.base));
  const all = new Set<string>();
  for (const list of Object.values(INSTITUTIONS)) for (const b of list) all.add(b);
  const extras: Coin[] = [];
  for (const b of all) {
    if (xvipBases.has(b)) continue;
    extras.push({
      base: b,
      name: b,
      groups: ["institution_only"],
      priority: false,
      // thesis 없음 — 추적만, 시그널 가중치 없음
    });
  }
  return extras;
}

export const ALL_COINS: Coin[] = [...XVIP_UNIVERSE, ...institutionOnlyCoins()];

export function holdersOf(base: string): Institution[] {
  const out: Institution[] = [];
  for (const [inst, list] of Object.entries(INSTITUTIONS)) {
    if ((list as readonly string[]).includes(base)) out.push(inst as Institution);
  }
  return out;
}

export function filterUniverse(name: "core" | "xvip" | "all" | "priority" | "curated"): Coin[] {
  switch (name) {
    case "core":
      return ALL_COINS.filter((c) => (CORE_COINS as readonly string[]).includes(c.base));
    case "xvip":
      return XVIP_UNIVERSE;
    case "priority":
      return ALL_COINS.filter((c) => c.priority);
    case "curated":
      return XVIP_UNIVERSE.filter((c) => c.thesis); // thesis 있는 코인만
    case "all":
      return ALL_COINS;
  }
}

/** Thesis 강도 점수 — 시그널 시스템에서 가중치로 사용 */
export function thesisStrength(coin: Coin): number {
  if (!coin.thesis) return 0;
  let s = 0;
  if (coin.thesis.xvipRank === "core") s += 2;
  else if (coin.thesis.xvipRank === "secondary") s += 1;
  if (coin.thesis.grayscaleStatus === "in-suite") s += 1;
  else if (coin.thesis.grayscaleStatus === "consideration") s += 1;
  return s;
}
