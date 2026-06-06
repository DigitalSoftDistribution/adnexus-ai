# AdNexus AI v2

AI-powered advertising campaign management, optimization, and analytics platform.

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
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry + Prometheus metrics
- **API Docs**: OpenAPI 3.1 + Scalar UI

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## API Versions

- **v1**: Legacy routes (backward compatible)
- **v2**: Clean Architecture routes with full OpenAPI documentation

## Environment Variables

See `apps/api/src/config/index.ts` and `apps/web/.env.example` for required variables.

## Launch readiness

The v1 launch safety net lives in `docs/V1_LAUNCH_READINESS.md`. Run `pnpm smoke:v1 -- --base-url <api-url> --web-url <web-url>` against a deployed preview before go/no-go.

## License

MIT
