#!/usr/bin/env bash
# =============================================================================
# AdNexus AI - Production Deployment Script
# =============================================================================
# Usage: ./scripts/deploy.sh [options]
#   ./scripts/deploy.sh                    # Deploy with latest tag
#   ./scripts/deploy.sh --version v1.2.3   # Deploy specific version
#   ./scripts/deploy.sh --rollback         # Rollback to previous version
#   ./scripts/deploy.sh --status           # Show deployment status
#   ./scripts/deploy.sh --migrate          # Run database migrations only
#   ./scripts/deploy.sh --backup           # Create manual backup
#   ./scripts/deploy.sh --health           # Run health checks
#
# Features:
#   - Pull latest images from registry
#   - Run database migrations with safety checks
#   - Rolling restart with zero downtime (blue-green)
#   - Comprehensive health check verification
#   - Automatic rollback on failure
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"
ENV_FILE="${PROJECT_ROOT}/.env"
LOG_DIR="${PROJECT_ROOT}/logs"
BACKUP_DIR="${PROJECT_ROOT}/backups"
HEALTH_CHECK_TIMEOUT=120
HEALTH_CHECK_INTERVAL=5
VERSION="latest"
DEPLOY_START_TIME=""
DEPLOY_COLOR=""
PREVIOUS_COLOR=""
ROLLBACK_ON_FAILURE=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Logging
# =============================================================================
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp=$(date -Iseconds)
    local color="${NC}"

    case "${level}" in
        INFO)  color="${BLUE}" ;;
        SUCCESS) color="${GREEN}" ;;
        WARN)  color="${YELLOW}" ;;
        ERROR) color="${RED}" ;;
    esac

    echo -e "${color}[${timestamp}] [${level}] ${message}${NC}" | tee -a "${LOG_DIR}/deploy.log"
}

# =============================================================================
# Utility Functions
# =============================================================================
error_exit() {
    log ERROR "$1"
    if [[ "${ROLLBACK_ON_FAILURE}" == "true" ]]; then
        rollback
    fi
    exit 1
}

ensure_directories() {
    mkdir -p "${LOG_DIR}" "${BACKUP_DIR}"
}

load_env() {
    if [[ -f "${ENV_FILE}" ]]; then
        log INFO "Loading environment from ${ENV_FILE}"
        set -a
        # shellcheck source=/dev/null
        source "${ENV_FILE}"
        set +a
    else
        log WARN "No .env file found at ${ENV_FILE}"
    fi
}

validate_env() {
    log INFO "Validating environment variables..."

    local required_vars=(
        "DATABASE_URL"
        "REDIS_URL"
        "JWT_SECRET"
        "ENCRYPTION_KEY"
        "STRIPE_SECRET_KEY"
        "STRIPE_WEBHOOK_SECRET"
        "OPENAI_API_KEY"
    )

    local missing=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing+=("${var}")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        error_exit "Missing required environment variables: ${missing[*]}"
    fi

    log SUCCESS "Environment validation passed"
}

# =============================================================================
# Health Check Functions
# =============================================================================
check_docker() {
    if ! command -v docker &>/dev/null; then
        error_exit "Docker is not installed"
    fi
    if ! docker info &>/dev/null; then
        error_exit "Docker daemon is not running"
    fi
    log SUCCESS "Docker is ready"
}

check_compose_file() {
    if [[ ! -f "${COMPOSE_FILE}" ]]; then
        error_exit "Compose file not found: ${COMPOSE_FILE}"
    fi

    if ! docker compose -f "${COMPOSE_FILE}" config > /dev/null 2>&1; then
        error_exit "Invalid docker-compose configuration"
    fi
    log SUCCESS "Docker compose configuration is valid"
}

health_check_container() {
    local container_name="$1"
    local port="${2:-}"
    local endpoint="${3:-/health}"
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / HEALTH_CHECK_INTERVAL))

    log INFO "Checking health of ${container_name}..."

    for ((i = 1; i <= max_attempts; i++)); do
        # Check container health status
        local health_status
        health_status=$(docker inspect --format='{{.State.Health.Status}}' "${container_name}" 2>/dev/null || echo "unknown")

        if [[ "${health_status}" == "healthy" ]]; then
            log SUCCESS "${container_name} is healthy (${i}/${max_attempts})"
            return 0
        fi

        if [[ "${health_status}" == "unhealthy" ]]; then
            log ERROR "${container_name} is unhealthy!"
            return 1
        fi

        # Also check HTTP endpoint if port is provided
        if [[ -n "${port}" ]]; then
            local http_status
            http_status=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:${port}${endpoint}" 2>/dev/null || echo "000")
            if [[ "${http_status}" == "200" ]]; then
                log SUCCESS "${container_name} HTTP health check passed (${i}/${max_attempts})"
                return 0
            fi
        fi

        log INFO "Waiting for ${container_name}... (attempt ${i}/${max_attempts}, status: ${health_status})"
        sleep "${HEALTH_CHECK_INTERVAL}"
    done

    log ERROR "Health check timeout for ${container_name}"
    return 1
}

run_health_checks() {
    log INFO "Running comprehensive health checks..."

    local failed=0

    # Check infrastructure services
    health_check_container "adnexus-postgres" || ((failed++))
    health_check_container "adnexus-redis" || ((failed++))

    # Check application services based on active deployment
    if [[ -n "${DEPLOY_COLOR}" ]]; then
        health_check_container "adnexus-backend-${DEPLOY_COLOR}" "3000" || ((failed++))
        health_check_container "adnexus-mcp-${DEPLOY_COLOR}" "8080" || ((failed++))
    fi

    # Check nginx
    health_check_container "adnexus-nginx" "80" || ((failed++))

    if [[ ${failed} -gt 0 ]]; then
        error_exit "${failed} health check(s) failed"
    fi

    log SUCCESS "All health checks passed"
}

# =============================================================================
# Backup Functions
# =============================================================================
create_backup() {
    log INFO "Creating database backup..."

    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${BACKUP_DIR}/manual_${timestamp}.sql"

    # Ensure backup directory exists
    mkdir -p "${BACKUP_DIR}"

    # Create PostgreSQL backup
    if ! docker exec adnexus-postgres pg_dump \
        -U "${DB_USER:-postgres}" \
        -d "${DB_NAME:-adnexus}" \
        --no-owner --no-acl > "${backup_file}"; then
        log ERROR "Database backup failed"
        return 1
    fi

    # Compress backup
    gzip "${backup_file}"
    local compressed_file="${backup_file}.gz"

    # Cleanup old backups (keep last 20)
    find "${BACKUP_DIR}" -name "*.sql.gz" -type f -printf '%T@ %p\n' |
        sort -n |
        head -n -20 |
        awk '{print $2}' |
        xargs -r rm -f

    log SUCCESS "Backup created: ${compressed_file}"
    echo "${compressed_file}"
}

# =============================================================================
# Deployment Functions
# =============================================================================
determine_active_color() {
    log INFO "Determining active deployment color..."

    if docker ps --format '{{.Names}}' | grep -q "adnexus-backend-blue"; then
        local is_running
        is_running=$(docker inspect --format='{{.State.Running}}' adnexus-backend-blue 2>/dev/null || echo "false")
        if [[ "${is_running}" == "true" ]]; then
            PREVIOUS_COLOR="blue"
            DEPLOY_COLOR="green"
        else
            PREVIOUS_COLOR="green"
            DEPLOY_COLOR="blue"
        fi
    else
        PREVIOUS_COLOR="green"
        DEPLOY_COLOR="blue"
    fi

    log INFO "Current active: ${PREVIOUS_COLOR}, deploying to: ${DEPLOY_COLOR}"
}

pull_images() {
    log INFO "Pulling Docker images (version: ${VERSION})..."

    export BACKEND_IMAGE="${BACKEND_IMAGE:-ghcr.io/adnexus-ai/adnexus-backend}:${VERSION}"
    export MCP_IMAGE="${MCP_IMAGE:-ghcr.io/adnexus-ai/adnexus-mcp-server}:${VERSION}"
    export WORKER_IMAGE="${WORKER_IMAGE:-ghcr.io/adnexus-ai/adnexus-worker}:${VERSION}"

    # Authenticate with registry if credentials are available
    if [[ -n "${GITHUB_TOKEN:-}" ]]; then
        echo "${GITHUB_TOKEN}" | docker login ghcr.io -u "${GITHUB_ACTOR:-adnexus}" --password-stdin
    fi

    docker compose -f "${COMPOSE_FILE}" pull || error_exit "Failed to pull Docker images"
    log SUCCESS "Images pulled successfully"
}

run_migrations() {
    log INFO "Running database migrations..."

    # First, run migration using the migrate profile
    if ! docker compose -f "${COMPOSE_FILE}" --profile migrate run --rm migrate; then
        error_exit "Database migration failed"
    fi

    log SUCCESS "Database migrations completed"
}

deploy_services() {
    log INFO "Deploying services to ${DEPLOY_COLOR} environment..."

    # Start the target environment services
    docker compose -f "${COMPOSE_FILE}" up -d \
        "backend-${DEPLOY_COLOR}" \
        "mcp-${DEPLOY_COLOR}" \
        "worker-${DEPLOY_COLOR}"

    # Wait for services to initialize
    log INFO "Waiting for services to initialize..."
    sleep 15

    # Run health checks on the new environment
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / HEALTH_CHECK_INTERVAL))
    local healthy=false

    for ((i = 1; i <= max_attempts; i++)); do
        local health_status
        health_status=$(docker inspect --format='{{.State.Health.Status}}' "adnexus-backend-${DEPLOY_COLOR}" 2>/dev/null || echo "unknown")

        log INFO "Health check ${i}/${max_attempts}: ${health_status}"

        if [[ "${health_status}" == "healthy" ]]; then
            healthy=true
            break
        fi

        if [[ "${health_status}" == "unhealthy" ]]; then
            error_exit "Container became unhealthy during startup"
        fi

        sleep "${HEALTH_CHECK_INTERVAL}"
    done

    if [[ "${healthy}" != "true" ]]; then
        error_exit "Health check timeout - deployment failed"
    fi

    log SUCCESS "Services deployed and healthy"
}

run_smoke_tests() {
    log INFO "Running smoke tests..."

    local port
    if [[ "${DEPLOY_COLOR}" == "blue" ]]; then
        port=3001
    else
        port=3002
    fi

    # Basic health check
    local status
    status=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:${port}/health" 2>/dev/null || echo "000")

    if [[ "${status}" != "200" ]]; then
        error_exit "Smoke test failed: HTTP ${status}"
    fi

    # API health check
    local api_status
    api_status=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:${port}/api/v1/health" 2>/dev/null || echo "000")

    if [[ "${api_status}" != "200" ]]; then
        error_exit "API smoke test failed: HTTP ${api_status}"
    fi

    log SUCCESS "Smoke tests passed"
}

switch_traffic() {
    log INFO "Switching traffic to ${DEPLOY_COLOR}..."

    local port
    if [[ "${DEPLOY_COLOR}" == "blue" ]]; then
        port=3001
    else
        port=3002
    fi

    # Update nginx upstream configuration
    local nginx_config="${PROJECT_ROOT}/nginx/upstream.conf"

    if [[ -f "${nginx_config}" ]]; then
        sed -i "s/proxy_pass http:\/\/localhost:3[0-9][0-9][0-9];/proxy_pass http:\/\/localhost:${port};/g" "${nginx_config}"

        # Reload nginx
        if docker ps --format '{{.Names}}' | grep -q "adnexus-nginx"; then
            docker exec adnexus-nginx nginx -s reload
            log SUCCESS "Nginx reconfigured and reloaded"
        else
            log WARN "Nginx container not running, skipping traffic switch"
        fi
    else
        log WARN "Nginx config not found at ${nginx_config}"
    fi
}

cleanup_previous() {
    log INFO "Cleaning up previous environment (${PREVIOUS_COLOR})..."

    # Gracefully stop the previous environment
    docker compose -f "${COMPOSE_FILE}" stop \
        "backend-${PREVIOUS_COLOR}" \
        "mcp-${PREVIOUS_COLOR}" \
        "worker-${PREVIOUS_COLOR}" || true

    log SUCCESS "Previous environment stopped"
}

# =============================================================================
# Rollback
# =============================================================================
rollback() {
    log WARN "!!! INITIATING ROLLBACK !!!"

    if [[ -z "${PREVIOUS_COLOR}" ]] || [[ -z "${DEPLOY_COLOR}" ]]; then
        log ERROR "Cannot rollback - deployment state unknown"
        return 1
    fi

    log INFO "Switching traffic back to ${PREVIOUS_COLOR}..."

    local port
    if [[ "${PREVIOUS_COLOR}" == "blue" ]]; then
        port=3001
    else
        port=3002
    fi

    # Restore nginx configuration
    local nginx_config="${PROJECT_ROOT}/nginx/upstream.conf"
    if [[ -f "${nginx_config}" ]]; then
        sed -i "s/proxy_pass http:\/\/localhost:3[0-9][0-9][0-9];/proxy_pass http:\/\/localhost:${port};/g" "${nginx_config}"
        docker exec adnexus-nginx nginx -s reload || true
    fi

    # Ensure previous environment is running
    docker compose -f "${COMPOSE_FILE}" start \
        "backend-${PREVIOUS_COLOR}" \
        "mcp-${PREVIOUS_COLOR}" \
        "worker-${PREVIOUS_COLOR}" || true

    # Stop failed deployment
    docker compose -f "${COMPOSE_FILE}" stop \
        "backend-${DEPLOY_COLOR}" \
        "mcp-${DEPLOY_COLOR}" \
        "worker-${DEPLOY_COLOR}" || true

    log WARN "!!! ROLLBACK COMPLETE - Traffic restored to ${PREVIOUS_COLOR} !!!"
}

# =============================================================================
# Status
# =============================================================================
show_status() {
    echo ""
    echo -e "${BLUE}=== AdNexus AI Deployment Status ===${NC}"
    echo ""

    echo -e "${YELLOW}Running Containers:${NC}"
    docker ps --filter "name=adnexus" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No containers found"

    echo ""
    echo -e "${YELLOW}Container Health:${NC}"
    for container in adnexus-backend-blue adnexus-backend-green adnexus-mcp-blue adnexus-mcp-green adnexus-postgres adnexus-redis adnexus-nginx; do
        if docker ps --format '{{.Names}}' | grep -q "${container}"; then
            local health
            health=$(docker inspect --format='{{.State.Health.Status}}' "${container}" 2>/dev/null || echo "N/A")
            local status
            status=$(docker inspect --format='{{.State.Status}}' "${container}" 2>/dev/null || echo "unknown")
            printf "  %-30s %-10s %-10s\n" "${container}:" "${status}" "(${health})"
        fi
    done

    echo ""
    echo -e "${YELLOW}Disk Usage:${NC}"
    df -h "${DATA_PATH:-${PROJECT_ROOT}/data}" 2>/dev/null || echo "  Data path not found"

    echo ""
    echo -e "${YELLOW}Recent Backups:${NC}"
    ls -la "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | tail -5 || echo "  No backups found"

    echo ""
}

# =============================================================================
# Main Deployment
# =============================================================================
main() {
    DEPLOY_START_TIME=$(date +%s)

    ensure_directories
    load_env

    log INFO "=== AdNexus AI Deployment Started ==="
    log INFO "Version: ${VERSION}"
    log INFO "Compose file: ${COMPOSE_FILE}"

    # Validate pre-conditions
    check_docker
    check_compose_file
    validate_env

    # Create pre-deployment backup
    if [[ "${SKIP_BACKUP:-false}" != "true" ]]; then
        create_backup
    fi

    # Determine deployment color (blue-green)
    determine_active_color

    # Pull images
    pull_images

    # Run database migrations
    if [[ "${SKIP_MIGRATE:-false}" != "true" ]]; then
        run_migrations
    fi

    # Deploy to inactive environment
    deploy_services

    # Run smoke tests
    run_smoke_tests

    # Switch traffic
    switch_traffic

    # Cleanup old environment
    cleanup_previous

    # Final health check
    run_health_checks

    # Calculate duration
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - DEPLOY_START_TIME))

    log SUCCESS "=== Deployment Complete in ${duration}s ==="
    log SUCCESS "Active environment: ${DEPLOY_COLOR}"
}

# =============================================================================
# CLI Argument Parsing
# =============================================================================
show_help() {
    cat <<EOF
AdNexus AI Deployment Script

Usage: $(basename "$0") [OPTIONS]

Options:
    --version VERSION    Deploy specific version (default: latest)
    --rollback           Rollback to previous deployment
    --status             Show deployment status
    --migrate            Run database migrations only
    --backup             Create manual database backup
    --health             Run health checks only
    --no-rollback        Disable automatic rollback on failure
    --skip-backup        Skip pre-deployment backup
    --skip-migrate       Skip database migrations
    --help, -h           Show this help message

Examples:
    $(basename "$0")                          # Deploy latest
    $(basename "$0") --version v1.2.3         # Deploy version v1.2.3
    $(basename "$0") --rollback               # Rollback deployment
    $(basename "$0") --status                 # Show status
    $(basename "$0") --backup                 # Create backup
EOF
}

# =============================================================================
# Main Entry Point
# =============================================================================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-}" in
        --help | -h)
            show_help
            exit 0
            ;;
        --status)
            show_status
            exit 0
            ;;
        --backup)
            ensure_directories
            load_env
            create_backup
            exit $?
            ;;
        --migrate)
            ensure_directories
            load_env
            validate_env
            check_docker
            run_migrations
            exit $?
            ;;
        --health)
            load_env
            run_health_checks
            exit $?
            ;;
        --rollback)
            ensure_directories
            load_env
            rollback
            exit $?
            ;;
        --version)
            VERSION="${2:-latest}"
            shift 2
            ;;
        --no-rollback)
            ROLLBACK_ON_FAILURE=false
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-migrate)
            SKIP_MIGRATE=true
            shift
            ;;
        "")
            # Default: run deployment
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac

    main "$@"
fi
