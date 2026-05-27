# AdNexus AI — Research Findings

## Pipeboard.co Analysis (Primary Competitor)

### What Pipeboard Does
- MCP server connecting Meta Ads, Google Ads, TikTok Ads, Snap Ads, Reddit Ads to Claude AI
- 120+ write tools across platforms — broadest write coverage
- AI-powered campaign analysis, budget optimization, creative insights
- OAuth secured, 2-min setup, no coding required
- Badged Meta Business Partner
- Pricing: Free (30 executions/week), Pro $29.90/mo (500/week), Premium $99/mo, Enterprise $199/mo
- Open source on GitHub

### Pipeboard Capabilities
- Campaign Performance Analysis (identify underperformers, suggest optimizations)
- Creative Performance Insights (analyze why some creatives perform better)
- Budget Reallocation Recommendations (ROI-based reallocation suggestions)
- Campaign Duplication with modifications
- AI Reports (performance, budget allocation, audiences, creative assets)
- Works with Claude, ChatGPT, Cursor, any MCP client
- Safety: campaigns created as PAUSED, human-in-the-loop design

### Pipeboard Weaknesses to Exploit
1. No unified dashboard/visual interface — purely MCP/chat-based
2. No proactive autonomous optimization — only responds to prompts
3. No predictive analytics or forecasting
4. Limited visual reporting capabilities
5. No creative fatigue detection system
6. No audience saturation monitoring
7. Cross-platform reasoning awkward (separate MCPs per platform)
8. 120+ tools = huge token consumption for LLMs

## Meta Marketing API (Most Mature)

### Core Endpoints
- `/act_{id}/campaigns` — Create, read, update, delete campaigns
- `/act_{id}/adsets` — Ad set management (budget, targeting, bidding)
- `/act_{id}/ads` — Ad management
- `/act_{id}/adcreatives` — Creative upload and management
- `/{object_id}/insights` — Reporting (70+ metrics available)

### Key Metrics (70+)
- Delivery: impressions, reach, frequency
- Engagement: clicks, CTR, link_clicks, post_engagement
- Cost: spend, CPM, CPC, cost_per_action_type
- Conversion: actions, action_values, conversions, leads, cost_per_lead
- Video: video views, completion rate, watch time
- Relevance: quality ranking, engagement rate ranking

### Breakdown Dimensions
- Demographics: age, gender, country, region
- Device: device_platform, publisher_platform, placement
- Time: hourly_stats, time_increment

### Rate Limits
- Application: 200 calls/hour/app
- User: 25 calls/hour/user
- Ad Account: 5 insights/minute
- Async jobs for large data pulls

## Google Ads API v16

### Core Resources
- `CampaignService` — Campaign CRUD
- `AdGroupService` — Ad group management
- `AdService` — Ad management
- `CampaignBudgetService` — Budget management
- `GoogleAdsService.Search()` — Reporting (GAQL queries)

### Key Features
- Campaign types: Search, Display, Video, Performance Max, Demand Gen
- Smart Bidding: Target CPA, Target ROAS, Maximize Conversions
- Audience targeting: custom segments, in-market, affinity, remarketing
- Asset-based ads for Performance Max
- Detailed conversion tracking

## TikTok Business API

### Core Endpoints
- `/open_api/v1.3/campaign/get/` — Campaign management
- `/open_api/v1.3/adgroup/get/` — Ad group management
- `/open_api/v1.3/ad/get/` — Ad management
- `/open_api/v1.3/creative/get/` — Creative assets
- Reporting with sync and async modes

### Key Features
- Campaign Budget Optimization (CBO)
- Split testing (creative, audience, placement)
- Automated rules (pause when CPA exceeds threshold, etc.)
- 400+ metrics in Ads Manager
- Video-first metrics: 6s views, 50% completion, engaged views
- TikTok Shop integration for in-app checkout

### Key Metrics
- Impressions, clicks, CTR, CPC, CPM
- Video views (6s, 50%, 100% completion)
- Conversions, conversion rate, cost_per_conversion
- Complete payment, total_purchase_value, ROAS
- Engagement rate (4.07% average — 4x Instagram)

## Snapchat Marketing API

### Core Endpoints
- `/adaccounts` — List ad accounts
- `/adaccounts/{id}/campaigns` — Campaign management
- `/adaccounts/{id}/adsquads` — Ad squad (ad set) management
- `/adaccounts/{id}/ads` — Ad management
- `/adaccounts/{id}/creatives` — Creative management
- `/{level}/stats` — Performance stats (total_stats, lifetime_stats)
- `/{level}/stats_report` — Async reporting

### Key Features
- Campaign objectives: Awareness, Consideration, Conversion
- Goal-based bidding: auto-bid, target cost, min ROAS
- Snap-specific: Snap Ads, Story Ads, Collection Ads, AR Lenses
- Audience match, lookalike audiences
- Snapchat Pixel for conversion tracking

## MCP (Model Context Protocol) Architecture

### What MCP Enables
- Universal adapter between AI assistants and external data sources
- Real-time data access without exports
- Secure OAuth authentication
- Execute actions (create campaigns, update budgets, duplicate ads)
- Works with Claude, ChatGPT, Cursor, any MCP client

### Key Protocols in Ad Tech
- **ECAPI** (Event Conversion API): Server-to-server conversion data transmission
- **AdCP** (Ad Context Protocol): Communication between buy-side and sell-side AI agents
- **UCP** (User Context Protocol): De-identified audience signals with browsing context
- **MCP** (Model Context Protocol): Universal plug for AI — connects to databases, inventory systems
- **ARTF** (Ad-buying Real-time Framework): Flattened, containerized high-performance bidding

## Competitive Landscape 2026

### AI Agent Platforms (New Category)
| Platform | Price | Platforms | Setup | Key Differentiator |
|----------|-------|-----------|-------|-------------------|
| Adspirer | $0-$199/mo | Meta, Google, TikTok | ~2 min | AI-agent platform, no dashboard |
| Pipeboard | $0-$199/mo | Meta, Google, TikTok, Snap | ~2 min | 120+ write tools, open source |
| Flyweel | Free tier | Google, Meta, TikTok | ~2 min | 222+ extended metrics |

### SaaS Dashboard Platforms (Mature)
| Platform | Price | Platforms | Best For |
|----------|-------|-----------|----------|
| Smartly.io | $2,500+/mo | Meta, Snap, Pinterest, TikTok | Enterprise e-commerce |
| Optmyzr | $209-$2,499/mo | Google, Microsoft, Amazon | PPC specialists |
| Madgicx | $31-$55+/mo | Meta only | Meta-focused e-commerce |
| Revealbot | $99+/mo | Meta, Google, TikTok, Snap | Rule-based automation |

### Key Trends 2026
1. Category split: SaaS dashboards vs AI-agent platforms
2. 48.5% of marketing teams using MCP connectors
3. 12,430+ public MCP servers, 97M monthly SDK downloads
4. Shift from rule-based to AI-native automation
5. Cross-platform coordination is the #1 pain point
6. Creative fatigue detection is critical (Meta ads fatigue after 3-5 days)
7. Audience saturation monitoring saves 15-25% wasted spend

## Feature Opportunities (What AdNexus AI Will Build)

### Differentiators from Pipeboard
1. **Unified Visual Dashboard** — Pipeboard has no UI; AdNexus has a full dashboard
2. **Proactive AI Agent** — Autonomous monitoring and optimization, not just chat responses
3. **Predictive Analytics** — Forecast spend, ROAS, creative fatigue before it happens
4. **Cross-Platform Attribution** — Unified view across all platforms
5. **Creative Intelligence** — Fatigue detection, performance prediction, A/B test analysis
6. **Smart Alerts** — Anomaly detection, budget pacing alerts, performance drops
7. **Visual Reporting** — Charts, graphs, executive summaries
8. **One-Click Actions** — Approve AI-suggested changes with single click

### Core Pages/Features Needed
1. Dashboard — Cross-platform overview with KPIs
2. Campaigns — List, create, edit, pause, duplicate campaigns across all platforms
3. AdSets/AdGroups — Management with targeting and budget controls
4. Ads — Creative management with preview and performance
5. Reports — Detailed analytics with charts and breakdowns
6. AI Insights — Proactive recommendations and alerts
7. AI Agent — MCP configuration, automation rules, agent status
8. Settings — Account connections, preferences, team management
