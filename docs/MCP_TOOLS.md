# AdNexus AI MCP Server

> **Server Version:** 2.0 | **Tools Available:** 14
> **Transport:** stdio / SSE / HTTP | **Auth:** JWT Bearer Token

---

## Overview

The AdNexus AI MCP Server enables AI assistants (Claude, Cursor, etc.) to manage ad campaigns across Meta, Google, TikTok, and Snapchat. It proxies structured tool calls to the AdNexus Node.js API.

**Source:** `apps/mcp/src/server.py`

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE_URL` | `http://localhost:3000/api/v2` | AdNexus API base URL |
| `API_JWT_TOKEN` | (required) | JWT token for API authentication |
| `MCP_TRANSPORT` | `stdio` | Transport: `stdio`, `sse`, or `http` |
| `MCP_PORT` | `8080` | Port for SSE/HTTP transport |
| `CACHE_TTL` | `60` | Tool result cache TTL (seconds) |

## Tools

### Campaign Tools (5)

| Tool | Method | API Endpoint | Cached |
|------|--------|-------------|--------|
| `list_campaigns` | GET | `/campaigns` | Yes |
| `get_campaign` | GET | `/campaigns/{id}` | Yes |
| `create_campaign` | POST | `/campaigns` | No |
| `update_campaign` | PATCH | `/campaigns/{id}` | No |
| `get_campaign_summary` | GET | `/campaigns/summary` | Yes |

### Draft Tools (5)

| Tool | Method | API Endpoint | Cached |
|------|--------|-------------|--------|
| `list_drafts` | GET | `/drafts` | Yes |
| `create_draft` | POST | `/drafts` | No |
| `approve_draft` | POST | `/drafts/{id}/approve` | No |
| `reject_draft` | POST | `/drafts/{id}/reject` | No |
| `get_draft_details` | GET | `/drafts/{id}` | Yes |

### AI Tools (3) -- STUB

These tools call `/ai/*` endpoints that are not yet implemented in the API backend. They will return errors until the AI engine is integrated.

| Tool | Method | API Endpoint | Status |
|------|--------|-------------|--------|
| `generate_creative` | POST | `/ai/generate-creative` | Stub |
| `analyze_audience` | GET | `/ai/analyze-audience` | Stub |
| `forecast_budget` | POST | `/ai/forecast-budget` | Stub |

### Utility Tools (2)

| Tool | Description |
|------|-------------|
| `batch_operations` | Execute multiple operations in one call |
| `cache_control` | Manage MCP-side result cache (clear/stats) |

## Required API Endpoints

For the MCP server to function, the AdNexus API must expose these v2 endpoints:

```
GET    /api/v2/campaigns
GET    /api/v2/campaigns/summary
GET    /api/v2/campaigns/:id
POST   /api/v2/campaigns
PATCH  /api/v2/campaigns/:id

GET    /api/v2/drafts
GET    /api/v2/drafts/:id
POST   /api/v2/drafts
POST   /api/v2/drafts/:id/approve
POST   /api/v2/drafts/:id/reject
```

## AI Endpoints (not yet implemented)

```
POST   /api/v2/ai/generate-creative
GET    /api/v2/ai/analyze-audience
POST   /api/v2/ai/forecast-budget
```

## Error Handling

All tools return structured errors:

```json
{
  "error": true,
  "message": "Description of the error",
  "status_code": 404
}
```

## Running

```bash
# stdio (default, for Claude Desktop / Cursor)
cd apps/mcp/src
python server.py

# SSE (for remote access)
MCP_TRANSPORT=sse MCP_PORT=8080 python server.py
```

## Docker

```bash
cd apps/mcp/src
docker build -t adnexus-mcp .
docker run -e API_BASE_URL=http://host.docker.internal:3000/api/v2 -e API_JWT_TOKEN=xxx adnexus-mcp
```
