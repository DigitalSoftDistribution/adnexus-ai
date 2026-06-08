# AdNexus AI — Master Makefile

.PHONY: all setup dev build test deploy clean

# === Setup ===
setup: setup-frontend setup-backend
	@echo "AdNexus AI setup complete!"

setup-frontend:
	cd apps/web && npm install

setup-backend:
	cd apps/api && npm install
	cd adnexus-backend/mcp-server && pip install -r requirements.txt

# === Development ===
dev: dev-db dev-backend dev-frontend dev-mcp

dev-db:
	docker-compose -f adnexus-backend/docker-compose.dev.yml up -d postgres redis

dev-backend:
	cd apps/api && npm run dev

dev-frontend:
	cd apps/web && npm run dev

dev-mcp:
	cd adnexus-backend/mcp-server && python server.py

# === Database ===
migrate:
	cd apps/api && npm run migrate:up

seed:
	cd apps/api && npm run seed

reset-db: migrate seed

# === Testing ===
test: test-frontend test-backend

test-frontend:
	cd apps/web && npm run test

test-backend:
	cd apps/api && npm run test:unit

test-e2e:
	cd apps/api && npm run test:e2e

test-integration:
	cd apps/api && npm run test:integration

# === Build ===
build: build-frontend build-backend

build-frontend:
	cd apps/web && npm run build

build-backend:
	cd apps/api && npm run build

# === Deploy ===
deploy-staging:
	cd adnexus-backend && ./scripts/deploy.sh staging

deploy-production:
	cd adnexus-backend && ./scripts/deploy.sh production

# === Lint ===
lint: lint-frontend lint-backend

lint-frontend:
	cd apps/web && npm run lint

lint-backend:
	cd apps/api && npm run lint

# === Clean ===
clean:
	cd apps/web && rm -rf node_modules dist
	cd apps/api && rm -rf node_modules dist

docker-clean:
	docker-compose -f adnexus-backend/docker-compose.dev.yml down -v

# === Logs ===
logs:
	cd adnexus-backend && docker-compose logs -f

# === Health ===
health:
	curl -s http://localhost:3000/health | jq .

# === Help ===
help:
	@echo "AdNexus AI — Available commands:"
	@echo "  make setup          - Install all dependencies"
	@echo "  make dev            - Start all dev services"
	@echo "  make test           - Run all tests"
	@echo "  make build          - Build for production"
	@echo "  make deploy-production  - Deploy to production"
	@echo "  make migrate        - Run database migrations"
	@echo "  make seed           - Seed database with demo data"
