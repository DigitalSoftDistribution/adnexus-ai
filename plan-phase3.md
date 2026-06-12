# AdNexus AI — Phase 3 Build Plan

> ⚠️ **HISTORICAL DOCUMENT** — superseded by [docs/PATH_TO_V1.md](docs/PATH_TO_V1.md)
> and [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md). Kept for reference only.

## Gap Analysis (Roadmap Tiers 3 & 4 not yet covered)

### Tier 3 — Proactive Agent Layer (Weeks 8-11) Gaps:
- ❌ Anomaly detection configuration UI (statistical z-score, MAD-based)
- ❌ Budget pacing dashboard (burn rate vs monthly target, projections)
- ❌ Morning Brief dedicated view (agent's daily output)
- ❌ Approve via mobile (lightweight mobile-friendly approval)

### Tier 4 — Creative (Weeks 10-12) Gaps:
- ❌ AI creative generation (image copy variants with AI)

### Product Completeness Gaps (not in roadmap but needed):
- ❌ Command Palette / Global Search (power user essential)
- ❌ A/B Testing management (every serious ad platform has this)
- ❌ Audience Manager (targeting creation, segments, lookalikes)
- ❌ Slack Integration full setup page
- ❌ Campaign Templates Library

## Phase 3 Build: 9 New Pages/Components

### Group A: Power User Features (Command Palette + A/B Testing + Audience Manager)
1. **CommandPalette** (`src/components/CommandPalette.tsx`) — Cmd+K global search
2. **ABTesting** (`src/pages/ABTesting.tsx`) — A/B test creation, management, results
3. **AudienceManager** (`src/pages/AudienceManager.tsx`) — Segments, targeting, lookalikes

### Group B: Proactive Agent Features (Pacing + Morning Brief + Slack)
4. **BudgetPacing** (`src/pages/BudgetPacing.tsx`) — Visual pacing dashboard with projections
5. **MorningBrief** (`src/pages/MorningBrief.tsx`) — Daily agent summary page
6. **SlackIntegration** (`src/pages/SlackIntegration.tsx`) — Full Slack connect + config

### Group C: Creative + Templates + Mobile Approval
7. **AICreativeStudio** (`src/pages/AICreativeStudio.tsx`) — Generate ad copy and images
8. **CampaignTemplates** (`src/pages/CampaignTemplates.tsx`) — Pre-built templates
9. **MobileApproval** (`src/pages/MobileApproval.tsx`) — Lightweight mobile approval UI
