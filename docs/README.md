# AdNexus AI Documentation

> AI-powered advertising campaign management, optimization, and analytics platform.
> Monorepo docs index — see the root [README.md](../README.md) for quick start.

---

## Architecture

```
├── apps/
│   ├── api/          # Express API with Clean Architecture
│   ├── web/          # Next.js 15 App Router frontend
│   └── mcp/          # MCP server for AI assistants
├── packages/
│   ├── shared/       # Zod schemas, types, constants
│   ├── ui/           # React component library
│   └── config/       # Shared TypeScript configs
```

## Tech Stack

### Backend
- **Runtime**: Node.js 22 + Express
- **Language**: TypeScript 5.5
- **Database**: PostgreSQL (Supabase) with Drizzle ORM
- **Auth**: Supabase Auth + JWT
- **Queue**: BullMQ + Redis
- **Real-time**: SSE + WebSocket unified via Redis Pub/Sub
- **Architecture**: Clean Architecture (Domain/Application/Infrastructure/Interface)

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5.5
- **Styling**: Tailwind CSS + CSS custom properties
- **State**: TanStack Query (server) + Zustand (client)
- **UI**: Radix UI primitives + custom design system
- **Charts**: Recharts

### Infrastructure
- **Monorepo**: Turborepo + pnpm workspaces
- **CI/CD**: GitHub Actions + Coolify preview deploys
- **Monitoring**: Sentry + Prometheus metrics
- **API Docs**: OpenAPI 3.1 + Scalar UI

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Run tests
pnpm test

# Playwright smoke (root)
pnpm test:smoke

# Build for production
pnpm build
```

## API Versions

- **v1**: Legacy routes (backward compatible)
- **v2**: Clean Architecture routes with full OpenAPI documentation — served at runtime via `mountV2Routes` in `apps/api/src/index.ts`

## Preview deploys (Coolify)

| Surface | App | URL |
|---|---|---|
| Web | `adnexus-ai` | `https://adnexus-ai.apps.softblaze.net` |
| API | `adnexus-api` | `https://adnexus-api.apps.softblaze.net` |

PR previews follow `https://pr-<N>-adnexus-ai.previews.softblaze.net` (stable per PR).

---

## Documentation Index

| Document | Description |
|---|---|
| **[PATH_TO_V1.md](./PATH_TO_V1.md)** | Launch milestones, P0/P1/P2 status, test gates |
| **[V1_LAUNCH_READINESS.md](./V1_LAUNCH_READINESS.md)** | Go/no-go checklist, smoke commands, route matrix |
| **[HANDOFF-v1-blockers.md](./HANDOFF-v1-blockers.md)** | Historical P0-1/P0-2 handoff (resolved) |
| **[API_REFERENCE.md](./API_REFERENCE.md)** | REST endpoints and examples |
| **[MCP_TOOLS.md](./MCP_TOOLS.md)** | MCP server setup and tool catalog |
| **[WEBHOOKS.md](./WEBHOOKS.md)** | Webhook integration guide |
| **[SELF_HOSTING.md](./SELF_HOSTING.md)** | Self-hosting deployment guide |
| **[architecture/](./architecture/)** | ADRs, test matrix, migration guides, composition root |

### Launch QA

| Document | Description |
|---|---|
| **[../qa/v1-sellability-manual-checklist.md](../qa/v1-sellability-manual-checklist.md)** | Manual browser QA matrix (SB-3099) |
| **`pnpm smoke:v1`** | Automated launch smoke against deployed preview URLs |

---

## Environment Variables

See `apps/api/src/config/index.ts` and `apps/web/.env.example` for required variables.

## License

MIT
