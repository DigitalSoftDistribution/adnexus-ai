# Self-Hosting Guide

> **Version:** 3.2.1 | **Deployment Methods:** Docker Compose, Kubernetes | **Estimated Setup Time:** 30 minutes

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Docker Compose Setup](#docker-compose-setup)
- [Environment Variables](#environment-variables)
- [SSL/TLS Setup](#ssltls-setup)
- [Configuration](#configuration)
- [Monitoring](#monitoring)
- [Backups](#backups)
- [Updates & Maintenance](#updates--maintenance)
- [Troubleshooting](#troubleshooting)

---

## Overview

DevPlatform can be fully self-hosted on your own infrastructure. This guide provides production-ready configurations for Docker Compose (recommended for small-to-medium deployments) and Kubernetes (recommended for large-scale deployments).

### Architecture (Self-Hosted)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              Traefik (Reverse Proxy)                       │
│                       Port 80/443 - SSL termination                        │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
┌───────▼────────┐         ┌──────────▼──────────┐      ┌──────────▼──────────┐
│  DevPlatform   │         │  DevPlatform        │      │  DevPlatform        │
│  API Server    │         │  Web Dashboard      │      │  WebSocket Gateway  │
│  Port 3000     │         │  Port 3001          │      │  Port 3002          │
│  Fastify       │         │  Next.js            │      │  Socket.io          │
└───────┬────────┘         └─────────────────────┘      └─────────────────────┘
        │
        │                              ┌──────────────────────┐
        │                              │  DevPlatform MCP     │
        │                              │  Server              │
        │                              │  Port 3003           │
        │                              └──────────┬───────────┘
        │                                         │
┌───────▼────────┐         ┌──────────▼──────────┐      ┌─────────────────────┐
│  PostgreSQL    │         │  Redis              │      │  MinIO (S3)         │
│  Port 5432     │         │  Port 6379          │      │  Port 9000          │
│  Data          │         │  Cache / Queue      │      │  Artifacts          │
└────────────────┘         └─────────────────────┘      └─────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                         Monitoring Stack                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │Prometheus│  │ Grafana  │  │  Loki    │  │ AlertMgr │                   │
│  │  Port 9090│  │ Port 3000│  │ Port 3100│  │ Port 9093│                   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                   │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended | Production |
|-----------|---------|-------------|------------|
| **CPU** | 2 cores | 4 cores | 8+ cores |
| **RAM** | 4 GB | 8 GB | 16+ GB |
| **Disk** | 20 GB | 50 GB SSD | 200+ GB SSD |
| **Network** | 100 Mbps | 1 Gbps | 1+ Gbps |

### Software Requirements

| Software | Version | Purpose |
|----------|---------|---------|
| Docker | 24.0.0+ | Container runtime |
| Docker Compose | 2.20.0+ | Orchestration |
| Git | 2.40+ | Source control |
| OpenSSL | 3.0+ | Certificate generation |

### OS Support

| OS | Status | Notes |
|----|--------|-------|
| Ubuntu 22.04 LTS | Fully supported | Recommended |
| Debian 12 | Fully supported | - |
| RHEL 9 / Rocky Linux 9 | Fully supported | - |
| Amazon Linux 2023 | Fully supported | - |
| macOS (Docker Desktop) | Development only | Not for production |

### Required Ports

| Port | Service | Protocol | Direction |
|------|---------|----------|-----------|
| 80 | Traefik HTTP | TCP | Inbound |
| 443 | Traefik HTTPS | TCP | Inbound |
| 5432 | PostgreSQL | TCP | Internal only |
| 6379 | Redis | TCP | Internal only |
| 9000 | MinIO API | TCP | Internal only |
| 9001 | MinIO Console | TCP | Optional external |
| 3000 | API Server | TCP | Internal only |
| 3001 | Web Dashboard | TCP | Internal only |
| 3002 | WebSocket | TCP | Internal only |

---

## Docker Compose Setup

### 1. Download Configuration

```bash
# Create project directory
mkdir -p /opt/devplatform && cd /opt/devplatform

# Download compose files
curl -L https://github.com/devplatform/core/releases/download/v3.2.1/docker-compose.yml -o docker-compose.yml
curl -L https://github.com/devplatform/core/releases/download/v3.2.1/docker-compose.prod.yml -o docker-compose.prod.yml
curl -L https://github.com/devplatform/core/releases/download/v3.2.1/.env.example -o .env.example

# Or clone the repository
git clone https://github.com/devplatform/core.git
cd core
```

### 2. Configure Environment

```bash
# Copy example environment
cp .env.example .env

# Generate secrets
./scripts/generate-secrets.sh >> .env

# Or manually generate:
# JWT Secret
openssl rand -base64 32

# Webhook Secret
openssl rand -base64 32

# MinIO Root Password
openssl rand -base64 24

# Database Password
openssl rand -base64 24
```

### 3. Base Docker Compose File

```yaml
# docker-compose.yml
version: "3.8"

services:
  # ─── Reverse Proxy ───
  traefik:
    image: traefik:v3.0
    container_name: devp_traefik
    restart: unless-stopped
    command:
      - "--api.dashboard=false"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--log.level=INFO"
      - "--accesslog=true"
      - "--ping=true"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_certs:/letsencrypt
    networks:
      - devp_network
    healthcheck:
      test: ["CMD", "traefik", "healthcheck"]
      interval: 10s
      timeout: 5s
      retries: 3

  # ─── API Server ───
  api:
    image: devplatform/api:v3.2.1
    container_name: devp_api
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
      - API_VERSION=v3
      - DATABASE_URL=postgresql://devp:${POSTGRES_PASSWORD}@postgres:5432/devplatform
      - REDIS_URL=redis://redis:6379/0
      - JWT_SECRET=${JWT_SECRET}
      - JWT_ISSUER=${JWT_ISSUER}
      - JWT_AUDIENCE=${JWT_AUDIENCE}
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
      - WEBHOOK_TOLERANCE_SECONDS=300
      - MCP_API_KEY=${MCP_API_KEY}
      - STORAGE_ENDPOINT=minio:9000
      - STORAGE_ACCESS_KEY=${MINIO_ROOT_USER}
      - STORAGE_SECRET_KEY=${MINIO_ROOT_PASSWORD}
      - STORAGE_BUCKET=devplatform
      - STORAGE_USE_SSL=false
      - LOG_LEVEL=info
      - METRICS_ENABLED=true
      - TRACING_ENABLED=true
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`${API_DOMAIN}`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=3000"
      - "traefik.http.middlewares.api-ratelimit.ratelimit.average=1000"
      - "traefik.http.middlewares.api-ratelimit.ratelimit.burst=100"
      - "traefik.http.routers.api.middlewares=api-ratelimit"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    networks:
      - devp_network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 30s

  # ─── Web Dashboard ───
  web:
    image: devplatform/web:v3.2.1
    container_name: devp_web
    restart: unless-stopped
    environment:
      - NEXT_PUBLIC_API_URL=https://${API_DOMAIN}
      - NEXT_PUBLIC_WS_URL=wss://${WS_DOMAIN}
      - NEXT_PUBLIC_MCP_URL=https://${MCP_DOMAIN}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`${APP_DOMAIN}`)"
      - "traefik.http.routers.web.entrypoints=websecure"
      - "traefik.http.routers.web.tls.certresolver=letsencrypt"
      - "traefik.http.services.web.loadbalancer.server.port=3000"
    networks:
      - devp_network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 15s
      timeout: 5s
      retries: 3

  # ─── WebSocket Gateway ───
  ws:
    image: devplatform/ws:v3.2.1
    container_name: devp_ws
    restart: unless-stopped
    environment:
      - PORT=3000
      - REDIS_URL=redis://redis:6379/1
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGIN=https://${APP_DOMAIN}
      - WS_PING_INTERVAL=25000
      - WS_PING_TIMEOUT=60000
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ws.rule=Host(`${WS_DOMAIN}`)"
      - "traefik.http.routers.ws.entrypoints=websecure"
      - "traefik.http.routers.ws.tls.certresolver=letsencrypt"
      - "traefik.http.services.ws.loadbalancer.server.port=3000"
      - "traefik.http.services.ws.loadbalancer.sticky.cookie=true"
      # Enable WebSocket support
      - "traefik.http.routers.ws.middlewares=ws-headers"
      - "traefik.http.middlewares.ws-headers.headers.customrequestheaders.Upgrade=websocket"
      - "traefik.http.middlewares.ws-headers.headers.customrequestheaders.Connection=Upgrade"
    depends_on:
      - redis
    networks:
      - devp_network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 15s
      timeout: 5s
      retries: 3

  # ─── MCP Server ───
  mcp:
    image: devplatform/mcp:v3.2.1
    container_name: devp_mcp
    restart: unless-stopped
    environment:
      - DEVP_API_KEY=${MCP_API_KEY}
      - DEVP_API_BASE_URL=http://api:3000
      - DEVP_MCP_TRANSPORT=sse
      - DEVP_MCP_PORT=3000
      - DEVP_MCP_LOG_LEVEL=info
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mcp.rule=Host(`${MCP_DOMAIN}`)"
      - "traefik.http.routers.mcp.entrypoints=websecure"
      - "traefik.http.routers.mcp.tls.certresolver=letsencrypt"
      - "traefik.http.services.mcp.loadbalancer.server.port=3000"
    depends_on:
      - api
    networks:
      - devp_network

  # ─── PostgreSQL ───
  postgres:
    image: postgres:16-alpine
    container_name: devp_postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=devp
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=devplatform
      - PGDATA=/var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - devp_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U devp -d devplatform"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    command:
      - "postgres"
      - "-c"
      - "max_connections=200"
      - "-c"
      - "shared_buffers=256MB"
      - "-c"
      - "effective_cache_size=768MB"
      - "-c"
      - "maintenance_work_mem=64MB"
      - "-c"
      - "checkpoint_completion_target=0.9"
      - "-c"
      - "wal_buffers=16MB"
      - "-c"
      - "default_statistics_target=100"
      - "-c"
      - "random_page_cost=1.1"
      - "-c"
      - "effective_io_concurrency=200"
      - "-c"
      - "work_mem=655kB"
      - "-c"
      - "min_wal_size=1GB"
      - "-c"
      - "max_wal_size=4GB"

  # ─── Redis ───
  redis:
    image: redis:7-alpine
    container_name: devp_redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 512mb --maxmemory-policy allkeys-lru --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - devp_network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── MinIO (S3-compatible storage) ───
  minio:
    image: minio/minio:latest
    container_name: devp_minio
    restart: unless-stopped
    environment:
      - MINIO_ROOT_USER=${MINIO_ROOT_USER}
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    networks:
      - devp_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 15s
      timeout: 5s
      retries: 5

  # ─── Background Workers ───
  worker:
    image: devplatform/worker:v3.2.1
    container_name: devp_worker
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://devp:${POSTGRES_PASSWORD}@postgres:5432/devplatform
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - JWT_SECRET=${JWT_SECRET}
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
      - STORAGE_ENDPOINT=minio:9000
      - STORAGE_ACCESS_KEY=${MINIO_ROOT_USER}
      - STORAGE_SECRET_KEY=${MINIO_ROOT_PASSWORD}
      - STORAGE_BUCKET=devplatform
      - STORAGE_USE_SSL=false
      - LOG_LEVEL=info
      - WORKER_CONCURRENCY=5
      - WORKERQueues=deployments,webhooks,notifications,exports,cleanup
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    networks:
      - devp_network

  # ─── Scheduled Jobs ───
  scheduler:
    image: devplatform/scheduler:v3.2.1
    container_name: devp_scheduler
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://devp:${POSTGRES_PASSWORD}@postgres:5432/devplatform
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - LOG_LEVEL=info
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - devp_network

  # ─── Migration Runner ───
  migrate:
    image: devplatform/api:v3.2.1
    container_name: devp_migrate
    restart: "no"
    environment:
      - DATABASE_URL=postgresql://devp:${POSTGRES_PASSWORD}@postgres:5432/devplatform
    command: ["npm", "run", "db:migrate"]
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - devp_network

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
  traefik_certs:
    driver: local

networks:
  devp_network:
    driver: bridge
```

### 4. Start Services

```bash
# Create required buckets before starting
docker compose up -d minio
docker compose exec minio mc alias set local http://localhost:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}
docker compose exec minio mc mb local/devplatform

# Run database migrations
docker compose up migrate

# Start all services
docker compose up -d

# Verify all services are healthy
docker compose ps

# View logs
docker compose logs -f

# Check API health
curl https://api.your-domain.com/health
```

### 5. Initial Setup

```bash
# Create the first admin user
docker compose exec api npm run cli:user:create \
  --email admin@your-domain.com \
  --name "System Administrator" \
  --password "secure-password" \
  --role admin

# Create default team
docker compose exec api npm run cli:team:create \
  --name "Default Team" \
  --slug default-team \
  --owner admin@your-domain.com

# Generate MCP API key
docker compose exec api npm run cli:key:generate \
  --type mcp \
  --name "Default MCP Key" \
  --scopes all
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `API_DOMAIN` | API server domain | `api.devplatform.yourcompany.com` |
| `APP_DOMAIN` | Web dashboard domain | `app.devplatform.yourcompany.com` |
| `WS_DOMAIN` | WebSocket gateway domain | `ws.devplatform.yourcompany.com` |
| `MCP_DOMAIN` | MCP server domain | `mcp.devplatform.yourcompany.com` |
| `ACME_EMAIL` | Let's Encrypt registration email | `admin@yourcompany.com` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `[generate with openssl]` |
| `REDIS_PASSWORD` | Redis password | `[generate with openssl]` |
| `MINIO_ROOT_USER` | MinIO access key | `devplatform` |
| `MINIO_ROOT_PASSWORD` | MinIO secret key | `[generate with openssl]` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `[generate with openssl rand -base64 32]` |

### Core Application Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | API server port | `3000` |
| `API_VERSION` | API version | `v3` |
| `LOG_LEVEL` | Log verbosity | `info` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | Required |
| `JWT_SECRET` | JWT signing key | Required |
| `JWT_ISSUER` | JWT issuer claim | `devplatform` |
| `JWT_AUDIENCE` | JWT audience claim | `api.devplatform.io` |
| `JWT_EXPIRY_SECONDS` | Token lifetime | `3600` |
| `JWT_REFRESH_EXPIRY_DAYS` | Refresh token lifetime | `30` |

### Webhook Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `WEBHOOK_SECRET` | Webhook signing secret | Required |
| `WEBHOOK_TOLERANCE_SECONDS` | Timestamp tolerance | `300` |
| `WEBHOOK_MAX_RETRIES` | Max retry attempts | `5` |
| `WEBHOOK_RETRY_INTERVAL` | Base retry interval (seconds) | `30` |
| `WEBHOOK_TIMEOUT_MS` | Request timeout | `30000` |

### Storage Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_TYPE` | Storage backend | `s3` |
| `STORAGE_ENDPOINT` | S3-compatible endpoint | Required |
| `STORAGE_ACCESS_KEY` | Access key | Required |
| `STORAGE_SECRET_KEY` | Secret key | Required |
| `STORAGE_BUCKET` | Bucket name | `devplatform` |
| `STORAGE_REGION` | Region | `us-east-1` |
| `STORAGE_USE_SSL` | Use HTTPS | `true` |
| `STORAGE_FORCE_PATH_STYLE` | Path-style URLs | `true` |

### Security Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` |
| `SESSION_SECRET` | Session encryption key | Auto-generated |
| `CORS_ORIGIN` | Allowed CORS origins | Dashboard URL |
| `RATE_LIMIT_ENABLED` | Enable rate limiting | `true` |
| `RATE_LIMIT_DEFAULT` | Default requests per minute | `1000` |
| `MFA_ENABLED` | Enable MFA support | `true` |
| `MFA_ISSUER` | TOTP issuer name | `DevPlatform` |

### MCP Server Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_ENABLED` | Enable MCP server | `true` |
| `MCP_API_KEY` | MCP authentication key | Required |
| `MCP_TRANSPORT` | Transport type | `sse` |
| `MCP_PORT` | MCP server port | `3000` |
| `MCP_CORS_ORIGIN` | MCP CORS origins | `*` |

### Worker Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `WORKER_CONCURRENCY` | Parallel jobs per worker | `5` |
| `WORKER_MAX_ATTEMPTS` | Max job attempts | `3` |
| `WORKER_BACKOFF_TYPE` | Backoff strategy | `exponential` |
| `WORKERQueues` | Enabled queue names | `deployments,webhooks,notifications` |

### Email Configuration (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | - |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |
| `SMTP_FROM` | Sender email address | `noreply@devplatform.io` |
| `SMTP_SECURE` | Use TLS | `true` |

### External Integrations (Optional)

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `GITLAB_CLIENT_ID` | GitLab OAuth app client ID |
| `GITLAB_CLIENT_SECRET` | GitLab OAuth app client secret |
| `SLACK_CLIENT_ID` | Slack app client ID |
| `SLACK_CLIENT_SECRET` | Slack app client secret |
| `STRIPE_SECRET_KEY` | Stripe API key (for billing) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

### Monitoring Variables (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `METRICS_ENABLED` | Enable Prometheus metrics | `true` |
| `METRICS_PORT` | Metrics endpoint port | `9090` |
| `TRACING_ENABLED` | Enable distributed tracing | `true` |
| `TRACING_SAMPLE_RATE` | Trace sampling rate | `0.1` |
| `JAEGER_ENDPOINT` | Jaeger collector URL | - |

### Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `FEATURE_COLLAB_EDITING` | Real-time collaborative editing | `true` |
| `FEATURE_ADVANCED_ANALYTICS` | Advanced analytics dashboard | `true` |
| `FEATURE_CUSTOM_DOMAINS` | Custom domain support | `true` |
| `FEATURE_TEAM_MANAGEMENT` | Team and member management | `true` |
| `FEATURE_BILLING` | Billing and subscriptions | `true` |
| `FEATURE_MCP_SERVER` | MCP AI integration server | `true` |

---

## SSL/TLS Setup

### Option 1: Let's Encrypt (Automatic — Recommended)

Let's Encrypt certificates are automatically provisioned via Traefik. Ensure:

1. Your domains point to the server IP
2. Ports 80 and 443 are open
3. `ACME_EMAIL` is set in `.env`

```bash
# Verify DNS
dig +short api.your-domain.com
dig +short app.your-domain.com

# Check certificate status
curl -v https://api.your-domain.com/health 2>&1 | grep "SSL certificate"

# View Traefik acme.json (contains certificates)
docker compose exec traefik cat /letsencrypt/acme.json
```

### Option 2: Custom Certificate

For using your own certificates:

```bash
# Place certificates in the certs directory
mkdir -p /opt/devplatform/certs
cp your-cert.crt /opt/devplatform/certs/cert.crt
cp your-key.key /opt/devplatform/certs/key.key

# Update docker-compose.yml - replace Traefik labels:
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.api.rule=Host(`${API_DOMAIN}`)"
  - "traefik.http.routers.api.entrypoints=websecure"
  - "traefik.http.routers.api.tls=true"
  - "traefik.http.routers.api.tls.certFile=/certs/cert.crt"
  - "traefik.http.routers.api.tls.keyFile=/certs/key.key"

# Add volume mount for certificates:
volumes:
  - ./certs:/certs:ro
```

### Option 3: Cloudflare Origin Certificates

```bash
# Generate origin certificate in Cloudflare dashboard
# Download certificate and key

# Store in Docker secrets (recommended)
docker secret create devp_cert /path/to/cert.pem
docker secret create devp_key /path/to/key.pem

# Or use environment-based configuration
CF_ORIGIN_CERT=/run/secrets/devp_cert
CF_ORIGIN_KEY=/run/secrets/devp_key
```

### Certificate Renewal

With Let's Encrypt, certificates auto-renew. To force renewal:

```bash
# Remove acme.json to force re-creation
docker compose stop traefik
docker compose rm traefik
rm -f volumes/traefik_certs/acme.json
docker compose up -d traefik

# Monitor renewal logs
docker compose logs -f traefik | grep "legolog"
```

### TLS Configuration Best Practices

```yaml
# Traefik TLS options for A+ SSL Labs rating
tls:
  options:
    default:
      minVersion: VersionTLS12
      cipherSuites:
        - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
        - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
        - TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305
        - TLS_AES_128_GCM_SHA256
        - TLS_AES_256_GCM_SHA384
        - TLS_CHACHA20_POLY1305_SHA256
      curvePreferences:
        - CurveP256
        - CurveP384
        - X25519
      sniStrict: true
```

---

## Configuration

### Database Connection Pool

Adjust based on your workload:

```env
# .env
DATABASE_POOL_SIZE=20
DATABASE_POOL_MIN=5
DATABASE_POOL_IDLE_TIMEOUT_MS=30000
DATABASE_POOL_ACQUIRE_TIMEOUT_MS=5000
```

### Redis Configuration

```env
# .env
REDIS_URL=redis://:password@redis:6379/0
REDIS_CLUSTER_ENABLED=false
REDIS_SENTINEL_ENABLED=false
REDIS_KEY_PREFIX=devp:
```

### Scaling Workers

For high-traffic deployments, scale workers horizontally:

```yaml
# docker-compose.override.yml
services:
  worker:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    environment:
      - WORKER_CONCURRENCY=10
```

### Read Replicas

For PostgreSQL read replicas:

```env
DATABASE_URL=postgresql://devp:pass@postgres-primary:5432/devplatform
DATABASE_READ_URL=postgresql://devp:pass@postgres-replica:5433/devplatform
DATABASE_READ_REPLICA_ENABLED=true
```

---

## Monitoring

### Enable Prometheus + Grafana

Add to `docker-compose.monitoring.yml`:

```yaml
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: devp_prometheus
    restart: unless-stopped
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    ports:
      - "127.0.0.1:9090:9090"
    networks:
      - devp_network

  grafana:
    image: grafana/grafana:latest
    container_name: devp_grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    ports:
      - "127.0.0.1:3000:3000"
    networks:
      - devp_network

  loki:
    image: grafana/loki:latest
    container_name: devp_loki
    restart: unless-stopped
    volumes:
      - ./monitoring/loki.yml:/etc/loki/local-config.yaml
      - loki_data:/loki
    ports:
      - "127.0.0.1:3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - devp_network

  alertmanager:
    image: prom/alertmanager:latest
    container_name: devp_alertmanager
    restart: unless-stopped
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    ports:
      - "127.0.0.1:9093:9093"
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - devp_network

  node-exporter:
    image: prom/node-exporter:latest
    container_name: devp_node_exporter
    restart: unless-stopped
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - devp_network

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: devp_cadvisor
    restart: unless-stopped
    privileged: true
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    networks:
      - devp_network

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
  alertmanager_data:

networks:
  devp_network:
    external: true
```

### Key Metrics to Monitor

| Metric | Warning | Critical | Description |
|--------|---------|----------|-------------|
| `api_requests_per_second` | > 500 | > 1000 | Request rate |
| `api_p95_latency_ms` | > 200 | > 500 | API latency |
| `api_error_rate` | > 0.01 | > 0.05 | Error percentage |
| `postgres_connections_active` | > 150 | > 180 | DB connections |
| `postgres_replication_lag` | > 5s | > 30s | Replica lag |
| `redis_memory_used` | > 400MB | > 480MB | Redis memory |
| `worker_queue_depth` | > 100 | > 500 | Pending jobs |
| `worker_failed_jobs` | > 10/hr | > 50/hr | Failed jobs |
| `container_cpu_percent` | > 70% | > 90% | CPU usage |
| `container_memory_percent` | > 80% | > 95% | Memory usage |
| `disk_free_percent` | < 20% | < 10% | Disk space |

### Health Check Endpoints

```bash
# API health
curl http://localhost:3000/health
# → {"status":"healthy","version":"3.2.1","services":{"database":"healthy","redis":"healthy","queue":"healthy","storage":"healthy"}}

# Liveness probe
curl http://localhost:3000/health/live
# → "ok"

# Readiness probe
curl http://localhost:3000/health/ready
# → {"ready":true}

# Metrics
curl http://localhost:3000/metrics
# → Prometheus format
```

---

## Backups

### Automated Database Backups

```bash
#!/bin/bash
# /opt/devplatform/scripts/backup-db.sh

BACKUP_DIR="/opt/devplatform/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup
docker compose exec -T postgres pg_dump \
  -U devp \
  -d devplatform \
  --no-owner \
  --no-privileges \
  | gzip > "${BACKUP_DIR}/devplatform_${TIMESTAMP}.sql.gz"

# Upload to S3 (optional)
aws s3 cp "${BACKUP_DIR}/devplatform_${TIMESTAMP}.sql.gz" \
  s3://your-backup-bucket/devplatform/

# Clean old backups
find "${BACKUP_DIR}" -name "devplatform_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "devplatform_*.sql.gz" -mtime +7 -exec gzip -t {} \; -delete
```

```bash
# Add to crontab
crontab -e
# 0 2 * * * /opt/devplatform/scripts/backup-db.sh >> /var/log/devplatform-backup.log 2>&1
```

### Redis Backups

```bash
#!/bin/bash
# /opt/devplatform/scripts/backup-redis.sh

BACKUP_DIR="/opt/devplatform/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Trigger BGSAVE
docker compose exec redis redis-cli BGSAVE

# Copy RDB file
docker compose cp redis:/data/dump.rdb "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

# Upload to S3
aws s3 cp "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb" \
  s3://your-backup-bucket/devplatform/redis/
```

### MinIO Backups

```bash
#!/bin/bash
# /opt/devplatform/scripts/backup-s3.sh

# Sync to remote S3
mc mirror local/devplatform s3/backups/devplatform
```

### Restore from Backup

```bash
#!/bin/bash
# /opt/devplatform/scripts/restore-db.sh

BACKUP_FILE=$1  # e.g., devplatform_20240115_020000.sql.gz

# Stop services
docker compose stop api worker scheduler

# Drop and recreate database
docker compose exec postgres dropdb -U devp devplatform
docker compose exec postgres createdb -U devp devplatform

# Restore from backup
gunzip < "/opt/devplatform/backups/${BACKUP_FILE}" | \
  docker compose exec -T postgres psql -U devp -d devplatform

# Run any pending migrations
docker compose up migrate

# Restart services
docker compose up -d api worker scheduler

# Verify
curl https://api.your-domain.com/health
```

---

## Updates & Maintenance

### Update Procedure

```bash
#!/bin/bash
# /opt/devplatform/scripts/update.sh

set -e

VERSION=${1:-latest}
BACKUP_DIR="/opt/devplatform/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=== DevPlatform Update to ${VERSION} ==="

# 1. Create pre-update backup
echo "[1/6] Creating backup..."
/opt/devplatform/scripts/backup-db.sh

# 2. Pull new images
echo "[2/6] Pulling new images..."
docker compose pull

# 3. Stop services gracefully
echo "[3/6] Stopping services..."
docker compose stop api worker scheduler ws mcp web

# 4. Run database migrations
echo "[4/6] Running migrations..."
docker compose up migrate

# 5. Start updated services
echo "[5/6] Starting updated services..."
docker compose up -d

# 6. Verify health
echo "[6/6] Verifying health..."
sleep 10
for service in api ws web; do
  if curl -sf "https://${API_DOMAIN}/health" > /dev/null; then
    echo "  ✓ ${service} is healthy"
  else
    echo "  ✗ ${service} health check FAILED"
    exit 1
  fi
done

echo "=== Update complete ==="
```

### Rolling Update (Zero Downtime)

```bash
#!/bin/bash
# Zero-downtime rolling update

# Update API (traffic continues via existing containers)
docker compose up -d --no-deps --scale api=2 api
docker compose up -d --no-deps --scale api=1 api

# Update WebSocket (clients reconnect automatically)
docker compose up -d --no-deps ws

# Update Web Dashboard
docker compose up -d --no-deps web

# Update MCP Server
docker compose up -d --no-deps mcp

# Update Workers (existing jobs complete first)
docker compose stop worker
docker compose up -d --no-deps worker

# Update Scheduler
docker compose up -d --no-deps scheduler
```

### Database Migrations

```bash
# Check migration status
docker compose exec api npm run db:migrate:status

# Run pending migrations
docker compose up migrate

# Rollback last migration (emergency only)
docker compose exec api npm run db:migrate:undo

# Rollback to specific migration
docker compose exec api npm run db:migrate:undo:all -- --to 20240101000000-create-users.js
```

### Log Rotation

```bash
# Docker log rotation
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "5",
    "labels": "production_status",
    "env": "OS_VERSION"
  }
}
EOF

systemctl restart docker
```

### Regular Maintenance Tasks

```bash
# Daily: Check health
docker compose ps
curl -f https://api.your-domain.com/health

# Weekly: Review logs for errors
docker compose logs --since=7d api | grep ERROR

# Weekly: Clean old build artifacts
docker compose exec api npm run cleanup:artifacts -- --older-than 30d

# Monthly: Vacuum and analyze database
docker compose exec postgres vacuumdb -U devp -d devplatform -z -v

# Monthly: Rotate API keys
docker compose exec api npm run cli:key:rotate -- --type mcp

# Quarterly: Update base images
docker compose pull
docker compose up -d
```

### Maintenance Mode

```bash
# Enable maintenance mode
docker compose exec api npm run cli:maintenance:enable \
  --message "Scheduled maintenance until 04:00 UTC" \
  --allowed-ips "203.0.113.10"

# Check status
docker compose exec api npm run cli:maintenance:status

# Disable maintenance mode
docker compose exec api npm run cli:maintenance:disable
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose logs --tail 100 <service_name>

# Check for port conflicts
sudo netstat -tlnp | grep 3000

# Check disk space
df -h
docker system df

# Clean up Docker
docker system prune -a --volumes
```

### Database Connection Issues

```bash
# Test connection
docker compose exec postgres pg_isready -U devp

# Check connection count
docker compose exec postgres psql -U devp -c "SELECT count(*) FROM pg_stat_activity;"

# Check for locks
docker compose exec postgres psql -U devp -c "
  SELECT pid, state, query_start, query 
  FROM pg_stat_activity 
  WHERE state != 'idle';
"

# Restart PostgreSQL
docker compose restart postgres
```

### Redis Issues

```bash
# Check Redis health
docker compose exec redis redis-cli PING

# Check memory usage
docker compose exec redis redis-cli INFO memory

# Check connected clients
docker compose exec redis redis-cli CLIENT LIST

# Flush all data (emergency only)
docker compose exec redis redis-cli FLUSHALL
```

### High Memory Usage

```bash
# Check container memory
docker stats --no-stream

# Restart high-memory services
docker compose restart worker

# Scale down workers temporarily
docker compose up -d --scale worker=1 worker
```

### SSL Certificate Issues

```bash
# Check certificate expiry
echo | openssl s_client -servername api.your-domain.com -connect api.your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# Force Traefik to refresh
docker compose restart traefik

# Check Traefik logs
docker compose logs traefik | grep -i "certificate\|acme\|tls"
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED postgres:5432` | PostgreSQL not ready | Wait for health check, check `docker compose ps` |
| `Redis connection refused` | Redis auth failed | Verify `REDIS_PASSWORD` matches |
| `JWT verification failed` | Wrong JWT secret | Regenerate and restart all services |
| `S3 connection error` | MinIO not ready | Check MinIO health, verify credentials |
| `Queue connection error` | Redis unavailable | Check Redis health and network |
| `Migration lock timeout` | Concurrent migrations | Kill stuck process, retry |

### Emergency Procedures

#### Complete Reset (Data Loss)

```bash
# WARNING: This will delete ALL data

docker compose down -v  # Remove containers AND volumes
rm -rf volumes/*
docker compose up -d    # Fresh start with new data
```

#### Rollback to Previous Version

```bash
# Edit docker-compose.yml to pin previous image versions
sed -i 's/:v3.2.1/:v3.1.0/g' docker-compose.yml

# Restore database from backup
./scripts/restore-db.sh devplatform_20240101_020000.sql.gz

# Start previous version
docker compose up -d
```

#### Access Recovery

```bash
# Reset admin password
docker compose exec api npm run cli:user:reset-password \
  --email admin@your-domain.com \
  --password "new-secure-password"

# Create emergency admin access
docker compose exec api npm run cli:user:create \
  --email emergency@your-domain.com \
  --name "Emergency Admin" \
  --password "temp-password-change-me" \
  --role superadmin
```

### Getting Help

```bash
# Generate diagnostic bundle
docker compose exec api npm run cli:diagnostics > /tmp/devp-diagnostics.txt

# Check version info
docker compose exec api npm run version

# View running config (redacted)
docker compose exec api npm run cli:config:show
```

Contact support at support@devplatform.io with your diagnostic bundle and instance ID.
