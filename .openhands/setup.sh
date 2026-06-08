#!/bin/bash
# OpenHands setup — runs on every checkout. Best-effort, stack-auto-detecting.
# Never hard-fails the conversation: install errors are tolerated (agent can install manually).
set +e
echo "[openhands setup] detecting project type..."

# --- Node ---
if [ -f package.json ]; then
  command -v pnpm >/dev/null 2>&1 || corepack enable >/dev/null 2>&1
  if [ -f pnpm-lock.yaml ] || grep -q '"packageManager"[[:space:]]*:[[:space:]]*"pnpm' package.json 2>/dev/null; then
    echo "[openhands setup] pnpm install"; pnpm install --no-frozen-lockfile
  elif [ -f yarn.lock ]; then
    echo "[openhands setup] yarn install"; corepack enable >/dev/null 2>&1; yarn install
  elif [ -f bun.lockb ] && command -v bun >/dev/null 2>&1; then
    echo "[openhands setup] bun install"; bun install
  else
    echo "[openhands setup] npm install"; npm install
  fi
fi

# --- PHP ---
if [ -f composer.json ] && command -v composer >/dev/null 2>&1; then
  echo "[openhands setup] composer install"; composer install --no-interaction --no-progress
fi

# --- Python ---
if [ -f pyproject.toml ] || [ -f requirements.txt ]; then
  if command -v uv >/dev/null 2>&1; then
    echo "[openhands setup] uv sync"; uv sync || { [ -f requirements.txt ] && uv pip install -r requirements.txt; }
  elif [ -f requirements.txt ]; then
    echo "[openhands setup] pip install -r requirements.txt"; pip install -r requirements.txt
  fi
fi

echo "[openhands setup] done."
exit 0
