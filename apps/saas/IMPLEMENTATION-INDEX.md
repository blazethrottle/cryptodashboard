# Auth Module Implementation Index (Phase 1)

**Status**: Skeleton Blueprint (Production logic to be implemented in main Claude session)  
**Date**: 2026-05-29  
**saas-swarm Sub-agent**: Single Task Agent (4 sub-sections)

---

## Deliverables Overview

### 1. Design Document
- **File**: `AUTH-MODULE-DESIGN.md` (902 lines)
- **Contents**:
  - Sub-section 1: OAuth 2.0 PKCE Flow (5-step sequence + Mermaid diagram)
  - Sub-section 2: Supabase Auth Integration + Session Management
  - Sub-section 3: JWT Layer + Multi-tenancy (RLS policies + 4 core entities)
  - Sub-section 4: QA & Attack Vectors (8 attack vectors + mitigations + test cases)

### 2. Backend Skeleton (TypeScript + Fastify)

#### Core Auth Module
| Module | Purpose | Status |
|--------|---------|--------|
| `auth/types.ts` | Type definitions (JWTPayload, OAuthCallback, etc.) | Design ready |
| `auth/oauth.ts` | Google OAuth PKCE: code_challenge, token exchange, ID token verify | Design ready |
| `auth/jwt.ts` | RS256 JWT: issuing + verifying access/refresh tokens | Design ready |
| `auth/middleware.ts` | Fastify hooks: authenticate, authz (tier-based), rate-limit, CORS | Design ready |

#### API Routes
| Module | Purpose | Status |
|--------|---------|--------|
| `routes/auth.ts` | Endpoints: /auth/init, /auth/callback, /auth/refresh, /auth/me, /auth/logout | Design ready |

#### Database & Config
| Module | Purpose | Status |
|--------|---------|--------|
| `db/schema.sql` | Supabase RLS schema (users, signals, briefs, subscriptions, audit_logs) | Design ready |
| `.env.example` | Environment variables template | ✓ Created |
| `README.md` | Setup instructions + API docs | Design ready |

---

## Architecture

```
Frontend (React + Vite)
├── /auth/callback → OAuth response handling
├── /dashboard → Protected route
└── Disclaimer modal → 한국어 compliance

     ↓ HTTPS + JWT

Backend (Node + Fastify)
├── GET /auth/init → PKCE params + auth URL
├── POST /auth/callback → code exchange + JWT issuing
├── POST /auth/refresh → access token rotation
├── GET /auth/me → current user (protected)
└── POST /auth/logout → clear cookies

     ↓ RLS-protected queries

Database (Supabase PostgreSQL)
├── users (id, email, tier)
├── signals (user_id, symbol, RSI, MA)
├── briefs (user_id, date, content)
├── subscriptions (user_id, tier, payment_method)
└── audit_logs (user_id, action, created_at)
```

---

## Security Model (At-a-Glance)

| Layer | Method | Implemented |
|-------|--------|-------------|
| **OAuth** | PKCE (code_verifier hash) | ✓ Design |
| **JWT** | RS256 asymmetric (private/public key) | ✓ Design |
| **Session** | httpOnly + Secure + SameSite=Lax cookies | ✓ Design |
| **Multi-tenant** | Supabase RLS (auth.uid() filtering) | ✓ Design |
| **Rate Limit** | Token bucket (100 req/min per tier) | ✓ Design |
| **CORS** | Whitelist allowed origins | ✓ Design |
| **HSTS** | max-age=31536000 header | ✓ Design |

---

## What's Included

- [x] Comprehensive design doc (902 lines, 4 sub-sections)
- [x] Type-safe TypeScript interfaces
- [x] PKCE OAuth 2.0 flow algorithm
- [x] RS256 JWT structure (public/private key)
- [x] Supabase RLS SQL policies (4 tables)
- [x] Fastify middleware hooks
- [x] HTTP cookie security (httpOnly, Secure, SameSite)
- [x] Rate limiting factory
- [x] Attack vectors + mitigations (8+)
- [x] QA test cases (Postman, Jest)
- [x] PIPA (개인정보보호법) compliance stubs
- [x] FSC (금융감독위) license exemption notes

---

## What's NOT Included (Next Phase)

- [ ] Database client implementation (Supabase connection)
- [ ] Redis integration (token blacklist, distributed rate limiting)
- [ ] Email service (Postmark/Sendgrid)
- [ ] Structured logging (Winston/Pino)
- [ ] Unit tests + E2E tests
- [ ] Production deployment config
- [ ] React UI components (LoginPage, DisclaimerModal)
- [ ] Signals module integration
- [ ] Sonnet brief generation
- [ ] Payment webhooks (Toss/Stripe)

---

## File Tree

```
apps/saas/
├── AUTH-MODULE-DESIGN.md                      ✓ (902 lines)
├── IMPLEMENTATION-INDEX.md                    ✓ (This file)
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   │   ├── types.ts                       (To create)
│   │   │   ├── oauth.ts                       (To create)
│   │   │   ├── jwt.ts                         (To create)
│   │   │   └── middleware.ts                  (To create)
│   │   ├── routes/
│   │   │   └── auth.ts                        (To create)
│   │   ├── db/
│   │   │   └── schema.sql                     (To create)
│   │   ├── app.ts                             (To create)
│   │   ├── config.ts                          (To create)
│   │   └── index.ts                           (To create)
│   ├── .env.example                           ✓ (Created)
│   ├── README.md                              (To create)
│   ├── package.json                           (To create)
│   └── tsconfig.json                          (To create)
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── auth.ts                        (To create)
│   │   ├── components/
│   │   │   ├── LoginPage.tsx                  (To create)
│   │   │   └── DisclaimerModal.tsx            (To create)
│   │   └── App.tsx                            (To create)
│   ├── .env.example                           (To create)
│   ├── package.json                           (To create)
│   └── vite.config.ts                         (To create)
└── README.md, MVP-BLUEPRINT.md, PROJECT-INDEX.md (Existing)
```

---

## Next Steps (Phase 1 Build)

### Immediate (Day 1-2)

1. **Create Backend Code Files**:
   - `backend/src/auth/types.ts` (70 lines)
   - `backend/src/auth/oauth.ts` (180 lines)
   - `backend/src/auth/jwt.ts` (90 lines)
   - `backend/src/auth/middleware.ts` (150 lines)
   - `backend/src/routes/auth.ts` (220 lines)
   - `backend/src/db/schema.sql` (140 lines)

2. **Create Config Files**:
   - `backend/src/app.ts` (Fastify setup)
   - `backend/src/config.ts` (Env validation)
   - `backend/src/index.ts` (Server start)
   - `backend/package.json` (Dependencies)
   - `backend/tsconfig.json` (TypeScript config)
   - `backend/README.md` (Setup guide)

3. **Create Frontend Files**:
   - `frontend/src/lib/auth.ts` (200 lines, OAuth + session)
   - `frontend/src/components/LoginPage.tsx` (React component)
   - `frontend/src/components/DisclaimerModal.tsx` (React component)
   - `frontend/src/hooks/useAuth.ts` (Auth hook)
   - `frontend/.env.example`
   - `frontend/package.json`, `vite.config.ts`

4. **Database Setup**:
   - Run `backend/src/db/schema.sql` in Supabase SQL editor
   - Configure Google OAuth in Supabase Auth
   - Test RLS policies

### Testing (Day 3)

```bash
# Terminal 1: Start backend
cd apps/saas/backend
npm install
npm run dev

# Terminal 2: Start frontend
cd apps/saas/frontend
npm install
npm run dev

# Browser: http://localhost:5173
# 1. Click "Login with Google"
# 2. Accept disclaimer
# 3. Redirect to Google OAuth
# 4. OAuth callback → JWT issued
# 5. Verify dashboard accessible + RLS working
```

### Security Test Cases

- [ ] PKCE: code_verifier not in URL
- [ ] RLS: User A cannot read User B's signals
- [ ] JWT: Expired token rejected
- [ ] Cookies: httpOnly flag present
- [ ] CSRF: state parameter validation
- [ ] Nonce: Replay attack prevention
- [ ] Rate limit: 100+ requests rejected

---

## Dependencies (Phase 1)

### Backend
```json
{
  "fastify": "^4.25.0",
  "@fastify/cors": "^8.4.0",
  "@fastify/cookie": "^9.0.0",
  "@supabase/supabase-js": "^2.38.0",
  "jose": "^5.2.0",
  "dotenv": "^16.3.0",
  "zod": "^3.22.0"
}
```

### Frontend
```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "@supabase/supabase-js": "^2.38.0",
  "vite": "^5.0.0",
  "tailwindcss": "^3.4.0"
}
```

---

## Success Criteria

- [ ] E2E OAuth flow: Login → Callback → JWT → Dashboard
- [ ] RLS enforcement: User cannot access other user's data
- [ ] Token refresh: Automatic refresh before 15m expiry
- [ ] Disclaimer: Korean text shown + accepted before signup
- [ ] Rate limiting: >100 requests/min rejected
- [ ] Security: All 8 attack vectors mitigated
- [ ] TypeScript: Strict mode, no `any` types
- [ ] Tests: Unit + E2E passing

---

## References

- **IETF RFC 7636**: PKCE (Proof Key for Code Exchange)
- **OAuth 2.0 Security**: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **Fastify Security**: https://www.fastify.io/docs/latest/Guides/Security/

---

**Blueprint Status**: COMPLETE (Design + skeleton structure)  
**Next Agent**: Main Claude (Opus 4.7) for production build  
**Estimated Build Time**: 2-3 days
