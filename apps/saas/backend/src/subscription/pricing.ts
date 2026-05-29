import type { Tier } from "../auth/types.ts";

export interface TierPricing {
  tier: Tier;
  monthly_krw: number;
  monthly_usd: number;
  features: string[];
}

export const PRICING: Record<Tier, TierPricing> = {
  free: {
    tier: "free",
    monthly_krw: 0,
    monthly_usd: 0,
    features: [
      "4 main coins (BTC·ETH·SOL·XRP)",
      "Daily Korean brief 1회",
      "Email alerts",
    ],
  },
  pro: {
    tier: "pro",
    monthly_krw: 29_000,
    monthly_usd: 22,
    features: [
      "16 coins universe",
      "Unlimited Korean brief",
      "Telegram + Email + Web Push",
      "Tier-based rate limit 1,000 req/hr",
    ],
  },
  pro_plus: {
    tier: "pro_plus",
    monthly_krw: 59_000,
    monthly_usd: 45,
    features: [
      "Custom coin universe (unlimited)",
      "Institutional flows (7 funds, 13F lag 명시)",
      "Multibagger Score",
      "Audit log + citation 풀",
      "Priority alerts",
      "Rate limit 10,000 req/hr",
    ],
  },
};

export const RATE_LIMIT_PER_HOUR: Record<Tier, number> = {
  free: 100,
  pro: 1_000,
  pro_plus: 10_000,
};
