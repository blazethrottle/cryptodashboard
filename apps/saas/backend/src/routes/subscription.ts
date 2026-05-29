import type { FastifyInstance } from "fastify";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { authenticate } from "../auth/middleware.ts";
import type {
  PaymentProvider,
  SubscriptionStatus,
  WebhookResult,
} from "../subscription/types.ts";
import type { Tier } from "../auth/types.ts";
import { PRICING } from "../subscription/pricing.ts";
import {
  createTossCheckoutSession,
  parseTossWebhook,
  verifyTossWebhookSignature,
} from "../subscription/toss.ts";
import {
  parseStripeWebhook,
  verifyStripeWebhookSignature,
} from "../subscription/stripe.ts";

const CheckoutBody = z.object({
  tier: z.enum(["pro", "pro_plus"]),
  provider: z.enum(["toss", "stripe"]),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});

function normalizeTier(value: unknown): Tier | null {
  if (value === "free" || value === "pro" || value === "pro_plus") return value;
  return null;
}

function normalizeStatus(value: string): SubscriptionStatus {
  switch (value) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "expired":
      return value;
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
      return "past_due";
    default:
      return "expired";
  }
}

export async function subscriptionRoutes(app: FastifyInstance) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const toss_secret = process.env.TOSS_SECRET_KEY!;
  const toss_webhook_secret = process.env.TOSS_WEBHOOK_SECRET!;
  const stripe_webhook_secret = process.env.STRIPE_WEBHOOK_SECRET!;

  app.get("/subscription/pricing", async (_req, reply) => {
    return reply.send({ pricing: PRICING });
  });

  app.post(
    "/subscription/checkout",
    { preHandler: authenticate },
    async (req, reply) => {
      const parsed = CheckoutBody.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });
      const session =
        parsed.data.provider === "toss"
          ? await createTossCheckoutSession({
              user_id: req.user!.sub,
              email: req.user!.email,
              tier: parsed.data.tier,
              provider: "toss",
              success_url: parsed.data.success_url,
              cancel_url: parsed.data.cancel_url,
              secret_key: toss_secret,
            })
          : await fastifyStripeStubCheckout(parsed.data);
      return reply.send(session);
    }
  );

  app.get(
    "/subscription/current",
    { preHandler: authenticate },
    async (req, reply) => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          "id, provider, provider_subscription_id, tier, status, current_period_start, current_period_end, cancel_at_period_end"
        )
        .eq("user_id", req.user!.sub)
        .in("status", ["trialing", "active", "past_due"])
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return reply.code(500).send({ error: "fetch_failed" });
      return reply.send({ subscription: data });
    }
  );

  app.post("/subscription/webhook/toss", async (req, reply) => {
    const raw = (req.body as string | undefined) ?? "";
    const signature = req.headers["x-toss-signature"];
    if (typeof signature !== "string") {
      return reply.code(400).send({ error: "missing_signature" });
    }
    const valid = verifyTossWebhookSignature({
      rawBody: raw,
      signature,
      secret: toss_webhook_secret,
    });
    if (!valid) return reply.code(401).send({ error: "invalid_signature" });
    const event = parseTossWebhook(raw);
    const result = await persistAndApply({
      supabase,
      provider: "toss",
      eventId: event.eventId,
      eventType: event.eventType,
      userKey: event.data.customerKey,
      providerSubId: event.data.subscriptionId,
      tier: normalizeTier(event.data.tier),
      status: event.eventType.endsWith(".canceled") ? "canceled" : "active",
      periodStart: event.data.currentPeriodStart,
      periodEnd: event.data.currentPeriodEnd,
      cancelAtPeriodEnd: event.data.cancelAtPeriodEnd ?? false,
      payload: event,
    });
    return reply.send(result);
  });

  app.post("/subscription/webhook/stripe", async (req, reply) => {
    const raw = (req.body as string | undefined) ?? "";
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string") {
      return reply.code(400).send({ error: "missing_signature" });
    }
    const valid = verifyStripeWebhookSignature({
      rawBody: raw,
      signatureHeader: signature,
      secret: stripe_webhook_secret,
    });
    if (!valid) return reply.code(401).send({ error: "invalid_signature" });
    const event = parseStripeWebhook(raw);
    const obj = event.data.object;
    const result = await persistAndApply({
      supabase,
      provider: "stripe",
      eventId: event.id,
      eventType: event.type,
      userKey: obj.metadata?.user_id ?? obj.customer,
      providerSubId: obj.id,
      tier: normalizeTier(obj.metadata?.tier),
      status: normalizeStatus(obj.status),
      periodStart: new Date(obj.current_period_start * 1000).toISOString(),
      periodEnd: new Date(obj.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: obj.cancel_at_period_end,
      payload: event,
    });
    return reply.send(result);
  });
}

async function fastifyStripeStubCheckout(params: {
  tier: Exclude<Tier, "free">;
}) {
  return {
    provider: "stripe" as PaymentProvider,
    checkout_url: `https://checkout.stripe.com/pay/cs_test_${params.tier}`,
    session_id: `cs_test_${params.tier}`,
  };
}

interface PersistArgs {
  supabase: any;
  provider: PaymentProvider;
  eventId: string;
  eventType: string;
  userKey: string;
  providerSubId: string;
  tier: Tier | null;
  status: SubscriptionStatus;
  periodStart?: string;
  periodEnd?: string;
  cancelAtPeriodEnd: boolean;
  payload: unknown;
}

async function persistAndApply(args: PersistArgs): Promise<WebhookResult> {
  const existing = await args.supabase
    .from("payment_events")
    .select("id")
    .eq("provider", args.provider)
    .eq("provider_event_id", args.eventId)
    .maybeSingle();
  if (existing.data) {
    return { ok: true, event_id: args.eventId, duplicated: true };
  }
  const { data: user } = await args.supabase
    .from("users")
    .select("id")
    .eq("id", args.userKey)
    .maybeSingle();
  const userId = (user as { id: string } | null)?.id ?? null;
  await args.supabase.from("payment_events").insert({
    provider: args.provider,
    provider_event_id: args.eventId,
    event_type: args.eventType,
    user_id: userId,
    payload: args.payload,
    processed_at: new Date().toISOString(),
  });
  if (userId && args.tier && args.periodStart && args.periodEnd) {
    await args.supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          provider: args.provider,
          provider_subscription_id: args.providerSubId,
          tier: args.tier,
          status: args.status,
          current_period_start: args.periodStart,
          current_period_end: args.periodEnd,
          cancel_at_period_end: args.cancelAtPeriodEnd,
        },
        { onConflict: "provider,provider_subscription_id" }
      );
    if (args.status === "active" || args.status === "trialing") {
      await args.supabase
        .from("users")
        .update({ tier: args.tier })
        .eq("id", userId);
    } else if (args.status === "canceled" || args.status === "expired") {
      await args.supabase.from("users").update({ tier: "free" }).eq("id", userId);
    }
  }
  return { ok: true, event_id: args.eventId, duplicated: false };
}
