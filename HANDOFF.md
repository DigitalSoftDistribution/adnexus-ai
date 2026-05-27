# AdNexus AI — Handoff Document

## What's Done (68+ agents deployed, 40,000+ lines of code)

### Frontend (`/mnt/agents/output/app/`)
- **42 pages** — all rendering with demo data
- **55+ components** — from skeleton loaders to AI chat widgets
- **Complete design system** — dark theme, #c3f53b accent, Tailwind CSS
- **Mock API interceptor** — app works without any backend (AuthContext)
- **Responsive layout** — sidebar, navbar, mobile bottom nav
- **Animation system** — CSS keyframes, Framer Motion transitions, stagger effects
- **Keyboard shortcuts** — 11 shortcuts with help modal
- **Error boundaries** — graceful error handling throughout
- **Theme system** — dark/light/system mode with CSS custom properties

### Backend (`/mnt/agents/output/adnexus-backend/`)
- **Production middleware** — validation, error handling, request logging, rate limiting
- **Database system** — migration runner, 17 tables, triggers, indexes, seed data
- **4 Platform API clients** — Meta (3,465 lines), Google (4,182 lines), TikTok (1,562 lines), Snap (1,725 lines)
- **Unified Platform Manager** — single interface across all 4 platforms (2,654 lines)
- **AI Agent Engine** — rule evaluator, performance analyzer, fatigue detector, budget optimizer (2,705 lines)
- **Draft Execution Engine** — validate, apply, rollback, log (3,496 lines across 9 modules)
- **MCP Server** — 30 tools, FastMCP, Pydantic inputs, structured outputs (1,969 lines)
- **Real-time system** — SSE + WebSocket + EventPublisher (1,301 lines)
- **Webhook handlers** — Meta, Google, TikTok, Snap with signature verification (2,605 lines)
- **Email service** — 11 email methods, morning brief HTML, Slack, webhooks
- **Monitoring** — Prometheus metrics, Grafana dashboards, health checks, alerts
- **Security** — Helmet, encryption, brute force protection, SQL injection detection
- **CI/CD** — GitHub Actions (3 workflows), Docker blue-green deployment

### Research & Strategy
- **18 research agents** — 8 wide exploration + 10 deep dive dimensions
- **13,700-word strategy report** — market sizing, competitive analysis, roadmap, GTM, pricing
- **8 cross-dimension insights** — category-defining strategic insights

---

## What YOU Need to Wire Up

### 1. Supabase Project (2-3 hours)
```bash
# 1. Create project at https://supabase.com
# 2. Go to SQL Editor → New query
# 3. Paste contents of /mnt/agents/output/adnexus-backend/api/migrations/001_initial_schema.sql
# 4. Run it
# 5. Paste 002_seed_data.sql → Run it
# 6. Go to Project Settings → API → copy URL and anon key
# 7. Go to Authentication → Settings → enable Email provider
# 8. (Optional) Add Google OAuth, GitHub OAuth for social login
```

### 2. Environment Variables (30 minutes)
Create `/mnt/agents/output/adnexus-backend/api/.env`:
```env
# Database
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_KEY=[service_role_key]
SUPABASE_ANON_KEY=[anon_key]

# JWT
JWT_SECRET=[generate_random_64_char_string]

# Redis (Upstash or self-hosted)
REDIS_URL=rediss://default:[password]@[host]:6379

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Email (SendGrid or AWS SES)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxx
EMAIL_FROM=noreply@adnexus.ai

# Frontend
FRONTEND_URL=https://your-domain.com

# Platforms (you'll get these from each developer portal)
META_APP_ID=...
META_APP_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_DEVELOPER_TOKEN=...
TIKTOK_APP_ID=...
TIKTOK_APP_SECRET=...
SNAP_APP_ID=...
SNAP_APP_SECRET=...

# MCP
MCP_API_JWT_SECRET=[same_as_JWT_SECRET]

# Security
ENCRYPTION_KEY=[32_byte_hex_for_AES]

# Optional: Sentry
SENTRY_DSN=https://...@....ingest.sentry.io/...
```

### 3. Platform Developer Apps (1-2 hours each)
You need to create apps at each platform to get API access:

**Meta (most important):**
1. Go to https://developers.facebook.com/apps
2. Create app → Business → "AdNexus AI"
3. Add "Marketing API" product
4. Get App ID and App Secret
5. Configure OAuth redirect URI: `https://your-api.com/api/v1/auth/meta/callback`
6. Request `ads_management`, `ads_read` permissions
7. Add your Meta ad account as a test account

**Google:**
1. Go to https://console.cloud.google.com
2. Create project → Enable "Google Ads API"
3. Create OAuth 2.0 credentials
4. Get Developer Token (apply at https://ads.google.com/aw/apicenter)
5. Configure redirect URI

**TikTok:**
1. Go to https://ads.tiktok.com/marketing_api/homepage
2. Create app → get App ID and Secret
3. Request `ads_management`, `ads_read` permissions

**Snap:**
1. Go to https://forbusiness.snapchat.com
2. Create app → get Client ID and Secret

### 4. Redis (15 minutes)
Option A: Upstash (easiest) — free tier at https://upstash.com
Option B: Self-hosted via Docker:
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 5. Start the Backend (5 minutes)
```bash
cd /mnt/agents/output/adnexus-backend/api
npm install
npm run migrate:up     # Run database migrations
npm run build
development:
```

### 6. Start the MCP Server (5 minutes)
```bash
cd /mnt/agents/output/adnexus-backend/mcp-server
pip install -r requirements.txt
python server.py
```

### 7. Deploy (30 minutes)
Option A: Railway/Render (easiest)
```bash
# Connect GitHub repo to Railway
# It auto-detects Dockerfile and docker-compose.yml
```

Option B: Self-hosted with Docker:
```bash
cd /mnt/agents/output/adnexus-backend
docker-compose -f docker-compose.prod.yml up -d
```

### 8. Frontend Deployment (10 minutes)
Update `.env`:
```env
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon_key]
VITE_API_URL=https://your-api.com/api/v1
```

Build and deploy:
```bash
cd /mnt/agents/output/app
npm run build
# Upload dist/ folder to Vercel/Netlify/S3
```

---

## Architecture Overview

```
User (Browser)
    │
    ├── React Frontend (app/)
    │   ├── Zustand stores (local state)
    │   ├── API client → axios → backend
    │   ├── SSE connection → real-time events
    │   └── Supabase auth (JWT tokens)
    │
    ├── AI Assistants (Claude, ChatGPT, Cursor)
    │   └── MCP protocol → MCP Server
    │
    └── Platform Dashboards (Meta, Google, TikTok, Snap)
        └── OAuth 2.0 → backend stores tokens

Backend (adnexus-backend/api/)
    ├── Express server
    ├── Auth middleware (Supabase JWT verification)
    ├── Rate limiter (Redis)
    ├── Request logger + error handler
    ├── Route handlers (campaigns, drafts, AI, reports, etc.)
    ├── AI Engine (rules, recommendations, fatigue detection)
    ├── Draft Execution Engine (validate → apply → rollback)
    ├── Platform Manager (unified Meta/Google/TikTok/Snap interface)
    ├── Real-time service (SSE + WebSocket)
    ├── Email service (morning brief, alerts, notifications)
    └── Workers (BullMQ + Redis): morning brief, rule evaluation, reports

MCP Server (adnexus-backend/mcp-server/)
    ├── FastMCP server
    ├── 30 tools (campaign/audience/reporting/draft/optimization)
    └── HTTP client → backend API

Database (PostgreSQL via Supabase)
    ├── 17 tables (users, workspaces, campaigns, ads, drafts, metrics, etc.)
    ├── Row Level Security policies
    └── Triggers for updated_at

Cache + Queue (Redis)
    ├── Rate limiting
    ├── Session storage
    ├── BullMQ job queues
    └── API response caching

External APIs
    ├── Meta Marketing API (OAuth, campaign CRUD, insights)
    ├── Google Ads API (OAuth, GAQL, campaign management)
    ├── TikTok Ads API (OAuth, campaign CRUD)
    └── Snap Ads API (OAuth, campaign CRUD)
```

---

## Remaining Work (estimated effort)

### Critical (do before first user)
| Task | Effort | Notes |
|------|--------|-------|
| Wire frontend stores to real API | 2-3 hours | Stores already have API calls, just need to test against running backend |
| Set up Supabase + env vars | 2-3 hours | Step-by-step above |
| Create platform dev apps | 3-4 hours | Meta is longest (approval process) |
| Test OAuth flows end-to-end | 2 hours | Connect each platform, verify token refresh |
| Test draft approval workflow | 1 hour | Create draft → approve → verify platform change |

### Important (do within first week)
| Task | Effort | Notes |
|------|--------|-------|
| Set up email/SendGrid | 1 hour | Get API key, update env, test morning brief email |
| Set up Sentry error tracking | 30 min | Get DSN, add to env |
| Custom domain + SSL | 1 hour | Via Railway/Render or Cloudflare |
| Seed real-looking demo data | 2 hours | Currently seed data is basic — make it richer |
| Test mobile responsive | 2 hours | Walk through every page on mobile viewport |

### Nice to have (do after launch)
| Task | Effort | Notes |
|------|--------|-------|
| A/B test onboarding flow | 4 hours | Test wizard vs. traditional signup |
| Add more AI rule presets | 2 hours | Industry-specific rule templates |
| Custom integrations (Shopify, HubSpot) | 4-8 hours | Webhook-based data sync |
| Advanced attribution modeling | 1-2 days | Data-driven, time-decay, position-based |
| White-label customization | 1-2 days | Custom domains, branding per agency client |

---

## File Map

### Frontend key files
```
app/src/
├── pages/              # 42 pages (all .tsx)
│   ├── Dashboard.tsx
│   ├── Campaigns.tsx
│   ├── AIAgent.tsx
│   ├── CreativeIntelligence.tsx
│   ├── MorningBrief.tsx
│   ├── BudgetPacing.tsx
│   ├── CompetitiveIntel.tsx
│   └── ... (34 more)
├── components/
│   ├── Layout.tsx      # Main app layout
│   ├── Sidebar.tsx     # Navigation sidebar
│   ├── AskAIWidget.tsx # Floating AI chat
│   ├── DemoModeBanner.tsx
│   └── ... (40+ more)
├── stores/
│   ├── campaignStore.ts
│   ├── draftStore.ts
│   ├── notificationStore.ts
│   └── ... (6 total)
├── hooks/
│   ├── useRealtime.ts   # SSE connection
│   ├── useMutation.ts   # API mutations
│   └── useToast.ts
├── lib/
│   └── api.ts           # API client (production-ready)
└── contexts/
    └── AuthContext.tsx  # Auth + mock fallback
```

### Backend key files
```
adnexus-backend/
├── api/src/
│   ├── index.ts              # Express server entry
│   ├── config/               # Environment config
│   ├── middleware/           # Validation, logging, rate limiting
│   ├── routes/               # All API route handlers
│   ├── services/             # Business logic (email, notifications, etc.)
│   ├── ai-engine/            # AI Agent decision engine
│   ├── draft-engine/         # Draft execution (validate/apply/rollback)
│   ├── platforms/            # 4 platform API clients + unified manager
│   ├── realtime/             # SSE + WebSocket system
│   ├── webhooks/             # Platform webhook handlers
│   ├── monitoring/           # Prometheus metrics + health checks
│   ├── security/             # Encryption + hardening
│   ├── db/                   # Connection + migration runner
│   └── workers/              # BullMQ background jobs
├── mcp-server/
│   └── server.py             # MCP server with 30 tools
├── migrations/
│   ├── 001_initial_schema.sql
│   └── 002_seed_data.sql
├── docker-compose.prod.yml
├── .github/workflows/        # CI/CD pipelines
└── monitoring/               # Grafana dashboards
```

---

## Testing Checklist (run before launch)

### Authentication
- [ ] Sign up with email
- [ ] Sign in with email
- [ ] Sign in with Google OAuth
- [ ] Password reset flow
- [ ] Token refresh (wait 1 hour)
- [ ] Logout clears all state

### Platform Connection
- [ ] Connect Meta ad account
- [ ] Connect Google ad account
- [ ] Connect TikTok ad account
- [ ] Connect Snap ad account
- [ ] Disconnect and reconnect account
- [ ] Token auto-refresh works

### Campaign Management
- [ ] View campaigns list
- [ ] Filter campaigns by platform/status
- [ ] Create campaign (creates draft)
- [ ] Approve draft → campaign created on platform
- [ ] Reject draft → stays rejected
- [ ] Pause/resume campaign (via draft)
- [ ] Budget change (via draft)

### AI Agent
- [ ] View AI recommendations
- [ ] Create draft from recommendation
- [ ] Approve → change applied
- [ ] Rule triggers create draft
- [ ] Creative fatigue detected

### Draft Workflow
- [ ] Draft created by AI shows in inbox
- [ ] Email notification sent for approval
- [ ] Approve → success notification
- [ ] Reject → reason logged
- [ ] Rollback works on failure

### Real-time
- [ ] Dashboard updates without refresh
- [ ] New draft appears instantly
- [ ] Campaign status changes reflected
- [ ] Mobile notifications work

### Reports
- [ ] Generate PDF report
- [ ] Export to CSV
- [ ] Schedule weekly report
- [ ] Morning Brief email arrives

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Recharts, Framer Motion, Zustand |
| Backend API | Node.js, Express, TypeScript, PostgreSQL, Redis, BullMQ |
| MCP Server | Python 3.11, FastMCP, Pydantic, httpx |
| Database | PostgreSQL 16 (via Supabase) |
| Cache/Queue | Redis 7 (via Upstash or Docker) |
| Auth | Supabase Auth (JWT) |
| AI | OpenAI/Anthropic APIs |
| Email | nodemailer + SendGrid |
| Monitoring | Prometheus + Grafana + Loki |
| CI/CD | GitHub Actions + Docker |
| Infra | Docker Compose / Kubernetes |

---

## Cost Estimate (monthly, production)

| Service | Tier | Cost |
|---------|------|------|
| Supabase | Pro | $25 |
| Upstash Redis | 10GB | $30 |
| Railway/Render | 2 vCPU, 4GB | $50 |
| SendGrid | 100K emails/mo | $20 |
| OpenAI API | GPT-4o | $50-200 (usage) |
| Sentry | Team | $26 |
| Domain | .com | $12/year |
| **Total** | | **~$200-350/mo** |

---

## Support

If you hit issues:
1. Check the backend logs: `docker logs adnexus-api`
2. Check the MCP server logs: `docker logs adnexus-mcp`
3. Check Supabase logs in the dashboard
4. Review the strategy document for context on decisions
5. The code is extensively commented — read the source!

---

*This handoff document was generated after 68+ agents built AdNexus AI across 12 phases of research, frontend development, backend engineering, and DevOps.*
