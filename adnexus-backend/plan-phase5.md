# AdNexus AI — Phase 5: Full Production Backend (20+ Agents)

## Overview
The API routes, core services, MCP server, auth, and docs are complete. Now we build the remaining production infrastructure: real platform APIs, AI services, background workers, caching, webhooks, notifications, real-time updates, testing, Docker, CI/CD, and monitoring.

## Architecture
All new code goes into `/mnt/agents/output/adnexus-backend/` under the existing structure.

## Agent Assignments (20 Parallel Agents)

### Platform API Services (3 agents)
| Agent | Files | Description |
|-------|-------|-------------|
| **google-api-service** | `api/src/services/google-api.ts` | Full Google Ads API integration (OAuth, campaigns, ad groups, ads, insights, normalization to UnifiedCampaign) — mirrors meta-api.ts pattern |
| **tiktok-api-service** | `api/src/services/tiktok-api.ts` | Full TikTok Ads API integration — same pattern |
| **snap-api-service** | `api/src/services/snap-api.ts` | Full Snap Ads API integration — same pattern |

### AI & Comms Services (3 agents)
| Agent | Files | Description |
|-------|-------|-------------|
| **ai-service** | `api/src/services/ai-service.ts` | OpenAI/Anthropic integration: morning brief generation, creative analysis, insight recommendations, budget optimization suggestions. Credit-aware (deducts credits per call). |
| **email-service** | `api/src/services/email-service.ts` | Resend/SendGrid integration: welcome emails, morning brief emails, draft approval notifications, alert emails, weekly summaries. Template-based. |
| **notification-service** | `api/src/services/notification-service.ts` + `api/src/routes/notifications.ts` | In-app notification system: create, list, mark-read, mark-all-read, unread count. Types: draft_approved, draft_rejected, rule_triggered, goal_alert, budget_alert. |

### Infrastructure (4 agents)
| Agent | Files | Description |
|-------|-------|-------------|
| **cache-service** | `api/src/services/cache-service.ts` + `api/src/lib/redis.ts` | Redis client singleton + cache service with TTL, cache invalidation patterns for campaigns, insights, user sessions. Graceful fallback when Redis is unavailable. |
| **rate-limiter** | `api/src/lib/rate-limiter.ts` + `api/src/middleware/rate-limiter.ts` | Tiered rate limiting per workspace plan (Free: 100/hr, Pro: 1000/hr, Premium: 5000/hr, Agency: 20000/hr). Redis-backed with fallback to memory. |
| **webhook-handler** | `api/src/services/webhook-handler.ts` + `api/src/routes/webhooks.ts` | Receive webhooks from Meta (leadgen, campaign updates), Google (conversion uploads), TikTok, Snap. Verify signatures, process events, update database. |
| **export-service** | `api/src/services/export-service.ts` + `api/src/routes/exports.ts` | CSV, Excel (xlsx), PDF export of campaigns, reports, audit logs. Streaming generation for large datasets. |

### Background Workers (4 agents)
| Agent | Files | Description |
|-------|-------|-------------|
| **rule-evaluator-worker** | `api/src/workers/rule-evaluator.ts` | BullMQ worker that evaluates automation rules every 15 min. Fetches active rules, checks campaigns against conditions, creates drafts when rules fire. Logs to audit_log. |
| **morning-brief-worker** | `api/src/workers/morning-brief.ts` | BullMQ worker that generates morning briefs daily at 7am per workspace. Fetches yesterday's metrics, uses AI service for analysis, stores result, sends email. |
| **report-generator-worker** | `api/src/workers/report-generator.ts` | BullMQ worker for scheduled reports. Runs scheduled_report entries, generates cross-platform reports, stores results, emails recipients. |
| **metrics-sync-worker** | `api/src/workers/metrics-sync.ts` | BullMQ worker that syncs campaign metrics from all platforms every 30 min. Fetches fresh insights from Meta/Google/TikTok/Snap, updates campaigns table. |

### Real-Time + Search (2 agents)
| Agent | Files | Description |
|-------|-------|-------------|
| **sse-realtime** | `api/src/realtime/sse.ts` | Server-Sent Events endpoint for live dashboard updates. Streams campaign metric changes, draft status updates, notification counts to connected clients. Workspace-scoped channels. |
| **search-service** | `api/src/services/search-service.ts` + `api/src/routes/search.ts` | Full-text search across campaigns, adsets, ads, drafts, audit log. Filters by platform, status, date range, performance thresholds. PostgreSQL tsvector + trigram. |

### DevOps + Quality (4 agents)
| Agent | Files | Description |
|-------|-------|-------------|
| **docker-setup** | `api/Dockerfile` + `mcp-server/Dockerfile` + `docker-compose.yml` + `.dockerignore` | Multi-stage Docker builds for API and MCP server. Docker Compose with PostgreSQL, Redis, API, MCP server, workers. Health checks, env file template. |
| **test-suite** | `api/tests/` (20+ test files) | Comprehensive Jest test suite: unit tests for all services, integration tests for all routes, auth flow tests, draft workflow tests, credit system tests. |
| **cicd-pipeline** | `.github/workflows/ci.yml` + `.github/workflows/deploy.yml` | GitHub Actions: lint, test, build, push Docker images, deploy to staging/production. Matrix testing across Node versions. |
| **monitoring** | `api/src/lib/monitoring.ts` + `api/src/middleware/request-logger.ts` | Prometheus metrics (request count, latency, errors, active users), structured JSON logging (pino), health check endpoint with DB/Redis connectivity checks. |

## Post-Agent Integration
After all 20 agents complete, a final integration agent will:
1. Update `api/src/index.ts` to wire all new routes
2. Add worker initialization to the server startup
3. Add SSE endpoint
4. Ensure all imports resolve
5. Final commit
