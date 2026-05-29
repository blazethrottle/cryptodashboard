# Crypto Signal Dashboard SaaS: Auth Module Design (Phase 1)

**Date**: 2026-05-29  
**Context**: saas-swarm Skill 첫 실증 산출 (Dynamic Workflows + single task agent로 4 sub-section)  
**Tech Stack**: TypeScript + Node.js + Fastify + Supabase Auth + Google OAuth 2.0 PKCE + JWT + Row-Level Security (RLS)  
**Target**: 한국 솔로 트레이더 (Solo Traders)  
**Security Level**: High (security-guidance plugin + Anthropic practices)

---

## Sub-section 1: OAuth Flow Design (Google OAuth 2.0 PKCE)

### 목표
- 한국 사용자 친화: Google OAuth 2.0 PKCE (Authorization Code with Proof Key for Code Exchange)
- CORS·CSRF·state hijacking 방지
- nonce로 ID token 검증
- "투자 자문 아님" 한국어 disclaimer 동의 단계

### Architecture: 5-Step Sequence

```
┌─────────────────────────────┐
│ 1. Frontend 초기화           │
│    - code_verifier 생성       │
│    - code_challenge 파생      │
│    - state 난수 생성           │
│    - nonce 난수 생성           │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│ 2. Google Authorization Endpoint로 리다이렉트       │
│    ?client_id=...                                   │
│    &redirect_uri=...                                │
│    &response_type=code                              │
│    &scope=openid+email+profile                      │
│    &code_challenge=...                              │
│    &code_challenge_method=S256                      │
│    &state=...                                       │
│    &nonce=...                                       │
└─────────────┬───────────────────────────────────────┘
              │ (사용자 Google 계정으로 로그인)
              ▼
┌─────────────────────────────┐
│ 3. 한국어 Disclaimer 동의     │
│    "투자 자문 아님"            │
│    "과거 수익≠미래 보장"       │
│    "고손실 위험 상품"          │
│    ☑ 동의했음                  │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 4. Google → Backend Callback        │
│    ?code=...                         │
│    &state=...  (state 검증)          │
│    POST /auth/callback               │
│    body: { code, state, nonce, ... } │
└─────────────┬─────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│ 5. Backend: JWT 발행                        │
│    - code + code_verifier → Google token    │
│    - ID token nonce 검증                     │
│    - Supabase user 생성·업데이트             │
│    - JWT (access + refresh) 발행             │
│    - httpOnly cookie 또는 localStorage 저장  │
└─────────────────────────────────────────────┘
```

### Mermaid Diagram

```mermaid
sequenceDiagram
  participant User
  participant Frontend
  participant GoogleOAuth as Google OAuth
  participant Backend
  participant Supabase
  
  User->>Frontend: 로그인 버튼 클릭
  Frontend->>Frontend: code_verifier + state + nonce 생성
  Frontend->>GoogleOAuth: Redirect with PKCE params
  
  GoogleOAuth->>User: 로그인 화면
  User->>GoogleOAuth: 계정 선택 · 동의
  GoogleOAuth->>Frontend: callback with authorization code
  
  Frontend->>Frontend: state 검증
  Frontend->>Backend: POST /auth/callback (code, state, nonce)
  
  Backend->>GoogleOAuth: Token Exchange (code + code_verifier)
  GoogleOAuth->>Backend: id_token + access_token
  
  Backend->>Backend: nonce 검증 · 서명 검증
  Backend->>Supabase: upsert user (email, name, picture)
  Supabase->>Backend: user_id
  
  Backend->>Backend: JWT 발행 (RS256, 15m exp)
  Backend->>Frontend: Set-Cookie: jwt=...; HttpOnly
  Frontend->>User: Dashboard로 리다이렉트
```

### 핵심 보안 메커니즘

| 메커니즘 | 용도 | 검증 위치 |
|---------|------|---------|
| **PKCE (Proof Key)** | Authorization Code 탈취 방지 | Backend: code_verifier로 복호화 |
| **state** | CSRF 방지 | Frontend: callback state == 초기 state |
| **nonce** | Replay attack 방지 + ID token 위조 검증 | Backend: id_token nonce claim |
| **code_challenge (S256)** | Plain PKCE vs Hashed PKCE | SHA256(code_verifier) == code_challenge |
| **HTTPS only** | 모든 통신 암호화 | 인프라 레벨 (Railway/Fly.io) |
| **HttpOnly cookie** | JavaScript XSS로부터 JWT 보호 | Response header: Set-Cookie + HttpOnly flag |

### 한국 사용자 UX: Disclaimer Flow

```typescript
// Frontend: 동의 동의 단계 (OAuth callback 전)
type DisclaimerStep = {
  stepId: 'fund_risk' | 'no_advisor' | 'past_not_future';
  koreanText: string;
  required: boolean;
};

const disclaimers: DisclaimerStep[] = [
  {
    stepId: 'no_advisor',
    koreanText: '본 서비스는 투자자문업 허가 상품이 아니며, 정보 제공 목적입니다.',
    required: true
  },
  {
    stepId: 'past_not_future',
    koreanText: '과거 수익률은 미래 수익을 보장하지 않습니다.',
    required: true
  },
  {
    stepId: 'fund_risk',
    koreanText: '암호화폐는 고위험 자산입니다. 손실 위험을 감수하는 범위 내에서만 투자하세요.',
    required: true
  }
];
```

---

## Sub-section 2: Supabase Auth Integration + Session Management

### 2-1. Supabase 환경 설정

```bash
# .env.example
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Backend only
GOOGLE_OAUTH_CLIENT_ID=12345...client_id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-...
GOOGLE_OAUTH_REDIRECT_URI=https://yourapp.com/auth/callback
JWT_SECRET=your-rs256-private-key-base64
JWT_PUBLIC_KEY=your-rs256-public-key-base64
```

### 2-2. Supabase RLS 데이터 위치 선택

한국 사용자 데이터: **Supabase Asia (Singapore) Region** 권장

```typescript
// supabase client 초기화 (Frontend + Backend 공용)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      storage: typeof window !== 'undefined' ? window.localStorage : new MemoryStorage(),
      storageKey: 'crypto_dashboard_session',
      flowType: 'pkce', // PKCE flow 활성화
      detectSessionInUrl: true, // OAuth callback URL에서 세션 감지
    },
    db: {
      schema: 'public',
    },
  }
);
```

### 2-3. Google OAuth 호출 코드 (TypeScript)

```typescript
// Frontend: src/lib/auth.ts
export async function initiateGoogleSignIn() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      queryParams: {
        access_type: 'offline',
        prompt: 'consent', // 매번 동의 화면 표시 (첫 로그인만)
      },
      // PKCE 자동 처리 (Supabase @0.47.0+)
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'openid email profile',
    },
  });
  
  if (error) {
    console.error('OAuth initiation failed:', error);
    throw error;
  }
  
  // Supabase가 Google OAuth URL로 자동 리다이렉트
}

// Frontend: src/lib/auth-callback.ts
export async function handleAuthCallback() {
  // URL #access_token=... fragment 해석
  const { data, error } = await supabase.auth.getSession();
  
  if (error || !data.session) {
    throw new Error('Session not found after OAuth callback');
  }
  
  const { user, session } = data;
  return { user, session, accessToken: session.access_token };
}
```

### 2-4. Session 관리 (Cookie vs LocalStorage)

```typescript
// Backend (Fastify): session 검증 hook
import jwt from '@fastify/jwt';

await app.register(jwt, {
  secret: process.env.JWT_SECRET,
  verify: {
    extractToken: (request: FastifyRequest) => {
      // 우선순위: httpOnly cookie > Authorization header > localStorage (Web API만)
      return (
        request.cookies.auth_token ||
        request.headers.authorization?.replace('Bearer ', '')
      );
    },
  },
  sign: {
    expiresIn: '15m',
  },
});

// Fastify route 보호
app.post('/auth/callback', async (req, reply) => {
  const { code, state, nonce } = req.body;
  
  // 1. state 검증
  if (state !== req.session?.state) {
    return reply.status(401).send({ error: 'Invalid state' });
  }
  
  // 2. Google token exchange (PKCE)
  const tokenResponse = await exchangeCodeForToken(code, process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  const { id_token, access_token } = tokenResponse;
  
  // 3. nonce 검증 + ID token 검증
  const payload = verifyIdToken(id_token, nonce);
  
  // 4. Supabase 사용자 생성·업데이트
  const { data: user, error } = await supabase.auth.admin.getUserById(payload.sub);
  if (!user) {
    await supabase.auth.admin.createUser({
      email: payload.email,
      email_confirm: true,
      user_metadata: {
        name: payload.name,
        picture: payload.picture,
      },
    });
  }
  
  // 5. 내부 JWT 발행
  const jwtToken = app.jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      tier: 'free', // 기본값
    },
    { expiresIn: '15m' }
  );
  
  // httpOnly + Secure (HTTPS only) 쿠키 설정
  reply.setCookie('auth_token', jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15분
  });
  
  // Refresh token도 별도 쿠키로 (7일)
  reply.setCookie('refresh_token', createRefreshToken(payload.sub), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  
  reply.redirect(`/dashboard?session_init=true`);
});
```

### 2-5. 세션 갱신 (Refresh Token Rotation)

```typescript
// Backend: /auth/refresh endpoint
app.post('/auth/refresh', async (req, reply) => {
  const refreshToken = req.cookies.refresh_token;
  
  if (!refreshToken) {
    return reply.status(401).send({ error: 'No refresh token' });
  }
  
  const payload = verifyRefreshToken(refreshToken);
  const userId = payload.sub;
  
  // Refresh token rotation: 이전 토큰 무효화 + 새 토큰 발행
  const newAccessToken = app.jwt.sign(
    { sub: userId, email: payload.email, tier: payload.tier },
    { expiresIn: '15m' }
  );
  
  const newRefreshToken = createRefreshToken(userId);
  
  // 이전 refresh token을 blacklist에 추가 (선택사항: Redis)
  // await redis.sadd('revoked_refresh_tokens', refreshToken);
  
  reply.setCookie('auth_token', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60,
  });
  
  reply.setCookie('refresh_token', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
  });
  
  reply.send({ success: true });
});

// Frontend: 자동 갱신 (만료 1분 전)
export function setupTokenRefresh() {
  const checkInterval = setInterval(() => {
    const { exp } = decodeJwt(localStorage.getItem('auth_token'));
    const timeUntilExpiry = exp * 1000 - Date.now();
    
    if (timeUntilExpiry < 60_000) { // 1분 미만
      fetch('/api/auth/refresh', { method: 'POST' });
    }
  }, 30_000); // 30초마다 체크
  
  return () => clearInterval(checkInterval);
}
```

---

## Sub-section 3: JWT Layer + Multi-tenancy (Row-Level Security)

### 3-1. JWT 구조 (RS256 비대칭 서명)

```typescript
// JWT payload example
type JWTPayload = {
  sub: string; // Supabase user_id (UUID)
  email: string;
  tier: 'free' | 'pro' | 'pro_plus';
  org_id?: string; // 향후: 팀/조직
  iss: 'crypto-dashboard-saas';
  aud: 'api.crypto-dashboard.com';
  iat: number;
  exp: number;
};

// Backend: JWT 발행 (RS256, 개인키)
function issueJWT(userId: string, email: string, tier: string) {
  const payload: JWTPayload = {
    sub: userId,
    email,
    tier,
    iss: 'crypto-dashboard-saas',
    aud: 'api.crypto-dashboard.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15분
  };
  
  return sign(payload, process.env.JWT_PRIVATE_KEY_RSA, {
    algorithm: 'RS256',
    keyid: 'crypto-dash-key-v1',
  });
}

// Backend: JWT 검증 (RS256, 공개키)
function verifyJWT(token: string) {
  return verify(token, process.env.JWT_PUBLIC_KEY_RSA, {
    algorithms: ['RS256'],
    issuer: 'crypto-dashboard-saas',
    audience: 'api.crypto-dashboard.com',
  });
}
```

### 3-2. Supabase RLS Policy: 4 Core Entities

```sql
-- 1. users (Supabase Auth과 1:1 연결)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  tier text default 'free' check (tier in ('free', 'pro', 'pro_plus')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  metadata jsonb default '{}'::jsonb
);

-- RLS: users는 자신의 레코드만 읽기
alter table public.users enable row level security;
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- 2. signals (기술적 신호: RSI, MA, Multibagger)
create table public.signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  symbol text not null, -- BTC, ETH, etc.
  timestamp timestamp with time zone not null,
  rsi numeric,
  ma_20 numeric,
  ma_50 numeric,
  multibagger_score numeric,
  created_at timestamp with time zone default now()
);

-- RLS: 각 사용자는 자신의 신호만 읽기
alter table public.signals enable row level security;
create policy "Users can read own signals"
  on public.signals for select
  using (auth.uid() = user_id);

create policy "Service can insert signals"
  on public.signals for insert
  with check (user_id = auth.uid() or auth.role() = 'service_role');

-- 3. briefs (Sonnet 생성 한국어 분석)
create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  content text not null, -- Markdown with citations
  token_count int,
  source_urls text[], -- 출처 (13F, CoinGecko 등)
  fact_checked_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- RLS: 각 사용자는 자신의 briefs만 읽기
alter table public.briefs enable row level security;
create policy "Users can read own briefs"
  on public.briefs for select
  using (auth.uid() = user_id);

create policy "Service can insert briefs"
  on public.briefs for insert
  with check (auth.uid() = user_id or auth.role() = 'service_role');

-- 4. subscriptions (결제 · tier 추적)
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  tier text not null default 'free',
  billing_period_start timestamp with time zone,
  billing_period_end timestamp with time zone,
  payment_method text, -- toss, stripe, etc.
  toss_customer_key text unique,
  status text default 'active' check (status in ('active', 'paused', 'cancelled')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RLS: 각 사용자는 자신의 구독만 읽기
alter table public.subscriptions enable row level security;
create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);
```

### 3-3. Tier 기반 권한 분기 (Free / Pro / Pro Plus)

```typescript
// Fastify middleware: tier-based access control
app.decorate('authz', (tier: string) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user; // JWT 검증 후
    
    const tierHierarchy = { free: 0, pro: 1, pro_plus: 2 };
    if (tierHierarchy[payload.tier] < tierHierarchy[tier]) {
      return reply.status(403).send({
        error: 'Insufficient tier for this feature',
        required_tier: tier,
        current_tier: payload.tier,
      });
    }
  };
});

// 라우트별 tier 요구사항
app.get(
  '/api/signal/advanced-metrics',
  { preHandler: [app.authenticate, app.authz('pro')] },
  async (req, reply) => {
    // Pro tier 이상만 접근 가능
    const signals = await getAdvancedMetrics(req.user.sub);
    reply.send(signals);
  }
);

// Tier별 API rate limit
const rateLimits = {
  free: { requests: 100, window: '1h' },
  pro: { requests: 1000, window: '1h' },
  pro_plus: { requests: 10000, window: '1h' },
};

app.decorate('rateLimit', (tier: string) => {
  const limit = rateLimits[tier] || rateLimits.free;
  return createRateLimiter({
    max: limit.requests,
    timeWindow: limit.window,
  });
});
```

### 3-4. Multi-tenant 데이터 격리 검증 SQL

```sql
-- 실제 쿼리: RLS가 자동으로 user_id 필터링
-- Frontend 요청: GET /api/signals?symbol=BTC
-- Backend 실행:
SELECT * FROM signals 
WHERE user_id = auth.uid() AND symbol = 'BTC'
ORDER BY timestamp DESC;

-- user_id를 명시적으로 전달할 수 없음 (RLS가 강제)
-- 따라서 한 사용자가 다른 사용자의 신호를 읽을 수 없음

-- Admin용 super-admin-only 뷰 (서비스 로직용)
create view admin.user_signal_count as
select 
  u.id, 
  u.email, 
  u.tier,
  count(s.id) as signal_count
from public.users u
left join public.signals s on u.id = s.user_id
group by u.id;

-- 접근: service_role (Backend server JWT)
-- 일반 사용자는 접근 불가
```

---

## Sub-section 4: QA & Attack Vectors (Security Review)

### 4-1. 공격 벡터 6+ · 완화 기법

| # | 공격 벡터 | 영향 | 완화 기법 | 검증 방법 |
|----|----------|------|---------|--------|
| **1** | **Session Hijacking (XSS)** | Attacker가 httpOnly cookie 탈취 | `HttpOnly + Secure + SameSite=Lax` cookie | 개발자 도구에서 cookie inspector 확인; 캡슐화 테스트 |
| **2** | **CSRF (Cross-Site Request Forgery)** | 사용자가 악의 사이트에서 클릭 시 다른 출처 요청 | `SameSite=Lax` + state parameter (OAuth) | Form action 테스트; 다른 도메인에서 요청 차단 확인 |
| **3** | **OAuth state 탈취** | Attacker가 authorization code 탈취 | PKCE (code_verifier not exposed) + state 검증 | Burp Suite로 state 제거 후 요청; 거부되는지 확인 |
| **4** | **JWT secret 유출** | Attacker가 임의 JWT 발행 가능 | RS256 (비대칭 서명) + 환경변수 보안 (HashiCorp Vault) | `JWT_SECRET` 노출 여부 git history 검색 |
| **5** | **Refresh token 회전 미흡** | Old refresh token으로 access token 재발행 | Refresh token rotation + blacklist (Redis) | 이전 refresh token으로 재요청; 거부되는지 확인 |
| **6** | **RLS bypass (다중 테넌트 데이터 유출)** | SQL injection 또는 RLS policy 우회로 다른 사용자 데이터 접근 | Parameterized queries + Supabase RLS 강제 + `auth.uid()` 필수 | 한 사용자의 JWT로 다른 사용자 ID를 직접 쿼리 시도; 거부되는지 확인 |
| **7** | **타이밍 공격 (Timing Attack)** | 유효한 사용자 이메일 열거 (회원가입 시간) | Constant-time comparison (bcrypt) + 응답 시간 균등화 | Timing 측정 도구; 응답 시간 표준편차 <10ms 확인 |
| **8** | **Man-in-the-Middle (MITM)** | 열린 네트워크에서 JWT 탈취 | HTTPS + HSTS header | curl -I https://api.../auth; Strict-Transport-Security 헤더 확인 |

### 4-2. OAuth 고급 공격 시나리오

#### Scenario A: Authorization Code 탈취 (PKCE 없이)
```
Attacker: 악의 앱에서 authorization code 탈취
→ 다른 클라이언트에서 같은 code로 token exchange 시도
→ 서버가 code를 두 번 사용 가능 (classic OAuth 2.0)

완화 (PKCE 적용):
- code_verifier는 클라이언트만 보유
- code는 code_challenge로만 링크
- code_challenge는 hash 단방향이므로, code_verifier 없이 복원 불가
```

#### Scenario B: Authorization Code + state 탈취 (Open Redirect)
```
Attacker: redirect_uri=evil.com으로 수정
→ 사용자가 Google 로그인
→ Google이 evil.com으로 리다이렉트
→ authorization code가 attacker에게 전달

완화:
- Google OAuth 설정에서 redirect_uri 사전 등록 (whitelist)
- 신청 시 redirect_uri 정확히 일치 검증
```

#### Scenario C: nonce 없는 ID token 검증
```
Attacker: 유효한 (타 사용자의) ID token 탈취
→ 다른 클라이언트에서 replay 시도
→ 같은 token으로 여러 세션 생성 가능

완화:
- nonce 생성 (클라이언트)
- ID token의 nonce claim 검증 (서버)
- 매 요청마다 nonce 값이 달라야 함
```

### 4-3. JWT 공격 벡터

```typescript
// ❌ 위험: HS256 (symmetric, 비밀키 유출 시 모든 토큰 위조)
const unsafeToken = sign(payload, process.env.JWT_SECRET, { 
  algorithm: 'HS256' 
});

// ✅ 안전: RS256 (asymmetric, 공개키로만 검증)
const safeToken = sign(payload, process.env.JWT_PRIVATE_KEY, { 
  algorithm: 'RS256' 
});

// ❌ 위험: none algorithm (알고리즘 없이 서명)
// { "alg": "none" } → Attacker가 서명 제거 후 페이로드 조작
const maliciousToken = {
  header: { alg: 'none' },
  payload: { sub: 'attacker-id', tier: 'pro_plus' },
  signature: '' // 빈 서명
};

// ✅ 방어: 항상 alg 검증
verify(token, publicKey, { 
  algorithms: ['RS256'], // 허용할 알고리즘 명시
  complete: true // 헤더도 검증
});

// ❌ 위험: 만료 시간 없음 (exp claim 제거)
const tokenNoExp = sign(payload, key); // expiresIn 미지정

// ✅ 안전: 항상 exp 지정
const tokenWithExp = sign(payload, key, { expiresIn: '15m' });
```

### 4-4. 한국 PIPA (개인정보보호법) · FSC 투자자문업 컴플라이언스

```typescript
// 4-1. PIPA: 3년 보관 제한 (암호화폐 거래 기록)
app.post('/api/subscription/delete-account', async (req, reply) => {
  const userId = req.user.sub;
  
  // 1. 유효 구독 확인
  const subscription = await supabase
    .from('subscriptions')
    .select()
    .eq('user_id', userId)
    .single();
  
  if (subscription.status === 'active') {
    return reply.status(400).send({
      error: 'Cannot delete while subscription active',
      action: 'Cancel subscription first'
    });
  }
  
  // 2. 거래 기록 익명화 (3년 보관 의무 충족 후)
  const deletionDate = new Date();
  const retentionDate = new Date(deletionDate);
  retentionDate.setFullYear(retentionDate.getFullYear() - 3);
  
  // 거래 기록 중 3년 이전 기록 삭제
  await supabase
    .from('signals')
    .delete()
    .eq('user_id', userId)
    .lt('created_at', retentionDate.toISOString());
  
  // 3. 사용자 정보 삭제
  await supabase.auth.admin.deleteUser(userId);
  await supabase.from('users').delete().eq('id', userId);
  
  reply.send({ success: true, message: 'Account deleted. Personal data retained per PIPA for 3 years.' });
});

// 4-2. FSC: 투자자문업 라이선스 불필요 확인
// Auth module 자체는 "정보 제공" 카테고리
// → License 불필요, 단 고지 필수
app.get('/api/disclaimer', async (req, reply) => {
  const disclaimer = {
    ko: '본 서비스는 투자자문업 인가 상품이 아니며, 정보 제공 목적입니다. 과거 수익률은 미래를 보장하지 않습니다.',
    required_acceptance: true,
    accept_checkbox_required: true,
  };
  reply.send(disclaimer);
});
```

### 4-5. QA Test Cases (Postman / Jest)

```typescript
// jest: JWT 검증 테스트
describe('JWT Verification', () => {
  test('Should reject token with invalid signature', () => {
    const token = sign({ sub: 'user-1' }, 'wrong-secret', { algorithm: 'RS256' });
    expect(() => verify(token, publicKey)).toThrow('invalid signature');
  });
  
  test('Should reject expired token', () => {
    const expiredToken = sign(
      { sub: 'user-1', exp: Math.floor(Date.now() / 1000) - 3600 }, 
      privateKey, 
      { algorithm: 'RS256' }
    );
    expect(() => verify(expiredToken, publicKey)).toThrow('token expired');
  });
  
  test('Should reject token with missing nonce', () => {
    const tokenNoNonce = sign({ sub: 'user-1' }, privateKey, { algorithm: 'RS256' });
    expect(() => verifyIdToken(tokenNoNonce, 'expected-nonce')).toThrow('nonce mismatch');
  });
});

// Postman: 다중 테넌트 RLS 검증
test('One user cannot read another user\'s signals', async () => {
  const user1Token = 'eyJhbGc...'; // user-1의 토큰
  const response = await fetch('/api/signals?user_id=user-2', {
    headers: { Authorization: `Bearer ${user1Token}` }
  });
  
  expect(response.status).toBe(403);
  expect(response.json()).toMatchObject({ error: 'Unauthorized' });
});

// CSRF 테스트: SameSite=Lax 동작
test('Cross-origin POST should be blocked (SameSite=Lax)', async () => {
  // evil.com에서 api.crypto-dashboard.com으로 POST 시도
  const form = new FormData();
  form.append('action', 'delete-account');
  
  fetch('https://api.crypto-dashboard.com/api/user/delete', {
    method: 'POST',
    body: form,
    // credentials: 'include' 없음 (SameSite=Lax는 top-level navigation만 쿠키 전송)
  });
  
  // 서버: 쿠키 없이 요청 수신 → 401 Unauthorized
});
```

### 4-6. 침투 테스트 (Penetration Testing) 체크리스트

```
[ ] 1. PKCE code_verifier 탈취 불가 확인 (DevTools에서 숨김 확인)
[ ] 2. state parameter 없이 callback URL 직접 접근 → 거부되는지
[ ] 3. nonce 제거 후 ID token 검증 → 거부되는지
[ ] 4. JWT secret을 .env 또는 git에 노출되지 않음 확인
[ ] 5. Refresh token 일회 사용 후 재사용 불가 확인 (blacklist)
[ ] 6. 한 사용자 JWT로 다른 사용자 데이터 조회 → RLS로 거부되는지
[ ] 7. HTTP (non-HTTPS) 요청 시 HSTS 강제 리다이렉트 확인
[ ] 8. 다른 도메인 (evil.com)에서 CORS preflight 거부 확인
[ ] 9. SQL injection: `symbol=' OR '1'='1` → parameterized 쿼리 검증
[ ] 10. Open redirect: ?redirect_uri=evil.com → 화이트리스트만 허용
```

---

## 종합 Implementation Summary

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React + Vite)                                         │
│ - Google OAuth PKCE flow (code_verifier 생성)                    │
│ - state + nonce 보안                                              │
│ - httpOnly cookie 자동 관리                                       │
│ - Disclaimer 동의 (한국어)                                        │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTPS + JWT (Authorization: Bearer)
┌─────────────────▼───────────────────────────────────────────────┐
│ BACKEND API (Fastify + TypeScript)                              │
│ - POST /auth/callback (code → JWT)                              │
│ - POST /auth/refresh (Refresh token rotation)                   │
│ - GET /auth/me (현재 사용자 정보)                                 │
│ - POST /auth/logout (토큰 폐기)                                  │
│ - Middleware: JWT 검증 + Tier 권한 확인                          │
└─────────────────┬───────────────────────────────────────────────┘
                  │ Row-Level Security (RLS)
┌─────────────────▼───────────────────────────────────────────────┐
│ SUPABASE (Auth + PostgreSQL + RLS)                              │
│ - Google OAuth provider 설정                                     │
│ - users, signals, briefs, subscriptions tables                  │
│ - RLS policies (auth.uid() = user_id)                           │
│ - Asia (Singapore) region for KR data                           │
└─────────────────────────────────────────────────────────────────┘
```

### 핵심 파일 구조 (Phase 1)

```
apps/saas/backend/
├── src/
│   ├── auth/
│   │   ├── oauth.ts           # Google OAuth PKCE flow
│   │   ├── jwt.ts             # JWT issuing + verification
│   │   ├── session.ts         # Refresh token rotation
│   │   └── middleware.ts       # Fastify auth hooks
│   ├── db/
│   │   ├── schema.sql         # RLS policies + tables
│   │   ├── migrations/        # Supabase migrations
│   │   └── client.ts          # Supabase client
│   ├── routes/
│   │   └── auth.ts            # /auth/callback, /auth/refresh
│   ├── app.ts                 # Fastify app setup
│   ├── config.ts              # Environment variables
│   └── index.ts               # Entry point
├── .env.example
├── tsconfig.json
└── package.json

apps/saas/frontend/
├── src/
│   ├── lib/
│   │   ├── supabase.ts        # Supabase client (PKCE)
│   │   └── auth.ts            # OAuth flow + session
│   ├── components/
│   │   ├── LoginPage.tsx      # Google OAuth button
│   │   └── DisclaimerModal.tsx # 한국어 disclaimer
│   ├── hooks/
│   │   └── useAuth.ts         # JWT + token refresh
│   └── App.tsx
└── package.json
```

### 검증 기준 (DoD: Definition of Done)

```
[ ] 1. Google OAuth PKCE flow 전체 동작 (localhost)
[ ] 2. 한국어 Disclaimer 동의 후 로그인 완료
[ ] 3. JWT 발행 + httpOnly cookie 설정 확인
[ ] 4. Refresh token 자동 회전 동작
[ ] 5. RLS policy: 한 사용자가 다른 사용자 데이터 접근 불가
[ ] 6. Tier별 API 접근 제어 동작 (Free vs Pro)
[ ] 7. Burp Suite 보안 테스트: 6+ 공격 벡터 완화 확인
[ ] 8. PIPA 3년 보관 정책 구현
[ ] 9. FSC 투자자문업 라이선스 불필요 확인 + 고지 추가
[ ] 10. 프로덕션 배포 전 security-review Skill 실행
```

### 보안 체크리스트 (배포 전)

```
[ ] JWT secret (RS256 private key) = HashiCorp Vault (프로덕션)
[ ] Google OAuth redirect_uri whitelist 설정 (Slack/Email 알림)
[ ] HTTPS only (Railway/Fly.io 자동 HTTPS)
[ ] HSTS header: max-age=31536000
[ ] CORS: 허용할 출처만 명시 (localhost/*은 개발 전용)
[ ] Rate limiter: 로그인 시도 5회/분 제한
[ ] 로그: 모든 인증 실패 기록 (보안 감시용)
[ ] 환경변수: .env 파일 .gitignore 포함
[ ] Secrets scanning: git-secrets 또는 GitHub advanced security
[ ] 정기 audit: 월 1회 보안 감시 (SIEM 또는 수동)
```

---

## 참고 자료 & 표준

- **IETF RFC 7636**: PKCE (Proof Key for Code Exchange)
- **OAuth 2.0 Security Best Practices**: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics
- **JWT Best Practices**: RS256 (RSA) vs HS256 (Symmetric)
- **OWASP Top 10**: A01:2021 Broken Access Control (RLS 필수)
- **한국 PIPA (개인정보보호법)**: 3년 보관, 동의 철회 권리
- **FSC (금융감독위)**: 투자자문업 License 범위 (정보 제공은 제외)
- **Supabase Security**: Row-Level Security, auth.uid() 검증
- **Anthropic Security Guidance**: Encrypted secrets, audit logs, principle of least privilege

