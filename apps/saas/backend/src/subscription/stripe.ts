import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyStripeWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string;
  secret: string;
  toleranceSeconds?: number;
}): boolean {
  const tolerance = params.toleranceSeconds ?? 300;
  const parts = params.signatureHeader.split(",").map((p) => p.trim());
  const ts = parts.find((p) => p.startsWith("t="))?.slice(2);
  const v1 = parts.find((p) => p.startsWith("v1="))?.slice(3);
  if (!ts || !v1) return false;
  const timestamp = Number(ts);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > tolerance) return false;
  const payload = `${ts}.${params.rawBody}`;
  const expected = createHmac("sha256", params.secret)
    .update(payload)
    .digest("hex");
  const got = Buffer.from(v1);
  const exp = Buffer.from(expected);
  if (got.length !== exp.length) return false;
  return timingSafeEqual(got, exp);
}

export interface StripeWebhookEvent {
  id: string;
  type:
    | "customer.subscription.created"
    | "customer.subscription.updated"
    | "customer.subscription.deleted"
    | "invoice.payment_succeeded"
    | "invoice.payment_failed";
  data: {
    object: {
      id: string;
      customer: string;
      status: string;
      current_period_start: number;
      current_period_end: number;
      cancel_at_period_end: boolean;
      metadata?: { tier?: string; user_id?: string };
    };
  };
}

export function parseStripeWebhook(rawBody: string): StripeWebhookEvent {
  return JSON.parse(rawBody) as StripeWebhookEvent;
}
