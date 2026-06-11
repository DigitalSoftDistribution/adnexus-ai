#!/bin/sh
# Run pending SQL migrations before starting the API server.
# Idempotent: migrate.js skips already-applied migrations.
# Fails fast (set -e) so Coolify marks the deploy unhealthy on migration errors.
set -eu

echo "[entrypoint] Applying database migrations..."
node apps/api/dist/db/migrate.js up

echo "[entrypoint] Starting API server..."
exec node apps/api/dist/index.js
