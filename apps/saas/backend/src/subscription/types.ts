import type { Tier } from "../auth/types.ts";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired";

export type PaymentProvider = "toss" | "stripe";

export interface Subscription {
  id: string;
  user_id: string;
  provider: PaymentProvider;
  provider_subscription_id: string;
  tier: Tier;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface CheckoutSessionParams {
  user_id: string;
  email: string;
  tier: Exclude<Tier, "free">;
  provider: PaymentProvider;
  success_url: string;
  cancel_url: string;
}

export interface CheckoutSession {
  provider: PaymentProvider;
  checkout_url: string;
  session_id: string;
}

export interface WebhookResult {
  ok: boolean;
  event_id: string;
  duplicated: boolean;
}
