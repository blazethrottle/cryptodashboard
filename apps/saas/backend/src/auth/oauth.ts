import { createHash, randomBytes } from "node:crypto";
import type { PKCEParams } from "./types.ts";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generatePKCE(): PKCEParams {
  const code_verifier = base64UrlEncode(randomBytes(32));
  const code_challenge = base64UrlEncode(
    createHash("sha256").update(code_verifier).digest()
  );
  const state = base64UrlEncode(randomBytes(16));
  const nonce = base64UrlEncode(randomBytes(16));
  return { code_verifier, code_challenge, state, nonce };
}

export function buildAuthorizeUrl(params: {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  state: string;
  nonce: string;
}): string {
  const query = new URLSearchParams({
    client_id: params.client_id,
    redirect_uri: params.redirect_uri,
    response_type: "code",
    scope: "openid email profile",
    code_challenge: params.code_challenge,
    code_challenge_method: "S256",
    state: params.state,
    nonce: params.nonce,
    access_type: "offline",
    prompt: "consent",
  });
  return `${GOOGLE_AUTH_URL}?${query.toString()}`;
}

export interface GoogleTokens {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(params: {
  code: string;
  code_verifier: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    code: params.code,
    code_verifier: params.code_verifier,
    client_id: params.client_id,
    client_secret: params.client_secret,
    redirect_uri: params.redirect_uri,
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as GoogleTokens;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
}

export async function fetchUserInfo(access_token: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!res.ok) throw new Error(`Google userinfo failed: ${res.status}`);
  return (await res.json()) as GoogleUserInfo;
}
