<p align="center">
  <img src="https://raw.githubusercontent.com/adnexus-ai/brand/main/logo-dark.svg" alt="AdNexus AI" width="200"/>
</p>

<h1 align="center">AdNexus AI — Backend Deployment Guide</h1>

<p align="center">
  <strong>Production-ready deployment guide for the AdNexus AI full-stack backend.</strong><br/>
  Covers Docker Compose, SSL/TLS, monitoring, OAuth configuration, and scaling.
</p>

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Variables](#2-environment-variables)
3. [Database Setup](#3-database-setup)
4. [Supabase Setup](#4-supabase-setup)
5. [Platform OAuth Apps](#5-platform-oauth-apps)
6. [Docker Compose Deployment](#6-docker-compose-deployment)
7. [SSL / TLS Configuration](#7-ssl--tls-configuration)
8. [Monitoring & Observability](#8-monitoring--observability)
9. [Scaling Strategies](#9-scaling-strategies)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

### 1.1 System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU**   | 2 vCPU  | 4+ vCPU     |
| **RAM**   | 4 GB    | 8+ GB       |
| **Disk**  | 20 GB   | 50+ GB SSD  |
| **OS**    | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

### 1.2 Required Software

Install the following on your deployment host before proceeding.

#### Docker (27.0+)

```bash
# Remove old versions
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
  sudo apt-get remove -y $pkg
done

# Install Docker from official repository
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify
sudo docker --version   # Docker version 27.x.x
sudo docker compose version  # v2.x.x
```

#### Docker Compose (v2.27+)

Docker Compose v2 is included with the Docker Engine installation above. Verify:

```bash
docker compose version
# Expected: Docker Compose version v2.27.x or higher
```

#### Node.js 20+ (for local development / building)

```bash
# Using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

node --version   # v20.x.x
npm --version    # 10.x.x
```

#### Python 3.11+ (for MCP server local dev)

```bash
sudo apt-get install -y python3.11 python3.11-venv python3-pip
python3 --version  # Python 3.11.x
```

#### PostgreSQL 16+ (client tools)

```bash
sudo apt-get install -y postgresql-client-16
psql --version  # psql (PostgreSQL) 16.x
```

#### Redis 7+ (client tools — optional)

```bash
sudo apt-get install -y redis-tools
redis-cli --version  # redis-cli 7.x
```

#### Nginx (for reverse proxy & SSL)

```bash
sudo apt-get install -y nginx
certbot --version  # certbot 2.x (see SSL section)
```

### 1.3 Firewall Rules

Open the following ports:

| Port | Protocol | Purpose | Access |
|------|----------|---------|--------|
| 22   | TCP      | SSH     | Your IP only |
| 80   | TCP      | HTTP    | Public (for ACME/SSL) |
| 443  | TCP      | HTTPS   | Public |
| 3000 | TCP      | API     | Internal / Nginx only |
| 8000 | TCP      | MCP     | Internal / Nginx only |
| 5432 | TCP      | PostgreSQL | Internal / Docker only |
| 6379 | TCP      | Redis   | Internal / Docker only |

```bash
# UFW rules
sudo ufw default deny incoming
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow from 172.0.0.0/8  # Docker network
sudo ufw enable
```

### 1.4 Domain & DNS

Before deployment, configure your DNS:

```
A     api.adnexus.ai     → <your-server-ip>
A     mcp.adnexus.ai     → <your-server-ip>
CNAME *.adnexus.ai       → adnexus.ai
```

> Replace `adnexus.ai` with your actual domain throughout this guide.

---

## 2. Environment Variables

### 2.1 Create the `.env` File

Copy the example template and fill in your values:

```bash
cd /mnt/agents/output/adnexus-backend
cp .env.example .env
chmod 600 .env        # Restrict permissions — contains secrets
```

### 2.2 Complete `.env` Reference

Below is the full production `.env` template with all required and optional variables.

```bash
# =============================================================================
# AdNexus AI — Production Environment Configuration
# =============================================================================
# Copy this file to .env and fill in all values. NEVER commit .env to git.
#
# Security checklist:
#   [ ] JWT_SECRET is a cryptographically random 256-bit string
#   [ ] DB_PASSWORD is unique and 32+ characters
#   [ ] All API keys are from production (not sandbox/test) accounts
#   [ ] File permissions: chmod 600 .env
# =============================================================================

# ------------------------------------------------------------------------------
# 1. Core Application Settings
# ------------------------------------------------------------------------------

# Runtime environment — must be 'production' for deploys
NODE_ENV=production

# API server port (inside container)
PORT=3000

# Frontend URL (for CORS and email links)
FRONTEND_URL=https://app.adnexus.ai

# ------------------------------------------------------------------------------
# 2. Database — PostgreSQL 16
# ------------------------------------------------------------------------------

# Strong password for the PostgreSQL adnexus user
# Generate: openssl rand -base64 32
DB_PASSWORD=<CHANGE_ME_TO_A_STRONG_PASSWORD>

# Full DATABASE_URL is auto-constructed in docker-compose.prod.yml:
# postgresql://adnexus:${DB_PASSWORD}@postgres:5432/adnexus

# ------------------------------------------------------------------------------
# 3. Supabase (Backend-as-a-Service)
# ------------------------------------------------------------------------------

# Your Supabase project URL
# Example: https://abcdefgh12345678.supabase.co
SUPABASE_URL=https://<your-project-ref>.supabase.co

# Supabase service_role key (NOT the anon key — this has admin privileges)
# Found in: Supabase Dashboard → Project Settings → API → service_role key
SUPABASE_SERVICE_KEY=<your-service-role-key>

# Supabase anon key (for frontend auth)
# Found in: Supabase Dashboard → Project Settings → API → anon/public key
SUPABASE_ANON_KEY=<your-anon-key>

# ------------------------------------------------------------------------------
# 4. Authentication — JWT
# ------------------------------------------------------------------------------

# Secret key for signing JSON Web Tokens
# Generate with: openssl rand -base64 32
JWT_SECRET=<256-bit-random-secret>

# Token expiry (optional — defaults shown)
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ------------------------------------------------------------------------------
# 5. MCP (Model Context Protocol)
# ------------------------------------------------------------------------------

# API key for securing API ↔ MCP server communication
# Generate with: openssl rand -base64 32
MCP_API_KEY=<mcp-inter-service-secret>

# MCP transport mode: stdio | http
MCP_TRANSPORT=http

# ------------------------------------------------------------------------------
# 6. Meta (Facebook) Marketing API
# ------------------------------------------------------------------------------

# From Meta for Developers → App Dashboard → Settings → Basic
META_APP_ID=<your-meta-app-id>
META_APP_SECRET=<your-meta-app-secret>

# Graph API version (optional — default shown)
META_API_VERSION=v19.0

# ------------------------------------------------------------------------------
# 7. Google Ads API
# ------------------------------------------------------------------------------

# From Google Cloud Console → APIs & Services → Credentials
GOOGLE_CLIENT_ID=<your-oauth-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-oauth-client-secret>

# From Google Ads API Center (apply at: https://ads.google.com/aw/apicenter)
GOOGLE_DEVELOPER_TOKEN=<your-developer-token>

# ------------------------------------------------------------------------------
# 8. TikTok for Business API
# ------------------------------------------------------------------------------

# From TikTok for Developers → App Management → Your App
TIKTOK_APP_ID=<your-tiktok-app-id>
TIKTOK_APP_SECRET=<your-tiktok-app-secret>

# ------------------------------------------------------------------------------
# 9. Snapchat Marketing API
# ------------------------------------------------------------------------------

# From Snap Kit Developer Portal → Your App → Credentials
SNAP_CLIENT_ID=<your-snap-client-id>
SNAP_CLIENT_SECRET=<your-snap-client-secret>

# ------------------------------------------------------------------------------
# 10. Stripe Payments
# ------------------------------------------------------------------------------

# Stripe Secret Key (sk_live_* for production, sk_test_* for testing)
STRIPE_SECRET_KEY=sk_live_<your-secret-key>

# Stripe Publishable Key (for frontend)
STRIPE_PUBLISHABLE_KEY=pk_live_<your-publishable-key>

# Stripe Webhook Endpoint Secret (set after creating webhook endpoint)
STRIPE_WEBHOOK_SECRET=whsec_<your-webhook-secret>

# ------------------------------------------------------------------------------
# 11. AI / LLM Providers
# ------------------------------------------------------------------------------

# OpenAI API Key (for GPT-4o, embeddings, etc.)
OPENAI_API_KEY=sk-proj-<your-openai-key>

# Anthropic API Key (for Claude models)
ANTHROPIC_API_KEY=sk-ant-<your-anthropic-key>

# ------------------------------------------------------------------------------
# 12. Email (Resend)
# ------------------------------------------------------------------------------

# From Resend Dashboard → API Keys
RESEND_API_KEY=re_<your-resend-api-key>

# From address for transactional emails
EMAIL_FROM=noreply@adnexus.ai
EMAIL_FROM_NAME="AdNexus AI"

# ------------------------------------------------------------------------------
# 13. Redis (Cache & Job Queue)
# ------------------------------------------------------------------------------

# Redis URL is auto-constructed in docker-compose.prod.yml:
# REDIS_URL=redis://redis:6379

# Optional: Redis password (if configured)
# REDIS_PASSWORD=

# ------------------------------------------------------------------------------
# 14. Optional — S3-Compatible Object Storage
# ------------------------------------------------------------------------------

# For creative asset uploads (optional — disable if not needed)
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_REGION=us-east-1

# ------------------------------------------------------------------------------
# 15. Optional — Sentry Error Tracking
# ------------------------------------------------------------------------------

SENTRY_DSN=https://<key>@<project>.ingest.sentry.io/<project-id>
SENTRY_ENVIRONMENT=production

# ------------------------------------------------------------------------------
# 16. Optional — Feature Flags
# ------------------------------------------------------------------------------

ENABLE_AI_CREATIVE=true
ENABLE_MORNING_BRIEF=true
ENABLE_AB_TESTING=true
```

---

## 3. Database Setup

### 3.1 Schema Initialization

The PostgreSQL schema is defined in `database/schema.sql`. When using Docker Compose, this file is automatically mounted to `/docker-entrypoint-initdb.d/` and executed on first container startup.

**Manual initialization** (if needed):

```bash
# 1. Connect to your PostgreSQL instance
psql postgresql://adnexus:<DB_PASSWORD>@localhost:5432/adnexus \
  -f database/schema.sql

# 2. Verify tables were created
psql postgresql://adnexus:<DB_PASSWORD>@localhost:5432/adnexus \
  -c "\dt" -c "\d users" -c "\d workspaces"

# 3. Expected output:
#                    List of relations
#    Schema |        Name        | Type  |  Owner
#   --------+--------------------+-------+---------
#    public | users              | table | adnexus
#    public | workspaces         | table | adnexus
#    public | workspace_members  | table | adnexus
#    public | ad_accounts        | table | adnexus
#    public | campaigns          | table | adnexus
#    public | adsets             | table | adnexus
#    public | ads                | table | adnexus
#    public | drafts             | table | adnexus
#    public | automation_rules   | table | adnexus
#    public | audit_log          | table | adnexus
#    public | api_keys           | table | adnexus
#    public | webhooks           | table | adnexus
#    public | ai_credits         | table | adnexus
#    public | credit_usage_log   | table | adnexus
#    public | goals              | table | adnexus
#    public | scheduled_reports  | table | adnexus
#    public | events             | table | adnexus
#    public | morning_briefs     | table | adnexus
#    public | report_results     | table | adnexus
#    public | auth_passwords     | table | adnexus
#    public | password_resets    | table | adnexus
```

### 3.2 Schema Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CORE TABLES                               │
├─────────────────────────────────────────────────────────────────┤
│ users            → Workspace members & profiles                  │
│ workspaces       → Multi-tenant workspace containers             │
│ workspace_members→ Many-to-many user/workspace roles             │
├─────────────────────────────────────────────────────────────────┤
│                       AD PLATFORM TABLES                         │
├─────────────────────────────────────────────────────────────────┤
│ ad_accounts      → OAuth-connected platform accounts             │
│ campaigns        → Cross-platform campaign data                  │
│ adsets           → Ad groups / ad sets                           │
│ ads              → Individual ads with fatigue tracking          │
├─────────────────────────────────────────────────────────────────┤
│                      DIFFERENTIATOR TABLES                       │
├─────────────────────────────────────────────────────────────────┤
│ drafts           → AI-proposed changes awaiting approval         │
│ automation_rules → User-defined campaign automation              │
│ audit_log        → Complete audit trail (AI + human actions)     │
├─────────────────────────────────────────────────────────────────┤
│                      FEATURE TABLES                              │
├─────────────────────────────────────────────────────────────────┤
│ goals            → Campaign performance targets                  │
│ morning_briefs   → Daily AI-generated summary reports            │
│ scheduled_reports→ Recurring report configurations               │
│ report_results   → Generated report outputs                      │
│ ai_credits       → Per-workspace AI usage quotas                 │
│ credit_usage_log → Detailed AI credit consumption                │
│ api_keys         → Workspace-scoped API access keys              │
│ webhooks         → Outgoing webhook configurations               │
│ events           → Background job queue events                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Seed Data (Optional)

The `database/seed.sql` file contains sample data for development. **Do NOT run in production.**

```bash
# Development only:
psql postgresql://adnexus:<DB_PASSWORD>@localhost:5432/adnexus \
  -f database/seed.sql
```

### 3.4 Database Backup Strategy

```bash
# Automated daily backup via cron (add to crontab)
0 2 * * * /usr/bin/pg_dump postgresql://adnexus:PASSWORD@localhost:5432/adnexus | gzip > /backup/adnexus-$(date +\%Y\%m\%d).sql.gz

# Retain 7 days
0 3 * * * find /backup -name "adnexus-*.sql.gz" -mtime +7 -delete
```

---

## 4. Supabase Setup

Supabase provides authentication, Row Level Security (RLS), and real-time subscriptions.

### 4.1 Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com) and sign in.
2. Click **New Project**.
3. Fill in:
   - **Organization**: Your org
   - **Project Name**: `adnexus-production`
   - **Database Password**: Use a strong password (save in a password manager)
   - **Region**: Choose closest to your API server (e.g., `us-east-1`)
4. Click **Create new project** and wait (~2 minutes).

### 4.2 Get API Keys

1. Navigate to **Project Settings → API**.
2. Copy the following values into your `.env`:

| Key | Location in Supabase | `.env` Variable |
|-----|---------------------|-----------------|
| `URL` | Project URL | `SUPABASE_URL` |
| `service_role key` | service_role secret | `SUPABASE_SERVICE_KEY` |
| `anon key` | anon/public key | `SUPABASE_ANON_KEY` |

> **CRITICAL**: The `service_role` key bypasses RLS. Treat it as a root password. Never expose it in frontend code.

### 4.3 Configure Authentication

1. Go to **Authentication → Providers**.
2. Enable the following providers:

#### Email Auth (default — required)
- **Enabled**: ON
- **Confirm email**: ON (recommended for production)
- **Secure email change**: ON

#### Google OAuth (optional)
- **Enabled**: ON
- **Client ID**: Your Google OAuth Client ID
- **Secret**: Your Google OAuth Client Secret

#### GitHub OAuth (optional)
- **Enabled**: ON
- **Client ID**: Your GitHub App Client ID
- **Secret**: Your GitHub App Client Secret

### 4.4 Configure Row Level Security (RLS)

The schema SQL (`database/schema.sql`) already includes RLS policies. After connecting Supabase to your database, verify policies are active:

```sql
-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN (
  'users', 'workspaces', 'workspace_members', 'ad_accounts',
  'campaigns', 'adsets', 'ads', 'drafts', 'automation_rules',
  'audit_log', 'api_keys', 'webhooks', 'ai_credits', 'goals',
  'scheduled_reports', 'events', 'morning_briefs', 'report_results'
);

-- All should show: rowsecurity = true
```

### 4.5 Site URL & Redirect URLs

1. Go to **Authentication → URL Configuration**.
2. Set:
   - **Site URL**: `https://app.adnexus.ai`
   - **Redirect URLs**: Add `https://app.adnexus.ai/auth/callback`

### 4.6 Supabase Security Checklist

- [ ] Project uses a strong database password
- [ ] `service_role` key is stored securely (never in frontend)
- [ ] RLS is enabled on all tables
- [ ] Email confirmation is enabled
- [ ] Only required OAuth providers are enabled
- [ ] Redirect URLs are explicitly configured

---

## 5. Platform OAuth Apps

AdNexus AI connects to four advertising platforms via OAuth. You must register a developer app on each platform you intend to support.

### 5.1 Meta (Facebook) Marketing API

#### Step-by-Step Setup

1. Go to [https://developers.facebook.com/apps](https://developers.facebook.com/apps).
2. Click **Create App**.
3. Select app type: **Business**.
4. Fill in:
   - **App Name**: `AdNexus AI`
   - **App Contact Email**: your email
   - **Business Account**: Select your Business Manager account
5. Click **Create App**.

6. Add the **Marketing API** product:
   - On the left sidebar, click **Add Product**.
   - Find **Marketing API** and click **Set Up**.

7. Configure OAuth:
   - Go to **App Settings → Basic**.
   - Add your **App Domains**: `adnexus.ai`, `app.adnexus.ai`
   - Add **Valid OAuth Redirect URIs**:
     ```
     https://api.adnexus.ai/api/v1/auth/meta/callback
     ```

8. Copy credentials:
   - **App ID** → `META_APP_ID`
   - **App Secret** → `META_APP_SECRET`

9. Set app to **Live Mode**:
   - Toggle from "Development" to "Live" at the top of the dashboard.
   - Complete Business Verification if prompted.

#### Required Permissions

```
ads_read              → Read ad account data
ads_management        → Manage campaigns, adsets, ads
business_management   → Access business-level assets
```

#### Access Token Flow

```
User clicks "Connect Meta" → Redirects to Facebook OAuth
→ User grants permissions → Redirect to our callback
→ We exchange code for access_token + refresh_token
→ Store encrypted tokens in ad_accounts table
→ Use tokens for all Marketing API calls
```

### 5.2 Google Ads API

#### Step-by-Step Setup

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com).
2. Create or select a project.
3. Navigate to **APIs & Services → Library**.
4. Enable the **Google Ads API**.
5. Go to **APIs & Services → Credentials**.
6. Click **Create Credentials → OAuth client ID**.
7. Configure consent screen (if first time):
   - **User Type**: External
   - **App Name**: `AdNexus AI`
   - **User support email**: your email
   - **Developer contact email**: your email
   - Add scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/adwords`
8. Create OAuth Client ID:
   - **Application type**: Web application
   - **Name**: `AdNexus AI Web Client`
   - **Authorized redirect URIs**:
     ```
     https://api.adnexus.ai/api/v1/auth/google/callback
     ```
9. Copy credentials:
   - **Client ID** → `GOOGLE_CLIENT_ID`
   - **Client Secret** → `GOOGLE_CLIENT_SECRET`

10. Apply for a **Developer Token**:
    - Go to [https://ads.google.com/aw/apicenter](https://ads.google.com/aw/apicenter).
    - Apply for a **Developer Token** (takes 1-5 business days for approval).
    - Copy the token → `GOOGLE_DEVELOPER_TOKEN`.

#### Required Scopes

```
openid, email, profile
https://www.googleapis.com/auth/adwords
```

### 5.3 TikTok for Business API

#### Step-by-Step Setup

1. Go to [https://business.tiktok.com](https://business.tiktok.com).
2. Navigate to **Developer Portal → Apps**.
3. Click **Create App**.
4. Fill in:
   - **App Name**: `AdNexus AI`
   - **App Description**: Ad campaign management platform
   - **App Icon**: Upload your app icon
5. Configure OAuth:
   - Add **Redirect URI**:
     ```
     https://api.adnexus.ai/api/v1/auth/tiktok/callback
     ```
   - Request permissions:
     - `ads_read` — Read ad data
     - `ads_management` — Manage campaigns
     - `bc_management` — Business Center management
     - `tt_user_info` — Basic user info
6. Submit for review (takes 1-3 business days).
7. Once approved, copy credentials:
   - **App ID** → `TIKTOK_APP_ID`
   - **App Secret** → `TIKTOK_APP_SECRET`

### 5.4 Snapchat Marketing API

#### Step-by-Step Setup

1. Go to [https://kit.snapchat.com/manage](https://kit.snapchat.com/manage).
2. Click **Create an App**.
3. Fill in:
   - **App Name**: `AdNexus AI`
   - **App Description**: Ad campaign management
4. Configure OAuth:
   - Add **Redirect URIs**:
     ```
     https://api.adnexus.ai/api/v1/auth/snap/callback
     ```
   - Request scopes:
     - `snapchat-marketing-api` — Access Marketing API
     - `snapchat-campaign-management` — Campaign CRUD
5. Submit for review (takes 2-5 business days).
6. Once approved, copy credentials:
   - **Client ID** → `SNAP_CLIENT_ID`
   - **Client Secret** → `SNAP_CLIENT_SECRET`

### 5.5 OAuth Callback URLs Summary

| Platform | Callback URL |
|----------|-------------|
| Meta     | `https://api.adnexus.ai/api/v1/auth/meta/callback` |
| Google   | `https://api.adnexus.ai/api/v1/auth/google/callback` |
| TikTok   | `https://api.adnexus.ai/api/v1/auth/tiktok/callback` |
| Snap     | `https://api.adnexus.ai/api/v1/auth/snap/callback` |

### 5.6 OAuth Security Notes

- Store access tokens and refresh tokens **encrypted** in the `ad_accounts` table.
- Tokens are automatically refreshed before expiry (handled by the API server).
- If a token refresh fails, the account status is set to `refresh_needed`.
- Users receive an email notification to reconnect the account.

---

## 6. Docker Compose Deployment

### 6.1 Project Structure

```
adnexus-backend/
├── docker-compose.prod.yml    # Production orchestration
├── .env                       # Environment variables (not in git)
├── .env.example               # Template for env variables
├── DEPLOY.md                  # This file
│
├── api/                       # Node.js/Express API server
│   ├── Dockerfile              # Multi-stage build
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts            # Express app entry
│       ├── config.ts           # Environment config
│       ├── routes/             # API route handlers
│       ├── services/           # Business logic
│       ├── workers/            # Background job processors
│       ├── middleware/         # Auth, rate limiting, logging
│       ├── lib/                # Shared utilities
│       └── realtime/           # SSE for real-time updates
│
├── mcp-server/                # Python/FastMCP AI server
│   ├── Dockerfile
│   ├── requirements.txt
│   └── server.py               # MCP tool definitions
│
└── database/
    ├── schema.sql              # Full PostgreSQL schema
    └── seed.sql                # Development seed data
```

### 6.2 Production Docker Compose (`docker-compose.prod.yml`)

```yaml
# =============================================================================
# AdNexus AI — Production Docker Compose
# =============================================================================
# Orchestrates the full AdNexus backend stack:
#   PostgreSQL 16, Redis 7, API server, MCP server, Workers, Nginx
#
# Usage:
#   docker compose -f docker-compose.prod.yml up -d
#   docker compose -f docker-compose.prod.yml logs -f api
#   docker compose -f docker-compose.prod.yml down
# =============================================================================

name: adnexus

services:
  # ---------------------------------------------------------------------------
  # PostgreSQL 16 — Primary database with persistent storage
  # ---------------------------------------------------------------------------
  postgres:
    image: postgres:16-alpine
    container_name: adnexus-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: adnexus
      POSTGRES_USER: adnexus
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
    ports:
      - "127.0.0.1:5432:5432"   # Bind to localhost only
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U adnexus -d adnexus"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - adnexus-network
    # Production resource limits
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 256M
          cpus: '0.25'

  # ---------------------------------------------------------------------------
  # Redis 7 — Cache + Job Queue (BullMQ) + Session Store
  # ---------------------------------------------------------------------------
  redis:
    image: redis:7-alpine
    container_name: adnexus-redis
    restart: unless-stopped
    command: >
      redis-server
      --appendonly yes
      --appendfsync everysec
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --requirepass ${REDIS_PASSWORD:-}
    volumes:
      - redis_data:/data
    ports:
      - "127.0.0.1:6379:6379"   # Bind to localhost only
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - adnexus-network
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  # ---------------------------------------------------------------------------
  # AdNexus API Server — Node.js/Express REST API
  # ---------------------------------------------------------------------------
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
      target: production
    container_name: adnexus-api
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"   # Internal only — Nginx proxies to this
    environment:
      # App
      NODE_ENV: production
      PORT: 3000

      # Database
      DATABASE_URL: postgresql://adnexus:${DB_PASSWORD}@postgres:5432/adnexus

      # Cache / Queue
      REDIS_URL: redis://redis:6379

      # Supabase
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}

      # Authentication
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-7d}
      JWT_REFRESH_EXPIRES_IN: ${JWT_REFRESH_EXPIRES_IN:-30d}

      # Meta (Facebook) Ads
      META_APP_ID: ${META_APP_ID}
      META_APP_SECRET: ${META_APP_SECRET}
      META_API_VERSION: ${META_API_VERSION:-v19.0}

      # Google Ads
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      GOOGLE_DEVELOPER_TOKEN: ${GOOGLE_DEVELOPER_TOKEN}

      # TikTok Ads
      TIKTOK_APP_ID: ${TIKTOK_APP_ID}
      TIKTOK_APP_SECRET: ${TIKTOK_APP_SECRET}

      # Snapchat Ads
      SNAP_CLIENT_ID: ${SNAP_CLIENT_ID}
      SNAP_CLIENT_SECRET: ${SNAP_CLIENT_SECRET}

      # Stripe
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      STRIPE_PUBLISHABLE_KEY: ${STRIPE_PUBLISHABLE_KEY}

      # AI / LLM
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}

      # Email
      RESEND_API_KEY: ${RESEND_API_KEY}
      EMAIL_FROM: ${EMAIL_FROM}
      EMAIL_FROM_NAME: ${EMAIL_FROM_NAME}

      # CORS
      FRONTEND_URL: ${FRONTEND_URL}

      # MCP
      MCP_API_KEY: ${MCP_API_KEY}

      # Optional
      SENTRY_DSN: ${SENTRY_DSN:-}
      SENTRY_ENVIRONMENT: ${SENTRY_ENVIRONMENT:-production}
      ENABLE_AI_CREATIVE: ${ENABLE_AI_CREATIVE:-true}
      ENABLE_MORNING_BRIEF: ${ENABLE_MORNING_BRIEF:-true}
      ENABLE_AB_TESTING: ${ENABLE_AB_TESTING:-true}

    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - adnexus-network
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 256M
          cpus: '0.25'

  # ---------------------------------------------------------------------------
  # MCP Server — Python/FastMCP AI integration server
  # ---------------------------------------------------------------------------
  mcp-server:
    build:
      context: ./mcp-server
      dockerfile: Dockerfile
      target: production
    container_name: adnexus-mcp-server
    restart: unless-stopped
    ports:
      - "127.0.0.1:8000:8000"   # Internal only
    environment:
      ADNEXUS_API_URL: http://api:3000/api/v1
      ADNEXUS_MCP_API_KEY: ${MCP_API_KEY}
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "python -c \"import urllib.request; urllib.request.urlopen('http://localhost:8000/health')\""]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - adnexus-network
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  # ---------------------------------------------------------------------------
  # Background Workers — BullMQ job processors
  # ---------------------------------------------------------------------------
  workers:
    build:
      context: ./api
      dockerfile: Dockerfile
      target: production
    container_name: adnexus-workers
    restart: unless-stopped
    command: ["node", "dist/workers/index.js"]
    environment:
      NODE_ENV: production
      WORKER_MODE: "true"
      DATABASE_URL: postgresql://adnexus:${DB_PASSWORD}@postgres:5432/adnexus
      REDIS_URL: redis://redis:6379
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
      JWT_SECRET: ${JWT_SECRET}
      META_APP_ID: ${META_APP_ID}
      META_APP_SECRET: ${META_APP_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      GOOGLE_DEVELOPER_TOKEN: ${GOOGLE_DEVELOPER_TOKEN}
      TIKTOK_APP_ID: ${TIKTOK_APP_ID}
      TIKTOK_APP_SECRET: ${TIKTOK_APP_SECRET}
      SNAP_CLIENT_ID: ${SNAP_CLIENT_ID}
      SNAP_CLIENT_SECRET: ${SNAP_CLIENT_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      RESEND_API_KEY: ${RESEND_API_KEY}
      MCP_API_KEY: ${MCP_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - adnexus-network
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  # ---------------------------------------------------------------------------
  # Nginx — Reverse Proxy + SSL termination
  # ---------------------------------------------------------------------------
  nginx:
    image: nginx:alpine
    container_name: adnexus-nginx
    restart: unless-stopped
    ports:
      - "80:80"       # HTTP → redirects to HTTPS
      - "443:443"     # HTTPS
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - certbot-data:/etc/letsencrypt
      - certbot-www:/var/www/certbot
    depends_on:
      api:
        condition: service_healthy
      mcp-server:
        condition: service_healthy
    networks:
      - adnexus-network
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: '0.25'

# =============================================================================
# Named Volumes
# =============================================================================
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  certbot-data:
    driver: local
  certbot-www:
    driver: local

# =============================================================================
# Networks
# =============================================================================
networks:
  adnexus-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### 6.3 Deploy Steps

```bash
# 1. Navigate to the backend directory
cd /mnt/agents/output/adnexus-backend

# 2. Ensure .env is configured
cat .env | grep -E '^[A-Z]' | wc -l   # Should show ~30+ lines

# 3. Pull latest images and build
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml build

# 4. Start services (database first, then dependents)
docker compose -f docker-compose.prod.yml up -d

# 5. Verify all services are healthy
docker compose -f docker-compose.prod.yml ps
# STATUS should show "healthy" for all services

# 6. Check logs
docker compose -f docker-compose.prod.yml logs -f api

# 7. Test health endpoint
curl -s http://localhost:3000/health | jq .
# Expected: {"status":"ok","version":"1.0.0",...}
```

### 6.4 Deployment Checklist

- [ ] `.env` file created with all variables filled
- [ ] Database password is strong (32+ chars, random)
- [ ] `JWT_SECRET` is a 256-bit random string
- [ ] All platform OAuth apps are registered and approved
- [ ] Supabase project is created and configured
- [ ] DNS records point to the server IP
- [ ] Firewall allows ports 80, 443, 22 only
- [ ] Docker and Docker Compose are installed (latest)
- [ ] SSL certificates are configured (see Section 7)
- [ ] Health checks return 200 OK

---

## 7. SSL / TLS Configuration

### 7.1 Let's Encrypt with Certbot

```bash
# 1. Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 2. Obtain certificates for your domains
sudo certbot certonly --standalone \
  -d api.adnexus.ai \
  -d mcp.adnexus.ai \
  --agree-tos \
  --no-eff-email \
  -m admin@adnexus.ai

# 3. Certificates are stored at:
#    /etc/letsencrypt/live/api.adnexus.ai/fullchain.pem
#    /etc/letsencrypt/live/api.adnexus.ai/privkey.pem

# 4. Auto-renewal cronjob (Certbot usually sets this up)
sudo certbot renew --dry-run

# 5. Add to crontab for auto-renewal
0 3 * * * /usr/bin/certbot renew --quiet --deploy-hook "docker exec adnexus-nginx nginx -s reload"
```

### 7.2 Nginx SSL Configuration (`nginx/nginx.conf`)

```nginx
# =============================================================================
# AdNexus AI — Nginx Production Configuration
# =============================================================================
# Handles: reverse proxying, SSL termination, rate limiting, static compression
# =============================================================================

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging format
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api_general:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=api_auth:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api_webhook:10m rate=100r/s;
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # ---------------------------------------------------------------------------
    # HTTP → HTTPS redirect
    # ---------------------------------------------------------------------------
    server {
        listen 80;
        server_name api.adnexus.ai mcp.adnexus.ai;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # ---------------------------------------------------------------------------
    # API Server — api.adnexus.ai
    # ---------------------------------------------------------------------------
    server {
        listen 443 ssl http2;
        server_name api.adnexus.ai;

        ssl_certificate /etc/letsencrypt/live/api.adnexus.ai/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/api.adnexus.ai/privkey.pem;

        # Client body limits
        client_max_body_size 50M;

        location / {
            limit_req zone=api_general burst=50 nodelay;
            limit_conn addr 20;

            proxy_pass http://api:3000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 60s;
            proxy_buffering off;
        }

        # WebSocket / SSE for real-time
        location /api/v1/realtime {
            proxy_pass http://api:3000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_read_timeout 86400s;
            proxy_send_timeout 86400s;
        }
    }

    # ---------------------------------------------------------------------------
    # MCP Server — mcp.adnexus.ai
    # ---------------------------------------------------------------------------
    server {
        listen 443 ssl http2;
        server_name mcp.adnexus.ai;

        ssl_certificate /etc/letsencrypt/live/api.adnexus.ai/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/api.adnexus.ai/privkey.pem;

        location / {
            limit_req zone=api_general burst=20 nodelay;
            limit_conn addr 10;

            proxy_pass http://mcp-server:8000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 60s;
        }
    }
}
```

### 7.3 SSL Verification

```bash
# Test SSL configuration
openssl s_client -connect api.adnexus.ai:443 -servername api.adnexus.ai < /dev/null

# Check certificate expiry
echo | openssl s_client -servername api.adnexus.ai -connect api.adnexus.ai:443 2>/dev/null | openssl x509 -noout -dates

# SSL Labs test (external)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=api.adnexus.ai
# Target grade: A+
```

### 7.4 SSL Renewal

Certbot automatically renews certificates via cron. Verify:

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Check cronjob exists
sudo systemctl status certbot.timer
# or
cat /etc/cron.d/certbot

# If using Docker, ensure the post-renewal hook reloads Nginx:
echo '#!/bin/bash
docker exec adnexus-nginx nginx -s reload' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

---

## 8. Monitoring & Observability

### 8.1 Health Check Endpoints

| Endpoint | Purpose | Response Codes |
|----------|---------|----------------|
| `GET /health` | Full health check (DB + Redis + status) | 200 (ok), 503 (degraded) |
| `GET /live` | Liveness probe (is the process running?) | 200 always |
| `GET /ready` | Readiness probe (can the pod handle traffic?) | 200 (ready), 503 (not ready) |
| `GET /metrics` | Prometheus metrics | 200 + text/plain |

**Example responses:**

```bash
# Health check
curl -s https://api.adnexus.ai/health | jq .
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-06-15T12:34:56.789Z",
  "uptime": 86400.123,
  "checks": {
    "db": "ok",
    "redis": "ok"
  }
}

# Readiness check
curl -s https://api.adnexus.ai/ready | jq .
{
  "status": "ready",
  "checks": {
    "db": "ok",
    "redis": "ok"
  }
}

# Metrics (Prometheus format)
curl -s https://api.adnexus.ai/metrics
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/health",status="200"} 42
...
```

### 8.2 Prometheus Metrics

The API server exposes the following Prometheus-compatible metrics:

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by method, route, status |
| `http_request_duration_seconds` | Histogram | Request duration distribution |
| `http_request_duration_summary` | Summary | Request duration percentiles |
| `api_errors_total` | Counter | Total API errors by type |
| `db_query_duration_seconds` | Histogram | Database query duration |
| `redis_operations_total` | Counter | Redis operations by command |
| `worker_jobs_processed_total` | Counter | Jobs processed by type |
| `worker_job_duration_seconds` | Histogram | Job processing duration |

**Prometheus scrape configuration:**

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'adnexus-api'
    static_configs:
      - targets: ['api.adnexus.ai:443']
    metrics_path: '/metrics'
    scheme: 'https'
    scrape_interval: 15s
    scrape_timeout: 10s
```

### 8.3 Logging

All services use structured JSON logging:

```json
{
  "timestamp": "2024-06-15T12:34:56.789Z",
  "level": "info",
  "service": "adnexus-api",
  "method": "POST",
  "path": "/api/v1/drafts",
  "status": 201,
  "duration_ms": 145,
  "user_id": "uuid-here",
  "workspace_id": "uuid-here",
  "request_id": "req-uuid-here"
}
```

**View logs:**

```bash
# API server logs
docker compose -f docker-compose.prod.yml logs -f api

# MCP server logs
docker compose -f docker-compose.prod.yml logs -f mcp-server

# Worker logs
docker compose -f docker-compose.prod.yml logs -f workers

# Database logs
docker compose -f docker-compose.prod.yml logs -f postgres

# Follow all logs
docker compose -f docker-compose.prod.yml logs -f
```

**Log aggregation with Loki (optional):**

```yaml
# Add to docker-compose.prod.yml
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki/loki-config.yml:/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./promtail/promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
```

### 8.4 Alerting Rules (Prometheus)

```yaml
# alert-rules.yml
groups:
  - name: adnexus
    rules:
      - alert: AdNexusAPIDown
        expr: up{job="adnexus-api"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "AdNexus API is down"
          description: "API has been down for more than 2 minutes"

      - alert: AdNexusHighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate on AdNexus API"
          description: "Error rate is above 5% for 5 minutes"

      - alert: AdNexusDatabaseDown
        expr: adnexus_db_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "AdNexus database is unreachable"
```

---

## 9. Scaling Strategies

### 9.1 Vertical Scaling (Single Server)

For moderate load, scale vertically by upgrading the VM:

| Tier | CPU | RAM | Disk | Concurrent Users |
|------|-----|-----|------|-----------------|
| Starter | 2 vCPU | 4 GB | 20 GB | ~50 |
| Growth | 4 vCPU | 8 GB | 50 GB | ~200 |
| Pro | 8 vCPU | 16 GB | 100 GB | ~500 |

```bash
# Adjust Docker Compose resource limits
docker compose -f docker-compose.prod.yml up -d --scale workers=2
```

### 9.2 Horizontal Scaling (Multi-Server)

For high availability and load, deploy across multiple servers:

```
                    ┌─────────────────┐
                    │   Cloud LB      │
                    │  (Nginx/ALB)    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │  API #1   │  │  API #2   │  │  API #3   │
        │  (Docker) │  │  (Docker) │  │  (Docker) │
        └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │  Worker   │  │  Worker   │  │  Worker   │
        │  #1       │  │  #2       │  │  #3       │
        └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
            ┌───────▼──────┐  ┌──────▼───────┐
            │ PostgreSQL   │  │    Redis     │
            │ (Primary)    │  │   Cluster    │
            └──────────────┘  └──────────────┘
```

### 9.3 Database Scaling

#### Read Replicas

For read-heavy workloads, configure PostgreSQL streaming replication:

```yaml
# Add to docker-compose.prod.yml
  postgres-replica:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: adnexus
      POSTGRES_USER: adnexus
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    command: |
      bash -c "
        pg_basebackup -h postgres -D /var/lib/postgresql/data -U replicator -v -P -W
        echo 'standby_mode = on' >> /var/lib/postgresql/data/recovery.conf
        postgres
      "
    depends_on:
      - postgres
    networks:
      - adnexus-network
```

#### Managed PostgreSQL (Recommended for Production)

Consider managed solutions for automatic backups, failover, and scaling:

| Provider | Service | Notes |
|----------|---------|-------|
| Supabase | Managed PostgreSQL | Built-in RLS, Realtime, Storage |
| AWS RDS  | PostgreSQL 16 | Multi-AZ, automated backups |
| GCP Cloud SQL | PostgreSQL 16 | Read replicas, point-in-time recovery |
| DigitalOcean | Managed PostgreSQL | Simple, cost-effective |

### 9.4 Redis Scaling

#### Redis Sentinel (High Availability)

```yaml
# docker-compose.redis-ha.yml
  redis-master:
    image: redis:7-alpine
    command: redis-server --appendonly yes

  redis-replica:
    image: redis:7-alpine
    command: redis-server --replicaof redis-master 6379

  redis-sentinel:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
```

#### Redis Cluster (Horizontal Sharding)

For workloads exceeding single-node memory capacity, use Redis Cluster with 3+ master nodes.

### 9.5 API Server Scaling

```bash
# Scale API instances (requires external LB)
docker compose -f docker-compose.prod.yml up -d --scale api=3

# Scale workers independently based on queue depth
docker compose -f docker-compose.prod.yml up -d --scale workers=5

# Auto-scaling with Docker Swarm
docker stack deploy -c docker-compose.prod.yml adnexus
```

### 9.6 CDN & Static Assets

Serve the React frontend via a CDN:

| Provider | Setup |
|----------|-------|
| Cloudflare | Set `FRONTEND_URL` to Cloudflare Pages domain |
| Vercel     | Connect GitHub repo for auto-deploys |
| Netlify    | Same as Vercel |
| AWS S3+CloudFront | Upload build artifacts to S3, serve via CloudFront |

### 9.7 Scaling Checklist

- [ ] Database has read replicas for analytics/reporting queries
- [ ] Redis is configured for persistence and replication
- [ ] API servers are behind a load balancer
- [ ] Workers can scale independently based on queue depth
- [ ] Monitoring alerts are configured for capacity thresholds
- [ ] Automated backups are tested monthly
- [ ] Disaster recovery plan is documented

---

## 10. Troubleshooting

### 10.1 Common Issues & Solutions

#### Issue: `docker compose up` fails with "env var not set"

```bash
# Error: Missing required environment variable: SUPABASE_URL

# Solution: Ensure .env is loaded
source .env
docker compose -f docker-compose.prod.yml --env-file .env up -d

# Or verify the variable exists:
grep "SUPABASE_URL" .env
```

#### Issue: PostgreSQL container fails to start

```bash
# Error: database files are incompatible with server

# Solution: Clear old data volume (WARNING: destroys data)
docker compose -f docker-compose.prod.yml down -v
docker volume rm adnexus_postgres_data
docker compose -f docker-compose.prod.yml up -d postgres

# Or check logs for specific errors:
docker compose -f docker-compose.prod.yml logs postgres
```

#### Issue: API container shows "Cannot connect to Supabase"

```bash
# Error: connect ETIMEDOUT to <supabase-host>

# Solutions:
# 1. Check SUPABASE_URL is correct
grep "SUPABASE_URL" .env

# 2. Verify network connectivity from container
docker exec -it adnexus-api sh
curl -I https://<your-project>.supabase.co

# 3. Check Supabase status at https://status.supabase.com

# 4. Verify firewall rules allow outbound HTTPS
```

#### Issue: Health check returns 503 (degraded)

```bash
# Error: {"status":"degraded","checks":{"db":"error","redis":"ok"}}

# Solutions:
# 1. Check database connection
docker exec -it adnexus-api sh
psql $DATABASE_URL -c "SELECT 1;"

# 2. Restart the database container
docker compose -f docker-compose.prod.yml restart postgres

# 3. Check database logs
docker compose -f docker-compose.prod.yml logs --tail=50 postgres
```

#### Issue: OAuth callback fails with "redirect_uri mismatch"

```bash
# Error: Facebook/Meta returns "redirect_uri mismatch"

# Solution: Verify the exact callback URL is registered in the app settings.
# The URL must match exactly — trailing slashes, protocol, and domain.

# Check current callback URLs:
curl -s https://graph.facebook.com/v19.0/<APP_ID> \
  -F "fields=oauth_redirect_uri" \
  -F "access_token=<APP_ACCESS_TOKEN>"

# Ensure these match your .env FRONTEND_URL and API routes
```

#### Issue: Worker jobs are not processing

```bash
# Error: Queue has pending jobs but workers are idle

# Solutions:
# 1. Check worker container is running
docker compose -f docker-compose.prod.yml ps workers

# 2. Check worker logs for errors
docker compose -f docker-compose.prod.yml logs -f workers

# 3. Verify Redis is accessible from workers
docker exec -it adnexus-workers sh
redis-cli -h redis -p 6379 ping

# 4. Restart workers
docker compose -f docker-compose.prod.yml restart workers
```

#### Issue: SSL certificate expired

```bash
# Error: NET::ERR_CERT_DATE_INVALID

# Solutions:
# 1. Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/api.adnexus.ai/fullchain.pem -noout -dates

# 2. Force renewal
sudo certbot renew --force-renewal

# 3. Reload Nginx
docker exec adnexus-nginx nginx -s reload

# 4. Verify auto-renewal cronjob exists
crontab -l | grep certbot
```

#### Issue: High memory usage in API container

```bash
# Error: Container killed by OOM

# Solutions:
# 1. Check memory usage
docker stats adnexus-api

# 2. Increase memory limit in docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 2G  # Increase from 1G

# 3. Enable Node.js memory optimization
environment:
  NODE_OPTIONS: "--max-old-space-size=1536"

# 4. Restart with new limits
docker compose -f docker-compose.prod.yml up -d --no-deps api
```

#### Issue: Slow database queries

```bash
# Solutions:
# 1. Check for missing indexes (run inside postgres)
docker exec -it adnexus-postgres psql -U adnexus -d adnexus -c "
  SELECT schemaname, tablename, indexname
  FROM pg_indexes
  WHERE tablename IN ('campaigns', 'drafts', 'audit_log')
  ORDER BY tablename;
"

# 2. Analyze slow queries
docker exec -it adnexus-postgres psql -U adnexus -d adnexus -c "
  SELECT query, calls, mean_time, rows
  FROM pg_stat_statements
  ORDER BY mean_time DESC
  LIMIT 10;
"

# 3. Add missing indexes (check schema.sql for the full list)
```

### 10.2 Diagnostic Commands

```bash
# Check all service status
docker compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats --no-stream

# Check network connectivity between containers
docker network inspect adnexus-network

# Inspect a specific container
docker inspect adnexus-api | jq '.[0].State'

# Check disk usage
docker system df -v

# View real-time logs for all services
docker compose -f docker-compose.prod.yml logs -f --tail=100

# Check for port conflicts
sudo ss -tlnp | grep -E ':(80|443|3000|5432|6379|8000)'

# Check Nginx error logs
docker exec adnexus-nginx cat /var/log/nginx/error.log

# Test API from inside the network
docker exec -it adnexus-api curl -s http://localhost:3000/health

# Check BullMQ queue depth (requires redis-cli)
docker exec -it adnexus-redis redis-cli --eval "return redis.call('llen', 'bull:metrics-sync:wait')"
```

### 10.3 Recovery Procedures

#### Full Stack Restart

```bash
# Graceful restart (zero-downtime for API)
docker compose -f docker-compose.prod.yml up -d --no-deps --build api

# Emergency restart (all services)
docker compose -f docker-compose.prod.yml restart

# Hard restart (destroys and recreates containers)
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

#### Database Recovery

```bash
# Restore from backup
gunzip -c /backup/adnexus-20240615.sql.gz | \
  docker exec -i adnexus-postgres psql -U adnexus -d adnexus

# Point-in-time recovery (if WAL archiving is enabled)
# See PostgreSQL documentation for PITR procedures
```

#### Rollback Deployment

```bash
# Rollback to previous Docker image
docker compose -f docker-compose.prod.yml down
docker tag adnexus-api:previous adnexus-api:latest
docker compose -f docker-compose.prod.yml up -d
```

### 10.4 Support Resources

| Resource | URL |
|----------|-----|
| Meta Marketing API Docs | https://developers.facebook.com/docs/marketing-api |
| Google Ads API Docs | https://developers.google.com/google-ads/api/docs/start |
| TikTok Ads API Docs | https://ads.tiktok.com/marketing_api/docs |
| Snapchat Ads API Docs | https://marketingapi.snapchat.com/docs |
| Supabase Docs | https://supabase.com/docs |
| Stripe API Docs | https://stripe.com/docs/api |
| OpenAI API Docs | https://platform.openai.com/docs |
| Anthropic API Docs | https://docs.anthropic.com |

---

## Appendix A: File Checksums

Verify deployment file integrity:

```bash
# Generate checksums for deployment artifacts
sha256sum docker-compose.prod.yml
sha256sum api/Dockerfile
sha256sum mcp-server/Dockerfile
sha256sum database/schema.sql
sha256sum nginx/nginx.conf
```

## Appendix B: Security Hardening

```bash
# 1. Run containers as non-root (already in Dockerfiles)
# 2. Read-only root filesystem
docker run --read-only --tmpfs /tmp:rw,noexec,nosuid,size=100m

# 3. Drop unnecessary capabilities
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE

# 4. Enable seccomp profile
docker run --security-opt seccomp=default.json

# 5. Network isolation — containers only talk via defined networks
#    (already configured in docker-compose.prod.yml)

# 6. Regular security scanning
docker scan adnexus-api:latest
trivy image adnexus-api:latest
```

## Appendix C: Environment Quick Reference

```bash
# Development (local)
cp .env.example .env
# Edit .env for local values
npm run dev          # API
python server.py     # MCP

# Staging
cp .env.staging .env
docker compose -f docker-compose.prod.yml up -d

# Production
cp .env.production .env
docker compose -f docker-compose.prod.yml up -d
```

---

<p align="center">
  <sub>Built with precision by the AdNexus AI engineering team.</sub><br/>
  <sub>For questions, contact <a href="mailto:devops@adnexus.ai">devops@adnexus.ai</a></sub>
</p>
