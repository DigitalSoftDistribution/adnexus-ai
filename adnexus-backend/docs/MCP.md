# AdNexus AI — MCP Server Guide

Complete guide to the Model Context Protocol (MCP) server that powers AI-driven campaign management through natural language.

---

## Table of Contents

1. [What is MCP?](#what-is-mcp)
2. [Why We Use MCP](#why-we-use-mcp)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Tool Reference](#tool-reference)
6. [Using with Claude](#using-with-claude)
7. [Security Considerations](#security-considerations)

---

## What is MCP?

The **Model Context Protocol (MCP)** is an open protocol that enables AI models to securely interact with external tools, data sources, and services. MCP was created by Anthropic to solve a fundamental problem: LLMs are powerful reasoning engines but they need secure, structured access to real-world systems to be truly useful.

Think of MCP as a "USB-C for AI applications" — a standardized way for AI assistants to connect to the tools and data they need to accomplish tasks.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Server** | A program that exposes tools, resources, and prompts to AI models |
| **Tool** | A function the AI can call to perform an action (e.g., "pause campaign") |
| **Resource** | A data source the AI can read (e.g., "campaign performance data") |
| **Prompt** | A pre-defined template for common interactions |
| **Transport** | How the AI connects to the server: `stdio` (local) or `SSE` (remote) |

### MCP vs. Traditional APIs

| | Traditional API | MCP |
|---|---|---|
| **Integration** | HTTP requests in code | Direct tool calling |
| **Discovery** | Manual endpoint documentation | Automatic tool enumeration |
| **Type Safety** | Runtime validation | Schema-validated parameters |
| **Context** | Stateless per-request | Stateful conversation |
| **Usage** | Developers write code | AI uses natural language |

---

## Why We Use MCP

AdNexus AI uses MCP to enable natural language campaign management. Instead of clicking through dashboards, users can simply **talk to their ads**.

### Example Interactions

```
User: "Pause my underperforming Meta campaigns"
Claude: I'll check your Meta campaigns and pause any that are underperforming.
       [Calls get_campaigns, analyzes performance, calls create_draft for each]
       I've found 2 campaigns with ROAS below 1.5x. I've created drafts to
       pause "Display - Remarketing" (ROAS: 1.8x) and reduce budget for
       "Brand Awareness" (ROAS: 1.2x). Review and approve in your dashboard.

User: "What's my CPA looking like this week?"
Claude: Let me pull your performance data.
       [Calls get_campaigns, calculates CPA trends]
       Your blended CPA is $32.45 this week, down 12% from last week ($36.89).
       Best performer: "Retargeting - Cart Abandoners" at $14.00 CPA.
       Needs attention: "Display - Remarketing" at $58.18 CPA.

User: "Create a new TikTok campaign targeting Gen Z interested in fitness"
Claude: I'll draft a new TikTok campaign for you.
       [Calls create_campaign_draft with targeting parameters]
       I've created a draft campaign "TikTok Fitness Gen Z" targeting
       ages 18-30, fitness interests, with a $200/day budget.
       Objective: CONVERSIONS. Review and approve to go live.
```

### Benefits

1. **Speed** — What takes 15 clicks takes one sentence
2. **Accessibility** — Non-technical team members can manage campaigns
3. **Consistency** — AI follows best practices every time
4. **Safety** — All changes still go through the draft-first workflow
5. **Context** — AI remembers your goals, past decisions, and preferences

---

## Installation

### Prerequisites

- Python 3.11 or higher
- `pip` or `uv` package manager
- A running AdNexus API server
- Claude Desktop or Cursor IDE

### Step 1: Set Up Python Environment

```bash
cd mcp-server

# Create virtual environment
python -m venv .venv

# Activate (macOS/Linux)
source .venv/bin/activate

# Activate (Windows)
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Install Claude Desktop

**macOS:**
```bash
brew install --cask claude
```

**Windows:**
Download from [claude.ai/download](https://claude.ai/download)

**Linux:**
Download the AppImage from [claude.ai/download](https://claude.ai/download)

### Step 3: Verify MCP Server

```bash
python server.py --help
```

Expected output:
```
usage: server.py [-h] [--transport {stdio,sse}] [--port PORT]

AdNexus AI MCP Server

options:
  -h, --help            show this help message and exit
  --transport {stdio,sse}
                        Transport type (default: stdio)
  --port PORT           Port for SSE transport (default: 8080)
```

---

## Configuration

### Environment Variables

Create a `.env` file in the `mcp-server/` directory:

```bash
# .env
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs...your_service_key
MCP_API_KEY=your_mcp_api_key_for_authentication
MCP_TRANSPORT=stdio
```

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase service role key |
| `MCP_API_KEY` | Yes | Secret key for MCP authentication |
| `MCP_TRANSPORT` | No | `stdio` (default) or `sse` |

### Claude Desktop Configuration

Edit Claude's configuration file:

**macOS:**
```bash
# Edit with your preferred editor
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

Add the AdNexus MCP server:

```json
{
  "mcpServers": {
    "adnexus": {
      "command": "/path/to/adnexus-ai/mcp-server/.venv/bin/python",
      "args": ["/path/to/adnexus-ai/mcp-server/server.py"],
      "env": {
        "SUPABASE_URL": "https://yourproject.supabase.co",
        "SUPABASE_KEY": "eyJhbGciOiJIUzI1NiIs...",
        "MCP_API_KEY": "your_mcp_api_key"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### Cursor IDE Configuration

**Method 1: Via Settings UI**
1. Open Cursor → Settings → MCP
2. Click "Add MCP Server"
3. Name: `adnexus`
4. Command: `/path/to/adnexus-ai/mcp-server/.venv/bin/python /path/to/adnexus-ai/mcp-server/server.py`
5. Save

**Method 2: Via Settings JSON**
```bash
# Open Cursor settings JSON
# macOS: ~/Library/Application Support/Cursor/User/settings.json
# Add:
```

```json
{
  "cursor.mcpServers": [
    {
      "name": "adnexus",
      "command": "/path/to/adnexus-ai/mcp-server/.venv/bin/python",
      "args": ["/path/to/adnexus-ai/mcp-server/server.py"],
      "env": {
        "SUPABASE_URL": "https://yourproject.supabase.co",
        "SUPABASE_KEY": "eyJhbGciOiJIUzI1NiIs...",
        "MCP_API_KEY": "your_mcp_api_key"
      }
    }
  ]
}
```

### Verify Configuration

1. Restart Claude Desktop or Cursor
2. Open a new conversation
3. Look for the hammer icon (tools) in the input area
4. Click to see available AdNexus tools
5. Test: "What campaigns do I have running?"

---

## Tool Reference

The AdNexus MCP server exposes 30 tools organized into 7 categories:

### 1. Campaign Tools

#### `get_campaigns`

Retrieve campaigns with optional filtering.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |
| `platform` | string | No | Filter by platform: `meta`, `google`, `tiktok`, `snap` |
| `status` | string | No | Filter by status: `active`, `paused`, `draft`, `error`, `ended` |
| `limit` | number | No | Max results (default: 50, max: 100) |

**Example:**
```json
{
  "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "platform": "meta",
  "status": "active",
  "limit": 10
}
```

**Returns:** Array of campaign objects with performance metrics.

---

#### `get_campaign`

Get a single campaign by ID.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_id` | string | Yes | Campaign UUID |

**Example:**
```json
{
  "campaign_id": "c9d0e1f2-a3b4-5678-cdef-901234567890"
}
```

---

#### `get_campaign_insights`

Get detailed performance insights for a campaign.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_id` | string | Yes | Campaign UUID |
| `date_start` | string | No | Start date (YYYY-MM-DD, default: 30 days ago) |
| `date_end` | string | No | End date (YYYY-MM-DD, default: today) |

**Example:**
```json
{
  "campaign_id": "c9d0e1f2-a3b4-5678-cdef-901234567890",
  "date_start": "2024-06-01",
  "date_end": "2024-07-01"
}
```

---

#### `create_campaign_draft`

Create a draft for a new campaign (goes through approval workflow).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |
| `ad_account_id` | string | Yes | Ad account UUID |
| `name` | string | Yes | Campaign name (1-500 chars) |
| `objective` | string | Yes | Campaign objective (e.g., `CONVERSIONS`) |
| `daily_budget` | number | No | Daily budget in dollars |
| `platform` | string | Yes | Target platform |

**Example:**
```json
{
  "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "ad_account_id": "f6a7b8c9-d0e1-2345-fabc-678901234567",
  "name": "Holiday Sale 2024",
  "objective": "CONVERSIONS",
  "daily_budget": 500,
  "platform": "meta"
}
```

---

#### `update_campaign_draft`

Create a draft to update an existing campaign.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_id` | string | Yes | Campaign UUID to update |
| `name` | string | No | New campaign name |
| `daily_budget` | number | No | New daily budget |
| `status` | string | No | New status: `active`, `paused` |
| `reason` | string | Yes | Reason for the change |

**Example:**
```json
{
  "campaign_id": "c9d0e1f2-a3b4-5678-cdef-901234567890",
  "daily_budget": 650,
  "reason": "ROAS above target, scaling budget"
}
```

---

#### `pause_campaign_draft`

Create a draft to pause a campaign.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaign_id` | string | Yes | Campaign UUID |
| `reason` | string | Yes | Reason for pausing |

**Example:**
```json
{
  "campaign_id": "a3b4c5d6-e7f8-9012-abcd-345678901234",
  "reason": "CPA above $50 threshold for 5 consecutive days"
}
```

---

#### `get_campaign_summary`

Get workspace-level campaign summary statistics.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |

**Returns:** Total campaigns, counts by status, connected platforms.

---

### 2. Draft Tools

#### `list_drafts`

List all drafts for a workspace.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |
| `status` | string | No | Filter by status |
| `limit` | number | No | Max results |

---

#### `get_draft`

Get a single draft by ID.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `draft_id` | string | Yes | Draft UUID |

---

#### `approve_draft`

Approve and apply a pending draft.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `draft_id` | string | Yes | Draft UUID |
| `approver_id` | string | Yes | User UUID of approver |

**Example:**
```json
{
  "draft_id": "draft-001-cccc-3333-000000000001",
  "approver_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

#### `reject_draft`

Reject a pending draft.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `draft_id` | string | Yes | Draft UUID |
| `approver_id` | string | Yes | User UUID |
| `reason` | string | No | Reason for rejection |

---

#### `schedule_draft`

Schedule a draft for future execution.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `draft_id` | string | Yes | Draft UUID |
| `execute_at` | string | Yes | ISO 8601 datetime |

---

#### `get_draft_stats`

Get draft statistics for a workspace.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |

**Returns:** Pending count, approved today, rejected today, auto-applied today.

---

### 3. Agent & Rule Tools

#### `list_automation_rules`

List all automation rules for a workspace.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |

---

#### `create_automation_rule`

Create a new automation rule.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |
| `name` | string | Yes | Rule name |
| `description` | string | No | Rule description |
| `conditions` | array | Yes | Array of condition objects |
| `actions` | array | Yes | Array of action objects |
| `platforms` | array | No | Target platforms (default: all) |

**Example:**
```json
{
  "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "name": "Pause Low ROAS Campaigns",
  "description": "Auto-pause campaigns with ROAS below 1.5x",
  "conditions": [
    { "metric": "roas", "operator": "lt", "value": 1.5 },
    { "metric": "spend", "operator": "gt", "value": 1000 }
  ],
  "actions": [
    { "type": "pause_campaign", "params": { "create_draft": true } },
    { "type": "notify", "params": { "channel": "email" } }
  ],
  "platforms": ["meta", "google", "tiktok"]
}
```

---

#### `toggle_rule`

Enable or disable an automation rule.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rule_id` | string | Yes | Rule UUID |
| `status` | string | Yes | `active` or `paused` |

---

#### `run_agent_check`

Manually trigger AI agent rule evaluation.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |

**Returns:** Number of rules evaluated, triggered, and drafts created.

---

#### `get_agent_status`

Get AI agent status and next scheduled check.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |

---

### 4. Report Tools

#### `get_cross_platform_report`

Generate a cross-platform performance report.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |
| `date_start` | string | No | Start date (YYYY-MM-DD) |
| `date_end` | string | No | End date (YYYY-MM-DD) |

**Returns:** Aggregated metrics per platform with ROAS, CPA, CTR.

---

#### `get_funnel_report`

Get conversion funnel data.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |

---

#### `get_morning_brief`

Generate the AI morning brief (executive summary, alerts, recommendations).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |

**Returns:** Executive summary, platform performance, drafted actions, alerts, creative insights, recommendations, forecast.

---

### 5. Goal Tools

#### `list_goals`

List all performance goals.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |

---

#### `create_goal`

Create a new performance goal.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |
| `name` | string | Yes | Goal name |
| `goal_type` | string | Yes | `roas`, `cpa`, `ctr`, `spend`, `conversions`, `custom` |
| `target_value` | number | Yes | Target value |
| `platform` | string | No | Target platform |
| `start_date` | string | Yes | Start date (YYYY-MM-DD) |
| `end_date` | string | Yes | End date (YYYY-MM-DD) |

**Example:**
```json
{
  "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "name": "Q3 Meta ROAS",
  "goal_type": "roas",
  "target_value": 4.0,
  "platform": "meta",
  "start_date": "2024-07-01",
  "end_date": "2024-09-30"
}
```

---

#### `get_goal_progress`

Get progress toward a specific goal.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `goal_id` | string | Yes | Goal UUID |

---

### 6. Credit & Billing Tools

#### `get_credit_balance`

Get current AI credit balance.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |
| `month` | string | No | Month in YYYY-MM format |

---

#### `get_credit_usage`

Get detailed credit usage log.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |
| `month` | string | No | Month filter |
| `limit` | number | No | Max entries |

---

#### `use_credits`

Deduct credits for a feature (returns error if insufficient).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |
| `feature` | string | Yes | Feature name |
| `action` | string | Yes | Description of action |
| `platform` | string | No | Related platform |

---

### 7. Ad Creative Tools

#### `analyze_creative_fatigue`

Analyze ad creative fatigue scores and recommend refreshes.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | Yes | Workspace UUID |
| `campaign_id` | string | No | Filter by campaign |
| `threshold` | number | No | Fatigue score threshold (default: 30) |

**Returns:** Ads with fatigue scores, status (healthy/warning/critical/exhausted), recommendations.

---

#### `get_creative_insights`

Get performance insights for specific ad creatives.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ad_ids` | array | Yes | Array of ad UUIDs |
| `date_start` | string | No | Start date |
| `date_end` | string | No | End date |

---

### Tool Summary Table

| # | Tool | Category | Description |
|---|------|----------|-------------|
| 1 | `get_campaigns` | Campaign | List campaigns with filters |
| 2 | `get_campaign` | Campaign | Get single campaign |
| 3 | `get_campaign_insights` | Campaign | Get campaign performance data |
| 4 | `create_campaign_draft` | Campaign | Draft a new campaign |
| 5 | `update_campaign_draft` | Campaign | Draft a campaign update |
| 6 | `pause_campaign_draft` | Campaign | Draft a campaign pause |
| 7 | `get_campaign_summary` | Campaign | Get workspace campaign stats |
| 8 | `list_drafts` | Draft | List all drafts |
| 9 | `get_draft` | Draft | Get single draft |
| 10 | `approve_draft` | Draft | Approve and apply a draft |
| 11 | `reject_draft` | Draft | Reject a draft |
| 12 | `schedule_draft` | Draft | Schedule a draft |
| 13 | `get_draft_stats` | Draft | Get draft statistics |
| 14 | `list_automation_rules` | Agent | List automation rules |
| 15 | `create_automation_rule` | Agent | Create a new rule |
| 16 | `toggle_rule` | Agent | Enable/disable a rule |
| 17 | `run_agent_check` | Agent | Run rule evaluation now |
| 18 | `get_agent_status` | Agent | Get agent status |
| 19 | `get_cross_platform_report` | Report | Cross-platform report |
| 20 | `get_funnel_report` | Report | Conversion funnel data |
| 21 | `get_morning_brief` | Report | AI morning brief |
| 22 | `list_goals` | Goal | List performance goals |
| 23 | `create_goal` | Goal | Create a new goal |
| 24 | `get_goal_progress` | Goal | Get goal progress |
| 25 | `get_credit_balance` | Billing | Get credit balance |
| 26 | `get_credit_usage` | Billing | Get credit usage log |
| 27 | `use_credits` | Billing | Deduct credits |
| 28 | `analyze_creative_fatigue` | Creative | Check ad fatigue |
| 29 | `get_creative_insights` | Creative | Get creative performance |
| 30 | `search_campaigns` | Campaign | Natural language campaign search |

---

## Using with Claude

### Natural Language Prompts

Here are examples of prompts that trigger MCP tools:

#### Campaign Management

```
"Show me all my active Meta campaigns"
-> Claude calls: get_campaigns(workspace_id, platform="meta", status="active")

"What's the ROAS on my Summer Sale campaign?"
-> Claude calls: get_campaign("Summer Sale") -> get_campaign_insights(...)

"Create a new TikTok campaign for our back-to-school promotion with a $300 daily budget"
-> Claude calls: create_campaign_draft(workspace_id, name="Back to School", ...)

"Pause my Google Display Remarketing campaign"
-> Claude calls: pause_campaign_draft(campaign_id, reason="User requested")

"Increase the budget on my highest ROAS Meta campaign by 20%"
-> Claude calls: get_campaigns(workspace, platform="meta") 
   -> [finds highest ROAS] 
   -> update_campaign_draft(campaign_id, daily_budget=new_value, reason="...")
```

#### Performance Analysis

```
"How are my campaigns performing this week?"
-> Claude calls: get_cross_platform_report(workspace_id, date_start="...", date_end="...")

"Which campaign has the best CPA?"
-> Claude calls: get_campaigns(workspace_id) -> [sorts by CPA]

"Show me the conversion funnel"
-> Claude calls: get_funnel_report(workspace_id)

"Give me my morning brief"
-> Claude calls: get_morning_brief(workspace_id)

"Compare Meta vs TikTok performance"
-> Claude calls: get_cross_platform_report(workspace_id) -> [filters and compares]
```

#### Draft Review

```
"What drafts are waiting for my approval?"
-> Claude calls: list_drafts(workspace_id, status="pending")

"Approve the budget increase draft for Summer Sale"
-> Claude calls: list_drafts(workspace_id) 
   -> [finds matching draft] 
   -> approve_draft(draft_id, approver_id)

"Reject the audience change draft and tell me why"
-> Claude calls: reject_draft(draft_id, approver_id, reason="...")
```

#### Automation Rules

```
"Show me my automation rules"
-> Claude calls: list_automation_rules(workspace_id)

"Create a rule to pause campaigns when CPA goes above $75"
-> Claude calls: create_automation_rule(workspace_id, name="...", conditions=[...], actions=[...])

"Turn off the Low CTR Alert rule"
-> Claude calls: toggle_rule(rule_id, status="paused")

"Run the AI agent now"
-> Claude calls: run_agent_check(workspace_id)
```

#### Goals & Credits

```
"Am I on track to hit my ROAS goal?"
-> Claude calls: list_goals(workspace_id) -> get_goal_progress(goal_id)

"How many credits do I have left this month?"
-> Claude calls: get_credit_balance(workspace_id)

"What used the most credits?"
-> Claude calls: get_credit_usage(workspace_id, limit=50) -> [aggregates by feature]
```

#### Creative Analysis

```
"Which ads are getting tired?"
-> Claude calls: analyze_creative_fatigue(workspace_id, threshold=30)

"Show me creative performance for my TikTok ads"
-> Claude calls: get_campaigns(workspace, platform="tiktok") 
   -> get_creative_insights(ad_ids=[...])
```

### Multi-Step Workflows

Claude can chain multiple tools for complex tasks:

```
User: "Optimize my campaigns"

Claude: I'll analyze your campaigns and create optimization drafts.

Step 1: get_campaigns(workspace, status="active")
        -> 6 active campaigns found

Step 2: For each campaign, get_campaign_insights(campaign_id)
        -> Performance data for all 6

Step 3: analyze_creative_fatigue(workspace)
        -> 2 ads in warning state

Step 4: Create drafts:
        - update_campaign_draft(camp_1, budget_increase, reason="ROAS 3.2x")
        - update_campaign_draft(camp_2, budget_decrease, reason="CPA too high")  
        - pause_campaign_draft(camp_5, reason="ROAS below 1.5x")

Response: I've analyzed your 6 active campaigns and created 3 optimization drafts:
1. Increase "Summer Sale" budget by 30% (ROAS: 3.2x)
2. Decrease "Brand Awareness" budget by 20% (CPA: $49.70)
3. Pause "Display Remarketing" (ROAS: 1.8x, below target)

2 ads are showing fatigue signs. I've also flagged them for creative review.
Review all drafts in your dashboard before approving.
```

---

## Security Considerations

### Authentication

The MCP server requires authentication via:
1. **MCP_API_KEY** — Shared secret between API and MCP server
2. **Workspace scoping** — All queries filter by workspace_id
3. **Row Level Security** — Supabase RLS prevents cross-workspace data access

### Data Isolation

```
User Request
    |
    v
+--------------------------------+
| MCP Server                      |
| 1. Validate API key            |
| 2. Extract workspace_id        |
| 3. Add workspace_id to ALL     |
|    database queries            |
| 4. RLS enforces at DB level    |
+--------------------------------+
    |
    v
Supabase (RLS prevents cross-workspace access)
```

### Input Validation

All tool parameters are validated using Pydantic schemas:
- UUID format validation for IDs
- Enum validation for status/platform fields
- Numeric range validation for budgets and thresholds
- SQL injection prevention via parameterized queries

### Credit Enforcement

Every AI action that consumes credits:
1. Checks balance before execution
2. Deducts credits atomically
3. Logs usage for audit
4. Returns error (429) if limit exceeded

### Best Practices

| Practice | Implementation |
|----------|---------------|
| **Never expose service keys** | SUPABASE_KEY only in server environment |
| **Validate all inputs** | Pydantic schemas on every tool |
| **Scope all queries** | workspace_id required on every tool |
| **Use RLS** | Database-level access control |
| **Audit everything** | All actions logged to audit_log table |
| **Rate limit** | Credit system prevents abuse |
| **HTTPS only** | API server requires TLS in production |

### Claude Desktop Security Model

```
+---------------+     stdio     +----------------+     HTTPS     +----------------+
|  Claude Desktop | <----------> |  MCP Server    | <----------> |  AdNexus API   |
|  (Local)        |  (Local)    |  (Local)       |  (Network)   |  + Supabase    |
+---------------+              +----------------+              +----------------+
       |                              |                               |
       | User approves each          | Validates API key            | RLS enforces
       | tool call                   | Workspace scoping             | access control
       +----------------------------+-------------------------------+
```

Claude Desktop requires **user confirmation** for each tool call by default (unless `autoApprove` is configured). This means:
- You see exactly what parameters are being passed
- You can deny any suspicious tool call
- No changes happen without your explicit approval

### Environment Security Checklist

- [ ] `MCP_API_KEY` is strong (64+ random characters)
- [ ] `.env` file is in `.gitignore`
- [ ] Supabase service key has appropriate permissions
- [ ] RLS is enabled on all tables
- [ ] API server uses HTTPS in production
- [ ] Credit limits are configured per plan
- [ ] Audit logging is enabled
- [ ] Rate limiting is configured

---

*Last updated: July 2024*
