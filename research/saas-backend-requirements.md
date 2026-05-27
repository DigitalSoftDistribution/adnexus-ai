# AdNexus AI: Backend Infrastructure Research Report

> **Date:** July 2025
> **Purpose:** Technical specification for transforming AdNexus AI from concept to sellable multi-platform ad management SaaS product
> **Research Scope:** Authentication, ad platform APIs, MCP servers, database architecture, billing, deployment

---

## Executive Summary

This report provides a comprehensive technical blueprint for building AdNexus AI — a multi-platform ad management SaaS with MCP (Model Context Protocol) integration. The research covers authentication systems, four major ad platform APIs (Meta, Google, TikTok, Snap), MCP server architecture, database design, billing infrastructure, and deployment strategy.

### Key Findings

| Area | Key Decision | Effort (days) |
|------|-------------|---------------|
| Auth | **Supabase Auth** — free tier 50K MAUs, native RLS, built-in OAuth | 3-5 |
| Meta API | Marketing API v19.0+ via OAuth, system user tokens for production | 7-10 |
| Google Ads API | REST API v15+, developer token required, 4-tier access system | 10-14 |
| TikTok API | Business API v1.3, developer portal registration, app review | 7-10 |
| Snap API | Marketing API via OAuth, async reporting for large pulls | 5-7 |
| MCP Server | Python FastMCP SDK, Streamable HTTP transport, JSON-RPC 2.0 | 10-14 |
| Database | PostgreSQL + Supabase, multi-tenant via `workspace_id` + RLS | 7-10 |
| Billing | **Stripe** — metered billing + credit system, hybrid subscriptions | 7-10 |
| Deployment | **Railway** for backend + MCP, **Vercel** for frontend | 3-5 |
| **Total MVP** | | **~60-85 days** |

---

## 1. Authentication & Authorization

### Research Findings

#### JWT vs Session-Based Auth for SaaS (2024-2025)

The industry has largely settled on a **hybrid approach**: short-lived JWT access tokens (stored in memory or sessionStorage) paired with long-lived refresh tokens (stored in HttpOnly cookies). This provides both security (no sensitive tokens in localStorage) and UX (no constant re-login).

**JWT Access Token Pattern:**
- Access tokens: 15-60 min expiry, stored in `sessionStorage` or memory
- Refresh tokens: 7-30 day expiry, stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies
- Automatic refresh via Axios/fetch interceptors on 401 responses
- Token rotation on refresh for enhanced security

**What Successful SaaS Products Use:**

| Provider | Best For | Free Tier | Cost/MAU | Standout Feature |
|----------|----------|-----------|----------|------------------|
| **Clerk** | Next.js SaaS, indie devs | 10,000 MAUs | $0.02/MAU | Best DX, pre-built React components, orgs support |
| **Supabase Auth** | Full-stack Supabase apps | 50,000 MAUs | $0.00325/MAU | Best value, native PostgreSQL RLS, 15+ OAuth providers |
| **Auth0** | Enterprise B2B SaaS | 7,000 MAUs | ~$0.07/MAU | Enterprise SSO, SAML, highest compliance |
| **Firebase Auth** | Google Cloud projects | 50,000 MAUs | ~$0.0055/MAU | Large free tier but limited modern DX |

#### Auth Flow Pattern for Ad Management SaaS

Ad management SaaS has a unique dual-auth challenge:

1. **App-level auth** — The user logs into YOUR app (Supabase/Clerk)
2. **Platform OAuth** — The user connects their ad accounts (Meta, Google, TikTok, Snap)

This creates a **two-layer token architecture:**

```
Layer 1: App Auth (Supabase JWT)
  └── User identity, workspace/team membership, roles
  
Layer 2: Platform OAuth Tokens (stored encrypted in DB)
  ├── Meta: OAuth access_token + refresh_token
  ├── Google: OAuth access_token + refresh_token
  ├── TikTok: OAuth access_token + refresh_token
  └── Snap: OAuth access_token + refresh_token
```

#### Protected Routes in React SPA

**Recommended Architecture:**
```tsx
// Auth Context + React Query pattern
<AuthProvider>           // Supabase auth state
  <QueryClientProvider>  // Server state caching
    <App>
      <ProtectedRoute requireAuth requireConnection="meta">
        <Dashboard />
      </ProtectedRoute>
    </App>
  </QueryClientProvider>
</AuthProvider>
```

Key patterns:
- **Route guards** check auth state before rendering
- **Auth context** provides user + loading state globally
- **Axios interceptors** handle automatic token refresh on 401
- **React Query** manages server state, caching, and background refetching

#### How Pipeboard Handles Auth

Pipeboard uses a **token-based auth system** with:
- OAuth 2.0 for platform connections (Meta, Google, TikTok, Snap)
- API tokens for programmatic access (read-only, write, full scopes)
- Per-account token scoping for agencies
- Bearer token authentication for MCP server requests
- Their open-source MCP server accepts tokens via: `https://mcp.pipeboard.co/meta-ads-mcp?token=YOUR_TOKEN`

### Recommendations

**For AdNexus AI:**
1. **Use Supabase Auth** — Best cost/value for a new SaaS, native integration with PostgreSQL RLS for multi-tenancy, handles OAuth providers out of the box
2. **Implement dual OAuth flow**: User signs in with Supabase Auth, then connects ad platforms via OAuth popups
3. **Encrypt all platform tokens** at rest using AES-256 before storing in PostgreSQL
4. **Build a token refresh service** that runs on a schedule (BullMQ cron job) to keep platform tokens fresh

**Token Storage Schema:**
```sql
CREATE TABLE platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  user_id UUID REFERENCES auth.users(id),
  platform VARCHAR(20) NOT NULL, -- 'meta', 'google', 'tiktok', 'snap'
  account_id VARCHAR(100) NOT NULL, -- platform-specific account ID
  account_name VARCHAR(255),
  access_token TEXT NOT NULL, -- encrypted
  refresh_token TEXT, -- encrypted
  token_expires_at TIMESTAMPTZ,
  scope TEXT[],
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, platform, account_id)
);
```

### Estimated Implementation Effort
- **Auth system setup (Supabase):** 3 days
- **Platform OAuth flows (4 platforms):** 5 days
- **Protected routes & context:** 2 days
- **Token refresh service:** 2 days
- **Total:** ~12 days

---

## 2. Meta Marketing API Integration

### Research Findings

#### Getting Started

1. **Prerequisites:**
   - Meta Business Manager account with admin access
   - Active ad account linked to Business Manager
   - Registered Meta Developer account at [developers.facebook.com](https://developers.facebook.com)

2. **App Setup Process:**
   - Create app in Meta Developer Portal
   - Add "Marketing API" product
   - Configure OAuth redirect URIs
   - Complete Business Verification (required for write permissions)

3. **Token Types:**
   - **Short-lived tokens** (User tokens): 1-2 hours expiry, for initial auth
   - **Long-lived tokens**: Valid for 60 days, can be refreshed
   - **System User tokens**: Never expire, for server-to-server automation. **This is what you want for production.**

#### OAuth 2.0 Flow

```
Step 1: Redirect user to:
https://www.facebook.com/v19.0/dialog/oauth?
  client_id=APP_ID&
  redirect_uri=REDIRECT_URI&
  scope=ads_read,ads_management&
  state=RANDOM_STATE

Step 2: User authorizes, redirects to REDIRECT_URI with ?code=AUTH_CODE

Step 3: Exchange code for token:
POST https://graph.facebook.com/v19.0/oauth/access_token
  ?client_id=APP_ID
  &client_secret=APP_SECRET
  &code=AUTH_CODE
  &redirect_uri=REDIRECT_URI

Step 4: Exchange for long-lived token:
GET https://graph.facebook.com/v19.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id=APP_ID
  &client_secret=APP_SECRET
  &fb_exchange_token=SHORT_LIVED_TOKEN
```

#### Required Scopes

| Scope | Purpose |
|-------|---------|
| `ads_read` | Read ad account data, campaigns, insights |
| `ads_management` | Create/edit campaigns, adsets, ads |
| `business_management` | Access Business Manager accounts |
| `pages_read_engagement` | Read page engagement data |

#### Key API Endpoints

| Operation | Endpoint |
|-----------|----------|
| List ad accounts | `GET /me/adaccounts` |
| Get campaigns | `GET /act_{id}/campaigns` |
| Create campaign | `POST /act_{id}/campaigns` |
| Get adsets | `GET /act_{id}/adsets` |
| Create adset | `POST /act_{id}/adsets` |
| Get ads | `GET /act_{id}/ads` |
| Create ad | `POST /act_{id}/ads` |
| Get insights | `GET /{object-id}/insights` |
| Upload image | `POST /act_{id}/adimages` |
| Search targeting | `GET /search?type=adinterest&q={query}` |

#### Rate Limits (CRITICAL)

| Limit Type | Limit | Reset Period |
|------------|-------|--------------|
| Application-level | 200 calls/hour per app | Rolling hour |
| User-level | 25 calls/hour per user | Rolling hour |
| Ad Account | 5 insights requests/minute | Per minute |
| Insights Job | 5 concurrent jobs per account | Concurrent |

**The 5-insights-per-minute ad account limit** is the most restrictive. For real-time reporting, use:
- **Async insights jobs** for large data pulls
- **Batching** — request multiple fields in a single call
- **Caching** — cache insights data for 15-30 minutes

```python
# Async insights pattern
# Submit job
POST /v19.0/act_{ad-account-id}/insights
{
  "level": "ad",
  "fields": ["impressions","clicks","spend","actions"],
  "date_preset": "last_30d",
  "breakdowns": ["age","gender"],
  "async": true
}
# Returns: {"report_run_id": "12345"}

# Poll for completion
GET /v19.0/12345
# Returns: {"async_status": "Job Completed", "async_percent_completion": 100}

# Download
GET /v19.0/12345/insights
```

#### System User Tokens (Production)

For a SaaS product, you need **System User tokens**:
1. Go to Business Manager > Settings > System Users
2. Create a System User (Admin role)
3. Generate a token for that System User
4. Assign the System User to ad accounts with appropriate roles
5. These tokens don't expire — ideal for background automation

**App Review Requirements:**
- Business Verification required
- Data Use Checkup must be completed
- For `ads_management` scope, you need Business Verification + app review
- Process takes 1-2 weeks typically

#### Insights Breakdowns Available

| Category | Breakdowns |
|----------|-----------|
| Demographics | `age`, `gender`, `country`, `region` |
| Device | `device_platform`, `platform_position`, `impression_device` |
| Placement | `publisher_platform`, `placement` |
| Time | `hourly_stats_aggregated_by_advertiser_time_zone` |
| Action | `action_type`, `action_device`, `action_reaction` |

**Pro tip:** Always include `action_attribution_windows` parameter to match Ads Manager data.

### Recommendations

1. **Use Meta Graph API v19.0 or later** (current as of 2025)
2. **Implement exponential backoff** for rate limit handling (1min, 2min, 4min)
3. **Cache insights data** for at least 15 minutes to stay within rate limits
4. **Use async jobs** for any report spanning more than 7 days
5. **Build token refresh automation** — long-lived tokens expire in 60 days
6. **Store all token data encrypted** — these are powerful credentials

### Estimated Implementation Effort
- **OAuth flow + token management:** 3 days
- **Campaign CRUD endpoints:** 3 days
- **Insights fetching + caching:** 3 days
- **Creative management:** 2 days
- **Rate limiting + error handling:** 2 days
- **Total:** ~13 days

---

## 3. Google Ads API Integration

### Research Findings

#### Overview

The Google Ads API uses **gRPC** (primary) or **REST** as transport. For a SaaS product, the REST API is simpler to integrate. It uses **OAuth 2.0** authentication and requires a **developer token**.

#### Key Requirements

1. **Google Ads API Developer Token:**
   - Apply through Google Ads Manager Account > API Center
   - Initially issued with **Test Account Access** only
   - Must apply for **Basic Access** to hit production accounts
   - As of 2026, Google introduced **Explorer Access** (automatic upgrade from Test Access, 2,880 ops/day limit)

2. **Google Cloud Project:**
   - Create OAuth 2.0 credentials (Web application type)
   - Configure consent screen
   - Enable Google Ads API

3. **OAuth Scopes:**
   - `https://www.googleapis.com/auth/adwords` — Full access
   - `https://www.googleapis.com/auth/adwords.readonly` — Read-only

#### Four-Tier Access System (2026)

| Tier | Daily Ops | Production Access | Application Required |
|------|-----------|-------------------|---------------------|
| **Test Account Access** | 15,000 | No (test only) | No |
| **Explorer Access** | 2,880 | Yes (with restrictions) | Auto-upgrade |
| **Basic Access** | 15,000 | Yes | Yes (~2 business days) |
| **Standard Access** | Unlimited | Full | Yes (~10 business days) |

**Explorer Access Restrictions:**
- Cannot create accounts via API
- No user management
- No keyword planning services
- No billing/payment operations
- No audience insights

**For AdNexus AI MVP:** Explorer Access or Basic Access is sufficient.

#### API Architecture

Google Ads API uses a unique **Google Ads Query Language (GAQL)** — a SQL-like query language:

```sql
-- Query campaigns
SELECT 
  campaign.id, 
  campaign.name, 
  campaign.status,
  campaign_budget.amount_micros,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions,
  metrics.conversions_value
FROM campaign
WHERE campaign.status = 'ENABLED'
DURING LAST_30_DAYS
```

#### Key Endpoints (REST)

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List accessible customers | GET | `/customers:listAccessibleCustomers` |
| Search (GAQL query) | POST | `/customers/{customerId}/googleAds:search` |
| Search Stream | POST | `/customers/{customerId}/googleAds:searchStream` |
| Mutate campaigns | POST | `/customers/{customerId}/campaigns:mutate` |
| Mutate ad groups | POST | `/customers/{customerId}/adGroups:mutate` |
| Mutate ads | POST | `/customers/{customerId}/adGroupAds:mutate` |
| Get change history | POST | `/customers/{customerId}/googleAds:search` (with change_event) |

#### REST Headers Required

```http
Authorization: Bearer {oauth_access_token}
developer-token: {developer_token}
login-customer-id: {manager_account_id}  # Required for manager account access
```

#### How Optmyzr Handles Google Ads

Optmyzr uses the Google Ads API extensively for:
- **Rule Engine** — Automated rule-based optimization
- **Campaign Automator** — Feed-based campaign creation
- **Alerts & Monitoring** — Performance anomaly detection
- **Smart Product Labeler** — Shopping campaign optimization

They use GAQL queries extensively and implement their own scheduling/cron system for automation rules.

### Recommendations

1. **Apply for developer token immediately** — approval can take 1-2 weeks
2. **Use REST API** (not gRPC) for simpler integration
3. **Build a GAQL query builder** — reusable query patterns for common reports
4. **Request Basic Access** as soon as you have a working integration
5. **Cache campaign structure** (campaigns, ad groups, ads) — changes less frequently than metrics
6. **Use `searchStream`** for large reporting queries (better performance)

### Estimated Implementation Effort
- **Developer token application + setup:** 3 days (parallel with other work)
- **OAuth flow:** 2 days
- **GAQL query builder + search:** 3 days
- **Campaign CRUD:** 3 days
- **Reporting + insights:** 3 days
- **Total:** ~14 days

---

## 4. TikTok Business API Integration

### Research Findings

#### Getting Started

1. **Prerequisites:**
   - TikTok for Business account
   - TikTok Business Center
   - Active ad account
   - Developer account at [ads.tiktok.com/marketing_api/homepage](https://ads.tiktok.com/marketing_api/homepage)

2. **App Registration:**
   - Register app in TikTok Marketing API developer portal
   - Submit for app review (required for production access)
   - Obtain `app_id` and `secret`

3. **Authentication:** OAuth 2.0 flow

#### OAuth Flow

```
Step 1: Authorization URL:
https://ads.tiktok.com/marketing_api/auth?
  app_id=APP_ID&
  redirect_uri=REDIRECT_URI&
  state=RANDOM_STATE&
  scope=[ADCM_READ,ADCM_WRITE]

Step 2: Exchange code for token:
POST https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/
{
  "app_id": "APP_ID",
  "secret": "SECRET",
  "auth_code": "CODE"
}

Step 3: Refresh token:
POST https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/
{
  "app_id": "APP_ID",
  "secret": "SECRET",
  "refresh_token": "REFRESH_TOKEN"
}
```

#### Key Scopes

| Scope | Permission |
|-------|-----------|
| `ADCM_READ` | Read campaign, ad group, ad data |
| `ADCM_WRITE` | Create/edit campaigns, ad groups, ads |
| `AUDIENCE_READ` | Read custom audiences |
| `AUDIENCE_WRITE` | Create/edit custom audiences |
| `REPORT_READ` | Read reporting data |

#### Key Endpoints (v1.3)

| Operation | Endpoint |
|-----------|----------|
| Get advertiser info | `GET /open_api/v1.3/oauth2/advertiser/get/` |
| Get campaign list | `GET /open_api/v1.3/campaign/get/` |
| Create campaign | `POST /open_api/v1.3/campaign/create/` |
| Update campaign | `POST /open_api/v1.3/campaign/update/` |
| Get ad group list | `GET /open_api/v1.3/adgroup/get/` |
| Get ad list | `GET /open_api/v1.3/ad/get/` |
| Get reporting data | `GET /open_api/v1.3/report/integrated/get/` |

#### Reporting API

```
GET /open_api/v1.3/report/integrated/get/
  ?advertiser_id=ADVERTISER_ID
  &report_type=BASIC
  &dimensions=["campaign_id"]
  &metrics=["spend","impressions","clicks","conversion","cost_per_conversion"]
  &start_date=2025-01-01
  &end_date=2025-01-31
```

#### Rate Limits

TikTok implements rate limits per app per advertiser:
- Default: **~1,000 requests/day** per app per advertiser (varies by tier)
- Can be increased upon request
- Implements 429 responses with retry-after headers

#### Data Retention

- Report data available for up to **2 years** (varies by report type)
- Real-time data has ~15-30 minute delay

### Recommendations

1. **Register for developer account early** — app review takes time
2. **Use v1.3** — the current stable version
3. **Implement request batching** — TikTok allows batching multiple operations
4. **Build data pipeline with caching** — rate limits are tight
5. **Request rate limit increase** after initial integration

### Estimated Implementation Effort
- **Developer registration + app setup:** 2 days
- **OAuth flow:** 2 days
- **Campaign CRUD:** 3 days
- **Reporting integration:** 3 days
- **Rate limit handling:** 2 days
- **Total:** ~12 days

---

## 5. Snapchat Marketing API Integration

### Research Findings

#### Getting Started

1. **Prerequisites:**
   - Snapchat Business account
   - Snapchat Ads Manager account
   - Organization setup in Business Manager
   - OAuth app registered in developer console

2. **Authentication:** OAuth 2.0 Bearer tokens

#### OAuth Flow

```
Step 1: Authorization:
https://accounts.snapchat.com/login/oauth2/authorize?
  client_id=CLIENT_ID&
  redirect_uri=REDIRECT_URI&
  scope=snapchat-marketing-api&
  response_type=code&
  state=RANDOM_STATE

Step 2: Exchange code:
POST https://accounts.snapchat.com/login/oauth2/access_token
  ?client_id=CLIENT_ID
  &client_secret=CLIENT_SECRET
  &code=AUTH_CODE
  &grant_type=authorization_code

Step 3: Use token:
Authorization: Bearer {access_token}
```

#### Key Endpoints

| Operation | Endpoint |
|-----------|----------|
| Get organizations | `GET /v1/organizations` |
| Get ad accounts | `GET /v1/organizations/{id}/adaccounts` |
| Get campaigns | `GET /v1/adaccounts/{id}/campaigns` |
| Create campaign | `POST /v1/adaccounts/{id}/campaigns` |
| Get ads | `GET /v1/adaccounts/{id}/ads` |
| Get reporting | `GET /v1/campaigns/{id}/stats` or async reporting |

#### Rate Limits

- Rate limiting enforced per ad account
- Returns `429 Too Many Requests` when exceeded
- Use async reporting endpoints for large data pulls
- Implement exponential backoff

#### Async Reporting

```
# Submit async report
POST /v1/reports
{
  "report_name": "Campaign Performance",
  "account_id": "ACCOUNT_ID",
  "type": "CAMPAIGN",
  "start_time": "2025-01-01T00:00:00Z",
  "end_time": "2025-01-31T23:59:59Z",
  "fields": ["impressions", "swipes", "spend", "installs"]
}

# Poll for completion
GET /v1/reports/{report_id}
# Returns download URL when complete
```

### Recommendations

1. **Snapchat has the simplest API** of the four platforms — implement last
2. **Use async reporting** for any date range > 7 days
3. **Store refresh tokens** — access tokens expire and need refreshing
4. **Lower priority than Meta/Google** — most advertisers focus on Meta + Google first

### Estimated Implementation Effort
- **OAuth flow:** 1 day
- **Campaign CRUD:** 2 days
- **Reporting:** 2 days
- **Total:** ~5 days

---

## 6. MCP Server Implementation

### Research Findings

#### What is MCP (Model Context Protocol)?

MCP is an **open standard protocol** introduced by Anthropic in November 2024 that standardizes how AI applications (like Claude, ChatGPT, Cursor) connect to external tools and data sources. Think of it as "USB-C for AI" — a universal connector.

**Three Core Primitives:**

| Primitive | What It Does | Controlled By |
|-----------|-------------|---------------|
| **Tools** | Functions the AI can call (read/write) | Model (AI decides when to use) |
| **Resources** | Read-only data the AI can reference | Application (you control context) |
| **Prompts** | Pre-crafted templates for common workflows | User |

#### The Protocol (JSON-RPC 2.0)

MCP uses **JSON-RPC 2.0** over several transport mechanisms:
- **stdio** — Local process communication (desktop apps)
- **SSE (Server-Sent Events)** — HTTP-based streaming
- **Streamable HTTP** — Modern HTTP transport (recommended for web)

**Example tool definition:**
```json
{
  "name": "meta_ads_get_campaigns",
  "description": "Get campaigns for a Meta Ads account",
  "inputSchema": {
    "type": "object",
    "properties": {
      "account_id": {
        "type": "string",
        "description": "Meta Ads account ID (format: act_XXXXXXXXX)"
      },
      "status": {
        "type": "string",
        "enum": ["ACTIVE", "PAUSED", "ARCHIVED"]
      }
    },
    "required": ["account_id"]
  }
}
```

#### How Pipeboard's MCP Server Works

**Architecture (from open-source code):**

```
Pipeboard MCP Server (Python/FastMCP)
├── meta_ads_mcp/
│   ├── core/
│   │   ├── server.py          # FastMCP server initialization, StreamableHTTP handler
│   │   ├── campaigns.py       # Campaign CRUD tools (get, create, update)
│   │   ├── adsets.py          # Ad set management tools
│   │   ├── ads.py             # Ad management + creative tools
│   │   ├── insights.py        # Reporting/insights tools
│   │   ├── accounts.py        # Account listing tools
│   │   ├── targeting.py       # Interest/audience search tools
│   │   ├── duplication.py     # Campaign/ad duplication tools
│   │   ├── budget_schedules.py # Budget scheduling tools
│   │   ├── auth.py            # Meta OAuth flow
│   │   ├── pipeboard_auth.py  # Pipeboard token authentication
│   │   ├── api.py             # HTTP client for Meta Graph API
│   │   ├── utils.py           # Helper functions
│   │   └── resources.py       # MCP resource handlers
│   ├── __init__.py
│   ├── __main__.py
│   └── ...
├── pyproject.toml             # Python 3.10+, mcp[cli], httpx, Pillow
├── Dockerfile                 # Container deployment
└── server.json                # MCP server manifest
```

**Key Dependencies (from pyproject.toml):**
```toml
dependencies = [
  "httpx>=0.26.0",           # HTTP client for Meta API calls
  "mcp[cli]==1.23.0",         # MCP Python SDK
  "python-dotenv>=1.1.0",     # Environment config
  "requests>=2.32.3",         # Legacy HTTP (some tools use this)
  "Pillow>=10.0.0",           # Image processing for creative previews
  "python-dateutil>=2.8.2",   # Date parsing
]
```

**Server Pattern:**
```python
from mcp.server.fastmcp import FastMCP

mcp_server = FastMCP("meta-ads")

@mcp_server.tool()
def get_campaigns(account_id: str, status: str = None) -> list:
    """Get campaigns for a Meta Ads account"""
    # ... API call to Meta
    return campaigns

@mcp_server.tool()
def create_campaign(account_id: str, name: str, objective: str) -> dict:
    """Create a new campaign"""
    # ... API call to Meta
    return new_campaign

# Run with Streamable HTTP
if __name__ == "__main__":
    mcp_server.run(transport="streamable-http")
```

**Available Tool Categories (30+ tools):**
1. **Account Management** — get_ad_accounts, get_account_info, get_account_pages
2. **Campaigns** — get_campaigns, get_campaign_details, create_campaign, update_campaign
3. **Ad Sets** — get_adsets, get_adset_details, create_adset, update_adset
4. **Ads** — get_ads, get_ad_details, create_ad, update_ad
5. **Creatives & Media** — upload_ad_image, create_ad_creative, get_ad_creatives
6. **Analytics** — get_insights, bulk_get_insights (with time ranges, breakdowns)
7. **Audience Targeting** — search_interests, estimate_audience_size, search_geo_locations
8. **Premium** — duplicate_campaign, duplicate_adset, duplicate_ad

#### MCP Transport Options

| Transport | Use Case | Pros | Cons |
|-----------|----------|------|------|
| **stdio** | Desktop apps, local CLI | Simple, no networking | Only local |
| **SSE** | Web-based with streaming | Real-time updates | Older standard |
| **Streamable HTTP** | Modern web deployment | Stateless, scalable, CORS | Requires HTTP server |

**For AdNexus AI: Streamable HTTP** is the right choice — it allows remote MCP access via URL, works with Claude Pro/Max integrations, and scales without persistent connections.

#### MCP Client Integration (Claude)

**Claude Desktop Config:**
```json
{
  "mcpServers": {
    "adnexus-meta-ads": {
      "url": "https://mcp.adnexus.ai/meta-ads"
    }
  }
}
```

**Claude Code:**
```bash
claude mcp add --transport http adnexus-meta-ads https://mcp.adnexus.ai/meta-ads
```

**Cursor Config** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "adnexus-meta-ads": {
      "url": "https://mcp.adnexus.ai/meta-ads"
    }
  }
}
```

#### Multi-Platform MCP Architecture

The recommended architecture serves each ad platform as a separate MCP server, all behind a unified gateway:

```
                    +-------------------------+
                    |    MCP Gateway/Router    |
                    |    (Authentication)      |
                    +------------+------------+
                                 |
           +--------------------+--------------------+
           |                    |                    |
    +------v------+     +------v------+     +------v------+
    | Meta Ads    |     | Google Ads  |     | TikTok Ads  |
    | MCP Server  |     | MCP Server  |     | MCP Server  |
    | (Python)    |     | (Python)    |     | (Python)    |
    +------+------+     +------+------+     +------+------+
           |                    |                    |
           +--------------------+--------------------+
                                 |
                    +------------v------------+
                    |  Ad Platform APIs       |
                    |  (Meta, Google, etc.)   |
                    +-------------------------+
```

### Recommendations

1. **Build MCP servers in Python** using the official `mcp` SDK (FastMCP)
2. **Use Streamable HTTP transport** for remote access
3. **Build one MCP server per ad platform** — simpler to maintain
4. **Mirror Pipeboard's architecture** — their open-source code is the reference implementation
5. **Deploy MCP servers separately** from the web app (they're long-running processes)
6. **Implement token-based auth** on MCP endpoints (like Pipeboard's `?token=` pattern)
7. **Each tool should accept `account_id`** as a parameter — supports multi-account users

### Estimated Implementation Effort
- **Meta Ads MCP server:** 7 days
- **Google Ads MCP server:** 5 days
- **TikTok Ads MCP server:** 4 days
- **Snap Ads MCP server:** 3 days
- **MCP gateway + auth:** 3 days
- **Total:** ~22 days

---

## 7. Database & Backend Architecture

### Research Findings

#### Recommended Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Database** | PostgreSQL 15+ | Best OR support, JSONB for flexible schemas, proven at scale |
| **Hosting** | Supabase (managed PostgreSQL) | Built-in auth, RLS, real-time subscriptions, generous free tier |
| **API Layer** | FastAPI (Python) or Next.js API Routes | FastAPI for MCP servers, Next.js for web API |
| **Background Jobs** | BullMQ + Redis | Industry standard, cron support, retries, dead letter queues |
| **Cache** | Redis | Rate limit counters, session cache, API response cache |
| **File Storage** | Supabase Storage | Creative assets, reports |

#### Multi-Tenancy Strategy

**Approach: Row-Level Security (RLS) with `workspace_id`**

Each table has a `workspace_id` column. PostgreSQL RLS policies ensure users only see data for their workspace:

```sql
-- Enable RLS on all tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their workspace's data
CREATE POLICY "workspace_isolation" ON campaigns
  FOR ALL
  USING (workspace_id = auth.uid()::text OR 
         workspace_id IN (
           SELECT workspace_id FROM workspace_members 
           WHERE user_id = auth.uid()
         ));
```

**Workspace/Organization Model:**
```sql
-- Workspaces (tenants)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(20) DEFAULT 'free', -- free, pro, premium, enterprise
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workspace members (many-to-many)
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member', -- owner, admin, member, viewer
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
```

#### Core Database Schema

```sql
-- Ad accounts (mirrored from platforms)
CREATE TABLE ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  platform VARCHAR(20) NOT NULL, -- 'meta', 'google', 'tiktok', 'snap'
  platform_account_id VARCHAR(100) NOT NULL,
  name VARCHAR(255),
  currency VARCHAR(3),
  timezone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  connection_id UUID REFERENCES platform_connections(id),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, platform, platform_account_id)
);

-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  ad_account_id UUID NOT NULL REFERENCES ad_accounts(id),
  platform VARCHAR(20) NOT NULL,
  platform_campaign_id VARCHAR(100) NOT NULL,
  name VARCHAR(500),
  status VARCHAR(20), -- ACTIVE, PAUSED, DELETED, ARCHIVED
  objective VARCHAR(50),
  budget_type VARCHAR(20), -- DAILY, LIFETIME
  budget_amount DECIMAL(12,2),
  bid_strategy VARCHAR(50),
  start_date DATE,
  end_date DATE,
  platform_data JSONB, -- raw platform-specific data
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, platform, platform_campaign_id)
);

-- Ad Sets / Ad Groups
CREATE TABLE ad_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  platform VARCHAR(20) NOT NULL,
  platform_adset_id VARCHAR(100) NOT NULL,
  name VARCHAR(500),
  status VARCHAR(20),
  targeting JSONB, -- audience targeting data
  budget_type VARCHAR(20),
  budget_amount DECIMAL(12,2),
  bid_amount DECIMAL(12,2),
  billing_event VARCHAR(50),
  optimization_goal VARCHAR(50),
  platform_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ads
CREATE TABLE ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  ad_set_id UUID NOT NULL REFERENCES ad_sets(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  platform VARCHAR(20) NOT NULL,
  platform_ad_id VARCHAR(100) NOT NULL,
  name VARCHAR(500),
  status VARCHAR(20),
  creative_type VARCHAR(50), -- IMAGE, VIDEO, CAROUSEL, etc.
  creative_assets JSONB, -- image URLs, video URLs, etc.
  copy_headline VARCHAR(500),
  copy_body TEXT,
  call_to_action VARCHAR(50),
  destination_url TEXT,
  platform_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insights (time-series reporting data)
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  platform VARCHAR(20) NOT NULL,
  entity_type VARCHAR(20) NOT NULL, -- campaign, adset, ad, account
  entity_id UUID NOT NULL, -- references campaigns, ad_sets, or ads
  date DATE NOT NULL,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(12,4) DEFAULT 0,
  ctr DECIMAL(8,4),
  cpm DECIMAL(12,4),
  cpc DECIMAL(12,4),
  conversions DECIMAL(12,4) DEFAULT 0,
  conversion_value DECIMAL(12,4) DEFAULT 0,
  reach BIGINT DEFAULT 0,
  frequency DECIMAL(8,4),
  video_views BIGINT DEFAULT 0,
  video_view_25p BIGINT DEFAULT 0,
  video_view_50p BIGINT DEFAULT 0,
  video_view_75p BIGINT DEFAULT 0,
  video_view_100p BIGINT DEFAULT 0,
  leads BIGINT DEFAULT 0,
  link_clicks BIGINT DEFAULT 0,
  actions JSONB, -- platform-specific action data
  breakdowns JSONB, -- age, gender, placement, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, platform, entity_type, entity_id, date, breakdowns)
);

-- Daily insights with breakdowns
CREATE INDEX idx_insights_entity_date ON insights(entity_id, date DESC);
CREATE INDEX idx_insights_workspace_platform ON insights(workspace_id, platform, date DESC);
CREATE INDEX idx_insights_date ON insights(date DESC);

-- Automation Rules
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  platform VARCHAR(20) NOT NULL,
  entity_type VARCHAR(20) NOT NULL, -- campaign, adset, ad
  entity_scope JSONB, -- which specific entities this applies to
  conditions JSONB NOT NULL, -- rule conditions (e.g., CPA > $50)
  actions JSONB NOT NULL, -- actions to take (e.g., PAUSE, NOTIFY)
  schedule VARCHAR(50) DEFAULT '*/15 * * * *', -- cron expression
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(20),
  last_run_result JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Draft Queue (pending changes)
CREATE TABLE draft_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  platform VARCHAR(20) NOT NULL,
  entity_type VARCHAR(20) NOT NULL, -- campaign, adset, ad, creative
  entity_id UUID, -- local entity ID (null for new entities)
  platform_entity_id VARCHAR(100), -- platform entity ID
  action VARCHAR(20) NOT NULL, -- CREATE, UPDATE, DELETE, PAUSE, ACTIVATE
  changes JSONB NOT NULL, -- proposed changes
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, applied, failed
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  applied_at TIMESTAMPTZ,
  platform_response JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Log (all platform changes)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID REFERENCES auth.users(id),
  platform VARCHAR(20) NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_log_workspace ON audit_log(workspace_id, created_at DESC);

-- Morning Briefs (AI-generated reports)
CREATE TABLE morning_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  brief_type VARCHAR(20) NOT NULL, -- daily, weekly
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'generating', -- generating, completed, failed
  summary TEXT,
  recommendations JSONB,
  anomalies JSONB,
  top_performers JSONB,
  spend_analysis JSONB,
  full_report TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(workspace_id, brief_type, date)
);
```

#### Background Job Processing

**Required Background Jobs:**

| Job | Schedule | Purpose |
|-----|----------|---------|
| **Insights Sync** | Every 15-30 min | Pull latest performance data from all platforms |
| **Campaign Structure Sync** | Every 2 hours | Sync campaign/adset/ad metadata |
| **Morning Brief Generation** | Daily at 6 AM | Generate AI briefs for each workspace |
| **Anomaly Detection** | Every hour | Detect performance anomalies |
| **Token Refresh** | Daily | Refresh platform OAuth tokens before expiry |
| **Automation Rules** | Every 15 min | Evaluate and execute automation rules |
| **Report Generation** | On-demand / scheduled | Generate PDF/CSV reports |
| **Budget Alerts** | Every hour | Check budget pacing and send alerts |

**BullMQ Implementation:**
```typescript
// Queue setup with BullMQ
const insightsQueue = new Queue('insights-sync', { connection: redis });
const briefQueue = new Queue('morning-brief', { connection: redis });
const automationQueue = new Queue('automation', { connection: redis });

// Cron job registration
await insightsQueue.add('sync-all-platforms', {}, {
  repeat: { pattern: '*/30 * * * *' } // Every 30 minutes
});

await briefQueue.add('generate-briefs', {}, {
  repeat: { pattern: '0 6 * * *', tz: 'America/New_York' } // 6 AM daily
});

await automationQueue.add('evaluate-rules', {}, {
  repeat: { pattern: '*/15 * * * *' } // Every 15 minutes
});

// Worker processes
const insightsWorker = new Worker('insights-sync', async (job) => {
  // Sync insights for all connected accounts
  const accounts = await getConnectedAccounts();
  for (const account of accounts) {
    await syncInsightsForAccount(account);
  }
}, { connection: redis, concurrency: 5 });
```

### Recommendations

1. **Use Supabase PostgreSQL** — built-in RLS, auth integration, generous free tier
2. **Mirror campaign structure locally** — don't rely solely on platform APIs for reads
3. **Store raw platform responses in `platform_data` JSONB** — flexible, forward-compatible
4. **Partition the `insights` table** by date for performance at scale
5. **Use BullMQ + Redis** for all background processing
6. **Implement proper indexing** — most queries filter by workspace + date
7. **Store OAuth tokens encrypted** — never in plain text

### Estimated Implementation Effort
- **Database schema + migrations:** 4 days
- **Multi-tenancy (RLS):** 2 days
- **Campaign CRUD API:** 4 days
- **Insights sync pipeline:** 4 days
- **Background jobs (BullMQ):** 3 days
- **Morning Brief generation:** 3 days
- **Automation rules engine:** 4 days
- **Audit logging:** 2 days
- **Total:** ~26 days

---

## 8. Pricing & Billing Infrastructure

### Research Findings

#### Payment Provider Comparison

| Provider | Fee | Merchant of Record | Best For |
|----------|-----|-------------------|----------|
| **Stripe** | 2.9% + $0.30 | No (you handle tax) | Complex billing, usage-based, scale |
| **Paddle** | 5% + $0.50 | Yes | Global sales, tax compliance |
| **Lemon Squeezy** | 5% + $0.50 | Yes | Indie hackers, quick setup |
| **Polar** | 4% + $0.40 | Yes | Developer-focused, MoR |

**For AdNexus AI: Stripe** is the clear choice — the credit-based usage model requires metered billing which Stripe handles best.

#### Credit-Based Billing Architecture

AdNexus AI's pricing model uses **AI credits** (e.g., AI Campaign Builder, AI Daily Brief, AI Analytics & Insights). Implementing this with Stripe:

```
Pricing Tiers:
├── Free: 30 AI executions/week, 2 ad accounts
├── Pro ($29.90/mo): 500 AI executions/week, 10 ad accounts
├── Premium ($99/mo): Unlimited AI executions, 50 ad accounts
└── Enterprise ($199/mo): Unlimited, up to 50 accounts + team features

Credit Model:
├── Each AI tool execution = N credits
├── Credits reset weekly (aligned with plan)
├── Overage: $X per additional 100 credits
└── Roll-over: Unused credits expire (weekly reset)
```

#### Implementation Pattern

**Database Schema for Credits:**
```sql
-- Subscription plans
CREATE TABLE plans (
  id VARCHAR(20) PRIMARY KEY, -- free, pro, premium, enterprise
  name VARCHAR(50),
  description TEXT,
  stripe_price_id VARCHAR(100),
  monthly_credits INTEGER,
  max_ad_accounts INTEGER,
  max_team_members INTEGER,
  features JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  plan_id VARCHAR(20) NOT NULL REFERENCES plans(id),
  stripe_subscription_id VARCHAR(100),
  stripe_customer_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active', -- active, canceled, past_due, trialing
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Credit usage tracking
CREATE TABLE credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID REFERENCES auth.users(id),
  feature VARCHAR(50) NOT NULL, -- 'campaign_builder', 'daily_brief', etc.
  credits_used INTEGER NOT NULL,
  metadata JSONB, -- which platform, account, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Credit balances (current period)
CREATE TABLE credit_balances (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id),
  plan_credits INTEGER NOT NULL, -- credits included in plan
  used_credits INTEGER DEFAULT 0,
  purchased_credits INTEGER DEFAULT 0, -- add-on credits
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Stripe Integration:**
```typescript
// Stripe subscription with usage tracking
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [
    { price: 'price_pro_plan' }, // $29.90/month base
  ],
  payment_behavior: 'default_incomplete',
  expand: ['latest_invoice.payment_intent']
});

// Credit consumption tracking (your own logic)
async function consumeCredits(workspaceId: string, feature: string, credits: number) {
  const balance = await getCreditBalance(workspaceId);
  
  if (balance.remaining < credits) {
    throw new InsufficientCreditsError();
  }
  
  await db.creditUsage.create({
    workspace_id: workspaceId,
    feature,
    credits_used: credits
  });
  
  await db.creditBalances.update({
    where: { workspace_id: workspaceId },
    data: { used_credits: { increment: credits } }
  });
}

// Weekly reset via cron job
await briefQueue.add('reset-credits', {}, {
  repeat: { pattern: '0 0 * * 0' } // Every Sunday midnight
});
```

**Stripe Webhook Handling:**
```typescript
// Critical webhook events
const handleWebhook = async (event: Stripe.Event) => {
  switch (event.type) {
    case 'invoice.payment_succeeded':
      // Renew subscription, reset credits
      break;
    case 'invoice.payment_failed':
      // Grace period, notify user
      break;
    case 'customer.subscription.updated':
      // Handle plan changes
      break;
    case 'customer.subscription.deleted':
      // Downgrade to free plan
      break;
  }
};
```

#### Usage Limits Enforcement

```typescript
// Middleware to enforce limits
const enforceLimits = async (req: Request, res: Response, next: NextFunction) => {
  const workspace = req.workspace;
  const plan = await getPlan(workspace.id);
  
  // Check ad account limit
  const accountCount = await getAdAccountCount(workspace.id);
  if (accountCount >= plan.max_ad_accounts) {
    return res.status(403).json({ 
      error: 'Account limit reached. Upgrade your plan.' 
    });
  }
  
  // Check credit balance
  const credits = await getCreditBalance(workspace.id);
  if (credits.remaining <= 0) {
    return res.status(403).json({ 
      error: 'Credit limit reached. Upgrade or purchase more credits.' 
    });
  }
  
  next();
};
```

### Recommendations

1. **Use Stripe Billing** — best for metered/hybrid pricing models
2. **Track credits in your own DB** (not Stripe) — simpler, faster reads
3. **Use Stripe webhooks** for subscription lifecycle events
4. **Implement a credits meter** in the UI — real-time visibility
5. **Set soft limits at 80%** — warn users before they hit limits
6. **Allow credit top-ups** — one-time purchases for additional credits
7. **Stripe Tax add-on** for automatic tax calculation

### Estimated Implementation Effort
- **Stripe integration:** 3 days
- **Subscription management:** 3 days
- **Credit tracking system:** 2 days
- **Usage limits enforcement:** 2 days
- **Billing portal (customer management):** 2 days
- **Webhook handling:** 2 days
- **Total:** ~14 days

---

## 9. Deployment & Infrastructure

### Research Findings

#### Hosting Options Comparison

| Platform | Best For | Cost (small SaaS) | Strengths | Weaknesses |
|----------|----------|-------------------|-----------|------------|
| **Railway** | Full-stack SaaS, containers | $15-45/mo | Native DB, no cold starts, Docker | No edge functions |
| **Vercel** | Next.js frontend, serverless | $20-60/mo | Zero-config, edge, preview deploys | No containers, timeouts |
| **AWS** | Enterprise, complex needs | $50-200/mo | Full control, any architecture | Complex, expensive |
| **Render** | Simple full-stack | $25-50/mo | Easy Docker, native DB | Slower than Railway |
| **Fly.io** | Global edge apps | $20-50/mo | Edge deployment, Docker | Learning curve |

#### Recommended Architecture

**Hybrid: Railway (backend + MCP) + Vercel (frontend)**

```
                        +------------------+
                        |     Users        |
                        +--------+---------+
                                 |
                    +------------v------------+
                    |    Cloudflare CDN       |
                    |    (DNS + SSL + DDoS)   |
                    +------+----------+-------+
                           |          |
              +------------v--+  +----v------------+
              |  Vercel       |  |  Railway        |
              |  (Frontend)   |  |  (Backend)      |
              |  Next.js SPA  |  |                 |
              +---------------+  |  +-------------+|
                                 |  | API Server  ||
                                 |  | (Node.js)   ||
                                 |  +-------------+|
                                 |  +-------------+|
                                 |  | MCP Servers ||
                                 |  | (Python)    ||
                                 |  +-------------+|
                                 |  +-------------+|
                                 |  | BullMQ      ||
                                 |  | Workers     ||
                                 |  +-------------+|
                                 +--------+--------+
                                          |
                                 +--------v--------+
                                 |  Supabase       |
                                 |  (PostgreSQL)   |
                                 +-----------------+
                                          |
                                 +--------v--------+
                                 |  Upstash Redis  |
                                 |  (BullMQ +      |
                                 |   Cache)        |
                                 +-----------------+
```

#### Service Breakdown

| Service | Platform | Specs | Purpose |
|---------|----------|-------|---------|
| **Web Frontend** | Vercel | Hobby/Pro ($20/mo) | Next.js React SPA |
| **API Server** | Railway | 1 vCPU, 1GB RAM | REST API, auth, business logic |
| **Meta MCP** | Railway | 1 vCPU, 1GB RAM | Meta Ads MCP server |
| **Google MCP** | Railway | 1 vCPU, 1GB RAM | Google Ads MCP server |
| **TikTok MCP** | Railway | 1 vCPU, 1GB RAM | TikTok Ads MCP server |
| **Snap MCP** | Railway | 0.5 vCPU, 512MB | Snap Ads MCP server |
| **Workers** | Railway | 1 vCPU, 1GB RAM | BullMQ background workers |
| **PostgreSQL** | Supabase | Free tier (500MB) | Primary database |
| **Redis** | Upstash | Free tier | BullMQ + caching |

**Estimated Total Cost at Launch:** $40-80/month

#### MCP Server Deployment

MCP servers are **long-running processes** that expose HTTP endpoints. Deploy as:

1. **Docker containers** on Railway (recommended)
2. Each MCP server has its own service for independent scaling
3. Environment variables for API keys, secrets
4. Health check endpoints for monitoring

**Example Dockerfile for MCP Server:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "-m", "meta_ads_mcp"]
```

#### Minimum Viable Infrastructure

For the **absolute minimum** to launch:

```
Vercel (Frontend) — $0-20/mo
  └── Next.js app

Railway (All backend):
  ├── API Server — ~$10/mo
  ├── Meta MCP Server — ~$10/mo
  └── Workers — ~$5/mo

Supabase (Database) — $0 (free tier)

Upstash Redis — $0 (free tier)

Total: ~$25-45/month
```

### Recommendations

1. **Start with Railway** — easiest full-stack container deployment
2. **Use Vercel for frontend** — best Next.js experience
3. **Deploy MCP servers as separate services** — independent scaling
4. **Use Docker** for all backend services — portability
5. **Start small, scale up** — begin with free tiers
6. **Set up monitoring** (Railway has built-in, or use Datadog)
7. **Use Cloudflare** for DNS + SSL + DDoS protection (free tier)

### Estimated Implementation Effort
- **Vercel + Railway setup:** 1 day
- **Docker containers:** 2 days
- **CI/CD pipeline:** 2 days
- **Environment configuration:** 1 day
- **Monitoring + logging:** 2 days
- **Total:** ~8 days

---

## Prioritized Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3) — ~20 days

Priority: Everything else depends on this

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-3 | Set up Supabase project, database schema, RLS policies | Working database with multi-tenancy |
| 3-5 | Implement Supabase Auth, workspace model, invitations | Login/signup, workspace creation |
| 5-7 | Build React SPA shell, protected routes, auth context | App shell with route guards |
| 7-10 | Set up Railway, deploy API server, CI/CD | Backend deployed with auto-deploy |
| 10-14 | Meta Marketing API integration (OAuth, campaign read) | Connect Meta accounts, view campaigns |
| 14-17 | Insights sync pipeline (hourly job) | Performance data flowing into DB |
| 17-20 | Basic dashboard (campaigns table, metrics) | Working dashboard with real data |

### Phase 2: Core Features (Weeks 4-6) — ~20 days

| Day | Task | Deliverable |
|-----|------|-------------|
| 20-24 | Meta Ads MCP server (read tools) | MCP server for campaign/insights read |
| 24-27 | Google Ads API integration | Google Ads connected, campaigns visible |
| 27-30 | Morning Brief generation (AI-powered) | Daily AI briefs via email/in-app |
| 30-34 | Campaign CRUD (create, edit, pause campaigns) | Full campaign management for Meta |
| 34-37 | Automation rules engine (basic rules) | Users can set CPA/ROAS alert rules |
| 37-40 | Billing integration (Stripe) | Subscription plans, credit tracking |

### Phase 3: Scale (Weeks 7-9) — ~20 days

| Day | Task | Deliverable |
|-----|------|-------------|
| 40-44 | TikTok Ads API integration | TikTok campaigns in dashboard |
| 44-47 | Snap Ads API integration | Snapchat campaigns in dashboard |
| 47-50 | Advanced MCP tools (write operations) | AI can create/edit campaigns |
| 50-54 | Team collaboration (members, roles, approvals) | Multi-user with approval workflows |
| 54-57 | Advanced reporting (custom reports, scheduling) | PDF/CSV report generation |
| 57-60 | Polish, performance optimization, launch prep | Production-ready product |

### Phase 4: Post-Launch (Month 4+)

- Advanced analytics (cohort analysis, attribution)
- Creative management (upload, A/B testing)
- Audience management (custom audiences, lookalikes)
- API for external integrations
- White-label / agency features

---

## Minimum Viable Backend (Cut to Bare Essentials)

To launch a **sellable product** in the shortest time possible, implement ONLY:

### MUST HAVE (MVP)

| # | Feature | Why |
|---|---------|-----|
| 1 | **Supabase Auth** + workspaces | Users need to log in and belong to teams |
| 2 | **Meta Ads API** integration (read-only) | 80% of advertisers use Meta — this is the core |
| 3 | **Campaign dashboard** | Table of campaigns with spend, impressions, clicks |
| 4 | **Meta Ads MCP server** (read tools) | The AI differentiation — connect to Claude/Cursor |
| 5 | **Daily AI Brief** (morning email) | High-value feature that competitors charge for |
| 6 | **Stripe billing** (2-3 plans) | You can't charge without this |
| 7 | **Basic automation rules** (alerts only) | PAUSE when CPA > X, NOTIFY when spend > Y |

### NICE TO HAVE (Post-MVP)

| # | Feature | Why Wait? |
|---|---------|-----------|
| 8 | Google Ads API | Adds complexity, Meta alone is enough for launch |
| 9 | TikTok + Snap APIs | Lower priority — smaller advertiser base |
| 10 | Campaign creation via API | Read-only is safer, less risk of ad spend errors |
| 11 | Advanced MCP write tools | Start with read, add write after validation |
| 12 | Team roles & approvals | Single-user is fine for initial launch |
| 13 | Advanced reporting | Basic charts are sufficient for MVP |
| 14 | Creative management | Complex feature, not core to value prop |

### Cut Scope to Launch in ~45 Days

**Weeks 1-2:** Auth + Database + Meta API read access
**Weeks 3-4:** Dashboard + MCP server (read tools) + Daily Brief
**Weeks 5-6:** Stripe billing + polish + landing page
**Week 7-9:** Google Ads + advanced features

---

## Key Technical Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Auth** | Supabase Auth | 50K free MAUs, native RLS, OAuth built-in |
| **Database** | Supabase PostgreSQL | Managed, RLS, real-time, generous free tier |
| **Backend** | Node.js (Next.js API Routes) | Full-stack JS, fast development |
| **MCP Servers** | Python (FastMCP SDK) | Official SDK, Pipeboard's proven pattern |
| **Background Jobs** | BullMQ + Redis (Upstash) | Industry standard, cron support |
| **Frontend** | Next.js + React + Tailwind | Vercel-native, fast DX |
| **Billing** | Stripe Billing | Best for metered/credit billing |
| **Hosting** | Railway (backend) + Vercel (frontend) | Best DX for full-stack |
| **API Style** | REST (not GraphQL) | Simpler, easier caching |
| **First Platform** | Meta Ads only | 80% of advertisers, highest API maturity |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Meta/Google API app review delays | High | Apply immediately, use test accounts during dev |
| Rate limiting on ad platform APIs | Medium | Implement caching, async jobs, backoff |
| OAuth token expiry | Medium | Build automated token refresh service |
| Data sync latency | Low | Show "last synced" timestamps, async updates |
| Ad platform API changes | Medium | Abstract platform differences, monitor changelogs |
| MCP spec changes | Low | Pin to stable version, Pipeboard follows spec |
| Multi-tenancy data leaks | High | Extensive RLS testing, audit logs, automated tests |

---

## References

### Authentication
- Clerk vs Auth0 vs Supabase comparison: https://designrevision.com/blog/auth-providers-compared
- Supabase Auth documentation: https://supabase.com/docs/guides/auth

### Meta Marketing API
- Meta Marketing API documentation: https://developers.facebook.com/docs/marketing-apis
- Rate limits guide: https://developers.facebook.com/docs/graph-api/overview/rate-limiting
- Insights API best practices: https://www.get-ryze.ai/blog/meta-ads-api-insights-endpoint

### Google Ads API
- Google Ads API documentation: https://developers.google.com/google-ads/api/docs/start
- REST API reference: https://developers.google.com/google-ads/api/rest/overview
- Explorer Access announcement: https://ppc.land/google-faces-developer-token-application-backlog

### MCP Protocol
- MCP Python SDK: https://github.com/modelcontextprotocol/python-sdk
- Pipeboard Meta Ads MCP (open source): https://github.com/pipeboard-co/meta-ads-mcp
- MCP ecosystem guide: https://www.digitalapplied.com/blog/mcp-ecosystem-complete-guide-2025
- Anthropic MCP course: https://anthropic.skilljar.com/introduction-to-model-context-protocol

### Billing
- Stripe SaaS billing guide: https://viprasol.com/blog/saas-usage-based-billing/
- Credit-based billing implementation: https://colorwhistle.com/stripe-saas-credits-billing/
- Paddle vs Stripe comparison: https://getathenic.com/blog/stripe-vs-paddle-vs-lemon-squeezy-saas-billing

### Deployment
- Railway vs Vercel comparison: https://docs.railway.com/platform/compare-to-vercel
- Vercel alternatives: https://encore.dev/articles/vercel-alternatives
- BullMQ documentation: https://bullmq.io/

### Ad Tech Architecture
- Optmyzr architecture: https://www.optmyzr.com/ai-info-page/
- AdTech ecosystem overview: https://geomotiv.com/blog/what-is-adtech-and-how-does-it-work/

---

*This report was compiled from extensive research including API documentation, open-source code analysis, competitive product analysis, and SaaS architecture best practices. Implementation estimates assume a team of 2-3 developers working full-time.*
