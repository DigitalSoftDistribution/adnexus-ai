# AdNexus AI — Full Backend SPEC

## Architecture Overview

```
Frontend (React SPA) → API (Node.js Express) → Supabase PostgreSQL
                                    ↓
                            Meta/Google/TikTok/Snap APIs
                                    ↓
                         MCP Server (Python FastMCP) ← Claude/Cursor
```

## Monorepo Structure

```
/mnt/agents/output/adnexus-backend/
├── api/                        # Node.js Express API
│   ├── src/
│   │   ├── index.ts            # Entry point
│   │   ├── config.ts           # Environment config
│   │   ├── lib/
│   │   │   ├── supabase.ts     # Supabase client
│   │   │   ├── errors.ts       # Error classes
│   │   │   └── validators.ts   # Input validation
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT auth middleware
│   │   │   ├── rate-limit.ts   # Rate limiting
│   │   │   └── error-handler.ts
│   │   ├── routes/
│   │   │   ├── auth.ts         # Sign up, sign in, forgot password
│   │   │   ├── meta.ts         # Meta Marketing API proxy
│   │   │   ├── google.ts       # Google Ads API proxy
│   │   │   ├── tiktok.ts       # TikTok Business API proxy
│   │   │   ├── snap.ts         # Snap Ads API proxy
│   │   │   ├── campaigns.ts    # Campaign CRUD (unified)
│   │   │   ├── drafts.ts       # Draft-first workflow
│   │   │   ├── reports.ts      # Reporting & analytics
│   │   │   ├── agent.ts        # AI automation rules
│   │   │   ├── insights.ts     # AI insights & recommendations
│   │   │   ├── billing.ts      # Stripe billing & credits
│   │   │   ├── webhooks.ts     # Webhook management
│   │   │   └── mcp.ts          # MCP server HTTP endpoint
│   │   ├── services/
│   │   │   ├── meta-api.ts     # Meta Marketing API client
│   │   │   ├── google-api.ts   # Google Ads API client
│   │   │   ├── tiktok-api.ts   # TikTok Ads API client
│   │   │   ├── snap-api.ts     # Snap Ads API client
│   │   │   ├── agent-engine.ts # AI automation rule engine
│   │   │   ├── brief-generator.ts # Morning Brief generator
│   │   │   ├── anomaly-detector.ts # Statistical anomaly detection
│   │   │   ├── credit-tracker.ts  # AI credit consumption tracking
│   │   │   └── stripe.ts       # Stripe billing service
│   │   └── types/
│   │       └── index.ts        # Shared TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── mcp-server/                 # Python FastMCP Server
│   ├── server.py               # Entry point
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── read_tools.py       # 12 read tools
│   │   ├── write_tools.py      # 10 draft-first write tools
│   │   ├── immediate_tools.py  # 4 immediate write tools
│   │   └── agent_tools.py      # 4 agent tools
│   ├── models/
│   │   └── types.py            # Pydantic models
│   ├── config.py               # Config
│   ├── requirements.txt
│   └── Dockerfile
├── database/
│   ├── schema.sql              # Full PostgreSQL schema
│   ├── seed.sql                # Seed data
│   └── migrations/
│       └── 001_initial.sql
├── frontend/                   # Auth integration for existing React app
│   └── src/
│       ├── lib/
│       │   ├── supabase.ts     # Supabase client
│       │   ├── api.ts          # API client (fetch wrapper)
│       │   └── auth.ts         # Auth utilities
│       ├── hooks/
│       │   └── useAuth.ts      # useAuth hook
│       ├── contexts/
│       │   └── AuthContext.tsx  # Auth provider
│       └── components/
│           └── ProtectedRoute.tsx # Route guard
└── docs/
    ├── SETUP.md                # Full setup guide
    ├── API.md                  # REST API docs
    └── MCP.md                  # MCP server docs
```

## Database Schema (PostgreSQL)

### Core Tables
- `users` — id, email, name, avatar_url, created_at, updated_at
- `workspaces` — id, name, slug, plan (free/pro/premium/agency), owner_id, created_at
- `workspace_members` — id, workspace_id, user_id, role (owner/admin/analyst/viewer), created_at
- `ad_accounts` — id, workspace_id, platform (meta/google/tiktok/snap), account_id, name, status, oauth_token (encrypted), refresh_token (encrypted), token_expires_at, created_at
- `campaigns` — id, ad_account_id, platform_campaign_id, name, status, objective, budget, budget_type, spend, impressions, clicks, ctr, conversions, cpa, roas, frequency, start_date, end_date, created_at, updated_at
- `adsets` — id, campaign_id, platform_adset_id, name, status, budget, targeting_json, created_at
- `ads` — id, adset_id, platform_ad_id, name, status, creative_type, creative_url, spend, impressions, clicks, ctr, conversions, fatigue_score, created_at
- `drafts` — id, workspace_id, platform, campaign_id, draft_type, change_summary, change_detail_json, ai_reasoning, impact_estimate, status (pending/approved/rejected/auto_applied), actor_type (ai/user), actor_id, created_at, resolved_at
- `automation_rules` — id, workspace_id, name, conditions_json, actions_json, status (active/paused), platforms, applied_count, created_at
- `audit_log` — id, workspace_id, actor_type, actor_id, action, platform, campaign_id, details_json, source, ip_address, created_at
- `api_keys` — id, workspace_id, name, key_hash, permissions, status, expires_at, last_used_at, created_at
- `webhooks` — id, workspace_id, url, events_json, secret, status, created_at
- `ai_credits` — id, workspace_id, month, credits_used, credits_limit, created_at, updated_at
- `goals` — id, workspace_id, name, goal_type, platform, target_value, current_value, unit, start_date, end_date, status, campaign_ids, created_at
- `scheduled_reports` — id, workspace_id, name, type, config_json, schedule_cron, status, last_run_at, next_run_at, created_at

### Indexes
- campaigns: (ad_account_id, status), (workspace_id via ad_account)
- drafts: (workspace_id, status), (campaign_id)
- audit_log: (workspace_id, created_at DESC)

## Auth Architecture

### Sign Up Flow
1. User submits email/password → POST /api/auth/signup
2. Backend creates user in Supabase Auth + `users` row + `workspaces` row
3. Returns JWT token → Frontend stores in httpOnly cookie
4. Redirects to /onboarding

### Sign In Flow
1. User submits email/password → POST /api/auth/signin
2. Supabase verifies → Returns JWT + user data
3. Frontend stores token → Redirects to /dashboard
4. If first login → shows Product Tour

### Protected Routes
- All `/api/*` routes (except `/api/auth/*`) require valid JWT
- Frontend route guard checks token → redirects unauthenticated to /signin
- Authenticated users visiting /signin or /signup → redirect to /dashboard

### Meta OAuth Flow
1. User clicks "Connect Meta" → Frontend opens Meta OAuth popup
2. Meta redirects with auth code → POST /api/meta/oauth/callback
3. Backend exchanges code for access token + stores in ad_accounts
4. Backend fetches ad accounts list → returns to frontend
5. Frontend shows account selector

## API Routes

### Auth (`/api/auth`)
- `POST /signup` — body: {email, password, name} → {token, user}
- `POST /signin` — body: {email, password} → {token, user}
- `POST /forgot-password` — body: {email} → {success}
- `POST /reset-password` — body: {token, password} → {success}
- `GET /me` → {user, workspace}
- `POST /refresh` → {token}

### Meta (`/api/meta`)
- `GET /oauth/url` → {url} — Meta OAuth URL
- `POST /oauth/callback` — body: {code} → {accounts}
- `GET /accounts` → [{id, name, status}]
- `GET /campaigns` ?account_id → [{...}]
- `POST /campaigns` — body: {...} → creates DRAFT
- `GET /insights` ?campaign_id &date_start &date_end → {...}

### Campaigns (`/api/campaigns`) — Unified
- `GET /` ?platform &status &page → [{id, name, platform, status, ...}]
- `POST /` — body: {...} → creates DRAFT in drafts table
- `PATCH /:id` — body: {...} → creates DRAFT for update
- `DELETE /:id` → creates DRAFT for deletion
- `GET /:id/insights` → {...}

### Drafts (`/api/drafts`) — THE CORE
- `GET /` ?status &platform → [{...draft with campaign info}]
- `POST /:id/approve` → applies change to live ad account
- `POST /:id/reject` → marks rejected
- `POST /:id/schedule` body: {execute_at} → schedules
- `GET /stats` → {pending, approved_today, rejected_today}

### Reports (`/api/reports`)
- `GET /cross-platform` ?date_start &date_end → {platforms: [...]}
- `GET /funnel` ?date_start &date_end → {stages: [...]}
- `POST /generate` body: {metrics, dimensions, date_range} → {report_id}
- `GET /scheduled` → [...]

### Agent (`/api/agent`)
- `GET /rules` → [{...}]
- `POST /rules` body: {...} → new rule
- `PATCH /rules/:id` → update rule
- `DELETE /rules/:id` → delete rule
- `GET /status` → {is_running, last_check, optimizations_count}
- `POST /run-now` → triggers immediate check

### Billing (`/api/billing`)
- `GET /subscription` → {plan, credits_used, credits_limit, next_billing}
- `POST /subscribe` body: {plan, payment_method} → Stripe checkout
- `GET /credits/history` ?month → [{...}]
- `POST /topup` body: {amount} → Stripe payment intent

### MCP (`/api/mcp`)
- `POST /` — JSON-RPC endpoint for MCP protocol
- `GET /manifest` → {tools: [...]}
- Handles all 30 tool calls

## Implementation Order
1. **Phase 1**: Database schema + Auth system + Protected routes
2. **Phase 2**: Meta Ads API integration + Campaign CRUD
3. **Phase 3**: Draft-first workflow + Agent engine
4. **Phase 4**: MCP Server (Python) + Morning Brief + Anomaly detection
5. **Phase 5**: Google/TikTok/Snap APIs
6. **Phase 6**: Billing (Stripe) + Credit system
7. **Phase 7**: Frontend integration (auth context, API client, protected routes)
8. **Phase 8**: Webhooks + Polish + Documentation
