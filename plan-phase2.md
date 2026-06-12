# AdNexus AI — Phase 2 Build Plan

> ⚠️ **HISTORICAL DOCUMENT** — superseded by [docs/PATH_TO_V1.md](docs/PATH_TO_V1.md)
> and [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md). Kept for reference only.

## Gap Analysis (Roadmap vs Current Build)

### What We Have (7 pages)
- Home (landing) ✅ | Dashboard ✅ | Campaigns ✅ | Ads ✅ | AI Agent ✅ | Reports ✅ | Settings ✅

### What's Missing (from roadmap)

**Tier 0 — Foundation:**
- ❌ Auth flow (Sign In / Sign Up / Forgot Password)
- ❌ Onboarding wizard (first-time account connection)
- ❌ Inbox/notification center
- ❌ Per-client token scoping UI

**Tier 1 — AI Reports & Q&A:**
- ❌ Agency multi-client roll-up dashboard
- ❌ In-app inbox for AI reports and alerts
- ❌ Natural-language Q&A chat interface
- ❌ Slack integration management

**Tier 2 — MCP Server & Draft-First:**
- ❌ Drafts management page (THE core differentiator)
- ❌ Full audit log page
- ❌ MCP tool explorer/documentation

**Tier 3 — Proactive Agent:**
- ❌ Morning Brief view
- ❌ Anomaly detection configuration
- ❌ Budget pacing alerts config

**Tier 4 — Creative:**
- ❌ AI creative generation interface
- ❌ Creative brief generator
- ❌ A/B test setup UI

**GTM — Marketing:**
- ❌ Comparison pages (vs Pipeboard, vs Madgicx)
- ❌ Blog page
- ❌ Dedicated pricing page

## Build Plan

### Stage 1: Design (Parallel with Designer)
Create design docs for all 14 new pages grouped by agent:
- Group A: Auth (SignIn, SignUp, ForgotPassword) + Onboarding
- Group B: Inbox + Drafts + Audit Log (the "core differentiator trio")
- Group C: Agency Dashboard + AI Chat + Creative Brief
- Group D: Comparison pages + Blog + Tool Explorer

### Stage 2: Build (4 parallel agents)
- Agent A: Auth pages + Onboarding wizard
- Agent B: Inbox + Drafts + Audit Log
- Agent C: Agency Dashboard + AI Chat overlay + Creative Brief
- Agent D: Comparison pages + Blog + Tool Explorer

### Stage 3: Merge, Wire Routes, Build, Deploy
