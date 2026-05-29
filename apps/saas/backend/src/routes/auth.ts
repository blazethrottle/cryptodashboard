import type { FastifyInstance } from "fastify";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  fetchUserInfo,
  generatePKCE,
} from "../auth/oauth.ts";
import {
  issueAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
} from "../auth/jwt.ts";
import { authenticate } from "../auth/middleware.ts";
import type { AuthSession, Tier } from "../auth/types.ts";

const CallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

const PENDING_STATE_TTL_MS = 10 * 60 * 1000;
const pendingStates = new Map<
  string,
  { code_verifier: string; nonce: string; expires_at: number }
>();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pendingStates) {
    if (v.expires_at < now) pendingStates.delete(k);
  }
}, 60_000).unref();

export async function authRoutes(app: FastifyInstance) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const client_id = process.env.GOOGLE_OAUTH_CLIENT_ID!;
  const client_secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
  const redirect_uri = process.env.GOOGLE_OAUTH_REDIRECT_URI!;

  app.post("/auth/init", async (_req, reply) => {
    const pkce = generatePKCE();
    pendingStates.set(pkce.state, {
      code_verifier: pkce.code_verifier,
      nonce: pkce.nonce,
      expires_at: Date.now() + PENDING_STATE_TTL_MS,
    });
    const authorize_url = buildAuthorizeUrl({
      client_id,
      redirect_uri,
      code_challenge: pkce.code_challenge,
      state: pkce.state,
      nonce: pkce.nonce,
    });
    return reply.send({ authorize_url, state: pkce.state });
  });

  app.post("/auth/callback", async (req, reply) => {
    const parsed = CallbackSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });
    const { code, state } = parsed.data;
    const pending = pendingStates.get(state);
    if (!pending) return reply.code(400).send({ error: "state_unknown" });
    pendingStates.delete(state);

    const tokens = await exchangeCodeForTokens({
      code,
      code_verifier: pending.code_verifier,
      client_id,
      client_secret,
      redirect_uri,
    });
    const info = await fetchUserInfo(tokens.access_token);
    if (!info.email_verified) {
      return reply.code(403).send({ error: "email_unverified" });
    }

    const { data: upserted, error } = await supabase
      .from("users")
      .upsert(
        {
          email: info.email,
          name: info.name,
          picture: info.picture,
        },
        { onConflict: "email" }
      )
      .select("id, email, name, picture, tier, created_at, disclaimer_accepted_at")
      .single();
    if (error || !upserted) return reply.code(500).send({ error: "user_upsert_failed" });

    const access_token = await issueAccessToken({
      id: upserted.id,
      email: upserted.email,
      tier: upserted.tier as Tier,
    });
    const refresh_token = await issueRefreshToken(upserted.id);

    reply.setCookie("cd_access", access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
    });
    reply.setCookie("cd_refresh", refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/auth",
      maxAge: 60 * 60 * 24 * 30,
    });

    const session: AuthSession = {
      access_token,
      refresh_token,
      user: upserted as AuthSession["user"],
    };
    return reply.send(session);
  });

  app.post("/auth/refresh", async (req, reply) => {
    const token = req.cookies["cd_refresh"];
    if (!token) return reply.code(401).send({ error: "no_refresh" });
    let payload;
    try {
      payload = await verifyRefreshToken(token);
    } catch {
      return reply.code(401).send({ error: "invalid_refresh" });
    }
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, tier")
      .eq("id", payload.sub)
      .single();
    if (error || !user) return reply.code(401).send({ error: "user_missing" });
    const access_token = await issueAccessToken({
      id: user.id,
      email: user.email,
      tier: user.tier as Tier,
    });
    reply.setCookie("cd_access", access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
    });
    return reply.send({ access_token });
  });

  app.get("/auth/me", { preHandler: authenticate }, async (req, reply) => {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, name, picture, tier, created_at, disclaimer_accepted_at")
      .eq("id", req.user!.sub)
      .single();
    if (error || !user) return reply.code(404).send({ error: "user_missing" });
    return reply.send(user);
  });

  app.post("/auth/logout", async (_req, reply) => {
    reply.clearCookie("cd_access", { path: "/" });
    reply.clearCookie("cd_refresh", { path: "/auth" });
    return reply.send({ ok: true });
  });

  app.post(
    "/auth/disclaimer-accept",
    { preHandler: authenticate },
    async (req, reply) => {
      const { error } = await supabase
        .from("users")
        .update({ disclaimer_accepted_at: new Date().toISOString() })
        .eq("id", req.user!.sub);
      if (error) return reply.code(500).send({ error: "update_failed" });
      return reply.send({ ok: true });
    }
  );
}
