# Changelog

All notable changes to AdNexus AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- No pending changes

---

## [1.0.0] - 2026-05-28

### Added - Production Infrastructure
- **Supabase Project** — PostgreSQL database with full schema (14 tables) and seed data
- **Authentication** — Working signup/signin flow via Supabase Auth with JWT tokens
- **Redis Integration** — Connected to Docker Redis for BullMQ background job queues
- **Meta OAuth Routes** — Full OAuth flow (connect → callback → token storage → disconnect) at `/api/v1/auth/meta/connect` and `/api/v1/auth/meta/callback`
- **Draft-First Approval Workflow** — All campaign mutations create drafts; approval executes via `DraftExecutionEngine` calling real Meta Marketing API
- **MCP Server** — 27-tool FastMCP server tested and operational (stdio transport, JWT auth)
- **Frontend API Client** — Full Axios-based client with auth interceptor, circuit breaker, retry, request dedup, and SSE support
- **Environment Configuration** — Backend `.env` with Supabase keys, JWT secrets, Redis URL; Frontend `.env` with Supabase URL, anon key, and API URL

### Fixed
- Backend TypeScript compilation errors (missing modules, incorrect imports, permissions)
- `db/connection.ts` lazy pool initialization (no-op when DATABASE_URL not configured)
- RLS policy on `workspace_members` preventing service-role queries
- Frontend `handleConnect` wired to real API with OAuth redirect
- `isDemoMode()` gate: when `VITE_API_URL` is set, all API calls go live

---

## [0.1.0] - 2025-05-21

### Added - Core Platform

- **Dashboard** - Real-time KPI overview with spend trends, campaign status cards, and performance summary widgets
- **Campaign Management** - Full CRUD for campaigns across all platforms with status badges, filtering, and sorting
- **Campaign Creation Wizard** - Step-by-step campaign builder with platform-specific configuration options
- **Campaign Templates** - Pre-built and custom reusable campaign configurations
- **A/B Testing Framework** - Built-in split testing for ads, audiences, and creatives
- **Budget Pacing** - Real-time budget spend tracking with pacing alerts and visual indicators
- **Campaign Calendar** - Visual timeline view of campaign schedules and key dates
- **Drafts System** - Save, edit, and approve campaign drafts before publishing
- **Ad Management** - Grid-based ad library with performance overlays and creative organization
- **Ad Creative Studio** - AI-assisted creative generation and editing tools
- **Export Center** - Bulk export campaigns, ads, and reports to CSV/Excel/PDF

### Added - AI & Intelligence

- **AI Chat Agent** - Conversational interface for performance queries with natural language understanding
- **Smart Suggestions** - AI-generated optimization recommendations with confidence scores
- **Predictive Analytics** - Forecast campaign performance trends using historical data
- **Anomaly Detection** - Automatic alerts for unusual metric changes and performance spikes
- **AI Creative Generation** - Generate ad copy variations and creative concepts with AI
- **Morning Brief** - Daily automated performance summary delivered via email/in-app
- **Portfolio Optimizer** - AI-powered budget reallocation across campaigns based on ROAS
- **Cohort Analysis** - User cohort segmentation with retention and conversion analytics
- **Forecasting Engine** - Predictive modeling for spend, impressions, and conversions

### Added - Integrations

- **Google Ads Integration** - OAuth 2.0 connection with full campaign sync and reporting
- **Meta Ads Integration** - Facebook & Instagram campaign management with audience sync
- **TikTok Ads Integration** - TikTok For Business account connection and campaign sync
- **LinkedIn Ads Integration** - LinkedIn Campaign Manager sync for B2B campaigns
- **Snapchat Ads Integration** - Snap Ads API connection and campaign management
- **Slack Integration** - Notifications and approvals via Slack with webhook support
- **Stripe Billing** - Subscription management, invoicing, and usage-based billing
- **API Keys Management** - Generate and manage API access keys for third-party integrations
- **Webhook Endpoints** - Receive real-time platform events with configurable payloads
- **Developer Portal** - API documentation, SDK references, and integration guides

### Added - UX & Platform

- **Dark Mode** - Full dark theme support across all 50+ pages with system preference detection
- **Command Palette** - Power-user keyboard navigation with fuzzy search (Cmd+K)
- **Keyboard Shortcuts** - Comprehensive shortcut system for common actions
- **Global Search** - Full-text search across campaigns, ads, reports, and settings
- **Notifications Center** - In-app alerts for campaigns, AI suggestions, and team activity
- **Onboarding Wizard** - Interactive first-time user experience with product tour
- **Mobile Responsive** - Fully responsive design optimized for tablet and mobile
- **Accessibility (a11y)** - WCAG 2.1 AA compliant with screen reader support
- **Offline Support** - Service worker caching with offline page indicators
- **PWA Ready** - Progressive Web App with install prompt and push notifications
- **Rate Limit Handling** - Graceful API rate limit management with user-friendly modals
- **Session Management** - Secure session expiry warnings and automatic renewal

### Added - Analytics & Reporting

- **Performance Analytics** - Interactive charts (line, bar, area, pie, funnel) with date range selection
- **Custom Report Builder** - Drag-and-drop report creation with 50+ available metrics
- **Attribution Dashboard** - First-click, last-click, and linear attribution modeling
- **Scheduled Reports** - Automated daily/weekly/monthly report delivery via email
- **White-Label Reports** - Custom branded reports with agency logo and colors
- **Credit Usage Tracking** - Monitor AI credit consumption and plan limits
- **Competitive Intelligence** - Benchmark performance against industry competitors

### Added - Team & Account

- **Authentication** - Multi-provider OAuth (Google, GitHub, LinkedIn) + email/password with MFA
- **Role-Based Access Control** - Admin, Editor, Viewer, and custom role definitions
- **Team Management** - Invite members, assign roles, and manage permissions
- **Audit Log** - Complete audit trail of all actions across the platform with filtering
- **Settings** - Profile, billing, notification preferences, appearance, and API keys
- **Agency Mode** - Client scoping, white-label branding, and multi-account management
- **Performance Goals** - Set and track KPI targets with visual progress indicators

### Added - Infrastructure

- **TypeScript Frontend** - React 18 + TypeScript 5 with Vite build tooling
- **Express Backend** - TypeScript REST API with structured routing and middleware
- **Supabase Database** - PostgreSQL with Row Level Security and real-time subscriptions
- **Redis Caching** - High-performance caching layer for API responses and sessions
- **Background Workers** - BullMQ job processing for reports, syncs, and AI tasks
- **MCP Server** - Model Context Protocol server for AI agent tool orchestration
- **CI/CD Pipelines** - GitHub Actions for testing, staging, and production deployments
- **Docker Compose** - Full containerized development and production environments
- **NGINX Config** - Production-ready reverse proxy with SSL and compression
- **Monitoring & Alerts** - Grafana dashboards, health checks, and error tracking
- **Security Hardening** - Rate limiting, encryption, CORS, input validation, and SQL injection protection

### Technical Details

| Metric | Count |
|--------|-------|
| Frontend Pages | 50+ |
| UI Components | 75+ |
| Backend Routes | 29 |
| API Services | 20 |
| Background Workers | 14 |
| Database Tables | 40+ |
| Test Suites | 25+ |
| Design Documents | 30 |
| Research Documents | 20+ |
| CI/CD Workflows | 4 |
| Docker Configs | 3 |

---

## Release History

| Version | Date | Status |
|---------|------|--------|
| 0.1.0 | 2025-05-21 | Initial Release |

---

*For upcoming features and roadmap, see [plan.md](plan.md) and [plan-phase2.md](plan-phase2.md).*
