import { SignJWT, jwtVerify, importPKCS8, importSPKI } from "jose";
import { randomBytes } from "node:crypto";
import type { JWTPayload, RefreshPayload, Tier } from "./types.ts";

const ALG = "RS256";
const ACCESS_TTL = "15m";
const REFRESH_TTL = "30d";

async function getPrivateKey() {
  const pem = process.env.JWT_PRIVATE_KEY;
  if (!pem) throw new Error("JWT_PRIVATE_KEY missing");
  return importPKCS8(pem.replace(/\\n/g, "\n"), ALG);
}

async function getPublicKey() {
  const pem = process.env.JWT_PUBLIC_KEY;
  if (!pem) throw new Error("JWT_PUBLIC_KEY missing");
  return importSPKI(pem.replace(/\\n/g, "\n"), ALG);
}

export async function issueAccessToken(user: {
  id: string;
  email: string;
  tier: Tier;
}): Promise<string> {
  const key = await getPrivateKey();
  return new SignJWT({ email: user.email, tier: user.tier })
    .setProtectedHeader({ alg: ALG })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .setIssuer("crypto-dashboard-saas")
    .sign(key);
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const key = await getPrivateKey();
  const jti = randomBytes(16).toString("hex");
  return new SignJWT({ jti })
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TTL)
    .setIssuer("crypto-dashboard-saas")
    .sign(key);
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const key = await getPublicKey();
  const { payload } = await jwtVerify(token, key, {
    issuer: "crypto-dashboard-saas",
  });
  return payload as unknown as JWTPayload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshPayload> {
  const key = await getPublicKey();
  const { payload } = await jwtVerify(token, key, {
    issuer: "crypto-dashboard-saas",
  });
  return payload as unknown as RefreshPayload;
}
