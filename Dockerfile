# syntax=docker/dockerfile:1.6
# Multi-stage Dockerfile for adnexus-ai (Turbo + pnpm monorepo)
# Builds apps/web (Vite SPA) with workspace packages @adnexus/shared, @adnexus/ui, @adnexus/config

FROM node:20-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# ---------- deps: install full workspace deps ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- builder: build shared packages + web (Vite SPA) ----------
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY . .
RUN pnpm --filter @adnexus/web... build

# ---------- runner: serve Vite SPA dist via simple HTTP ----------
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN npm install -g serve
COPY --from=builder /app/apps/web/dist /app/dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
