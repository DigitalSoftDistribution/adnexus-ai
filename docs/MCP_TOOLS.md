# MCP Server Documentation

> **Protocol Version:** 1.0 | **Server Version:** 3.2.1 | **Tools Available:** 30
> **Transport:** stdio / Server-Sent Events (SSE) | **Auth:** API Key

---

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [Tool Reference](#tool-reference)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)
- [Error Codes](#error-codes)

---

## Overview

The **DevPlatform MCP Server** implements the [Model Context Protocol](https://modelcontextprotocol.io) specification, enabling AI assistants (Claude, ChatGPT, Copilot, etc.) to interact with DevPlatform resources through structured tool calls. It provides 30 tools across 6 categories:

| Category | Tools | Description |
|----------|-------|-------------|
| **Project Management** | 6 | Create, read, update, delete, list, and deploy projects |
| **Deployment Operations** | 5 | Trigger deployments, stream logs, rollback, promote, cancel |
| **Environment Variables** | 4 | Manage secrets and configuration across environments |
| **Webhook Management** | 5 | Configure outgoing webhooks and event subscriptions |
| **Analytics & Monitoring** | 5 | Query metrics, logs, traces, and generate reports |
| **Administration** | 5 | User management, audit logs, maintenance mode, billing |

### Architecture

```
┌─────────────────┐     MCP (stdio/SSE)     ┌─────────────────┐
│   AI Client     │ ◄──────────────────────► │  MCP Server     │
│  (Claude/ChatGPT)│    JSON-RPC 2.0         │  (devp mcp)     │
└─────────────────┘                         └────────┬────────┘
                                                      │
                                            ┌─────────▼─────────┐
                                            │   REST API Layer  │
                                            │  (Fastify + JWT)  │
                                            └─────────┬─────────┘
                                                      │
                                            ┌─────────▼─────────┐
                                            │  PostgreSQL +     │
                                            │  Redis + S3       │
                                            └───────────────────┘
```

---

## Getting Started

### 1. Install the MCP Server

```bash
# Via npm
npm install -g @devplatform/mcp-server

# Via Docker
docker pull devplatform/mcp-server:latest

# From source
git clone https://github.com/devplatform/mcp-server.git
cd mcp-server
npm install
npm run build
```

### 2. Configure Environment

```bash
export DEVP_API_KEY="mcp_your_api_key_here"
export DEVP_API_BASE_URL="https://api.devplatform.io"  # Optional, defaults to cloud
export DEVP_MCP_TRANSPORT="stdio"                       # Options: stdio, sse
export DEVP_MCP_LOG_LEVEL="info"                        # Options: debug, info, warn, error
```

### 3. Verify Installation

```bash
devp mcp --version
# Output: DevPlatform MCP Server v3.2.1 (Protocol 1.0)

devp mcp validate
# Output: Configuration valid. API connection successful.
#         Tools registered: 30
```

### 4. Claude Desktop Configuration

Add to your Claude Desktop configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "devplatform": {
      "command": "devp",
      "args": ["mcp", "start"],
      "env": {
        "DEVP_API_KEY": "mcp_your_api_key_here",
        "DEVP_API_BASE_URL": "https://api.devplatform.io"
      }
    }
  }
}
```

### 5. ChatGPT / OpenAI GPTs Configuration

For ChatGPT with custom GPTs, use the SSE transport:

```bash
devp mcp start --transport sse --port 8765
```

Then configure your GPT with:
- **Schema URL:** `http://localhost:8765/openapi.json`
- **Actions URL:** `http://localhost:8765/actions`

### 6. VS Code / Copilot Configuration

Add to `.vscode/settings.json`:

```json
{
  "mcp.servers": {
    "devplatform": {
      "type": "stdio",
      "command": "devp",
      "args": ["mcp", "start"],
      "env": {
        "DEVP_API_KEY": "mcp_your_api_key_here"
      }
    }
  }
}
```

---

## Authentication

All MCP tool calls are authenticated using your DevPlatform API key. The server forwards requests to the REST API with proper JWT authentication.

### API Key Types

| Key Type | Prefix | Permissions | Use Case |
|----------|--------|-------------|----------|
| MCP Key | `mcp_` | All 30 tools | AI assistant integration |
| PAT | `dp_pat_` | Scoped access | CI/CD, scripts |
| Client Secret | `dp_sk_` | OAuth flows | Application auth |

### Obtaining an MCP API Key

1. Log in to [DevPlatform Dashboard](https://app.devplatform.io)
2. Navigate to **Settings > API Keys > MCP Keys**
3. Click **Generate MCP Key**
4. Copy the key (starts with `mcp_`) — shown only once

### Scope Requirements

The MCP key must have these scopes for full functionality:

```
projects:read, projects:write,
deployments:read, deployments:write,
webhooks:read, webhooks:write,
monitoring:read, billing:read
```

### Security Best Practices

1. **Never commit MCP keys** — Use environment variables or secret managers
2. **Rotate keys quarterly** — Generate new keys and revoke old ones
3. **Use least-privilege scopes** — Only grant needed permissions
4. **Monitor usage** — Review MCP audit logs regularly
5. **Enable IP allowlisting** — Restrict to known AI client IPs

---

## Tool Reference

### Project Management Tools

---

#### Tool 1: `project_list`

List projects accessible to the authenticated user.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `team_id` | string | No | - | Filter by team ID |
| `status` | string | No | `active` | Filter by status: `active`, `archived`, `all` |
| `limit` | integer | No | 20 | Max results (1-100) |
| `cursor` | string | No | - | Pagination cursor |

**Returns:**

```json
{
  "projects": [
    {
      "id": "proj_abc123",
      "name": "API Gateway",
      "slug": "api-gateway",
      "status": "active",
      "url": "https://api-gateway.devplatform.app",
      "framework": "nextjs",
      "last_deployed_at": "2024-01-15T09:00:00Z"
    }
  ],
  "total_count": 12,
  "has_more": true,
  "next_cursor": "cursor_string"
}
```

**Example:**

```
<function_calls>
<invoke name="project_list">
<parameter name="team_id">team_xyz789</parameter>
<parameter name="status">active</parameter>
<parameter name="limit">10</parameter>
</invoke>
</function_calls>
```

---

#### Tool 2: `project_get`

Get detailed information about a specific project.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | string | Yes | Project ID or slug |

**Returns:** Full project object with environments, latest deployment, and analytics.

**Example:**

```
<function_calls>
<invoke name="project_get">
<parameter name="project_id">proj_abc123</parameter>
</invoke>
</function_calls>
```

---

#### Tool 3: `project_create`

Create a new project on DevPlatform.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | string | Yes | - | Project name |
| `slug` | string | Yes | - | URL-friendly identifier |
| `team_id` | string | Yes | - | Parent team ID |
| `framework` | string | Yes | - | Framework preset |
| `description` | string | No | - | Project description |
| `git_provider` | string | No | `github` | Git provider: `github`, `gitlab`, `bitbucket` |
| `git_repo` | string | No | - | Repository full name (owner/repo) |
| `git_branch` | string | No | `main` | Default branch |
| `build_command` | string | No | Auto-detected | Build command |
| `output_directory` | string | No | Auto-detected | Build output directory |

**Supported Frameworks:** `nextjs`, `react`, `vue`, `svelte`, `nuxt`, `astro`, `remix`, `fastify`, `express`, `django`, `flask`, `go`, `rust`, `static`

**Returns:**

```json
{
  "id": "proj_new123",
  "name": "My New Project",
  "slug": "my-new-project",
  "status": "initializing",
  "url": "https://my-new-project.devplatform.app",
  "created_at": "2024-01-15T10:00:00Z",
  "message": "Project created successfully. Connect a git repository to start deploying."
}
```

**Example:**

```
<function_calls>
<invoke name="project_create">
<parameter name="name">E-commerce API</parameter>
<parameter name="slug">ecommerce-api</parameter>
<parameter name="team_id">team_xyz789</parameter>
<parameter name="framework">fastify</parameter>
<parameter name="git_provider">github</parameter>
<parameter name="git_repo">myorg/ecommerce-api</parameter>
<parameter name="git_branch">main</parameter>
</invoke>
</function_calls>
```

---

#### Tool 4: `project_update`

Update project configuration.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | string | Yes | Project ID |
| `name` | string | No | New project name |
| `description` | string | No | New description |
| `build_command` | string | No | New build command |
| `output_directory` | string | No | New output directory |
| `framework` | string | No | Change framework |

**Returns:** Updated project object.

**Example:**

```
<function_calls>
<invoke name="project_update">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="name">Updated API Gateway</parameter>
<parameter name="build_command">npm run build:production</parameter>
</invoke>
</function_calls>
```

---

#### Tool 5: `project_delete`

Delete a project and all associated resources.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | string | Yes | Project ID to delete |
| `confirm` | boolean | Yes | Must be `true` to confirm deletion |

**Returns:**

```json
{
  "success": true,
  "project_id": "proj_abc123",
  "deleted_at": "2024-01-15T10:00:00Z",
  "message": "Project 'API Gateway' and all associated resources have been permanently deleted."
}
```

**Example:**

```
<function_calls>
<invoke name="project_delete">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="confirm">true</parameter>
</invoke>
</function_calls>
```

---

#### Tool 6: `project_deploy`

Trigger a deployment for a project.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `project_id` | string | Yes | - | Project ID |
| `environment` | string | Yes | - | Environment name or ID |
| `git_ref` | string | No | `main` | Git branch, tag, or commit SHA |
| `commit_sha` | string | No | - | Specific commit to deploy |

**Returns:**

```json
{
  "deployment_id": "dep_abc123",
  "status": "queued",
  "environment": "production",
  "queued_at": "2024-01-15T10:00:00Z",
  "estimated_duration_seconds": 120,
  "stream_url": "https://api.devplatform.io/api/v3/deployments/dep_abc123/logs/stream",
  "message": "Deployment queued. Use 'deployment_logs' to track progress."
}
```

**Example:**

```
<function_calls>
<invoke name="project_deploy">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="environment">production</parameter>
<parameter name="git_ref">main</parameter>
</invoke>
</function_calls>
```

---

### Deployment Operations Tools

---

#### Tool 7: `deployment_list`

List deployments for a project.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `project_id` | string | Yes | - | Project ID |
| `environment` | string | No | `all` | Environment filter |
| `status` | string | No | `all` | Status: `queued`, `building`, `success`, `failed`, `cancelled`, `all` |
| `limit` | integer | No | 20 | Max results (1-100) |

**Returns:**

```json
{
  "deployments": [
    {
      "id": "dep_abc123",
      "status": "success",
      "environment": "production",
      "commit_sha": "a1b2c3d",
      "commit_message": "feat: add user authentication",
      "commit_author": "Jane Developer",
      "duration_seconds": 95,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total_count": 145
}
```

**Example:**

```
<function_calls>
<invoke name="deployment_list">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="environment">production</parameter>
<parameter name="limit">5</parameter>
</invoke>
</function_calls>
```

---

#### Tool 8: `deployment_get`

Get detailed information about a deployment.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deployment_id` | string | Yes | Deployment ID |

**Returns:** Full deployment object with build metrics and rollback availability.

**Example:**

```
<function_calls>
<invoke name="deployment_get">
<parameter name="deployment_id">dep_abc123</parameter>
</invoke>
</function_calls>
```

---

#### Tool 9: `deployment_logs`

Get build logs for a deployment.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `deployment_id` | string | Yes | - | Deployment ID |
| `follow` | boolean | No | `false` | Stream logs in real-time |
| `from_line` | integer | No | 0 | Start from this line number |
| `limit` | integer | No | 500 | Max lines to return |

**Returns:**

```json
{
  "deployment_id": "dep_abc123",
  "status": "building",
  "total_lines": 245,
  "lines": [
    {
      "line_number": 1,
      "timestamp": "2024-01-15T10:00:05Z",
      "level": "info",
      "message": "Cloning repository github.com/org/repo..."
    },
    {
      "line_number": 245,
      "timestamp": "2024-01-15T10:01:40Z",
      "level": "success",
      "message": "Deployment successful! Live at https://api.devplatform.app"
    }
  ]
}
```

**Example:**

```
<function_calls>
<invoke name="deployment_logs">
<parameter name="deployment_id">dep_abc123</parameter>
<parameter name="follow">true</parameter>
</invoke>
</function_calls>
```

---

#### Tool 10: `deployment_rollback`

Rollback to a previous deployment.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `deployment_id` | string | Yes | - | Current deployment to rollback from |
| `reason` | string | No | - | Reason for rollback |
| `immediate` | boolean | No | `true` | Skip confirmation and pre-checks |

**Returns:**

```json
{
  "rollback_deployment_id": "dep_roll456",
  "target_deployment_id": "dep_prev789",
  "status": "in_progress",
  "reason": "Critical bug in latest deployment",
  "estimated_duration_seconds": 30,
  "message": "Rollback initiated. Previous deployment v1.2.3 is being restored."
}
```

**Example:**

```
<function_calls>
<invoke name="deployment_rollback">
<parameter name="deployment_id">dep_abc123</parameter>
<parameter name="reason">Critical bug in payment flow</parameter>
</invoke>
</function_calls>
```

---

#### Tool 11: `deployment_cancel`

Cancel a running or queued deployment.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deployment_id` | string | Yes | Deployment ID to cancel |

**Returns:**

```json
{
  "deployment_id": "dep_abc123",
  "previous_status": "building",
  "status": "cancelled",
  "cancelled_at": "2024-01-15T10:00:30Z"
}
```

**Example:**

```
<function_calls>
<invoke name="deployment_cancel">
<parameter name="deployment_id">dep_abc123</parameter>
</invoke>
</function_calls>
```

---

### Environment Variable Tools

---

#### Tool 12: `env_list`

List environment variables for a project.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `project_id` | string | Yes | - | Project ID |
| `environment` | string | No | `all` | Filter by environment |
| `decrypt` | boolean | No | `false` | Show decrypted values (admin only) |

**Returns:**

```json
{
  "variables": [
    {
      "key": "DATABASE_URL",
      "value": "***encrypted***",
      "encrypted": true,
      "environments": ["production", "staging"],
      "updated_at": "2024-01-10T14:22:00Z"
    },
    {
      "key": "API_URL",
      "value": "https://api.example.com",
      "encrypted": false,
      "environments": ["production"],
      "updated_at": "2024-01-05T10:00:00Z"
    }
  ],
  "total_count": 15
}
```

**Example:**

```
<function_calls>
<invoke name="env_list">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="environment">production</parameter>
</invoke>
</function_calls>
```

---

#### Tool 13: `env_set`

Set or update an environment variable.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `project_id` | string | Yes | - | Project ID |
| `key` | string | Yes | - | Variable name |
| `value` | string | Yes | - | Variable value |
| `environments` | string[] | No | `[]` | Target environments (empty = all) |
| `encrypt` | boolean | No | `true` | Encrypt the value |

**Returns:**

```json
{
  "key": "API_SECRET",
  "encrypted": true,
  "environments": ["production"],
  "created": true,
  "message": "Environment variable 'API_SECRET' set for production environment."
}
```

**Example:**

```
<function_calls>
<invoke name="env_set">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="key">STRIPE_SECRET_KEY</parameter>
<parameter name="value">sk_live_xxxxxxxxxxxxx</parameter>
<parameter name="environments">["production"]</parameter>
<parameter name="encrypt">true</parameter>
</invoke>
</function_calls>
```

---

#### Tool 14: `env_delete`

Delete an environment variable.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `project_id` | string | Yes | - | Project ID |
| `key` | string | Yes | - | Variable name to delete |
| `environments` | string[] | No | `[]` | Delete from specific environments only |

**Returns:**

```json
{
  "success": true,
  "key": "OLD_API_KEY",
  "deleted_from": ["production", "staging"],
  "message": "Environment variable 'OLD_API_KEY' deleted from 2 environments."
}
```

**Example:**

```
<function_calls>
<invoke name="env_delete">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="key">OLD_API_KEY</parameter>
</invoke>
</function_calls>
```

---

#### Tool 15: `env_bulk_set`

Set multiple environment variables at once.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | string | Yes | Project ID |
| `variables` | object | Yes | Key-value pairs to set |
| `environments` | string[] | No | Target environments |
| `encrypt` | boolean | No | Encrypt all values |

**Returns:**

```json
{
  "success": true,
  "set_count": 3,
  "skipped_count": 0,
  "variables": ["DATABASE_URL", "REDIS_URL", "API_SECRET"],
  "message": "3 environment variables set successfully."
}
```

**Example:**

```
<function_calls>
<invoke name="env_bulk_set">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="variables">{
  "NODE_ENV": "production",
  "API_VERSION": "v3",
  "FEATURE_FLAGS": "new_ui,beta_api"
}</parameter>
<parameter name="environments">["production", "staging"]</parameter>
</invoke>
</function_calls>
```

---

### Webhook Management Tools

---

#### Tool 16: `webhook_list`

List configured outgoing webhooks.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `project_id` | string | Yes | - | Project ID |
| `active_only` | boolean | No | `false` | Show only active webhooks |

**Returns:**

```json
{
  "webhooks": [
    {
      "id": "wh_abc123",
      "name": "Slack Notifications",
      "url": "https://hooks.slack.com/services/...",
      "events": ["deployment.success", "deployment.failed"],
      "active": true,
      "last_triggered_at": "2024-01-15T09:00:00Z",
      "last_status": "success"
    }
  ],
  "total_count": 3
}
```

**Example:**

```
<function_calls>
<invoke name="webhook_list">
<parameter name="project_id">proj_abc123</parameter>
</invoke>
</function_calls>
```

---

#### Tool 17: `webhook_create`

Create a new outgoing webhook.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `project_id` | string | Yes | - | Project ID |
| `name` | string | Yes | - | Webhook name |
| `url` | string | Yes | - | Target URL |
| `events` | string[] | Yes | - | Events to subscribe to |
| `secret` | string | No | Auto-generated | Signing secret |
| `headers` | object | No | `{}` | Custom HTTP headers |
| `active` | boolean | No | `true` | Enable immediately |

**Returns:**

```json
{
  "id": "wh_new456",
  "name": "CI/CD Pipeline",
  "url": "https://ci.example.com/webhook",
  "events": ["deployment.success"],
  "secret": "whsec_xxxxxxxxxxxx",
  "active": true,
  "created_at": "2024-01-15T10:00:00Z",
  "test_url": "https://api.devplatform.io/api/v3/webhooks/wh_new456/test"
}
```

**Example:**

```
<function_calls>
<invoke name="webhook_create">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="name">Discord Notifications</parameter>
<parameter name="url">https://discord.com/api/webhooks/xxx/yyy</parameter>
<parameter name="events">["deployment.success", "deployment.failed", "deployment.started"]</parameter>
</invoke>
</function_calls>
```

---

#### Tool 18: `webhook_update`

Update an existing webhook.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `webhook_id` | string | Yes | Webhook ID |
| `name` | string | No | New name |
| `url` | string | No | New URL |
| `events` | string[] | No | New event list |
| `active` | boolean | No | Enable/disable |
| `headers` | object | No | New custom headers |

**Returns:** Updated webhook object.

**Example:**

```
<function_calls>
<invoke name="webhook_update">
<parameter name="webhook_id">wh_abc123</parameter>
<parameter name="active">false</parameter>
<parameter name="events">["deployment.failed"]</parameter>
</invoke>
</function_calls>
```

---

#### Tool 19: `webhook_delete`

Delete a webhook.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `webhook_id` | string | Yes | Webhook ID |
| `confirm` | boolean | Yes | Must be `true` |

**Returns:**

```json
{
  "success": true,
  "webhook_id": "wh_abc123",
  "deleted_at": "2024-01-15T10:00:00Z"
}
```

**Example:**

```
<function_calls>
<invoke name="webhook_delete">
<parameter name="webhook_id">wh_abc123</parameter>
<parameter name="confirm">true</parameter>
</invoke>
</function_calls>
```

---

#### Tool 20: `webhook_test`

Send a test payload to a webhook.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `webhook_id` | string | Yes | - | Webhook ID |
| `event_type` | string | No | `deployment.success` | Test event type |

**Returns:**

```json
{
  "success": true,
  "status_code": 200,
  "response_time_ms": 245,
  "response_body": "ok",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

**Example:**

```
<function_calls>
<invoke name="webhook_test">
<parameter name="webhook_id">wh_abc123</parameter>
<parameter name="event_type">deployment.success</parameter>
</invoke>
</function_calls>
```

---

### Analytics & Monitoring Tools

---

#### Tool 21: `analytics_overview`

Get a high-level analytics overview for a project.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `project_id` | string | Yes | - | Project ID |
| `period` | string | No | `24h` | Time period: `1h`, `6h`, `24h`, `7d`, `30d` |

**Returns:**

```json
{
  "project_id": "proj_abc123",
  "period": "24h",
  "summary": {
    "total_requests": 450230,
    "unique_visitors": 12500,
    "avg_response_time_ms": 45,
    "p95_response_time_ms": 120,
    "p99_response_time_ms": 280,
    "error_rate": 0.0012,
    "total_bandwidth_gb": 12.5,
    "total_deployments": 8
  },
  "trend": {
    "requests_change": 0.05,
    "latency_change": -0.12,
    "error_rate_change": -0.003
  }
}
```

**Example:**

```
<function_calls>
<invoke name="analytics_overview">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="period">7d</parameter>
</invoke>
</function_calls>
```

---

#### Tool 22: `analytics_timeseries`

Get time-series analytics data.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `project_id` | string | Yes | - | Project ID |
| `metric` | string | Yes | - | Metric: `requests`, `latency`, `errors`, `bandwidth` |
| `from` | string | No | - | ISO 8601 start time |
| `to` | string | No | Now | ISO 8601 end time |
| `granularity` | string | No | `1h` | `1m`, `5m`, `15m`, `1h`, `1d` |

**Returns:**

```json
{
  "project_id": "proj_abc123",
  "metric": "requests",
  "granularity": "1h",
  "data_points": [
    {
      "timestamp": "2024-01-15T00:00:00Z",
      "value": 18750,
      "label": "00:00"
    },
    {
      "timestamp": "2024-01-15T01:00:00Z",
      "value": 15230,
      "label": "01:00"
    }
  ]
}
```

**Example:**

```
<function_calls>
<invoke name="analytics_timeseries">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="metric">latency</parameter>
<parameter name="from">2024-01-15T00:00:00Z</parameter>
<parameter name="granularity">1h</parameter>
</invoke>
</function_calls>
```

---

#### Tool 23: `logs_query`

Query application logs.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `project_id` | string | Yes | - | Project ID |
| `query` | string | No | - | Search query string |
| `level` | string | No | `all` | `debug`, `info`, `warn`, `error`, `fatal`, `all` |
| `from` | string | No | `24h ago` | Start time (ISO 8601 or relative) |
| `to` | string | No | `now` | End time |
| `limit` | integer | No | 100 | Max results (1-1000) |

**Returns:**

```json
{
  "query_id": "qry_abc123",
  "total_results": 523,
  "logs": [
    {
      "timestamp": "2024-01-15T10:00:00Z",
      "level": "error",
      "message": "Database connection timeout after 5000ms",
      "service": "projects-api",
      "trace_id": "trace_def456",
      "metadata": {
        "query": "SELECT * FROM projects WHERE id = $1",
        "duration_ms": 5000
      }
    }
  ],
  "aggregations": {
    "by_level": {
      "error": 45,
      "warn": 120,
      "info": 358
    }
  }
}
```

**Example:**

```
<function_calls>
<invoke name="logs_query">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="level">error</parameter>
<parameter name="from">1h ago</parameter>
<parameter name="limit">50</parameter>
</invoke>
</function_calls>
```

---

#### Tool 24: `trace_get`

Get a distributed trace by ID.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `trace_id` | string | Yes | Trace ID to look up |

**Returns:** Full trace object with all spans and service dependencies.

**Example:**

```
<function_calls>
<invoke name="trace_get">
<parameter name="trace_id">trace_def456</parameter>
</invoke>
</function_calls>
```

---

#### Tool 25: `health_check`

Check the health status of a project or the platform.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `project_id` | string | No | - | Specific project to check |
| `environment` | string | No | `production` | Environment name |

**Returns:**

```json
{
  "timestamp": "2024-01-15T10:00:00Z",
  "overall": "healthy",
  "checks": {
    "api": { "status": "healthy", "response_time_ms": 12 },
    "database": { "status": "healthy", "response_time_ms": 5 },
    "redis": { "status": "healthy", "response_time_ms": 2 },
    "storage": { "status": "healthy", "response_time_ms": 45 }
  },
  "project": {
    "id": "proj_abc123",
    "deployments_last_24h": 8,
    "success_rate": 1.0,
    "avg_build_time_seconds": 85
  }
}
```

**Example:**

```
<function_calls>
<invoke name="health_check">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="environment">production</parameter>
</invoke>
</function_calls>
```

---

### Administration Tools

---

#### Tool 26: `user_list`

List team members (admin/team scope).

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `team_id` | string | Yes | - | Team ID |
| `role` | string | No | `all` | Filter: `admin`, `member`, `all` |
| `limit` | integer | No | 50 | Max results |

**Returns:**

```json
{
  "users": [
    {
      "id": "usr_abc123",
      "email": "jane@example.com",
      "name": "Jane Developer",
      "role": "admin",
      "joined_at": "2023-06-01T00:00:00Z",
      "last_active_at": "2024-01-15T09:00:00Z"
    }
  ],
  "total_count": 12
}
```

**Example:**

```
<function_calls>
<invoke name="user_list">
<parameter name="team_id">team_xyz789</parameter>
</invoke>
</function_calls>
```

---

#### Tool 27: `user_invite`

Invite a new user to a team.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `team_id` | string | Yes | - | Team ID |
| `email` | string | Yes | - | User email address |
| `role` | string | No | `member` | `member` or `admin` |

**Returns:**

```json
{
  "invitation_id": "inv_abc123",
  "email": "newuser@example.com",
  "role": "member",
  "status": "pending",
  "expires_at": "2024-01-22T10:00:00Z",
  "message": "Invitation sent to newuser@example.com."
}
```

**Example:**

```
<function_calls>
<invoke name="user_invite">
<parameter name="team_id">team_xyz789</parameter>
<parameter name="email">newmember@example.com</parameter>
<parameter name="role">member</parameter>
</invoke>
</function_calls>
```

---

#### Tool 28: `billing_info`

Get billing information for a team.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `team_id` | string | Yes | Team ID |

**Returns:**

```json
{
  "team_id": "team_xyz789",
  "plan": {
    "name": "Team",
    "price_monthly": 79,
    "renewal_date": "2024-02-01T00:00:00Z"
  },
  "usage": {
    "projects": { "used": 8, "limit": 50 },
    "bandwidth_gb": { "used": 1200.5, "limit": 2048 },
    "build_minutes": { "used": 4500, "limit": 10000 }
  },
  "invoices": {
    "total_count": 12,
    "last_invoice": {
      "amount": 85.32,
      "status": "paid",
      "date": "2024-01-01T00:00:00Z"
    }
  }
}
```

**Example:**

```
<function_calls>
<invoke name="billing_info">
<parameter name="team_id">team_xyz789</parameter>
</invoke>
</function_calls>
```

---

#### Tool 29: `audit_log`

Query the audit log (admin only).

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `team_id` | string | Yes | - | Team ID |
| `action` | string | No | `all` | Filter by action type |
| `from` | string | No | `7d ago` | Start time |
| `limit` | integer | No | 50 | Max results |

**Returns:**

```json
{
  "entries": [
    {
      "timestamp": "2024-01-15T10:00:00Z",
      "actor": "jane@example.com",
      "action": "deployment.trigger",
      "resource": "proj_abc123",
      "details": "Deployed to production from main branch"
    }
  ],
  "total_count": 1450
}
```

**Example:**

```
<function_calls>
<invoke name="audit_log">
<parameter name="team_id">team_xyz789</parameter>
<parameter name="from">24h ago</parameter>
<parameter name="limit">20</parameter>
</invoke>
</function_calls>
```

---

#### Tool 30: `maintenance_status`

Check platform maintenance status or toggle maintenance mode (admin).

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `enable` | boolean | No | - | Enable/disable maintenance mode |
| `message` | string | No | - | Maintenance message for users |

**Returns (when checking status):**

```json
{
  "maintenance": false,
  "next_scheduled": {
    "start": "2024-01-20T02:00:00Z",
    "end": "2024-01-20T04:00:00Z",
    "description": "Database upgrade to PostgreSQL 16"
  }
}
```

**Returns (when enabling maintenance):**

```json
{
  "maintenance": true,
  "enabled_at": "2024-01-15T10:00:00Z",
  "message": "Scheduled maintenance in progress.",
  "affected_services": ["api", "deployments", "webhooks"]
}
```

**Example:**

```
<function_calls>
<invoke name="maintenance_status">
</invoke>
</function_calls>
```

---

## Usage Examples

### Example 1: Deploy and Monitor with Claude

```
User: Deploy my API Gateway project to production and monitor the deployment.

Claude:
I'll help you deploy the API Gateway project and monitor it. Let me start by finding the project and triggering the deployment.

<function_calls>
<invoke name="project_list">
<parameter name="limit">10</parameter>
</invoke>
</function_calls>

<function_results>
Found project "API Gateway" (proj_abc123). Now deploying to production:
</function_results>

<function_calls>
<invoke name="project_deploy">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="environment">production</parameter>
<parameter name="git_ref">main</parameter>
</invoke>
</function_calls>

<function_results>
Deployment dep_xyz789 is queued. Let me stream the logs:
</function_results>

<function_calls>
<invoke name="deployment_logs">
<parameter name="deployment_id">dep_xyz789</parameter>
<parameter name="follow">true</parameter>
</invoke>
</function_calls>

<function_results>
[10:00:05] [info] Cloning repository...
[10:00:08] [info] Installing dependencies...
[10:00:45] [info] Building application...
[10:01:35] [success] Build completed in 90s
[10:01:38] [success] Deployment successful! Live at https://api-gateway.devplatform.app
</function_results>

The deployment was successful! Your API Gateway is now live at https://api-gateway.devplatform.app.
```

### Example 2: Manage Secrets with ChatGPT

```
User: Set up environment variables for my project. I need DATABASE_URL, REDIS_URL,
and STRIPE_SECRET_KEY for production only.

ChatGPT:
<function_calls>
<invoke name="project_list">
<parameter name="limit">10</parameter>
</invoke>
</function_calls>

<function_results>
I can see your projects. Which project would you like to set up environment variables for?
Please provide:
1. The project ID or name
2. The values for DATABASE_URL, REDIS_URL, and STRIPE_SECRET_KEY

Note: I'll encrypt the values automatically for security.
</function_results>

<function_calls>
<invoke name="env_bulk_set">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="variables">{
  "DATABASE_URL": "postgresql://user:pass@db.example.com:5432/app",
  "REDIS_URL": "redis://redis.example.com:6379/0",
  "STRIPE_SECRET_KEY": "sk_live_xxxxxxxxxxxxx"
}</parameter>
<parameter name="environments">["production"]</parameter>
<parameter name="encrypt">true</parameter>
</invoke>
</function_calls>

<function_results>
All 3 environment variables have been set for the production environment with encryption enabled:
- DATABASE_URL (encrypted)
- REDIS_URL (encrypted)
- STRIPE_SECRET_KEY (encrypted)

Your next deployment will pick up these variables automatically.
</function_results>
```

### Example 3: Webhook Management with Copilot

```
User: Create a Slack webhook for deployment notifications on my project.

Copilot:
<function_calls>
<invoke name="webhook_create">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="name">Slack Deployment Notifications</parameter>
<parameter name="url">https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN</parameter>
<parameter name="events">["deployment.success", "deployment.failed", "deployment.started"]</parameter>
</invoke>
</function_calls>

<function_results>
Webhook created successfully!
- ID: wh_slack789
- Events: deployment.success, deployment.failed, deployment.started
- Status: Active

Let me test it to make sure it's working:
</function_results>

<function_calls>
<invoke name="webhook_test">
<parameter name="webhook_id">wh_slack789</parameter>
<parameter name="event_type">deployment.success</parameter>
</invoke>
</function_calls>

<function_results>
Test successful! Slack responded with HTTP 200 in 245ms.
Your team will now receive deployment notifications in Slack.
</function_results>
```

### Example 4: Debugging with Claude

```
User: My project has been having issues. Can you check the health and recent error logs?

Claude:
<function_calls>
<invoke name="health_check">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="environment">production</parameter>
</invoke>
<invoke name="logs_query">
<parameter name="project_id">proj_abc123</parameter>
<parameter name="level">error</parameter>
<parameter name="from">1h ago</parameter>
<parameter name="limit">20</parameter>
</invoke>
</function_calls>

<function_results>
Health Status: API is responding slowly (p95: 850ms, threshold: 500ms)

Recent Errors:
- 15x "Database connection timeout" (last hour)
- 8x "Redis cache miss cascade" 
- 3x "External API rate limited"

The pattern suggests database connection pool exhaustion. 
Recommendations:
1. Increase DB connection pool size
2. Check for slow queries (> 1s)
3. Verify Redis is not in memory pressure
</function_results>
```

---

## Error Handling

### Error Response Format

All tool errors follow this structure:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "The 'project_id' parameter is required.",
    "tool": "project_get",
    "request_id": "req_mcp_abc123",
    "documentation_url": "https://docs.devplatform.io/mcp/errors/validation_failed",
    "details": {
      "field": "project_id",
      "issue": "missing_required_parameter"
    }
  }
}
```

### Error Handling Best Practices

1. **Always check for errors** before processing responses
2. **Retry with exponential backoff** on `rate_limited` and `service_unavailable`
3. **Validate inputs** before calling tools
4. **Handle partial failures** gracefully

```typescript
// Good error handling pattern
async function safeDeploy(projectId: string) {
  try {
    const result = await mcp.call('project_deploy', {
      project_id: projectId,
      environment: 'production'
    });
    
    if (result.error) {
      switch (result.error.code) {
        case 'resource_not_found':
          throw new Error(`Project ${projectId} not found`);
        case 'insufficient_scope':
          throw new Error('Missing deployment permissions');
        case 'rate_limited':
          await sleep(result.error.retry_after * 1000);
          return safeDeploy(projectId); // Retry
        default:
          throw new Error(result.error.message);
      }
    }
    
    return result;
  } catch (err) {
    console.error('Deployment failed:', err);
    throw err;
  }
}
```

---

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `auth_failed` | MCP API key is invalid or expired | Check DEVP_API_KEY, generate new key |
| `insufficient_scope` | API key lacks required permissions | Add required scopes in dashboard |
| `rate_limited` | Too many MCP requests | Wait `retry_after` seconds, implement backoff |
| `resource_not_found` | Requested project/deployment/etc not found | Verify resource ID |
| `resource_conflict` | Resource already exists or state conflict | Check current state, retry with different params |
| `validation_failed` | Invalid parameters | Check error.details for field-level errors |
| `service_unavailable` | DevPlatform API temporarily unavailable | Retry with exponential backoff |
| `permission_denied` | User lacks permission for this action | Request team admin to grant permissions |
| `mcp_transport_error` | Connection issue between client and MCP server | Check network, restart MCP server |
| `api_timeout` | Request to DevPlatform API timed out | Retry with increased timeout |
| `encryption_error` | Failed to encrypt/decrypt sensitive data | Contact support |
| `quota_exceeded` | Resource quota exceeded | Upgrade plan or clean up resources |
| `deployment_in_progress` | Another deployment is already running | Wait or cancel existing deployment |
| `invalid_git_ref` | Git branch/tag/commit not found | Verify git reference exists |
| `build_failed` | Build process failed | Check deployment logs for details |
| `webhook_delivery_failed` | Could not deliver webhook | Check webhook URL and retry |
| `maintenance_mode` | Platform is in maintenance mode | Wait for maintenance to complete |

---

## MCP Protocol Details

### Transport Modes

| Mode | Use Case | Start Command |
|------|----------|---------------|
| `stdio` | Claude Desktop, local tools | `devp mcp start` |
| `sse` | Remote clients, ChatGPT GPTs | `devp mcp start --transport sse --port 8765` |

### stdio Transport

The default mode. The MCP server reads JSON-RPC messages from stdin and writes responses to stdout.

```
<-- { "jsonrpc": "2.0", "id": 1, "method": "tools/list" }
--> { "jsonrpc": "2.0", "id": 1, "result": { "tools": [...] } }
```

### SSE Transport

For browser-based or remote clients. Runs an HTTP server with Server-Sent Events.

```bash
devp mcp start --transport sse --host 0.0.0.0 --port 8765
```

- **SSE Endpoint:** `GET /events`
- **Message POST:** `POST /message`
- **Health Check:** `GET /health`
- **OpenAPI Schema:** `GET /openapi.json`

### Capabilities

The server announces these MCP capabilities:

```json
{
  "protocolVersion": "1.0",
  "capabilities": {
    "tools": { "listChanged": true },
    "logging": {},
    "prompts": {},
    "resources": { "subscribe": true, "listChanged": true }
  },
  "serverInfo": {
    "name": "devplatform-mcp",
    "version": "3.2.1"
  }
}
```
