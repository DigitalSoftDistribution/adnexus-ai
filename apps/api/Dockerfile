# syntax=docker/dockerfile:1.6
# =============================================================================
# AdNexus API Server — Multi-stage Docker Build (Turbo + pnpm monorepo)
# =============================================================================
# IMPORTANT: build from the REPOSITORY ROOT as the Docker context, not from
# apps/api, e.g.:  docker build -f apps/api/Dockerfile -t adnexus-api .
# (Coolify: set the Dockerfile path to apps/api/Dockerfile and build context "/".)
#
# Compiles @adnexus/api (Express, TypeScript) and ships a minimal runtime image
# running as non-root with dumb-init for correct PID-1 signal handling.
# =============================================================================

FROM node:20-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates dumb-init curl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# ---------- deps: install workspace deps (frozen lockfile) ----------
# Install the full workspace (no --filter) so transitive @types are available
# to tsc in the builder; a filtered install prunes hoisted type packages and
# breaks `tsc` with TS2742 (e.g. @types/express-serve-static-core).
FROM base AS deps
# .npmrc carries `public-hoist-pattern[]=*@types/*` which the API's tsc relies on
# to resolve transitive express types — without it the build fails with TS2742.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- builder: compile the API (tsc -> dist) ----------
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
# Build workspace deps first — tsc needs @adnexus/shared dist + .d.ts on disk.
RUN pnpm turbo run build --filter=@adnexus/api

# ---------- runner: minimal production image ----------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

# pnpm stores real packages under the root node_modules/.pnpm and symlinks them
# into each workspace's node_modules. Copy BOTH the root store and the API's
# symlink tree so the runtime can resolve direct deps (e.g. express).
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=node:node /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=node:node /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=node:node /app/packages/shared/node_modules ./packages/shared/node_modules

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/index.js"]
