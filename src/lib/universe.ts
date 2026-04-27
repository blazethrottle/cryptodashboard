/**
 * 코인 유니버스: X-VIP 포트폴리오 + 기관 포트폴리오 합집합.
 * `priority`는 X-VIP에서 빨간색으로 강조된 코어 픽 + 사용자 지정 중심 4개.
 */

export type Group =
  | "core"
  | "layer1"
  | "layer1_2"
  | "rwa_defi"
  | "ai"
  | "meme"
  | "privacy"
  | "institution_only";

export interface Coin {
  base: string;        // Binance base symbol (e.g. BTC)
  name: string;        // 표시명
  groups: Group[];
  priority: boolean;   // 사용자가 강조한 코인 여부
  coingeckoId?: string; // CoinGecko ID for fallback when not on Binance
  defillamaSlug?: string; // DefiLlama protocol slug for TVL tracking
  chain?: "ethereum" | "solana" | "sui" | "bitcoin" | "ton" | "cardano" | "avalanche" | "polkadot" | "near" | "polygon" | "arbitrum" | "optimism" | "base" | "tron" | "bsc" | "other";
  notes?: string;
}

/**
 * 사용자가 지정한 중심 4개 — 항상 핵심으로 표시.
 */
export const CORE_COINS = ["BTC", "ETH", "SOL", "XRP"] as const;

/**
 * X-VIP 포트폴리오 (ver 2026.04). 빨간색=priority.
 */
export const XVIP_UNIVERSE: Coin[] = [
  // 필수 자산
  { base: "BTC", name: "Bitcoin", groups: ["core"], priority: true, coingeckoId: "bitcoin", chain: "bitcoin" },
  { base: "ETH", name: "Ethereum", groups: ["core"], priority: true, coingeckoId: "ethereum", chain: "ethereum" },
  { base: "SOL", name: "Solana", groups: ["core"], priority: true, coingeckoId: "solana", chain: "solana" },
  { base: "XRP", name: "XRP", groups: ["core"], priority: true, coingeckoId: "ripple", chain: "other" },

  // 핵심 레이어1
  { base: "LINK", name: "Chainlink", groups: ["layer1"], priority: true, coingeckoId: "chainlink", chain: "ethereum" },
  { base: "SUI", name: "Sui", groups: ["layer1"], priority: true, coingeckoId: "sui", chain: "sui" },
  { base: "XLM", name: "Stellar", groups: ["layer1"], priority: false, coingeckoId: "stellar", chain: "other" },
  { base: "ADA", name: "Cardano", groups: ["layer1"], priority: false, coingeckoId: "cardano", chain: "cardano" },

  // 레이어1 / 레이어2
  { base: "AVAX", name: "Avalanche", groups: ["layer1_2"], priority: true, coingeckoId: "avalanche-2", chain: "avalanche" },
  { base: "ARB", name: "Arbitrum", groups: ["layer1_2"], priority: false, coingeckoId: "arbitrum", chain: "arbitrum" },
  { base: "ALGO", name: "Algorand", groups: ["layer1_2"], priority: false, coingeckoId: "algorand", chain: "other" },
  { base: "DOT", name: "Polkadot", groups: ["layer1_2"], priority: false, coingeckoId: "polkadot", chain: "polkadot" },
  { base: "LTC", name: "Litecoin", groups: ["layer1_2"], priority: false, coingeckoId: "litecoin", chain: "other" },

  // RWA / DeFi
  { base: "ONDO", name: "Ondo Finance", groups: ["rwa_defi"], priority: true, coingeckoId: "ondo-finance", defillamaSlug: "ondo-finance", chain: "ethereum" },
  { base: "UNI", name: "Uniswap", groups: ["rwa_defi"], priority: true, coingeckoId: "uniswap", defillamaSlug: "uniswap", chain: "ethereum" },
  { base: "AAVE", name: "Aave", groups: ["rwa_defi"], priority: true, coingeckoId: "aave", defillamaSlug: "aave", chain: "ethereum" },
  { base: "COMP", name: "Compound", groups: ["rwa_defi"], priority: true, coingeckoId: "compound-governance-token", defillamaSlug: "compound-finance", chain: "ethereum" },
  { base: "MORPHO", name: "Morpho", groups: ["rwa_defi"], priority: false, coingeckoId: "morpho", defillamaSlug: "morpho-blue", chain: "ethereum", notes: "이더리움 기반" },
  { base: "PENDLE", name: "Pendle", groups: ["rwa_defi"], priority: false, coingeckoId: "pendle", defillamaSlug: "pendle", chain: "ethereum", notes: "이더리움 기반" },
  { base: "MNT", name: "Mantle", groups: ["rwa_defi"], priority: false, coingeckoId: "mantle", chain: "ethereum", notes: "이더리움 기반" },
  { base: "JUP", name: "Jupiter", groups: ["rwa_defi"], priority: false, coingeckoId: "jupiter-exchange-solana", defillamaSlug: "jupiter-aggregator", chain: "solana", notes: "솔라나 기반" },
  { base: "JTO", name: "Jito", groups: ["rwa_defi"], priority: false, coingeckoId: "jito-governance-token", defillamaSlug: "jito", chain: "solana", notes: "솔라나 기반" },
  { base: "INJ", name: "Injective", groups: ["rwa_defi"], priority: false, coingeckoId: "injective-protocol", chain: "other", notes: "솔라나 기반(인젝티브)" },
  { base: "ORCA", name: "Orca", groups: ["rwa_defi"], priority: false, coingeckoId: "orca", defillamaSlug: "orca", chain: "solana", notes: "솔라나 기반" },
  { base: "DRIFT", name: "Drift", groups: ["rwa_defi"], priority: false, coingeckoId: "drift-protocol", defillamaSlug: "drift-trade", chain: "solana", notes: "솔라나 기반" },
  { base: "DEEP", name: "DeepBook", groups: ["rwa_defi"], priority: false, coingeckoId: "deep", defillamaSlug: "deepbook", chain: "sui", notes: "수이 기반" },
  { base: "WAL", name: "Walrus", groups: ["rwa_defi"], priority: false, coingeckoId: "walrus-2", chain: "sui", notes: "수이 기반" },
  { base: "HYPE", name: "Hyperliquid", groups: ["rwa_defi"], priority: false, coingeckoId: "hyperliquid", defillamaSlug: "hyperliquid", chain: "other" },

  // AI
  { base: "RENDER", name: "Render", groups: ["ai"], priority: true, coingeckoId: "render-token", chain: "solana" },
  { base: "TAO", name: "Bittensor", groups: ["ai"], priority: true, coingeckoId: "bittensor", chain: "other" },
  { base: "AKT", name: "Akash Network", groups: ["ai"], priority: false, coingeckoId: "akash-network", chain: "other" },
  { base: "VIRTUAL", name: "Virtuals Protocol", groups: ["ai"], priority: false, coingeckoId: "virtual-protocol", chain: "base" },
  { base: "NEAR", name: "Near Protocol", groups: ["ai"], priority: false, coingeckoId: "near", chain: "near" },
  { base: "IP", name: "Story", groups: ["ai"], priority: false, coingeckoId: "story-2", chain: "other", notes: "Story Protocol" },

  // Meme
  { base: "DOGE", name: "Dogecoin", groups: ["meme"], priority: true, coingeckoId: "dogecoin", chain: "other" },
  { base: "SHIB", name: "Shiba Inu", groups: ["meme"], priority: true, coingeckoId: "shiba-inu", chain: "ethereum" },
  { base: "PEPE", name: "Pepe", groups: ["meme"], priority: false, coingeckoId: "pepe", chain: "ethereum" },
  { base: "MEW", name: "Cat in a dogs world", groups: ["meme"], priority: false, coingeckoId: "cat-in-a-dogs-world", chain: "solana" },
  { base: "BONK", name: "Bonk", groups: ["meme"], priority: false, coingeckoId: "bonk", chain: "solana" },
  { base: "PENGU", name: "Pudgy Penguins", groups: ["meme"], priority: false, coingeckoId: "pudgy-penguins", chain: "solana" },

  // Privacy
  { base: "ZEC", name: "Zcash", groups: ["privacy"], priority: true, coingeckoId: "zcash", chain: "other" },
  { base: "XMR", name: "Monero", groups: ["privacy"], priority: false, coingeckoId: "monero", chain: "other" },
];

/**
 * 기관 포트폴리오 (slide 4). X-VIP에 없는 코인만 institution_only로 보강.
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
 * 기관에서만 보유하고 X-VIP에는 없는 코인 — 트래킹 보조용.
 */
function institutionOnlyCoins(): Coin[] {
  const xvipBases = new Set(XVIP_UNIVERSE.map((c) => c.base));
  const all = new Set<string>();
  for (const list of Object.values(INSTITUTIONS)) for (const b of list) all.add(b);
  const extras: Coin[] = [];
  for (const b of all) {
    if (xvipBases.has(b)) continue;
    extras.push({ base: b, name: b, groups: ["institution_only"], priority: false });
  }
  return extras;
}

/**
 * 전체 통합 유니버스. 중복 제거.
 */
export const ALL_COINS: Coin[] = [...XVIP_UNIVERSE, ...institutionOnlyCoins()];

/**
 * 특정 코인을 어떤 기관이 보유하고 있는지 역인덱스.
 */
export function holdersOf(base: string): Institution[] {
  const out: Institution[] = [];
  for (const [inst, list] of Object.entries(INSTITUTIONS)) {
    if ((list as readonly string[]).includes(base)) out.push(inst as Institution);
  }
  return out;
}

/**
 * 유니버스 필터 헬퍼.
 */
export function filterUniverse(name: "core" | "xvip" | "all" | "priority"): Coin[] {
  switch (name) {
    case "core":
      return ALL_COINS.filter((c) => (CORE_COINS as readonly string[]).includes(c.base));
    case "xvip":
      return XVIP_UNIVERSE;
    case "priority":
      return ALL_COINS.filter((c) => c.priority);
    case "all":
      return ALL_COINS;
  }
}
