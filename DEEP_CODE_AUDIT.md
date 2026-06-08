# AdNexus AI — Deep Code Audit Report

**Version:** 1.0.0  
**Date:** 2026-06-08  
**Auditor:** OpenHands AI Agent (Systematic Code Audit)  
**Scope:** Full-stack — Backend (Express API v1/v2), Frontend (Next.js), MCP Server (Python), Shared Packages, Cross-cutting Concerns  
**Previous Audits Reviewed:** SECURITY_AUDIT.md (26 open findings), PERFORMANCE_AUDIT.md (all open), QA_CHECKLIST.md (0/99 executed), FINAL_STATUS.md (claims contradicted by evidence)

**Overall Grade: C+ — 102 findings (15 CRITICAL, 29 HIGH, 43 MEDIUM, 15 LOW)**

---

## Executive Summary

This deep code audit analyzed ~50,000+ lines of code across all layers of the AdNexus AI platform. We verified the 26 findings from the existing security audit (**all still open**), validated the performance audit findings (**all still open**), and discovered **76 new issues** through systematic code review.

**Critical blocking issues (15 total):**
- JWT tokens accepted with ANY algorithm (including `none`) across 5 locations — allows token forgery
- V2 RBAC checks JWT claims instead of database — stale roles persist until token expiry
- All OAuth platform tokens stored in plaintext — database breach = full ad account takeover
- Auth tokens stored in localStorage + leaked in SSE URL query params — XSS exfiltratable
- Zero MCP tool authentication — any client can call any tool on any workspace
- 5 production workers completely untyped (`@ts-nocheck`)
- Broken Dockerfile for MCP server (missing source dirs, wrong port)
- Shared packages are dead code (schemas unused, config exports broken)
- Campaign creation has no rollback on partial failure

**The FINAL_STATUS.md claim that "Security hardening — Complete" and "Security audit — Passed" is demonstrably false.** There are 102 open findings, including 15 critical issues that must be resolved before production deployment.

---

## Audit Methodology

1. Reviewed all 4 existing audit documents for known findings
2. Performed systematic code review of every layer: API routes, middleware, services, repositories, workers, frontend components/pages/hooks, MCP server, shared packages
3. Verified claims against actual code (grep, cross-reference, static analysis)
4. Traced critical integration flows end-to-end (auth, campaign creation, SSE, MCP)
5. Checked dependency security, build pipeline, Docker config, testing coverage

---

## Consolidated Finding Index

### Legend
- 🔴 **CRITICAL** — Must fix before production (blocks release)
- 🟠 **HIGH** — Fix within 2 weeks (significant risk)
- 🟡 **MEDIUM** — Fix within 1 month (defense-in-depth)
- 🟢 **LOW** — Fix when convenient (hygiene)
- **[E]** — From existing SECURITY_AUDIT.md
- **[N]** — New finding from this audit

---

# 🔴 CRITICAL Findings (15)

| # | Source | Area | Summary |
|---|--------|------|---------|
| C1 | E | API/Auth | JWT signing key stored in environment variable only |
| C2 | N | API/Auth | **No `algorithms` option in 5 `jwt.verify()` calls** — accepts `none` algorithm, enables token forgery |
| C3 | N | API/Auth | **V2 `requireRole` checks JWT claims, not database** — role changes take up to 15 min; stolen tokens retain elevated roles |
| C4 | E | API/Data | **Mass assignment on campaign creation** — client can set `budget_spent`, `status`, bypassing business logic |
| C5 | N | API/Data | **OAuth tokens stored in plaintext** — `encryptToken()` exists but is dead code; all Meta/Google/TikTok/Snap tokens stored raw |
| C6 | N | Web/Auth | **Auth tokens in `localStorage`** — trivially exfiltratable via XSS |
| C7 | N | Web/Auth | **Auth token exposed in SSE URL query parameter** — logged by proxies, servers, browser history |
| C8 | N | Web/Auth | **No middleware auth guard for `/dashboard/*` routes** — only client-side redirect; unauthenticated users see dashboard flash |
| C9 | N | MCP/Auth | **Zero authentication on MCP tools** — any client can call any tool (create campaigns, approve drafts) |
| C10 | N | MCP/Infra | **MCP `ToolCache` not thread-safe** — plain `dict` with no locks; concurrent invocations cause data races |
| C11 | N | MCP/Infra | **MCP Dockerfile broken** — `COPY models/` and `COPY tools/` of non-existent dirs; `EXPOSE 8000` vs actual port 8080 |
| C12 | N | MCP/Logic | **Batch operations: no atomicity or rollback** — partial failures leave side effects (approved drafts, created campaigns) |
| C13 | N | Config | **`@adnexus/config` exports 3 non-existent files** — importing `@adnexus/config/eslint` or `/tailwind` crashes |
| C14 | N | Web/Data | **All dashboard data fetching uses bare `fetch()`** — bypasses API client with retry/circuit-breaker/dedup/auth |
| C15 | N | Web/Bundle | **2,488-line monolithic `api.ts`** with embedded mock data — any import pulls entire payload into client bundle |

---

# 🟠 HIGH Findings (29)

| # | Source | Area | Summary |
|---|--------|------|---------|
| H1 | E | API/Auth | Refresh token rotation not implemented |
| H2 | E | API/Auth | IDOR on campaign edit (missing ownership validation) |
| H3 | E | API/Auth | Role promotion vulnerability (inviter can assign any role to invitee) |
| H4 | E | API/Input | File upload extension bypass (no MIME/content-type validation) |
| H5 | E | Web/CSP | CSP allows `unsafe-inline` and `unsafe-eval` — neuters XSS protection |
| H6 | E | API/Secrets | Database credentials in plaintext `.env` |
| H7 | E | API/Logging | API keys logged in plaintext in request logs |
| H8 | E | Deps | `jsonwebtoken` vulnerability (algorithm confusion in older versions) |
| H9 | E | Deps | `lodash` vulnerability (prototype pollution) |
| H10 | N | API/Auth | V2 auth routes proxy to V1 — user enumeration via error message timing |
| H11 | N | API/Auth | V2 `requireAuth` doesn't verify user exists in DB (unlike V1 which does) |
| H12 | N | API/Error | V2 error handler leaks detailed error info unconditionally (no production check) |
| H13 | N | API/Upload | Upload `authMiddleware` doesn't verify tokens — commented-out with "Token verification would go here" |
| H14 | N | API/Webhooks | Platform webhooks don't use raw body for HMAC — signature verification may fail |
| H15 | N | API/Infra | `requestLogger` overrides `res.end` — conflict risk with other middleware |
| H16 | N | API/Security | AES-256-GCM encryption is BROKEN — salt generated but not stored; decryption uses zeroed salt |
| H17 | N | Web/Auth | Two competing token keys: `adnexus_token` vs `access_token` — only one gets populated |
| H18 | N | Web/Forms | `SignUpForm` has zero client-side validation (unlike `SignInForm`) |
| H19 | N | Web/i18n | 20+ i18n keys in `en.json` missing from `de.json` — non-English locales break |
| H20 | N | Web/i18n | `ContactForm` has entirely hardcoded English strings — bypasses i18n |
| H21 | N | Web/CSRF | Contact form POST endpoint has no CSRF protection |
| H22 | N | Web/Auth | No token refresh mechanism — token expiry = silent logout |
| H23 | N | Web/UI | Duplicate component directories (`components/ui/` vs `src/components/ui/`) with divergent implementations |
| H24 | N | Shared/Schemas | **Shared Zod schemas are dead code** — neither API nor web app imports them; each has own inline validation |
| H25 | N | Shared/Schemas | Web app's `validation.ts` has third independent set of schemas — 3 divergent copies of validation |
| H26 | N | UI | `@adnexus/ui` ThemeProvider unused — web app uses `next-themes` instead |
| H27 | N | UI | Primitives barrel exports empty object (`export {}`) |
| H28 | N | Cross | **5 production workers use `@ts-nocheck`** — completely untyped (metrics-sync, detect-fatigue, evaluate-rules, onboarding-emails, report-generator) |
| H29 | N | MCP | No rate limiting on MCP server — unlimited API calls possible |

---

# 🟡 MEDIUM Findings (43)

| # | Source | Area | Summary |
|---|--------|------|---------|
| M1 | E | API/Auth | OAuth state in sessionStorage (tab-fixation risk) |
| M2 | E | API/Auth | Password reset uses `Math.random()` not crypto |
| M3 | E | API/AuthZ | Missing tenant isolation on shared resources (templates, reports) |
| M4 | E | API/AuthZ | 3 API endpoints missing authorization middleware |
| M5 | E | API/Input | Mass assignment on user profile update |
| M6 | E | API/Input | CSV injection in export feature |
| M7 | E | Web/XSS | Rich text editor uses `dangerouslySetInnerHTML` without sanitization |
| M8 | E | Web/XSS | AI agent output not sanitized (LLM could output HTML/JS) |
| M9 | E | API/CSRF | State-changing GET requests on 3 endpoints |
| M10 | E | API/SQL | Raw SQL in search endpoint with string concatenation |
| M11 | E | API/Security | No automated secret rotation |
| M12 | E | Deps | Moderate vulnerabilities in axios, semver, dottie |
| M13 | E | Perf | MUI full library import (580KB raw, only ~30 components used) |
| M14 | E | Perf | `date-fns` full import (45KB in bundle) |
| M15 | E | Perf | `lodash` full import (70KB in bundle) |
| M16 | E | Perf | Unused Recharts dependencies (118KB) |
| M17 | N | API/Rate | Public audit endpoint has weak rate limiting — account ID enumeration possible |
| M18 | N | API/Privacy | URL paths may contain PII and are logged unsanitized |
| M19 | N | API/CSRF | No CSRF protection on auth state-changing endpoints |
| M20 | N | API/OAuth | OAuth state JWT lacks `algorithms` option |
| M21 | N | API/Billing | Stripe webhook signature verification fragility (raw body not preserved) |
| M22 | N | API/Realtime | WebSocket server has no authentication — all connections anonymous |
| M23 | N | API/Realtime | Redis EventBus subscriber has no reconnection or error handling |
| M24 | N | API/Workers | Platform rate limiter is in-memory Map — not distributed across instances |
| M25 | N | API/Admin | Admin impersonation lacks pre-action audit log entry |
| M26 | N | API/Email | `getUserEmail` always returns null — all email methods silently skip |
| M27 | N | API/Email | `sendEmail` bypasses BullMQ queue — synchronous SMTP in request path |
| M28 | N | API/Test | Jest diagnostics disabled for 5 TS error codes in API tests |
| M29 | N | API/Test | Both Jest AND Vitest run for API — split configs, potential confusion |
| M30 | N | Web/Auth | `AuthProvider` monkey-patches `window.fetch` — fragile, conflicts with other libraries |
| M31 | N | Web/Auth | Race condition in `AuthProvider` initialization — first render may lack auth headers |
| M32 | N | Web/Auth | `signOut()` doesn't clear all token keys, React Query cache, or call server logout |
| M33 | N | Web/SSE | EventSource passes token via URL — appears in server logs, proxy logs, browser history |
| M34 | N | Web/i18n | `SubmitButton` has hardcoded "Processing..." — not i18n'd |
| M35 | N | Web/i18n | `CreateRuleModal` entirely hardcoded English — all strings |
| M36 | N | Web/Data | Mock data in `api.ts` includes realistic PII-like data — confusion risk |
| M37 | N | Web/Types | 15+ pages use `as any`/`as never` for i18n namespace casting |
| M38 | N | Web/Build | `ignoreBuildErrors: true` in Next.js — silently allows type-unsafe builds |
| M39 | N | Web/Query | React Query retry checks `error.status` but fetch errors have no `.status` |
| M40 | N | MCP/Cache | Cache has no max size — unbounded memory growth |
| M41 | N | MCP/Input | `operations` list in batch input has no max_length — DoS possible |
| M42 | N | MCP/Input | `status` and `platform` fields accept arbitrary strings — no enum validation |
| M43 | N | Cross | 130+ `console.error` calls instead of structured pino logging |

---

# 🟢 LOW Findings (15)

| # | Source | Area | Summary |
|---|--------|------|---------|
| L1 | E | API/Auth | Missing progressive account lockout |
| L2 | E | API/AuthZ | API key auth bypasses CSRF (acceptable but undocumented) |
| L3 | E | API/SQL | Unvalidated sort parameter in queries |
| L4 | E | API/Admin | Admin routes return mock data on DB failure |
| L5 | N | API/Workers | `cron` + `node-cron` both listed as dependencies |
| L6 | N | API/Deps | Dependencies use caret ranges (not pinned) |
| L7 | N | Web/UI | `PageTransition` component duplicated in two directories |
| L8 | N | Web/UI | `SelectField` renders blank lines for options with missing labels |
| L9 | N | Web/Forms | `JsonLd` uses `dangerouslySetInnerHTML` (safe but worth noting) |
| L10 | N | MCP/Code | 5 unused imports in `server.py` |
| L11 | N | MCP/Code | Docstring claims "30+ tools" but only 15 exist |
| L12 | N | MCP/Config | `campaign_ids` and `budget_scenarios` have no max length |
| L13 | N | MCP/Docker | MCP Dockerfile runs as root (no `USER` directive) |
| L14 | N | Config | `shared/tsconfig.json` doesn't extend base config |
| L15 | N | Infra | Makefile references old directory structure — broken |

---

## Detailed Findings — New Critical Issues

### C2: No `algorithms` option in JWT verify calls (5 locations)

**Files:** `apps/api/src/middleware/auth.ts:28`, `apps/api/src/interface/http/middleware/requireAuth.ts:23`, `apps/api/src/routes/auth.ts:376`, `apps/api/src/routes/auth.ts:756`, `apps/api/src/routes/auth/oauthState.ts:92`

**What:** Every `jwt.verify(token, secret)` call omits the `algorithms` parameter. The `jsonwebtoken` library, by default, accepts tokens with the `none` algorithm or any algorithm in the JWT header. An attacker can forge a token with `{"alg": "none"}` and bypass verification entirely.

**Fix:** Add `{ algorithms: ['HS256'] }` to every `jwt.verify()` call.

### C3: V2 `requireRole` checks JWT claims, not database

**Files:** `apps/api/src/interface/http/middleware/requireAuth.ts:68-80`

**What:** V2's `requireRole` checks `req.user.role` from the JWT payload. V1's `requireRole` (in `apps/api/src/middleware/auth.ts:39-59`) correctly queries `workspace_members.role` from the database. If a user's role is downgraded, their existing JWT retains the old role for up to 15 minutes. A stolen token with elevated role works until expiry.

**Fix:** Query `workspace_members` table on each role check (like V1 does), or use short-lived tokens (5 min).

### C5: OAuth tokens stored in plaintext

**Files:** `apps/api/src/routes/auth/meta.ts:205`, `apps/api/src/routes/auth/google.ts`, `apps/api/src/routes/auth/tiktok.ts:175`, `apps/api/src/routes/auth/snap.ts:187`

**What:** Despite a full `src/security/encryption.ts` module with AES-256-GCM `encryptToken()`/`decryptToken()` functions, those functions are NEVER imported. All platform access tokens (Meta, Google, TikTok, Snap) are stored raw in the `ad_accounts.oauth_token` column. Database breach = attacker gets full API access to all connected ad accounts.

**Compounding factor (H16):** The encryption module itself is broken — it generates a random salt during encryption but uses a zeroed salt during decryption. Even if someone tried to use it, round-trip encrypt/decrypt would fail.

**Fix:** Import and use `encryptToken()` before database insert. Fix the salt serialization bug in the encryption module.

### C6-C7: Auth tokens in localStorage + SSE URL

**Files:** `apps/web/providers/AuthProvider.tsx:47` (localStorage), `apps/web/hooks/useSSE.ts:73` (URL query param)

**What:** The JWT is stored in `localStorage` as `adnexus_token`, making it accessible to any JavaScript on the same origin (XSS exfiltration). The same token is passed as `?token=` in the SSE URL, exposing it in server logs, proxy logs, browser history, and `Referer` headers.

**Fix:** Store tokens in `HttpOnly; Secure; SameSite=Strict` cookies. For SSE, generate short-lived, single-use connection tokens via POST.

### C9: Zero MCP tool authentication

**File:** `apps/mcp/src/server.py:341-595`

**What:** All 15 MCP tools are decorated with `@mcp.tool()` and accept any caller. No authentication, no workspace scoping — an attacker can call `create_campaign`, `approve_draft`, `generate_creative` for any workspace.

**Fix:** Add authentication middleware before tool execution. Validate workspace access.

### C11: MCP Dockerfile broken

**File:** `apps/mcp/src/Dockerfile`

**What:** `COPY models/ ./models/` and `COPY tools/ ./tools/` reference non-existent directories. `EXPOSE 8000` but the server runs on port 8080. The health check hits `localhost:8000/health` which will never succeed.

**Fix:** Remove the bad COPY lines, fix EXPOSE to 8080, fix health check port.

### C13: `@adnexus/config` broken exports

**File:** `packages/config/package.json:7-11`

**What:** Exports `./eslint` and `./tailwind` point to file paths that don't exist. Only `./typescript` (tsconfig.base.json) actually works. Any import of these will crash.

**Fix:** Create the missing files or remove the exports.

---

## Integration Flow Gaps

### Auth Flow
- **Sign-in**: Token → `localStorage` (C6), no httpOnly cookie
- **Token injection**: Monkey-patched `window.fetch` (M30), alternative `authFetch.ts` largely unused (M4 from web section)
- **Token validation**: V2 doesn't verify user existence in DB (H11), no `algorithms` enforcement (C2)
- **Token refresh**: Only in axios-based `api.ts` which is unused by dashboard components (C14)
- **Sign-out**: Only removes from localStorage, no server-side invalidation (M32)

### Campaign Creation Flow
- Authorized → Validated → Written to DB → Event published → Audit logged
- **No platform sync** at creation time (async via worker)
- **No rollback** if event publish or audit log fails after DB commit

### SSE Flow
- Token in URL query param (C7), no heartbeat, no Last-Event-ID
- Two different SSE implementations with different reconnect logic
- WebSocket has no authentication at all (M22)

### MCP Flow
- MCP server → API backend: JWT from env var, no rotation (C1 from MCP section)
- Zero auth on tool calls (C9), no workspace scoping
- No rate limiting (H29)

---

## Dependency & Infrastructure Issues

### Critical Infrastructure Gaps
1. **No API Dockerfile** — only the web app has a container definition
2. **5 workers untyped** — `@ts-nocheck` disables all type safety
3. **Makefile broken** — references old directory structure
4. **Security audit in CI non-blocking** — `continue-on-error: true`
5. **Split test runners** — both Jest and Vitest in API with different configs

### Shared Package Dead Code
- `@adnexus/shared` listed as dependency by both web and API — **zero imports found**
- `@adnexus/ui` listed as dependency by web — **zero imports found**
- Three independent copies of validation schemas (shared, API inline, web inline)

---

## Remediation Priority

### Sprint 1 (Week 1): Fix All 15 CRITICAL Issues
1. Add `algorithms: ['HS256']` to all 5 `jwt.verify()` calls (C2)
2. Fix V2 `requireRole` to query database (C3)
3. Implement OAuth token encryption at rest (C5) + fix encryption module (H16)
4. Add mass assignment protection on campaign/user models (C4)
5. Move auth tokens to httpOnly cookies (C6, C7)
6. Add middleware auth guard for dashboard routes (C8)
7. Add MCP tool authentication (C9) + fix cache thread safety (C10)
8. Fix MCP Dockerfile (C11)
9. Fix `@adnexus/config` exports (C13)
10. Migrate dashboard to use API client (C14) + split `api.ts` (C15)

### Sprint 2 (Week 2): Fix 15 Highest HIGH Issues
1. Implement refresh token rotation (H1)
2. Fix IDOR on campaign edit (H2)
3. Fix role promotion vulnerability (H3)
4. Fix V2 error handler (H12), upload auth (H13), webhook raw body (H14)
5. Fix V2 user existence check (H11), user enumeration (H10)
6. Add `@ts-nocheck` removal plan for workers (H28)
7. Consolidate validation schemas into shared package (H24, H25)
8. Add token refresh mechanism (H22)
9. Clean up duplicate UI component directories (H23)

### Sprint 3 (Weeks 3-4): Fix Remaining HIGH + Top MEDIUM
- File upload validation (H4), CSP hardening (H5)
- i18n key audit across all locales (H19, H20)
- Contact form CSRF (H21), SignUpForm validation (H18)
- Remove `@adnexus/ui` dead code or migrate to it (H26, H27)
- MCP rate limiting (H29)

### Ongoing: MEDIUM + LOW Issues
- Structured logging migration (M43)
- Dependency pinning (L5, L6)
- Test coverage improvement
- API Dockerfile creation

---

## Discrepancies with FINAL_STATUS.md

| Claim in FINAL_STATUS.md | Reality |
|--------------------------|---------|
| "Security hardening — Complete" | 102 open findings (15 CRITICAL, 29 HIGH) |
| "Security audit — Passed" | Grade C+, requires substantial improvement |
| "Test suites — Complete, 25+ tests" | QA Checklist: 0/99 tests executed |
| "Performance (Lighthouse) — 85+ score" | 847KB initial bundle (69% over budget) |
| "Accessibility — WCAG 2.1 AA" | 0/8 accessibility QA tests executed |
| "v0.1.0 — Initial Release Complete" | Release gates: all pending, 0% QA pass rate |

---

*This report was generated by an AI agent (OpenHands) performing a systematic code audit on behalf of the AdNexus AI team.*
