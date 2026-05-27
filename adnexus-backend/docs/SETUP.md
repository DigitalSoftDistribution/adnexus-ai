# AdNexus AI — Setup Guide

Complete step-by-step instructions for setting up the AdNexus AI backend on your local machine or deploying to production.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Local Development Setup](#local-development-setup)
4. [Stripe Webhook Setup](#stripe-webhook-setup)
5. [OAuth App Configuration](#oauth-app-configuration)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | >= 20.0.0 | API server runtime |
| Python | >= 3.11 | MCP server runtime |
| PostgreSQL | >= 15 | Primary database (or use Supabase) |
| Supabase account | Free tier OK | Managed PostgreSQL + Auth + Realtime |
| Redis | >= 7.0 (optional) | Background job queue (BullMQ) |
| Stripe account | Any tier | Payment processing |
| Git | Any | Version control |

### Platform-Specific Prerequisites

**macOS:**
```bash
# Install Node.js 20+ via Homebrew
brew install node@20

# Install Python 3.11+
brew install python@3.11

# Install Redis (optional, for job queues)
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python 3.11
sudo apt-get install -y python3.11 python3.11-venv python3-pip

# Redis (optional)
sudo apt-get install -y redis-server
sudo systemctl start redis
```

**Windows (WSL2 recommended):**
```bash
# Use Ubuntu WSL2 and follow Ubuntu instructions above
# Or install via Chocolatey:
choco install nodejs redis-64
```

---

## Environment Variables

Create a `.env` file in the `api/` directory. All variables are required unless marked as optional.

### Core Infrastructure

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `NODE_ENV` | `development` | Runtime environment: `development`, `staging`, `production` | No |
| `PORT` | `3001` | API server port | No |
| `SUPABASE_URL` | — | Your Supabase project URL (e.g., `https://xxxxx.supabase.co`) | Yes |
| `SUPABASE_SERVICE_KEY` | — | Supabase service_role key (keep secret) | Yes |
| `SUPABASE_ANON_KEY` | — | Supabase anon/public key | No |
| `JWT_SECRET` | — | Secret for signing JWT tokens (min 32 chars) | Yes |
| `JWT_EXPIRES_IN` | `7d` | Access token expiry (e.g., `1h`, `7d`, `30d`) | No |
| `JWT_REFRESH_EXPIRES_IN` | `30d` | Refresh token expiry | No |

### Meta (Facebook) Ads

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `META_APP_ID` | — | Meta App ID from developers.facebook.com | No* |
| `META_APP_SECRET` | — | Meta App Secret | No* |
| `META_API_VERSION` | `v19.0` | Graph API version | No |

*Required for Meta ad account connections.

### Google Ads

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `GOOGLE_CLIENT_ID` | — | Google Cloud OAuth client ID | No* |
| `GOOGLE_CLIENT_SECRET` | — | Google Cloud OAuth client secret | No* |
| `GOOGLE_DEVELOPER_TOKEN` | — | Google Ads API developer token | No* |

*Required for Google Ads account connections.

### TikTok Ads

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `TIKTOK_APP_ID` | — | TikTok for Business app ID | No* |
| `TIKTOK_APP_SECRET` | — | TikTok app secret | No* |

*Required for TikTok ad account connections.

### Snap Ads

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `SNAP_CLIENT_ID` | — | Snap Kit client ID | No* |
| `SNAP_CLIENT_SECRET` | — | Snap Kit client secret | No* |

*Required for Snap ad account connections.

### Stripe Billing

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `STRIPE_SECRET_KEY` | — | Stripe secret key (`sk_test_...` or `sk_live_...`) | No* |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook endpoint secret | No* |
| `STRIPE_PUBLISHABLE_KEY` | — | Stripe publishable key for frontend | No |

*Required for billing features.

### MCP Server

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `MCP_API_KEY` | — | API key for MCP server authentication | No* |
| `MCP_TRANSPORT` | `stdio` | Transport: `stdio` or `sse` | No |

*Required for MCP server integration.

### Frontend

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL for CORS | No |

### Example `.env` file (development)

```bash
# Core
NODE_ENV=development
PORT=3001
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...your_service_key
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...your_anon_key
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Meta
META_APP_ID=1234567890
META_APP_SECRET=your_meta_app_secret
META_API_VERSION=v19.0

# Google
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_DEVELOPER_TOKEN=your_developer_token

# TikTok
TIKTOK_APP_ID=your_tiktok_app_id
TIKTOK_APP_SECRET=your_tiktok_app_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# MCP
MCP_API_KEY=your_mcp_api_key

# Frontend
FRONTEND_URL=http://localhost:5173
```

---

## Local Development Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/adnexus-ai.git
cd adnexus-ai
```

### Step 2: Install API Dependencies

```bash
cd api
npm install
```

### Step 3: Set Up Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy the project URL and service_role key from **Project Settings > API**
3. Add them to your `.env` file
4. Enable the `uuid-ossp` extension in the SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

### Step 4: Run Database Schema

Open the Supabase SQL Editor and execute the contents of `database/schema.sql`:

```bash
# Or use the Supabase CLI
npx supabase sql < ../database/schema.sql
```

This creates:
- All 18 tables (users, workspaces, campaigns, drafts, automation rules, etc.)
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers for `updated_at` timestamps

### Step 5: Run Seed Data

```bash
# Execute seed.sql in the Supabase SQL Editor
npx supabase sql < ../database/seed.sql
```

This populates:
- 2 users (Alex Morgan, Sam Chen)
- 1 workspace (Acme Marketing)
- 3 ad accounts (Meta, Google, TikTok)
- 8 campaigns with realistic metrics
- 12 adsets, 16 ads
- 8 drafts (various statuses)
- 3 automation rules
- 3 goals
- 2 scheduled reports
- 10 audit log entries
- AI credits and usage log

### Step 6: Start the API Server

```bash
# Development mode with hot reload
npm run dev

# Or build and start
npm run build
npm start
```

The API will be running at `http://localhost:3001`.

Verify it's working:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-07-20T12:00:00.000Z"
}
```

### Step 7: Start the MCP Server

```bash
cd ../mcp-server
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

The MCP server runs on `stdio` transport by default for integration with Claude Desktop.

---

## Stripe Webhook Setup

For local development, use the Stripe CLI to forward webhooks to your local server.

### Step 1: Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Ubuntu
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
```

### Step 2: Login and Forward Webhooks

```bash
# Login to Stripe
stripe login

# Forward webhooks to local API
stripe listen --forward-to http://localhost:3001/api/v1/billing/webhook
```

The CLI will output a webhook signing secret. Add it to your `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
```

### Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activate subscription, update workspace plan |
| `invoice.paid` | Confirm payment, extend subscription |
| `invoice.payment_failed` | Mark subscription past due, notify user |
| `customer.subscription.updated` | Sync plan changes |
| `customer.subscription.deleted` | Downgrade to free plan |

### Production Webhook Setup

1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Add endpoint: `https://your-api-domain.com/api/v1/billing/webhook`
3. Select events listed above
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

---

## OAuth App Configuration

### Meta (Facebook) Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new app (type: **Business**)
3. Add the **Marketing API** product
4. Go to **Settings > Basic** and copy App ID and App Secret
5. Add your redirect URI: `https://your-frontend.com/auth/meta/callback`
6. Request `ads_read`, `ads_management`, and `business_management` permissions
7. For production, submit the app for [Business Verification](https://developers.facebook.com/docs/app-review)

### Google Cloud OAuth 2.0

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Go to **APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID**
4. Configure the consent screen (type: **External**)
5. Add scope: `https://www.googleapis.com/auth/adwords`
6. Add authorized redirect URI: `https://your-frontend.com/auth/google/callback`
7. Copy Client ID and Client Secret
8. Go to **Google Ads API** and apply for a [developer token](https://developers.google.com/google-ads/api/docs/first-call/dev-token)

### TikTok for Business

1. Go to [TikTok for Business Developers](https://business-api.tiktok.com/portal)
2. Create a developer app
3. Request permissions: `ad.read`, `ad.write`
4. Add redirect URI: `https://your-frontend.com/auth/tiktok/callback`
5. Copy App ID and App Secret
6. Submit for review to access production data

### Snap Kit

1. Go to [Snap Kit Portal](https://kit.snapchat.com/)
2. Create a new app
3. Enable **Snap Ads** product
4. Add redirect URI: `https://your-frontend.com/auth/snap/callback`
5. Copy Client ID and Client Secret

### OAuth Redirect Flow Summary

```
1. Frontend: User clicks "Connect Meta Account"
2. Frontend: Redirects to /api/v1/auth/meta?workspace_id=xxx
3. API: Returns Meta OAuth URL with state parameter
4. Frontend: Redirects user to Meta login
5. Meta: User authorizes, redirects back with code
6. Frontend: POST /api/v1/auth/meta/callback { code, state }
7. API: Exchanges code for tokens, stores in ad_accounts table
8. API: Returns connected account info
```

---

## Deployment

### Docker

A `Dockerfile` is included in the `api/` directory for containerized deployment.

```dockerfile
# api/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

Build and run:
```bash
cd api
docker build -t adnexus-api .
docker run -p 3001:3001 --env-file .env adnexus-api
```

### Railway

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Add environment variables in Railway Dashboard
5. Deploy: `railway up`

```yaml
# railway.yaml
build:
  builder: DOCKERFILE
  dockerfilePath: api/Dockerfile

deploy:
  startCommand: node dist/index.js
  healthcheckPath: /health
  restartPolicyType: ON_FAILURE
```

### Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub/GitLab repository
3. Set build command: `cd api && npm install && npm run build`
4. Set start command: `cd api && npm start`
5. Add environment variables in Render Dashboard
6. Deploy

```yaml
# render.yaml
services:
  - type: web
    name: adnexus-api
    env: node
    buildCommand: cd api && npm install && npm run build
    startCommand: cd api && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: JWT_SECRET
        generateValue: true
```

### Environment-Specific Notes

| Environment | Notes |
|-------------|-------|
| **Development** | Uses `tsx watch` for hot reload. Stripe in test mode. All OAuth apps in sandbox/development mode. |
| **Staging** | Build and run compiled JS. Stripe test mode. Connected to staging Supabase project. |
| **Production** | Optimized build. Stripe live mode. All OAuth apps approved for production. Redis recommended for queues. Enable DB connection pooling. |

### Production Checklist

- [ ] Use strong `JWT_SECRET` (64+ random characters)
- [ ] Enable Supabase RLS on all tables
- [ ] Set up Stripe live mode keys and webhook
- [ ] All OAuth apps approved for production use
- [ ] Redis running for BullMQ job processing
- [ ] API behind HTTPS with valid SSL certificate
- [ ] Frontend URL updated in CORS config and OAuth redirects
- [ ] Monitoring and alerting configured (Sentry, LogRocket, etc.)
- [ ] Database backups enabled (Supabase does this automatically)
- [ ] Rate limiting enabled on API endpoints

---

## Troubleshooting

### Common Issues

**`Missing required environment variable: SUPABASE_URL`**
```bash
# Ensure .env file exists in api/ directory
cd api && cp .env.example .env
# Fill in all required values
```

**`Failed to fetch campaigns: permission denied for table campaigns`**
```bash
# RLS is enabled but no policy matches. Run schema.sql fully to create RLS policies.
# Or disable RLS for development (NOT recommended for production):
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
```

**`Port 3001 already in use`**
```bash
# Find and kill the process, or change PORT in .env
lsof -ti:3001 | xargs kill -9
```

**`Module not found` errors**
```bash
# Clean install dependencies
cd api
rm -rf node_modules package-lock.json
npm install
```

**MCP Server connection issues**
```bash
# Ensure Python 3.11+ is active
python --version
# Install dependencies
cd mcp-server
pip install -r requirements.txt
# Check MCP_API_KEY matches between .env files
```

### Database Reset (Development Only)

```sql
-- WARNING: This deletes all data
TRUNCATE TABLE users, workspaces, workspace_members, ad_accounts,
  campaigns, adsets, ads, drafts, automation_rules, audit_log,
  api_keys, webhooks, ai_credits, credit_usage_log, goals,
  scheduled_reports, events, auth_passwords, password_resets
  CASCADE;
```

### Getting Help

- Check the [API Reference](./API.md) for endpoint details
- Review the [MCP Server Guide](./MCP.md) for AI integration
- File issues on the GitHub repository
- Contact: support@adnexus.ai
