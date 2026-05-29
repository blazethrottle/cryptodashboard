import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "./jwt.ts";
import type { JWTPayload, Tier } from "./types.ts";

declare module "fastify" {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const cookie = req.cookies["cd_access"];
  const header = req.headers.authorization;
  const token = cookie ?? (header?.startsWith("Bearer ") ? header.slice(7) : null);
  if (!token) {
    return reply.code(401).send({ error: "unauthenticated" });
  }
  try {
    req.user = await verifyAccessToken(token);
  } catch {
    return reply.code(401).send({ error: "invalid_token" });
  }
}

export function requireTier(minimum: Tier) {
  const rank: Record<Tier, number> = { free: 0, pro: 1, pro_plus: 2 };
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) return reply.code(401).send({ error: "unauthenticated" });
    if (rank[req.user.tier] < rank[minimum]) {
      return reply.code(403).send({ error: "tier_required", required: minimum });
    }
  };
}
