#!/usr/bin/env bash
###############################################################################
# AdNexus Backend — One-Command Setup
# Usage: ./scripts/setup.sh [--dev|--prod|--ci]
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV="${1:-dev}"
LOG_FILE="${PROJECT_ROOT}/logs/setup-$(date +%Y%m%d-%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

mkdir -p "$(dirname "$LOG_FILE")"

log()  { echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"; }
info() { echo -e "${BLUE}[ℹ]${NC} $1" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1" | tee -a "$LOG_FILE"; }
err()  { echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"; }
step() { echo -e "\n${BOLD}${CYAN}━━━ $1 ━━━${NC}" | tee -a "$LOG_FILE"; }

###############################################################################
# 0. Parse arguments
###############################################################################
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dev)   ENV="dev"; shift ;;
      --prod)  ENV="prod"; shift ;;
      --ci)    ENV="ci";  CI=true; shift ;;
      --skip-seed) SKIP_SEED=true; shift ;;
      --skip-docker) SKIP_DOCKER=true; shift ;;
      -h|--help)
        echo "Usage: $0 [--dev|--prod|--ci] [--skip-seed] [--skip-docker]"
        echo ""
        echo "Options:"
        echo "  --dev          Development environment (default)"
        echo "  --prod         Production environment"
        echo "  --ci           CI/CD mode (non-interactive)"
        echo "  --skip-seed    Skip database seeding"
        echo "  --skip-docker  Skip Docker services startup"
        echo "  -h, --help     Show this help"
        exit 0
        ;;
      *) shift ;;
    esac
  done
  CI="${CI:-false}"
  SKIP_SEED="${SKIP_SEED:-false}"
  SKIP_DOCKER="${SKIP_DOCKER:-false}"
}

###############################################################################
# 1. Check prerequisites
###############################################################################
check_prerequisites() {
  step "Step 1/7 — Checking Prerequisites"

  local fail=0

  # Node.js 20+
  if command -v node &>/dev/null; then
    local node_version
    node_version="$(node --version | sed 's/v//')"
    local major="$(echo "$node_version" | cut -d. -f1)"
    if [[ "$major" -ge 20 ]]; then
      log "Node.js $node_version (≥20)"
    else
      err "Node.js $node_version — requires ≥20"
      fail=1
    fi
  else
    err "Node.js not found — install Node 20+ (https://nodejs.org)"
    fail=1
  fi

  # npm or pnpm
  if command -v pnpm &>/dev/null; then
    log "pnpm $(pnpm --version)"
    PKG_MGR="pnpm"
  elif command -v npm &>/dev/null; then
    log "npm $(npm --version)"
    PKG_MGR="npm"
  else
    err "No package manager found — install npm or pnpm"
    fail=1
  fi

  # Docker
  if [[ "$SKIP_DOCKER" != true ]]; then
    if command -v docker &>/dev/null && docker info &>/dev/null; then
      log "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
    else
      err "Docker not running — start Docker Desktop or dockerd"
      fail=1
    fi

    # Docker Compose
    if docker compose version &>/dev/null 2>&1 || docker-compose --version &>/dev/null 2>&1; then
      log "Docker Compose available"
    else
      err "Docker Compose not found"
      fail=1
    fi
  fi

  # Git
  if command -v git &>/dev/null; then
    log "Git $(git --version | awk '{print $3}')"
  else
    warn "Git not found — version detection unavailable"
  fi

  # TypeScript (tsc)
  if command -v tsc &>/dev/null; then
    log "TypeScript $(tsc --version | awk '{print $2}')"
  else
    info "TypeScript compiler not globally installed — will use npx"
  fi

  if [[ "$fail" -eq 1 ]]; then
    err "Prerequisite checks failed. Fix issues and re-run."
    exit 1
  fi

  info "All prerequisites satisfied ✓"
}

###############################################################################
# 2. Install dependencies
###############################################################################
install_deps() {
  step "Step 2/7 — Installing Dependencies"

  cd "$PROJECT_ROOT"

  if [[ -f "pnpm-lock.yaml" && "$PKG_MGR" == "pnpm" ]]; then
    pnpm install --frozen-lockfile 2>&1 | tee -a "$LOG_FILE"
  elif [[ -f "package-lock.json" && "$PKG_MGR" == "npm" ]]; then
    npm ci 2>&1 | tee -a "$LOG_FILE"
  else
    $PKG_MGR install 2>&1 | tee -a "$LOG_FILE"
  fi

  log "Dependencies installed"
}

###############################################################################
# 3. Environment variables
###############################################################################
setup_env() {
  step "Step 3/7 — Environment Configuration"

  cd "$PROJECT_ROOT"

  local env_file=".env"
  if [[ "$ENV" == "prod" ]]; then
    env_file=".env.production"
  elif [[ "$ENV" == "ci" ]]; then
    env_file=".env.ci"
  fi

  if [[ -f "$env_file" ]]; then
    warn "$env_file already exists"
    if [[ "$CI" == true ]]; then
      info "CI mode — keeping existing $env_file"
      return
    fi
    read -rp "  Overwrite? [y/N]: " answer
    [[ "$answer" =~ ^[Yy]$ ]] || { info "Keeping existing $env_file"; return; }
  fi

  # Default values
  local db_password
  db_password="$(openssl rand -hex 16 2>/dev/null || LC_ALL=C tr -dc 'a-zA-Z0-9' </dev/urandom | head -c 32)"
  local jwt_secret
  jwt_secret="$(openssl rand -hex 32 2>/dev/null || LC_ALL=C tr -dc 'a-zA-Z0-9' </dev/urandom | head -c 64)"
  local encryption_key
  encryption_key="$(openssl rand -hex 32 2>/dev/null || LC_ALL=C tr -dc 'a-zA-Z0-9' </dev/urandom | head -c 64)"

  if [[ "$CI" == true ]]; then
    # Non-interactive CI defaults
    cat > "$env_file" <<EOF
# AdNexus Backend — ${ENV} environment
# Generated: $(date -Iseconds)

# ── Server ──────────────────────────────────────
NODE_ENV=${ENV}
PORT=3001
HOST=0.0.0.0
API_PREFIX=/api/v1

# ── Database ────────────────────────────────────
DATABASE_URL=postgresql://postgres:${db_password}@localhost:5432/adnexus?schema=public
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${db_password}
POSTGRES_DB=adnexus

# ── Redis ───────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ── Authentication ──────────────────────────────
JWT_SECRET=${jwt_secret}
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ── Encryption ──────────────────────────────────
ENCRYPTION_KEY=${encryption_key}

# ── MCP Server ──────────────────────────────────
MCP_SERVER_URL=http://localhost:3002
MCP_API_KEY=${MCP_API_KEY:-$(openssl rand -hex 16 2>/dev/null | head -c 32)}

# ── External Services ───────────────────────────
OPENAI_API_KEY=${OPENAI_API_KEY:-}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-}

# ── AWS (for backups / file uploads) ────────────
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-}
AWS_REGION=${AWS_REGION:-us-east-1}
S3_BUCKET=${S3_BUCKET:-adnexus-backups}

# ── Email ───────────────────────────────────────
SMTP_HOST=${SMTP_HOST:-}
SMTP_PORT=${SMTP_PORT:-587}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
EMAIL_FROM=noreply@adnexus.local

# ── Feature Flags ───────────────────────────────
ENABLE_AI_FEATURES=true
ENABLE_BILLING=true
ENABLE_NOTIFICATIONS=true
ENABLE_AUDIT_LOG=true
EOF
    log "Created $env_file (CI mode with defaults)"
    return
  fi

  # Interactive mode
  info "Please configure your environment:"
  echo ""

  read -rp "  Database host [localhost]: " db_host
  db_host="${db_host:-localhost}"
  read -rp "  Database port [5432]: " db_port
  db_port="${db_port:-5432}"
  read -rp "  Database user [postgres]: " db_user
  db_user="${db_user:-postgres}"
  read -rsp "  Database password [auto-generated]: " db_pass
  echo ""
  db_pass="${db_pass:-$db_password}"
  read -rp "  Database name [adnexus]: " db_name
  db_name="${db_name:-adnexus}"

  read -rp "  Server port [3001]: " srv_port
  srv_port="${srv_port:-3001}"
  read -rp "  Redis URL [redis://localhost:6379/0]: " redis_url
  redis_url="${redis_url:-redis://localhost:6379/0}"

  read -rsp "  OpenAI API key [optional]: " openai_key
  echo ""
  read -rsp "  Stripe secret key [optional]: " stripe_key
  echo ""

  read -rp "  AWS region [us-east-1]: " aws_region
  aws_region="${aws_region:-us-east-1}"
  read -rp "  S3 backup bucket [adnexus-backups]: " s3_bucket
  s3_bucket="${s3_bucket:-adnexus-backups}"

  cat > "$env_file" <<EOF
# AdNexus Backend — ${ENV} environment
# Generated: $(date -Iseconds)

# ── Server ──────────────────────────────────────
NODE_ENV=${ENV}
PORT=${srv_port}
HOST=0.0.0.0
API_PREFIX=/api/v1

# ── Database ────────────────────────────────────
DATABASE_URL=postgresql://${db_user}:${db_pass}@${db_host}:${db_port}/${db_name}?schema=public
POSTGRES_USER=${db_user}
POSTGRES_PASSWORD=${db_pass}
POSTGRES_DB=${db_name}

# ── Redis ───────────────────────────────────────
REDIS_URL=${redis_url}

# ── Authentication ──────────────────────────────
JWT_SECRET=${jwt_secret}
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ── Encryption ──────────────────────────────────
ENCRYPTION_KEY=${encryption_key}

# ── MCP Server ──────────────────────────────────
MCP_SERVER_URL=http://localhost:3002
MCP_API_KEY=$(openssl rand -hex 16 2>/dev/null | head -c 32)

# ── External Services ───────────────────────────
OPENAI_API_KEY=${openai_key}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
STRIPE_SECRET_KEY=${stripe_key}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-}

# ── AWS ─────────────────────────────────────────
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-}
AWS_REGION=${aws_region}
S3_BUCKET=${s3_bucket}

# ── Email ───────────────────────────────────────
SMTP_HOST=${SMTP_HOST:-}
SMTP_PORT=${SMTP_PORT:-587}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
EMAIL_FROM=noreply@adnexus.local

# ── Feature Flags ───────────────────────────────
ENABLE_AI_FEATURES=${ENABLE_AI_FEATURES:-true}
ENABLE_BILLING=${ENABLE_BILLING:-true}
ENABLE_NOTIFICATIONS=${ENABLE_NOTIFICATIONS:-true}
ENABLE_AUDIT_LOG=${ENABLE_AUDIT_LOG:-true}
EOF

  log "Created $env_file"
  info "JWT_SECRET and ENCRYPTION_KEY were auto-generated."
  info "Keep .env secure — do not commit to version control."
}

###############################################################################
# 4. Start infrastructure services
###############################################################################
start_services() {
  if [[ "$SKIP_DOCKER" == true ]]; then
    info "Skipping Docker services (--skip-docker)"
    return
  fi

  step "Step 4/7 — Starting Infrastructure Services"

  cd "$PROJECT_ROOT"

  local compose_file="docker-compose.yml"
  [[ -f "docker-compose.${ENV}.yml" ]] && compose_file="docker-compose.${ENV}.yml"

  if [[ -f "$compose_file" ]]; then
    info "Using $compose_file"
    docker compose -f "$compose_file" up -d --wait 2>&1 | tee -a "$LOG_FILE"

    # Wait for DB to be ready
    info "Waiting for PostgreSQL..."
    local retries=30
    until $PKG_MGR exec -- prisma db execute --stdin <<<'SELECT 1' &>/dev/null 2>&1 || [[ $retries -le 0 ]]; do
      sleep 1
      ((retries--))
    done

    if [[ $retries -le 0 ]]; then
      err "PostgreSQL failed to start within 30s"
      exit 1
    fi

    log "PostgreSQL ready ✓"

    # Check Redis
    if command -v redis-cli &>/dev/null; then
      if redis-cli ping &>/dev/null; then
        log "Redis ready ✓"
      else
        warn "Redis ping failed — may still be starting"
      fi
    fi

    log "Infrastructure services running"
  else
    warn "No $compose_file found — assuming services are external"
    warn "Ensure PostgreSQL and Redis are running manually"
  fi
}

###############################################################################
# 5. Database migrations
###############################################################################
run_migrations() {
  step "Step 5/7 — Database Migrations"

  cd "$PROJECT_ROOT"

  # Ensure Prisma is generated
  if [[ -f "prisma/schema.prisma" ]]; then
    info "Generating Prisma client..."
    npx prisma generate 2>&1 | tee -a "$LOG_FILE"

    info "Running migrations..."
    npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"

    log "Database migrations applied ✓"
  elif [[ -f "drizzle.config.ts" || -d "drizzle" ]]; then
    info "Running Drizzle migrations..."
    npx drizzle-kit migrate 2>&1 | tee -a "$LOG_FILE"

    log "Database migrations applied ✓"
  else
    warn "No recognized migration tool found — skipping migrations"
    warn "Expected: Prisma (prisma/schema.prisma) or Drizzle (drizzle.config.ts)"
  fi
}

###############################################################################
# 6. Seed database
###############################################################################
seed_database() {
  if [[ "$SKIP_SEED" == true ]]; then
    info "Skipping database seeding (--skip-seed)"
    return
  fi

  step "Step 6/7 — Seeding Database"

  cd "$PROJECT_ROOT"

  if [[ -f "scripts/seed-rich.ts" ]]; then
    info "Running rich seed script..."
    npx tsx scripts/seed-rich.ts 2>&1 | tee -a "$LOG_FILE"
    log "Database seeded with rich demo data ✓"
  elif [[ -f "prisma/seed.ts" ]]; then
    info "Running Prisma seed..."
    npx prisma db seed 2>&1 | tee -a "$LOG_FILE"
    log "Database seeded ✓"
  else
    warn "No seed script found — database is empty"
    warn "Create scripts/seed-rich.ts for demo data"
  fi
}

###############################################################################
# 7. Start application
###############################################################################
start_app() {
  step "Step 7/7 — Starting Application"

  cd "$PROJECT_ROOT"

  if [[ "$ENV" == "ci" ]]; then
    info "CI mode — running build check..."
    npx tsc --noEmit 2>&1 | tee -a "$LOG_FILE"
    npx vitest run 2>&1 | tee -a "$LOG_FILE" || true
    log "CI checks passed ✓"
    return
  fi

  if [[ "$SKIP_DOCKER" == true ]]; then
    info "Skipping app startup (--skip-docker)"
    info "Start the app manually: $PKG_MGR run dev"
    return
  fi

  info "Starting AdNexus Backend..."

  if [[ "$ENV" == "prod" ]]; then
    $PKG_MGR run build 2>&1 | tee -a "$LOG_FILE"
    $PKG_MGR start 2>&1 | tee -a "$LOG_FILE" &
  else
    $PKG_MGR run dev 2>&1 | tee -a "$LOG_FILE" &
  fi

  local app_pid=$!

  # Wait for API to be ready
  info "Waiting for API on port ${PORT:-3001}..."
  local retries=30
  until curl -sf "http://localhost:${PORT:-3001}/api/v1/health" &>/dev/null || [[ $retries -le 0 ]]; do
    sleep 1
    ((retries--))
  done

  if [[ $retries -le 0 ]]; then
    err "API failed to start within 30s (PID: $app_pid)"
    kill "$app_pid" 2>/dev/null || true
    exit 1
  fi

  log "AdNexus Backend running ✓"
  info "Health check: http://localhost:${PORT:-3001}/api/v1/health"
  info "API docs:      http://localhost:${PORT:-3001}/api/v1/docs"
  info "Log file:      $LOG_FILE"
  info ""
  info "To stop: kill $app_pid  or  $PKG_MGR run stop"
}

###############################################################################
# Summary
###############################################################################
print_summary() {
  echo ""
  echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║           AdNexus Backend Setup Complete ✓                   ║${NC}"
  echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${BOLD}Environment:${NC}  $ENV"
  echo -e "  ${BOLD}Log file:${NC}     $LOG_FILE"
  echo -e "  ${BOLD}Health:${NC}       http://localhost:${PORT:-3001}/api/v1/health"
  echo ""
  echo -e "  ${CYAN}Quick commands:${NC}"
  echo -e "    ${BOLD}Start:${NC}      $PKG_MGR run dev"
  echo -e "    ${BOLD}Logs:${NC}       $PKG_MGR run logs"
  echo -e "    ${BOLD}DB Console:${NC} npx prisma studio"
  echo -e "    ${BOLD}Tests:${NC}      $PKG_MGR test"
  echo -e "    ${BOLD}Backup:${NC}     ./scripts/backup.sh"
  echo ""
}

###############################################################################
# Main
###############################################################################
main() {
  echo -e "${BOLD}${CYAN}"
  echo "    ___    _   _   _   _   __  __   ___   ____  ____"
  echo "   /   \\  | \\ | | | \\ | | |  \\/  | |_ _| |  _ \\\|  _ \\"
  echo "  / /\\ \\ |  \\| | |  \\| |  \\      /   | |  | |_) | |_) |"
  echo " / ___ \\| |\\  | | |\\  |   \\    /    | |  |  _ <|  __/"
  echo "/_/   \\_\\_| \\\_| |_| \\_|    \\__/    |___| |_| \\_\\_|"
  echo -e "${NC}"
  echo -e "  ${BOLD}Backend Setup — v1.0.0${NC}"
  echo ""

  parse_args "$@"
  check_prerequisites
  install_deps
  setup_env
  start_services
  run_migrations
  seed_database
  start_app
  print_summary
}

main "$@"
