#!/usr/bin/env bash
###############################################################################
# AdNexus Backend — Database Backup & Cron Script
# Usage:
#   ./scripts/backup.sh                    # Full backup (local + S3)
#   ./scripts/backup.sh --local-only       # Local file only
#   ./scripts/backup.sh --s3-only          # S3 only
#   ./scripts/backup.sh --restore <file>   # Restore from backup
#   ./scripts/backup.sh --cron             # Cron-mode (quiet, with rotation)
#   ./scripts/backup.sh --setup-cron       # Install daily cron job
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load .env if present
[[ -f "$PROJECT_ROOT/.env" ]] && source "$PROJECT_ROOT/.env"

# Configuration
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
BACKUP_PREFIX="${BACKUP_PREFIX:-adnexus}"
DB_NAME="${POSTGRES_DB:-adnexus}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_PASS="${POSTGRES_PASSWORD:-}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_PREFIX}-${TIMESTAMP}.sql.gz"
LOCAL_BACKUP="${BACKUP_DIR}/${BACKUP_FILE}"

# Colors (disabled in cron mode)
CRON_MODE=false
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log()  { [[ "$CRON_MODE" == true ]] || echo -e "${GREEN}[✓]${NC} $1"; }
info() { [[ "$CRON_MODE" == true ]] || echo -e "${BLUE}[ℹ]${NC} $1"; }
warn() { [[ "$CRON_MODE" == true ]] || echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1" >&2; }

###############################################################################
# Usage
###############################################################################
usage() {
  cat <<EOF
AdNexus Backup Manager

Usage: $0 [OPTION]

Options:
  (no args)        Full backup — local file + S3 upload
  --local-only     Save backup to local directory only
  --s3-only        Stream backup directly to S3 (no local copy)
  --restore FILE   Restore database from a backup file
  --list           List available backups (local + S3)
  --cron           Cron mode — quiet output, auto-rotation
  --setup-cron     Install daily cron job
  --verify FILE    Verify backup file integrity
  --help           Show this help

Environment variables (set in .env):
  BACKUP_DIR           Local backup directory
  BACKUP_RETENTION_DAYS  Retention period (default: 30)
  S3_BUCKET            S3 bucket for remote backups
  AWS_REGION           AWS region (default: us-east-1)
  DATABASE_URL         Full PostgreSQL connection string
  POSTGRES_*           Individual DB connection params

Examples:
  $0                          # Daily full backup
  $0 --restore backups/adnexus-20240115-030000.sql.gz
  $0 --setup-cron             # Install 3:00 AM daily cron
EOF
}

###############################################################################
# Ensure backup directory exists
###############################################################################
ensure_backup_dir() {
  mkdir -p "$BACKUP_DIR"
}

###############################################################################
# Build PGPASSWORD export
###############################################################################
export_pgpass() {
  if [[ -n "$DB_PASS" ]]; then
    export PGPASSWORD="$DB_PASS"
  fi
}

###############################################################################
# Check pg_dump availability
###############################################################################
check_pg_dump() {
  if ! command -v pg_dump &>/dev/null; then
    err "pg_dump not found — install PostgreSQL client tools"
    exit 1
  fi

  if ! command -v psql &>/dev/null; then
    err "psql not found — install PostgreSQL client tools"
    exit 1
  fi
}

###############################################################################
# Check database connectivity
###############################################################################
check_db() {
  export_pgpass
  if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &>/dev/null; then
    err "Cannot connect to PostgreSQL at ${DB_HOST}:${DB_PORT}/${DB_NAME}"
    exit 1
  fi
  log "Database connection OK"
}

###############################################################################
# Local backup
###############################################################################
backup_local() {
  ensure_backup_dir
  check_pg_dump
  check_db

  info "Creating local backup: $BACKUP_FILE"

  pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    --verbose \
    2>/dev/null | gzip > "$LOCAL_BACKUP"

  local size
  size=$(du -h "$LOCAL_BACKUP" | cut -f1)
  log "Local backup created: $BACKUP_FILE ($size)"

  # Show table row counts
  if [[ "$CRON_MODE" == false ]]; then
    info "Backup contents:"
    pg_restore -l "$LOCAL_BACKUP" 2>/dev/null | head -20 || true
  fi

  echo "$LOCAL_BACKUP"
}

###############################################################################
# S3 upload
###############################################################################
backup_s3() {
  if [[ -z "$S3_BUCKET" ]]; then
    warn "S3_BUCKET not set — skipping S3 upload"
    return 1
  fi

  # Check AWS CLI
  if ! command -v aws &>/dev/null; then
    warn "AWS CLI not found — install: pip install awscli"
    return 1
  fi

  local source_file="$1"

  info "Uploading to s3://${S3_BUCKET}/backups/ ..."

  aws s3 cp "$source_file" "s3://${S3_BUCKET}/backups/${BACKUP_FILE}" \
    --region "$AWS_REGION" \
    --storage-class STANDARD_IA \
    2>/dev/null

  # Verify upload
  if aws s3 ls "s3://${S3_BUCKET}/backups/${BACKUP_FILE}" --region "$AWS_REGION" &>/dev/null; then
    log "S3 upload complete: s3://${S3_BUCKET}/backups/${BACKUP_FILE}"
  else
    err "S3 upload verification failed"
    return 1
  fi

  return 0
}

###############################################################################
# Stream directly to S3 (no local copy)
###############################################################################
backup_s3_stream() {
  if [[ -z "$S3_BUCKET" ]]; then
    err "S3_BUCKET not set"
    exit 1
  fi

  if ! command -v aws &>/dev/null; then
    err "AWS CLI not found"
    exit 1
  fi

  check_pg_dump
  check_db

  info "Streaming backup directly to S3..."

  pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    2>/dev/null | gzip | \
    aws s3 cp - "s3://${S3_BUCKET}/backups/${BACKUP_FILE}" \
      --region "$AWS_REGION" \
      --storage-class STANDARD_IA \
      2>/dev/null

  log "S3 stream complete: s3://${S3_BUCKET}/backups/${BACKUP_FILE}"
}

###############################################################################
# Restore from backup
###############################################################################
restore_backup() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    # Try in backup directory
    file="${BACKUP_DIR}/${file}"
    if [[ ! -f "$file" ]]; then
      err "Backup file not found: $1"
      exit 1
    fi
  fi

  check_db

  warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  warn "  THIS WILL DESTROY EXISTING DATABASE DATA"
  warn "  Target: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
  warn "  Source: ${file}"
  warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [[ "$CRON_MODE" == false ]]; then
    read -rp "Type 'RESTORE' to confirm: " confirm
    [[ "$confirm" == "RESTORE" ]] || { info "Restore cancelled"; exit 0; }
  fi

  info "Restoring database..."

  # Create pre-restore backup
  local pre_restore_backup="${BACKUP_DIR}/${BACKUP_PREFIX}-pre-restore-$(date +%Y%m%d-%H%M%S).sql.gz"
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>/dev/null | gzip > "$pre_restore_backup"
  info "Pre-restore backup: $pre_restore_backup"

  # Restore
  gunzip -c "$file" | psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --set ON_ERROR_STOP=on \
    2>/dev/null

  log "Database restored from $file"
}

###############################################################################
# List backups
###############################################################################
list_backups() {
  echo -e "${BOLD}Local Backups:${NC}"
  echo "──────────────────────────────────────────────────────────"
  if [[ -d "$BACKUP_DIR" ]]; then
    ls -lht "$BACKUP_DIR"/*.sql.gz 2>/dev/null | while read -r line; do
      echo "  $line"
    done || echo "  (none)"
  else
    echo "  Backup directory not found: $BACKUP_DIR"
  fi

  echo ""
  echo -e "${BOLD}S3 Backups:${NC}"
  echo "──────────────────────────────────────────────────────────"
  if [[ -n "$S3_BUCKET" ]] && command -v aws &>/dev/null; then
    aws s3 ls "s3://${S3_BUCKET}/backups/" --region "$AWS_REGION" 2>/dev/null | \
      sort -k1,2 | tail -20 | while read -r line; do
      echo "  $line"
    done || echo "  (none or S3 not accessible)"
  else
    echo "  S3 not configured"
  fi
}

###############################################################################
# Verify backup integrity
###############################################################################
verify_backup() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    file="${BACKUP_DIR}/${file}"
    if [[ ! -f "$file" ]]; then
      err "Backup file not found: $1"
      exit 1
    fi
  fi

  info "Verifying backup: $(basename "$file")"

  # Check gzip integrity
  if ! gzip -t "$file" 2>/dev/null; then
    err "Gzip integrity check FAILED"
    exit 1
  fi
  log "Gzip integrity OK"

  # Check pg_restore can parse it
  if command -v pg_restore &>/dev/null; then
    local toc_count
    toc_count=$(pg_restore -l "$file" 2>/dev/null | wc -l)
    log "TOC entries: $toc_count"
    if [[ "$toc_count" -lt 1 ]]; then
      err "No valid TOC entries found"
      exit 1
    fi
    log "PostgreSQL format OK"
  fi

  # Check size
  local size
  size=$(du -h "$file" | cut -f1)
  log "Backup file size: $size"

  log "Backup verification PASSED ✓"
}

###############################################################################
# Rotate old backups
###############################################################################
rotate_backups() {
  if [[ ! -d "$BACKUP_DIR" ]]; then
    return
  fi

  info "Rotating local backups older than ${RETENTION_DAYS} days..."

  local count=0
  while IFS= read -r file; do
    rm -f "$file"
    ((count++))
  done < <(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}-*.sql.gz" -mtime "+${RETENTION_DAYS}" 2>/dev/null)

  if [[ $count -gt 0 ]]; then
    log "Removed $count old local backup(s)"
  fi

  # Rotate S3 backups (keep 90 days on S3)
  if [[ -n "$S3_BUCKET" ]] && command -v aws &>/dev/null; then
    local cutoff_date
    cutoff_date=$(date -d "90 days ago" +%Y-%m-%d 2>/dev/null || date -v-90d +%Y-%m-%d)

    aws s3 ls "s3://${S3_BUCKET}/backups/" --region "$AWS_REGION" 2>/dev/null | \
      while read -r date _ file; do
        if [[ "$date" < "$cutoff_date" ]]; then
          aws s3 rm "s3://${S3_BUCKET}/backups/${file}" --region "$AWS_REGION" &>/dev/null
          log "Removed from S3: $file"
        fi
      done
  fi
}

###############################################################################
# Setup cron job
###############################################################################
setup_cron() {
  local cron_entry
  cron_entry="0 3 * * * cd $PROJECT_ROOT && $PROJECT_ROOT/scripts/backup.sh --cron >> $PROJECT_ROOT/logs/backup-cron.log 2>&1"

  info "Installing daily backup cron job (3:00 AM)..."

  # Check if already installed
  if crontab -l 2>/dev/null | grep -qF "$PROJECT_ROOT/scripts/backup.sh"; then
    warn "Cron job already exists — skipping"
    return
  fi

  (crontab -l 2>/dev/null || true; echo "$cron_entry") | crontab -

  log "Cron job installed ✓"
  info "Run 'crontab -l' to verify"
  info "Logs will be written to: $PROJECT_ROOT/logs/backup-cron.log"
}

###############################################################################
# Main
###############################################################################
main() {
  case "${1:-}" in
    --help|-h)
      usage
      exit 0
      ;;
    --restore)
      [[ -z "${2:-}" ]] && { err "Usage: $0 --restore <file>"; exit 1; }
      restore_backup "$2"
      ;;
    --list|-l)
      list_backups
      ;;
    --verify)
      [[ -z "${2:-}" ]] && { err "Usage: $0 --verify <file>"; exit 1; }
      verify_backup "$2"
      ;;
    --local-only)
      backup_local
      ;;
    --s3-only)
      backup_s3_stream
      ;;
    --cron)
      CRON_MODE=true
      backup_file=$(backup_local)
      backup_s3 "$backup_file" || true
      rotate_backups
      log "Cron backup complete: $(basename "$backup_file")"
      ;;
    --setup-cron)
      setup_cron
      ;;
    "")
      # Full backup
      backup_file=$(backup_local)
      backup_s3 "$backup_file" || true
      rotate_backups
      log "Backup complete: $(basename "$backup_file")"
      ;;
    *)
      err "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
}

main "$@"
