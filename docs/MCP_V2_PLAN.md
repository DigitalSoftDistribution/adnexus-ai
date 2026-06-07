# AdNexus MCP V2 plan

## Current implemented status

MCP is partially present today, but not yet a production user-facing V2 transport:

- `apps/mcp/src/server.py` contains a FastMCP proxy server with stdio/SSE/HTTP modes and a small campaign/draft/AI tool surface. It is not mounted into the Node API runtime and still references endpoints that are not all present.
- V2 dashboard APIs already exist for campaigns, ads, drafts, reports, recommendations, integrations, audit log, exports, settings, and sync jobs.
- API keys exist in both v1 and V2 settings surfaces, but V2 settings currently returns placeholder API keys and does not yet enforce MCP-specific scopes.
- Audit logging exists for dashboard and worker flows, but there is no mandatory MCP tool-call audit middleware yet.
- This safe slice adds authenticated `GET /api/v2/mcp/status` and `GET /api/v2/mcp/tools` so the dashboard/docs can expose truthful MCP readiness and the complete V2 catalog without faking live MCP transport.

## V2 principles

1. **Read-first:** every production MCP client should be able to inspect workspace context, accounts, campaigns, metrics, reports, drafts, audit events, and sync state before proposing changes.
2. **Draft-first writes:** MCP tools must not write directly to Meta, Google, TikTok, or Snap. Write intents become drafts and require explicit approval.
3. **Scoped API keys:** MCP keys need granular scopes such as `campaigns:read`, `drafts:write`, `approvals:write`, and `audit:read`, not broad `read/write/admin` only.
4. **Auditable by default:** every MCP request should create an audit event with actor type, key id, tool name, input hash, result status, latency, and request id.
5. **No fake transport:** until Streamable HTTP is mounted and authenticated, dashboard status must report transport as planned/not live.

## Complete V2 tool catalog

The catalog is available at `GET /api/v2/mcp/tools` and defined in the pure metadata module `apps/api/src/interface/http/routes/mcpCatalog.ts`; `apps/api/src/interface/http/routes/mcp.ts` only mounts the authenticated HTTP routes.

### Workspace context

- `workspace_get_context` — read workspace identity, plan, settings, branding, and current actor context.
- `workspace_list_members` — read members and roles for approval/escalation context.

### Integrations

- `integration_list_accounts` — read connected Meta, Google, TikTok, and Snap accounts with sync status.
- `integration_get_account` — planned read details for one account, token health, and last sync.
- `integration_disconnect_draft` — planned draft to disconnect or revoke an integration.

### Campaigns and ads

- `campaign_list` — read normalized campaigns.
- `campaign_get` — read one campaign.
- `campaign_get_summary` — read aggregate campaign summary.
- `campaign_create_draft` — planned draft for new campaign creation.
- `campaign_update_draft` — draft campaign update using the drafts API.
- `campaign_pause_draft` — draft campaign pause.
- `ad_list` — read ads and creatives.
- `ad_get_performance` — read ad performance.

### Metrics

- `metrics_query` — planned normalized time-series metrics query.
- `metrics_compare_platforms` — planned cross-platform comparison for Meta/Google/TikTok/Snap.

### Reports and exports

- `report_list` — read reports.
- `report_get` — read one report.
- `report_run_draft` — planned draft for report generation/export side effects.
- `export_create_draft` — planned draft for export creation.

### Recommendations

- `recommendation_list` — read recommendations.
- `recommendation_generate` — generate recommendations that produce drafts, not direct writes.

### Drafts and approvals

- `draft_list` — read drafts.
- `draft_get` — read draft details.
- `draft_create` — create a draft for proposed write intent.
- `draft_approve` — approve a draft.
- `draft_reject` — reject a draft.

### Audit

- `audit_list` — read audit events.
- `audit_get` — read one audit event.
- `audit_export_draft` — planned draft for audit export.

### Sync

- `sync_list_jobs` — read sync jobs.
- `sync_account_draft` — planned draft for account sync.

### MCP metadata

- `mcp_get_status` — read MCP readiness and gaps.
- `mcp_list_tools` — read tool catalog.

## Transport and Coolify deployment architecture

### Recommended transport

Use MCP **Streamable HTTP** as the production transport under the Node API domain:

- Public endpoint: `https://<app-domain>/api/v2/mcp`
- Metadata/status: `GET /api/v2/mcp/status`
- Catalog: `GET /api/v2/mcp/tools`
- MCP JSON-RPC Streamable HTTP session endpoint: planned `POST /api/v2/mcp/rpc`

Do not deploy the Python FastMCP proxy as the user-facing production server until it is reconciled with the V2 Node API, scopes, audit logging, and draft-first write policy.

### Auth

- Accept `Authorization: Bearer <mcp_key>` for MCP clients.
- Store only hashes and safe prefixes.
- Attach `actor_type=mcp`, `actor_id=<api_key_id>`, `workspace_id`, and `scopes` to request context.
- Support optional JWT auth for dashboard-only metadata endpoints, but external MCP clients should use scoped MCP keys.

### Scopes

Required scope families:

- `mcp:read`
- `workspace:read`
- `integrations:read`, `integrations:write`
- `campaigns:read`, `campaigns:write`
- `ads:read`
- `metrics:read`
- `reports:read`, `reports:write`
- `recommendations:read`, `recommendations:write`
- `drafts:read`, `drafts:write`
- `approvals:write`
- `audit:read`
- `exports:write`
- `sync:read`, `sync:write`

### Rate limits

- Per key: default 60 requests/minute and 5 concurrent calls.
- Write/draft tools: stricter 10 requests/minute.
- Expensive metrics/report tools: cost-weighted limits and max date ranges.
- Sync tools: queued, idempotency-key protected, and never executed inline from MCP.

### Audit logs

Every MCP call should persist:

- workspace id
- API key id/prefix
- tool name/category/mode
- input hash and safe redacted parameter summary
- output status and error code
- latency, request id, user agent, IP
- linked draft id/report id/export id/sync job id when applicable

## Backend gaps

1. Implement Streamable HTTP MCP JSON-RPC endpoint in the Node API.
2. Replace placeholder V2 API key repository methods with database-backed hashed keys and granular scopes.
3. Add API-key authentication middleware separate from dashboard JWT auth.
4. Add per-tool scope enforcement and rate-limit weights.
5. Add persistent MCP audit logger.
6. Build normalized metrics read model for Meta, Google, TikTok, and Snap.
7. Convert remaining write-like flows into draft creation tools.
8. Add dashboard MCP page/card wiring to status and catalog endpoints.
9. Add contract tests for `/api/v2/mcp/status`, `/api/v2/mcp/tools`, scope checks, and audit writes.
