export type Tier = "free" | "pro" | "pro_plus";

export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  tier: Tier;
  created_at: string;
  disclaimer_accepted_at: string | null;
}

export interface JWTPayload {
  sub: string;
  email: string;
  tier: Tier;
  iat: number;
  exp: number;
}

export interface RefreshPayload {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface OAuthInitResponse {
  authorize_url: string;
  state: string;
}

export interface OAuthCallbackBody {
  code: string;
  state: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface PKCEParams {
  code_verifier: string;
  code_challenge: string;
  state: string;
  nonce: string;
}
