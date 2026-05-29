import { createHmac, timingSafeEqual } from "node:crypto";
import type { CheckoutSession, CheckoutSessionParams } from "./types.ts";

const TOSS_BILLING_BASE = "https://api.tosspayments.com/v1/billing";

export function verifyTossWebhookSignature(params: {
  rawBody: string;
  signature: string;
  secret: string;
}): boolean {
  const expected = createHmac("sha256", params.secret)
    .update(params.rawBody)
    .digest("hex");
  const got = Buffer.from(params.signature);
  const exp = Buffer.from(expected);
  if (got.length !== exp.length) return false;
  return timingSafeEqual(got, exp);
}

export async function createTossCheckoutSession(
  params: CheckoutSessionParams & { secret_key: string }
): Promise<CheckoutSession> {
  const body = {
    customerKey: params.user_id,
    customerEmail: params.email,
    successUrl: params.success_url,
    failUrl: params.cancel_url,
    tier: params.tier,
  };
  const res = await fetch(`${TOSS_BILLING_BASE}/checkout-sessions`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(params.secret_key + ":").toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Toss checkout failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { checkoutUrl: string; sessionId: string };
  return {
    provider: "toss",
    checkout_url: json.checkoutUrl,
    session_id: json.sessionId,
  };
}

export interface TossWebhookEvent {
  eventId: string;
  eventType:
    | "billing.subscription.created"
    | "billing.subscription.updated"
    | "billing.subscription.canceled"
    | "billing.payment.succeeded"
    | "billing.payment.failed";
  data: {
    customerKey: string;
    subscriptionId: string;
    tier?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  };
}

export function parseTossWebhook(rawBody: string): TossWebhookEvent {
  return JSON.parse(rawBody) as TossWebhookEvent;
}
