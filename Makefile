# AdNexus AI — Master Makefile

.PHONY: all setup dev build test deploy clean

# === Setup ===
setup: setup-frontend setup-backend
	@echo "AdNexus AI setup complete!"

setup-frontend:
	cd app && npm install

setup-backend:
	cd adnexus-backend/api && npm install
	cd adnexus-backend/mcp-server && pip install -r requirements.txt

# === Development ===
dev: dev-db dev-backend dev-frontend dev-mcp

dev-db:
	docker-compose -f adnexus-backend/docker-compose.dev.yml up -d postgres redis

dev-backend:
	cd adnexus-backend/api && npm run dev

dev-frontend:
	cd app && npm run dev

dev-mcp:
	cd adnexus-backend/mcp-server && python server.py

# === Database ===
migrate:
	cd adnexus-backend/api && npm run migrate:up

seed:
	cd adnexus-backend/api && npm run seed

reset-db: migrate seed

# === Testing ===
test: test-frontend test-backend

test-frontend:
	cd app && npm run test

test-backend:
	cd adnexus-backend/api && npm run test:unit

test-e2e:
	cd adnexus-backend/api && npm run test:e2e

test-integration:
	cd adnexus-backend/api && npm run test:integration

# === Build ===
build: build-frontend build-backend

build-frontend:
	cd app && npm run build

build-backend:
	cd adnexus-backend/api && npm run build

# === Deploy ===
deploy-staging:
	cd adnexus-backend && ./scripts/deploy.sh staging

deploy-production:
	cd adnexus-backend && ./scripts/deploy.sh production

# === Lint ===
lint: lint-frontend lint-backend

lint-frontend:
	cd app && npm run lint

lint-backend:
	cd adnexus-backend/api && npm run lint

# === Clean ===
clean:
	cd app && rm -rf node_modules dist
	cd adnexus-backend/api && rm -rf node_modules dist

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
