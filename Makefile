# AdNexus AI — monorepo Makefile (pnpm + Turborepo)
#
# Prefer `pnpm` commands directly; this file is a thin convenience wrapper.
# Legacy `adnexus-backend/` paths were removed — see apps/api, apps/web, apps/mcp.

.PHONY: all setup dev build test lint typecheck clean help

all: build

setup:
	pnpm install

dev:
	pnpm dev

build:
	pnpm build

test:
	pnpm test

lint:
	pnpm lint

typecheck:
	pnpm typecheck

clean:
	rm -rf node_modules apps/*/node_modules packages/*/node_modules .turbo

help:
	@echo "AdNexus AI monorepo — common commands:"
	@echo "  make setup      Install dependencies (pnpm install)"
	@echo "  make dev        Start API + web dev servers"
	@echo "  make test       Run test suites"
	@echo "  make build      Production build (all packages)"
	@echo "  make typecheck  TypeScript check"
	@echo "  make lint       ESLint across packages"
	@echo ""
	@echo "See README.md for API/web env vars and deploy notes."
