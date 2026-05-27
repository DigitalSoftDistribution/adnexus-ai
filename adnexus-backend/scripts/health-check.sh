#!/usr/bin/env bash
###############################################################################
# AdNexus Backend — Health Check Monitor
# Usage:
#   ./scripts/health-check.sh              # Full health check
#   ./scripts/health-check.sh --json       # Output JSON only
#   ./scripts/health-check.sh --watch      # Continuous monitoring
#   ./scripts/health-check.sh --cron       # Cron mode with alerts
#   ./scripts/health-check.sh --notify     # Send alert on failure
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load .env
[[ -f "$PROJECT_ROOT/.env" ]] && source "$PROJECT_ROOT/.env"

# Configuration
API_URL="${API_URL:-http://localhost:${PORT:-3001}}"
API_HEALTH="${API_URL}/api/v1/health"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-adnexus}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASS="${POSTGRES_PASSWORD:-}"
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
MCP_URL="${MCP_SERVER_URL:-http://localhost:3002}"
ALERT_WEBHOOK="${ALERT_WEBHOOK_URL:-}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
SMTP_HOST="${SMTP_HOST:-}"

# Timing
TIMEOUT=5
WATCH_INTERVAL=30

# Colors
JSON_ONLY=false
CRON_MODE=false
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Health state
declare -A SERVICES

###############################################################################
# Output helpers
###############################################################################
ok()   { [[ "$JSON_ONLY" == true ]] || echo -e "  ${GREEN}✓${NC} $1"; }
fail() { [[ "$JSON_ONLY" == true ]] || echo -e "  ${RED}✗${NC} $1"; }
warn() { [[ "$JSON_ONLY" == true ]] || echo -e "  ${YELLOW}⚠${NC} $1"; }
info() { [[ "$JSON_ONLY" == true ]] || echo -e "  ${BLUE}ℹ${NC} $1"; }

###############################################################################
# Check: API Server
###############################################################################
check_api() {
  local status="healthy"
  local latency="-"
  local details="{}"

  local start end
  start=$(date +%s%N 2>/dev/null || echo "$(date +%s)000000000")

  local response
  if response=$(curl -sf --max-time "$TIMEOUT" \
    -H "Accept: application/json" \
    "$API_HEALTH" 2>/dev/null); then

    end=$(date +%s%N 2>/dev/null || echo "$(date +%s)000000000")
    latency=$(( (end - start) / 1000000 ))  # ms

    # Parse response if JSON
    if echo "$response" | head -1 | grep -q '{'; then
      local api_status
      api_status=$(echo "$response" | grep -o '"status"[^,}]*' | head -1 | cut -d: -f2 | tr -d ' "')
      details="$response"

      if [[ "$api_status" == "ok" || "$api_status" == "healthy" ]]; then
        ok "API Server — healthy (${latency}ms)"
      else
        status="degraded"
        warn "API Server — degraded (status: $api_status)"
      fi
    else
      ok "API Server — responding (${latency}ms)"
    fi
  else
    status="unhealthy"
    end=$(date +%s%N 2>/dev/null || echo "$(date +%s)000000000")
    latency=$(( (end - start) / 1000000 ))
    fail "API Server — unreachable (timeout: ${TIMEOUT}s)"
  fi

  SERVICES[api]="{\"name\":\"API Server\",\"status\":\"${status}\",\"latency\":${latency},\"url\":\"${API_HEALTH}\",\"details\":${details}}"
  [[ "$status" == "healthy" ]]
}

###############################################################################
# Check: PostgreSQL
###############################################################################
check_db() {
  local status="healthy"
  local latency="-"

  local start end
  start=$(date +%s%N 2>/dev/null || echo "$(date +%s)000000000")

  export PGPASSWORD="$DB_PASS"

  if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "SELECT version(), NOW(), pg_database_size('${DB_NAME}')" \
    --quiet --csv 2>/dev/null | head -2 | tail -1 | grep -q ".*"; then

    end=$(date +%s%N 2>/dev/null || echo "$(date +%s)000000000")
    latency=$(( (end - start) / 1000000 ))

    # Get connection count
    local connections
    connections=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      -c "SELECT count(*) FROM pg_stat_activity" -t --quiet 2>/dev/null | xargs)

    ok "PostgreSQL — healthy (${latency}ms, ${connections} connections)"
  else
    status="unhealthy"
    end=$(date +%s%N 2>/dev/null || echo "$(date +%s)000000000")
    latency=$(( (end - start) / 1000000 ))
    fail "PostgreSQL — unreachable (${DB_HOST}:${DB_PORT}/${DB_NAME})"
  fi

  unset PGPASSWORD

  SERVICES[db]="{\"name\":\"PostgreSQL\",\"status\":\"${status}\",\"latency\":${latency},\"host\":\"${DB_HOST}:${DB_PORT}\",\"database\":\"${DB_NAME}\"}"
  [[ "$status" == "healthy" ]]
}

###############################################################################
# Check: Redis
###############################################################################
check_redis() {
  local status="healthy"
  local latency="-"

  local start end
  start=$(date +%s%N 2>/dev/null || echo "$(date +%s)000000000")

  if redis-cli -u "$REDIS_URL" ping 2>/dev/null | grep -q "PONG"; then
    end=$(date +%s%N 2>/dev/null || echo "$(date +%s)000000000")
    latency=$(( (end - start) / 1000000 ))

    local info_keyspace
    info_keyspace=$(redis-cli -u "$REDIS_URL" info keyspace 2>/dev/null | head -2 | tail -1)

    ok "Redis — healthy (${latency}ms)"
    [[ -n "$info_keyspace" ]] && info "  $info_keyspace"
  else
    # Try without -u flag
    if redis-cli ping 2>/dev/null | grep -q "PONG"; then
      end=$(date +%s%N 2>/dev/null || echo "$(date +%s)000000000")
      latency=$(( (end - start) / 1000000 ))
      ok "Redis — healthy (${latency}ms, default connection)"
    else
      status="unhealthy"
      end=$(date +%s%N 2>/dev/null || echo "$(date +%s)000000000")
      latency=$(( (end - start) / 1000000 ))
      fail "Redis — unreachable"
    fi
  fi

  SERVICES[redis]="{\"name\":\"Redis\",\"status\":\"${status}\",\"latency\":${latency},\"url\":\"${REDIS_URL}\"}"
  [[ "$status" == "healthy" ]]
}

###############################################################################
# Check: MCP Server
###############################################################################
check_mcp() {
  local status="healthy"
  local latency="-"

  local start end
  start=$(date +%s%N 2>/dev/null || echo "$(date +%s)000000000")

  local mcp_health="${MCP_URL%/}/health"
  if curl -sf --max-time "$TIMEOUT" "$mcp_health" 2>/dev/null | grep -qi "ok\|healthy"; then
    end=$(date +%s%N 2>/dev/null || echo "$(date +%s)000000000")
    latency=$(( (end - start) / 1000000 ))
    ok "MCP Server — healthy (${latency}ms)"
  else
    # MCP server might not have a /health endpoint — try root
    if curl -sf --max-time "$TIMEOUT" "$MCP_URL" 2>/dev/null | grep -q ".*"; then
      end=$(date +%s%N 2>/dev/null || echo "$(date +%s)000000000")
      latency=$(( (end - start) / 1000000 ))
      ok "MCP Server — responding (${latency}ms)"
    else
      status="unhealthy"
      end=$(date +%s%N 2>/dev/null || echo "$(date +%s)000000000")
      latency=$(( (end - start) / 1000000 ))
      warn "MCP Server — unreachable (may not be running)"
      # Don't fail the whole check for MCP — it might be optional
      status="unknown"
    fi
  fi

  SERVICES[mcp]="{\"name\":\"MCP Server\",\"status\":\"${status}\",\"latency\":${latency},\"url\":\"${MCP_URL}\"}"
  true  # MCP is optional, don't fail overall
}

###############################################################################
# Check: Disk Space
###############################################################################
check_disk() {
  local status="healthy"
  local usage
  usage=$(df "$PROJECT_ROOT" 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')

  if [[ "$usage" -lt 80 ]]; then
    ok "Disk Space — ${usage}% used"
  elif [[ "$usage" -lt 90 ]]; then
    status="degraded"
    warn "Disk Space — ${usage}% used (getting full)"
  else
    status="unhealthy"
    fail "Disk Space — ${usage}% used (critical)"
  fi

  SERVICES[disk]="{\"name\":\"Disk Space\",\"status\":\"${status}\",\"usagePercent\":${usage},\"path\":\"${PROJECT_ROOT}\"}"
  [[ "$status" != "unhealthy" ]]
}

###############################################################################
# Check: Memory
###############################################################################
check_memory() {
  local status="healthy"
  local usage

  if [[ -f /proc/meminfo ]]; then
    local total available
    total=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    available=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    usage=$(( 100 - (available * 100 / total) ))
  else
    # macOS / BSD
    usage=$(vm_stat 2>/dev/null | awk '
      /Pages free/ { free=$3 }
      /Pages active/ { active=$3 }
      /Pages inactive/ { inactive=$3 }
      /Pages wired/ { wired=$3 }
      END { gsub(/[^0-9]/,"",free); gsub(/[^0-9]/,"",active); gsub(/[^0-9]/,"",inactive); gsub(/[^0-9]/,"",wired); total=free+active+inactive+wired; print int((active+inactive+wired)*100/total) }'
    )
  fi

  if [[ "$usage" -lt 80 ]]; then
    ok "Memory — ${usage}% used"
  elif [[ "$usage" -lt 90 ]]; then
    status="degraded"
    warn "Memory — ${usage}% used (getting high)"
  else
    status="unhealthy"
    fail "Memory — ${usage}% used (critical)"
  fi

  SERVICES[memory]="{\"name\":\"Memory\",\"status\":\"${status}\",\"usagePercent\":${usage}}"
  [[ "$status" != "unhealthy" ]]
}

###############################################################################
# Send alert notification
###############################################################################
send_alert() {
  local message="$1"
  local timestamp
  timestamp=$(date -Iseconds)

  # Webhook alert
  if [[ -n "$ALERT_WEBHOOK" ]]; then
    curl -sf --max-time 10 -X POST \
      -H "Content-Type: application/json" \
      -d "{\"text\":\"🚨 AdNexus Health Alert\n$message\nTime: $timestamp\"}" \
      "$ALERT_WEBHOOK" 2>/dev/null || true
  fi

  # Email alert
  if [[ -n "$ALERT_EMAIL" && -n "$SMTP_HOST" ]]; then
    {
      echo "Subject: [AdNexus ALERT] Service Health Check Failed"
      echo "To: $ALERT_EMAIL"
      echo "Content-Type: text/plain; charset=utf-8"
      echo ""
      echo "$message"
      echo ""
      echo "Timestamp: $timestamp"
      echo "Host: $(hostname)"
    } | msmtp "$ALERT_EMAIL" 2>/dev/null || \
      sendmail "$ALERT_EMAIL" 2>/dev/null || true
  fi
}

###############################################################################
# Build and output JSON result
###############################################################################
output_json() {
  local overall="healthy"
  local failed=0
  local service_json=""

  for key in api db redis mcp disk memory; do
    [[ -n "${SERVICES[$key]+x}" ]] || continue

    local svc_status
    svc_status=$(echo "${SERVICES[$key]}" | grep -o '"status"[^,}]*' | head -1 | cut -d: -f2 | tr -d ' "')

    if [[ "$svc_status" == "unhealthy" ]]; then
      overall="unhealthy"
      ((failed++)) || true
    elif [[ "$svc_status" == "degraded" && "$overall" != "unhealthy" ]]; then
      overall="degraded"
    fi

    [[ -n "$service_json" ]] && service_json="${service_json},"
    service_json="${service_json}${SERVICES[$key]}"
  done

  local json
  json=$(cat <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "host": "$(hostname)",
  "overall": "${overall}",
  "services": [${service_json}]
}
EOF
)

  echo "$json"

  # Return non-zero if unhealthy
  if [[ "$overall" == "unhealthy" ]]; then
    return 1
  fi
  return 0
}

###############################################################################
# Watch mode
###############################################################################
watch_mode() {
  while true; do
    clear
    echo -e "${BOLD}AdNexus Health Monitor${NC} — $(date '+%Y-%m-%d %H:%M:%S')"
    echo "────────────────────────────────────────────────────────────"
    echo ""

    run_checks

    echo ""
    echo "Refreshing every ${WATCH_INTERVAL}s (Ctrl+C to exit)..."
    sleep "$WATCH_INTERVAL"
  done
}

###############################################################################
# Run all checks
###############################################################################
run_checks() {
  local failed=0

  check_api  || ((failed++)) || true
  check_db   || ((failed++)) || true
  check_redis|| ((failed++)) || true
  check_mcp  || true  # Optional
  check_disk || ((failed++)) || true
  check_memory || ((failed++)) || true

  if [[ "$failed" -gt 0 ]]; then
    echo ""
    fail "$failed service(s) unhealthy"

    local alert_msg=""
    for key in api db redis mcp disk memory; do
      [[ -n "${SERVICES[$key]+x}" ]] || continue
      local svc_name svc_status
      svc_name=$(echo "${SERVICES[$key]}" | grep -o '"name"[^,}]*' | head -1 | cut -d: -f2 | tr -d ' "')
      svc_status=$(echo "${SERVICES[$key]}" | grep -o '"status"[^,}]*' | head -1 | cut -d: -f2 | tr -d ' "')
      if [[ "$svc_status" == "unhealthy" ]]; then
        alert_msg="${alert_msg}• ${svc_name}: UNHEALTHY
"
      fi
    done

    send_alert "$alert_msg"
    return 1
  fi

  return 0
}

###############################################################################
# Main
###############################################################################
main() {
  case "${1:-}" in
    --json)
      JSON_ONLY=true
      run_checks &>/dev/null
      output_json
      exit $?
      ;;
    --watch|-w)
      watch_mode
      ;;
    --cron)
      CRON_MODE=true
      JSON_ONLY=true
      output=$(output_json 2>/dev/null)
      echo "$output" >> "$PROJECT_ROOT/logs/health-check.jsonl" 2>/dev/null || true
      exit $?
      ;;
    --notify)
      if ! run_checks &>/dev/null; then
        output_json
        exit 1
      fi
      output_json
      ;;
    --help|-h)
      cat <<EOF
AdNexus Health Check Monitor

Usage: $0 [OPTION]

Options:
  (no args)     Run health check with visual output
  --json        Output JSON only (for monitoring systems)
  --watch       Continuous monitoring mode
  --cron        Quiet cron mode (append to log)
  --notify      Send alerts on failure
  --help        Show this help

Checks: API Server, PostgreSQL, Redis, MCP Server, Disk, Memory

Configure via .env:
  API_URL, DATABASE_URL, REDIS_URL, MCP_SERVER_URL
  ALERT_WEBHOOK_URL, ALERT_EMAIL, SMTP_HOST
EOF
      ;;
    *)
      echo -e "${BOLD}AdNexus Backend — Health Check${NC}"
      echo "────────────────────────────────────────────────────────────"
      echo ""

      run_checks
      local result=$?

      echo ""
      output_json > /dev/null  # Populate SERVICES

      # Pretty print summary
      echo -e "${BOLD}Summary:${NC}"
      for key in api db redis mcp disk memory; do
        [[ -n "${SERVICES[$key]+x}" ]] || continue
        local svc_name svc_status svc_latency
        svc_name=$(echo "${SERVICES[$key]}" | grep -o '"name"[^,}]*' | head -1 | cut -d: -f2 | tr -d ' "')
        svc_status=$(echo "${SERVICES[$key]}" | grep -o '"status"[^,}]*' | head -1 | cut -d: -f2 | tr -d ' "')
        svc_latency=$(echo "${SERVICES[$key]}" | grep -o '"latency"[^,}]*' | head -1 | cut -d: -f2 | tr -d ' ')

        case "$svc_status" in
          healthy)  echo -e "  ${GREEN}●${NC} $svc_name — ${GREEN}$svc_status${NC} (${svc_latency}ms)" ;;
          degraded) echo -e "  ${YELLOW}●${NC} $svc_name — ${YELLOW}$svc_status${NC}" ;;
          unhealthy|unknown) echo -e "  ${RED}●${NC} $svc_name — ${RED}$svc_status${NC}" ;;
        esac
      done

      if [[ "$result" -eq 0 ]]; then
        echo ""
        echo -e "  ${GREEN}✓ All systems operational${NC}"
      else
        echo ""
        echo -e "  ${RED}✗ Some services are unhealthy${NC}"
      fi

      exit "$result"
      ;;
  esac
}

main "$@"
