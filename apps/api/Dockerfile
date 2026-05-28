# =============================================================================
# AdNexus API Server — Multi-stage Docker Build
# =============================================================================
# Production-ready Node.js 20 image with multi-stage build for minimal size.
# Security: runs as non-root 'node' user, uses dumb-init for PID 1.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies — install all packages (including devDependencies)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: Builder — compile TypeScript
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

# Build the TypeScript project (outputs to dist/)
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production — minimal runtime image
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production
WORKDIR /app

# Install dumb-init for proper signal handling (PID 1)
# Install curl for healthcheck support
RUN apk add --no-cache dumb-init curl

# Create non-root user for security
USER node

# Copy production artifacts from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package*.json ./

# Expose the API port
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
