# DevPlatform Documentation

> **Version:** 3.2.1 | **Last Updated:** 2026-01-15 | **Maintainers:** Platform Team

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Start Guide](#quick-start-guide)
3. [Architecture](#architecture)
4. [Directory Structure](#directory-structure)
5. [Documentation Index](#documentation-index)
6. [Support & Community](#support--community)

---

## Project Overview

**DevPlatform** is a unified cloud-native development platform that provides API management, webhook orchestration, MCP (Model Context Protocol) server hosting, and real-time collaboration tools. It is designed to be self-hosted or consumed as a managed service, offering complete data sovereignty and enterprise-grade security.

### Key Capabilities

| Capability | Description | Status |
|---|---|---|
| **REST API** | 95+ endpoints covering auth, projects, deployments, billing, webhooks | Stable |
| **MCP Server** | 30+ tools for AI agent integration (Claude, ChatGPT, Copilot) | Stable |
| **Webhook Engine** | Multi-platform webhook ingestion with signature verification | Stable |
| **Real-time Collab** | WebSocket-based presence, cursors, live edits | Beta |
| **Self Hosting** | Docker Compose, Kubernetes Helm charts, bare metal | Stable |
| **CLI Tool** | `devp` command-line interface for automation | Stable |

### Tech Stack

```
Backend:     Node.js 20 + TypeScript 5.3 + Fastify 4.26
Database:    PostgreSQL 16 + Redis 7 (caching + pub/sub)
Queue:       BullMQ 5 + Redis Streams
WebSocket:   Socket.io 4.7 with Redis adapter
Frontend:    Next.js 14 + React 18 + TailwindCSS
AI/ML:       Python 3.11 + FastAPI + LangChain 0.1
MCP:         Model Context Protocol SDK 1.0
Infra:       Docker + Kubernetes + Terraform + Prometheus/Grafana
```

---

## Quick Start Guide

### Prerequisites

- Node.js >= 20.0.0
- Docker >= 24.0.0 & Docker Compose >= 2.20.0
- PostgreSQL >= 16.0
- Redis >= 7.0

### 1. Clone & Install

```bash
git clone https://github.com/devplatform/core.git
cd core
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required environment variables:

```env
# Core
NODE_ENV=production
PORT=3000
API_VERSION=v3

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/devplatform
REDIS_URL=redis://localhost:6379/0

# Auth
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_ISSUER=devplatform
JWT_AUDIENCE=api.devplatform.io

# Webhook
WEBHOOK_SECRET=whsec_your_webhook_signing_secret
WEBHOOK_TOLERANCE_SECONDS=300

# AI / MCP
MCP_API_KEY=mcp_your_mcp_api_key
OPENAI_API_KEY=sk-...        # Optional
ANTHROPIC_API_KEY=sk-ant-... # Optional
```

### 3. Database Setup

```bash
# Run migrations
npm run db:migrate

# Seed default data
npm run db:seed

# Verify connection
npm run db:health
```

### 4. Start Services

```bash
# Development (all services)
npm run dev

# Production with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Check health
curl http://localhost:3000/health
```

### 5. First API Call

```bash
curl -X POST http://localhost:3000/api/v3/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "grant_type": "client_credentials"
  }'
```

### 6. Verify Installation

```bash
# Run full test suite
npm run test:ci

# Run integration tests only
npm run test:integration

# Run lint + typecheck
npm run lint && npm run typecheck
```

---

## Architecture

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Load Balancer (Traefik)                           │
│                    SSL termination + Rate limiting + WAF                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
           ┌────────▼────────┐ ┌──────▼──────┐ ┌───────▼────────┐
           │  Next.js (SSR)  │ │  Fastify    │ │  Socket.io     │
           │  Web Dashboard  │ │  REST API   │ │  WS Gateway    │
           │    Port 3001    │ │   Port 3000 │ │   Port 3002    │
           └────────┬────────┘ └──────┬──────┘ └───────┬────────┘
                    │                 │                 │
                    └─────────────────┼─────────────────┘
                                      │
┌─────────────────────────────────────▼─────────────────────────────────────┐
│                           Internal Services                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │  Project │  │  Deploy  │  │  Billing │  │ Webhook  │   │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │  │ Service  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │             │         │
│  ┌────▼─────────────▼─────────────▼─────────────▼─────────────▼─────┐   │
│  │                    Message Queue (BullMQ + Redis)                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
           ┌────────▼────────┐ ┌──────▼──────┐ ┌───────▼────────┐
           │   PostgreSQL    │ │    Redis    │ │   S3/MinIO     │
           │   (Primary)     │ │  (Cache/Q)  │ │   (Artifacts)  │
           │    Port 5432    │ │   Port 6379 │ │    Port 9000   │
           └─────────────────┘ └─────────────┘ └────────────────┘
                    │
           ┌────────▼────────┐
           │  PostgreSQL     │
           │  (Read Replica) │
           │   Port 5433     │
           └─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         MCP Server Architecture                               │
│                                                                               │
│   ┌──────────┐     ┌──────────────┐     ┌──────────────┐                    │
│   │  Claude  │◄───►│  MCP Server  │◄───►│  Tool Reg.   │                    │
│   │  Desktop │     │   (SSE/Stdio)│     │  (30 Tools)  │                    │
│   └──────────┘     └──────┬───────┘     └──────────────┘                    │
│                           │                                                  │
│                    ┌──────▼──────┐                                            │
│                    │  Fastify    │                                            │
│                    │  API Layer  │                                            │
│                    └─────────────┘                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Client Request → Traefik LB → Fastify API Router → Service Layer → Repository → PostgreSQL
2. Async Jobs    → Service Layer → BullMQ Queue → Worker → Redis → Webhook/Notification
3. Real-time     → Client → Socket.io → Redis Pub/Sub → All connected clients
4. MCP Tools     → AI Client → MCP Server → API Layer → Service → DB
5. Webhooks      → External Platform → API Endpoint → Signature Verify → Queue → Handler
```

### Service Communication

| Pattern | Protocol | Use Case | Latency Target |
|---------|----------|----------|----------------|
| Sync REST | HTTP/2 | CRUD operations | < 50ms p99 |
| Async Events | Redis Streams | Background jobs | < 5s delivery |
| Real-time | WebSocket | Live collaboration | < 100ms |
| MCP | stdio/SSE | AI tool calls | < 2s |

---

## Directory Structure

```
devplatform/
├── .github/                     # CI/CD workflows
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── release.yml
│   │   └── security-scan.yml
├── apps/
│   ├── api/                     # Fastify REST API server
│   │   ├── src/
│   │   │   ├── auth/            # Authentication & authorization
│   │   │   ├── billing/         # Subscription & payment management
│   │   │   ├── deploy/          # Deployment orchestration
│   │   │   ├── health/          # Health checks & probes
│   │   │   ├── project/         # Project CRUD & management
│   │   │   ├── team/            # Team & member management
│   │   │   ├── user/            # User management
│   │   │   ├── webhook/         # Webhook ingestion & delivery
│   │   │   ├── plugin/          # Extensible plugin system
│   │   │   ├── middleware/      # Auth, logging, rate limiting
│   │   │   ├── routes/          # Route definitions
│   │   │   ├── types/           # Shared TypeScript types
│   │   │   └── index.ts         # Server entry point
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── e2e/
│   │   └── package.json
│   │
│   ├── web/                     # Next.js dashboard
│   │   ├── src/
│   │   │   ├── app/             # Next.js App Router
│   │   │   ├── components/      # React components
│   │   │   ├── hooks/           # Custom React hooks
│   │   │   ├── lib/             # Utilities & API client
│   │   │   └── styles/
│   │   └── package.json
│   │
│   ├── ws/                      # Socket.io real-time gateway
│   │   ├── src/
│   │   │   ├── handlers/        # Event handlers
│   │   │   ├── rooms/           # Room & presence management
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── mcp/                     # MCP Server implementation
│       ├── src/
│       │   ├── tools/           # 30 tool implementations
│       │   ├── server.ts        # MCP server bootstrap
│       │   └── registry.ts      # Tool registration
│       └── package.json
│
├── packages/
│   ├── shared/                  # Shared types & utilities
│   ├── sdk/                     # Official SDK (Node.js, Python)
│   ├── eslint-config/
│   └── ts-config/
│
├── infra/
│   ├── docker/                  # Dockerfiles & compose configs
│   ├── terraform/               # IaC for AWS/GCP/Azure
│   ├── kubernetes/              # K8s manifests & Helm charts
│   └── monitoring/              # Prometheus, Grafana, Loki configs
│
├── docs/                        # Developer documentation
│   ├── README.md               # This file
│   ├── API_REFERENCE.md        # Complete API reference
│   ├── MCP_TOOLS.md            # MCP server documentation
│   ├── WEBHOOKS.md             # Webhook integration guide
│   └── SELF_HOSTING.md         # Self-hosting deployment guide
│
├── scripts/
│   ├── setup.sh                # One-click setup
│   ├── migrate.sh              # Database migration helper
│   └── backup.sh               # Backup & restore
│
├── tests/
│   ├── fixtures/               # Test data
│   ├── factories/              # Object factories
│   └── helpers/                # Test utilities
│
├── .env.example
├── docker-compose.yml
├── docker-compose.prod.yml
├── Makefile
├── package.json
├── turbo.json
└── README.md
```

---

## Documentation Index

| Document | Description | Audience |
|----------|-------------|----------|
| **[API_REFERENCE.md](./API_REFERENCE.md)** | 95+ REST endpoints, auth, rate limits, examples | Backend developers |
| **[MCP_TOOLS.md](./MCP_TOOLS.md)** | MCP server setup, 30 tools, AI integration | AI/ML engineers |
| **[WEBHOOKS.md](./WEBHOOKS.md)** | Webhook setup, events, signature verification, retries | Integration engineers |
| **[SELF_HOSTING.md](./SELF_HOSTING.md)** | Docker Compose, SSL, backups, monitoring | DevOps engineers |

---

## Support & Community

### Getting Help

| Channel | Response Time | Best For |
|---------|--------------|----------|
| [Discord](https://discord.gg/devplatform) | < 2 hours | Quick questions, community help |
| [GitHub Issues](https://github.com/devplatform/core/issues) | < 24 hours | Bug reports, feature requests |
| [Email Support](mailto:support@devplatform.io) | < 4 hours | Enterprise & billing issues |
| [Status Page](https://status.devplatform.io) | Real-time | Service status & incidents |

### Contributing

We welcome contributions! See our [Contributing Guide](https://github.com/devplatform/core/blob/main/CONTRIBUTING.md) for details.

```bash
# Fork, clone, and setup
git clone https://github.com/YOU/core.git
cd core
npm install
npm run setup:git-hooks

# Create a branch and make changes
git checkout -b feat/your-feature
# ... make changes ...
npm run test:ci
npm run lint

# Submit PR
git push origin feat/your-feature
# Open a Pull Request on GitHub
```

### License

[MIT License](https://github.com/devplatform/core/blob/main/LICENSE) © 2026 DevPlatform, Inc.
