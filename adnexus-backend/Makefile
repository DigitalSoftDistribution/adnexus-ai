# AdNexus Backend — Development Makefile
# Usage: make <target>
# ------------------------------------------------------------------------------

# Colors for pretty output
BLUE  := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED   := \033[31m
RESET := \033[0m

# Default target
.DEFAULT_GOAL := help

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------
PROJECT_NAME   := adnexus-backend
DOCKER_COMPOSE := docker compose -f docker-compose.dev.yml -p $(PROJECT_NAME)
NODE_BIN       := ./node_modules/.bin
API_PORT       := 3001
MCP_PORT       := 3002

# ------------------------------------------------------------------------------
# Helper: Print section headers
# ------------------------------------------------------------------------------
define section
	@echo ""
	@echo "$(BLUE)▶ $(1)$(RESET)"
	@echo "$(BLUE)────────────────────────────────────────────────────────────$(RESET)"
endef

# ------------------------------------------------------------------------------
# 🏠 HELP
# ------------------------------------------------------------------------------
.PHONY: help
help: ## Show this help message
	@echo ""
	@echo "$(GREEN)╔════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(GREEN)║          AdNexus Backend — Development Commands           ║$(RESET)"
	@echo "$(GREEN)╚════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(YELLOW)Usage:$(RESET) make $(BLUE)<target>$(RESET)"
	@echo ""
	@echo "$(YELLOW)Available targets:$(RESET)"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# ------------------------------------------------------------------------------
# 🚀 SETUP & INITIALIZATION
# ------------------------------------------------------------------------------
.PHONY: setup
setup: ## Initial setup — install dependencies, copy env, create volumes
	$(call section,"Initial Setup")
	@echo "$(GREEN)📦 Installing dependencies...$(RESET)"
	@npm install
	@echo "$(GREEN)📋 Creating environment file...$(RESET)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(YELLOW)⚠ Created .env from .env.example — please review and update it!$(RESET)"; \
	else \
		echo "$(YELLOW)⚠ .env already exists, skipping copy$(RESET)"; \
	fi
	@echo "$(GREEN)📁 Creating Docker volumes...$(RESET)"
	@mkdir -p .docker/postgres-data .docker/redis-data .docker/logs
	@echo "$(GREEN)✅ Setup complete! Edit .env, then run 'make dev'$(RESET)"

# ------------------------------------------------------------------------------
# 🔥 DEVELOPMENT — ALL SERVICES
# ------------------------------------------------------------------------------
.PHONY: dev
dev: ## Start all services (PostgreSQL + Redis + API + MCP) in dev mode
	$(call section,"Starting All Dev Services")
	@$(DOCKER_COMPOSE) up --build -d
	@echo ""
	@echo "$(GREEN)✅ All services started!$(RESET)"
	@echo ""
	@echo "$(YELLOW)  API:   $(BLUE)http://localhost:$(API_PORT)$(RESET)"
	@echo "$(YELLOW)  MCP:   $(BLUE)http://localhost:$(MCP_PORT)$(RESET)"
	@echo "$(YELLOW)  DB:    $(BLUE)localhost:5432$(RESET)"
	@echo "$(YELLOW)  Redis: $(BLUE)localhost:6379$(RESET)"
	@echo ""
	@echo "$(YELLOW)Run 'make logs' to view real-time logs$(RESET)"
	@echo "$(YELLOW)Run 'make stop' to stop all services$(RESET)"

# ------------------------------------------------------------------------------
# 🔧 INDIVIDUAL SERVICES
# ------------------------------------------------------------------------------
.PHONY: api
api: ## Start API service only (with hot reload)
	$(call section,"Starting API Service")
	@$(DOCKER_COMPOSE) up --build -d api
	@echo "$(GREEN)✅ API running at http://localhost:$(API_PORT)$(RESET)"
	@echo "$(YELLOW)Run 'make logs-api' for API logs$(RESET)"

.PHONY: mcp
mcp: ## Start MCP server only
	$(call section,"Starting MCP Server")
	@$(DOCKER_COMPOSE) up --build -d mcp
	@echo "$(GREEN)✅ MCP running at http://localhost:$(MCP_PORT)$(RESET)"
	@echo "$(YELLOW)Run 'make logs-mcp' for MCP logs$(RESET)"

.PHONY: db
db: ## Start PostgreSQL + Redis only
	$(call section,"Starting Database Services")
	@$(DOCKER_COMPOSE) up --build -d postgres redis
	@echo "$(GREEN)✅ PostgreSQL running at localhost:5432$(RESET)"
	@echo "$(GREEN)✅ Redis running at localhost:6379$(RESET)"

# ------------------------------------------------------------------------------
# 🗄️ DATABASE OPERATIONS
# ------------------------------------------------------------------------------
.PHONY: migrate
migrate: ## Run database migrations
	$(call section,"Running Migrations")
	@$(DOCKER_COMPOSE) run --rm api npx prisma migrate dev
	@echo "$(GREEN)✅ Migrations complete$(RESET)"

.PHONY: migrate-prod
migrate-prod: ## Run migrations in production mode (no interactive)
	$(call section,"Running Production Migrations")
	@$(DOCKER_COMPOSE) run --rm api npx prisma migrate deploy
	@echo "$(GREEN)✅ Production migrations complete$(RESET)"

.PHONY: seed
seed: ## Seed database with initial data
	$(call section,"Seeding Database")
	@$(DOCKER_COMPOSE) run --rm api npx prisma db seed
	@echo "$(GREEN)✅ Seeding complete$(RESET)"

.PHONY: db-reset
db-reset: ## Reset database — drop, recreate, migrate, seed
	$(call section,"Resetting Database")
	@echo "$(RED)⚠ This will destroy all data in the database!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm; \
		if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
			$(DOCKER_COMPOSE) run --rm api npx prisma migrate reset --force; \
			echo "$(GREEN)✅ Database reset complete$(RESET)"; \
		else \
			echo "$(YELLOW)❎ Cancelled$(RESET)"; \
		fi

.PHONY: db-studio
db-studio: ## Open Prisma Studio (database GUI)
	$(call section,"Starting Prisma Studio")
	@echo "$(GREEN)🌐 Prisma Studio will open at http://localhost:5555$(RESET)"
	@$(DOCKER_COMPOSE) run --rm -p 5555:5555 api npx prisma studio

.PHONY: db-generate
db-generate: ## Generate Prisma client
	$(call section,"Generating Prisma Client")
	@$(DOCKER_COMPOSE) run --rm api npx prisma generate
	@echo "$(GREEN)✅ Prisma client generated$(RESET)"

# ------------------------------------------------------------------------------
# 🧪 TESTING
# ------------------------------------------------------------------------------
.PHONY: test
test: ## Run all tests (unit + integration)
	$(call section,"Running All Tests")
	@$(DOCKER_COMPOSE) run --rm api npx jest --coverage --passWithNoTests
	@echo "$(GREEN)✅ Tests complete$(RESET)"

.PHONY: test-unit
test-unit: ## Run unit tests only
	$(call section,"Running Unit Tests")
	@$(DOCKER_COMPOSE) run --rm api npx jest --testPathPattern="\.unit\." --passWithNoTests
	@echo "$(GREEN)✅ Unit tests complete$(RESET)"

.PHONY: test-int
test-int: ## Run integration tests only
	$(call section,"Running Integration Tests")
	@$(DOCKER_COMPOSE) run --rm api npx jest --testPathPattern="\.integration\." --passWithNoTests
	@echo "$(GREEN)✅ Integration tests complete$(RESET)"

.PHONY: test-e2e
test-e2e: ## Run end-to-end tests
	$(call section,"Running E2E Tests")
	@$(DOCKER_COMPOSE) -f docker-compose.dev.yml -f docker-compose.test.yml run --rm test-runner npx jest --testPathPattern="\.e2e\." --runInBand --passWithNoTests
	@echo "$(GREEN)✅ E2E tests complete$(RESET)"

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	$(call section,"Running Tests in Watch Mode")
	@$(DOCKER_COMPOSE) run --rm api npx jest --watch --passWithNoTests

.PHONY: test-coverage
test-coverage: ## Generate test coverage report
	$(call section,"Generating Coverage Report")
	@$(DOCKER_COMPOSE) run --rm api npx jest --coverage --passWithNoTests
	@echo "$(GREEN)✅ Coverage report generated in ./coverage/$(RESET)"

# ------------------------------------------------------------------------------
# 🧹 LINTING & FORMATTING
# ------------------------------------------------------------------------------
.PHONY: lint
lint: ## Run ESLint
	$(call section,"Running Linter")
	@npx eslint "src/**/*.ts" --ext .ts --cache
	@echo "$(GREEN)✅ Linting passed$(RESET)"

.PHONY: lint-fix
lint-fix: ## Run ESLint with auto-fix
	$(call section,"Running Linter (Auto-fix)")
	@npx eslint "src/**/*.ts" --ext .ts --fix --cache
	@echo "$(GREEN)✅ Linting complete$(RESET)"

.PHONY: format
format: ## Format code with Prettier
	$(call section,"Formatting Code")
	@npx prettier --write "src/**/*.ts" "tests/**/*.ts"
	@echo "$(GREEN)✅ Formatting complete$(RESET)"

.PHONY: format-check
format-check: ## Check code formatting
	$(call section,"Checking Code Formatting")
	@npx prettier --check "src/**/*.ts" "tests/**/*.ts"
	@echo "$(GREEN)✅ Code formatting OK$(RESET)"

.PHONY: type-check
type-check: ## Run TypeScript type checking
	$(call section,"Running TypeScript Type Check")
	@npx tsc --noEmit
	@echo "$(GREEN)✅ TypeScript check passed$(RESET)"

.PHONY: ci-check
ci-check: lint type-check test ## Run all CI checks (lint + types + tests)
	@echo "$(GREEN)✅ All CI checks passed!$(RESET)"

# ------------------------------------------------------------------------------
# 🔨 BUILD & PRODUCTION
# ------------------------------------------------------------------------------
.PHONY: build
build: ## Production build (TypeScript compilation + Prisma generate)
	$(call section,"Production Build")
	@echo "$(GREEN)📦 Installing production dependencies...$(RESET)"
	@npm ci --production
	@echo "$(GREEN)🔧 Generating Prisma client...$(RESET)"
	@npx prisma generate
	@echo "$(GREEN)🏗️ Compiling TypeScript...$(RESET)"
	@npx tsc -p tsconfig.build.json
	@echo "$(GREEN)✅ Build complete! Output in ./dist/$(RESET)"

.PHONY: build-image
build-image: ## Build production Docker image
	$(call section,"Building Production Docker Image")
	@docker build -t $(PROJECT_NAME):latest -f Dockerfile .
	@echo "$(GREEN)✅ Production image built: $(PROJECT_NAME):latest$(RESET)"

# ------------------------------------------------------------------------------
# 🚀 DEPLOYMENT
# ------------------------------------------------------------------------------
.PHONY: deploy
deploy: build-image ## Deploy to production (build + push + deploy)
	$(call section,"Deploying to Production")
	@echo "$(GREEN)🚀 Pushing image to registry...$(RESET)"
	@docker tag $(PROJECT_NAME):latest $(DOCKER_REGISTRY)/$(PROJECT_NAME):latest
	@docker push $(DOCKER_REGISTRY)/$(PROJECT_NAME):latest
	@echo "$(GREEN)🚀 Triggering production deployment...$(RESET)"
	@# Add your deployment trigger here (e.g., kubectl, ssh, or webhook)
	@echo "$(YELLOW)   kubectl set image deployment/$(PROJECT_NAME) $(PROJECT_NAME)=$(DOCKER_REGISTRY)/$(PROJECT_NAME):latest$(RESET)"
	@echo "$(GREEN)✅ Deployment complete!$(RESET)"

# ------------------------------------------------------------------------------
# 📜 LOGS
# ------------------------------------------------------------------------------
.PHONY: logs
logs: ## View logs for all services
	@$(DOCKER_COMPOSE) logs -f --tail=100

.PHONY: logs-api
logs-api: ## View API service logs
	@$(DOCKER_COMPOSE) logs -f --tail=100 api

.PHONY: logs-mcp
logs-mcp: ## View MCP server logs
	@$(DOCKER_COMPOSE) logs -f --tail=100 mcp

.PHONY: logs-db
logs-db: ## View PostgreSQL logs
	@$(DOCKER_COMPOSE) logs -f --tail=100 postgres

.PHONY: logs-redis
logs-redis: ## View Redis logs
	@$(DOCKER_COMPOSE) logs -f --tail=100 redis

# ------------------------------------------------------------------------------
# 🛑 STOP & CLEANUP
# ------------------------------------------------------------------------------
.PHONY: stop
stop: ## Stop all services (containers preserved)
	$(call section,"Stopping All Services")
	@$(DOCKER_COMPOSE) stop
	@echo "$(GREEN)✅ All services stopped$(RESET)"

.PHONY: down
down: ## Stop and remove all containers, networks
	$(call section,"Removing All Containers")
	@$(DOCKER_COMPOSE) down
	@echo "$(GREEN)✅ All containers and networks removed$(RESET)"

.PHONY: clean
clean: ## Stop all + remove volumes (⚠ destroys all data)
	$(call section,"Cleaning Everything")
	@echo "$(RED)⚠ This will remove all containers, networks, and volumes!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm; \
		if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
			$(DOCKER_COMPOSE) down -v --remove-orphans; \
			docker volume rm -f $(PROJECT_NAME)_postgres-data $(PROJECT_NAME)_redis-data 2>/dev/null || true; \
			rm -rf .docker/postgres-data .docker/redis-data .docker/logs; \
			echo "$(GREEN)✅ Cleanup complete$(RESET)"; \
		else \
			echo "$(YELLOW)❎ Cancelled$(RESET)"; \
		fi

.PHONY: prune
prune: ## Full Docker cleanup (images + volumes + networks)
	$(call section,"Full Docker Prune")
	@echo "$(RED)⚠ This will prune all unused Docker resources!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm; \
		if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
			docker system prune -f; \
			docker volume prune -f; \
			echo "$(GREEN)✅ Docker prune complete$(RESET)"; \
		else \
			echo "$(YELLOW)❎ Cancelled$(RESET)"; \
		fi

# ------------------------------------------------------------------------------
# 🔍 DEBUGGING
# ------------------------------------------------------------------------------
.PHONY: shell-api
shell-api: ## Open a shell inside the API container
	@$(DOCKER_COMPOSE) exec api /bin/sh

.PHONY: shell-mcp
shell-mcp: ## Open a shell inside the MCP container
	@$(DOCKER_COMPOSE) exec mcp /bin/sh

.PHONY: shell-db
shell-db: ## Open a psql shell inside PostgreSQL
	@$(DOCKER_COMPOSE) exec postgres psql -U $$POSTGRES_USER -d $$POSTGRES_DB

.PHONY: shell-redis
shell-redis: ## Open redis-cli inside Redis
	@$(DOCKER_COMPOSE) exec redis redis-cli

.PHONY: status
status: ## Show running container status
	$(call section,"Container Status")
	@$(DOCKER_COMPOSE) ps

.PHONY: inspect
inspect: ## Inspect Docker network and volumes
	$(call section,"Docker Network & Volumes")
	@echo "$(YELLOW)Networks:$(RESET)"
	@docker network ls | grep $(PROJECT_NAME) || echo "  None"
	@echo ""
	@echo "$(YELLOW)Volumes:$(RESET)"
	@docker volume ls | grep $(PROJECT_NAME) || echo "  None"
	@echo ""
	@echo "$(YELLOW)Images:$(RESET)"
	@docker images | grep $(PROJECT_NAME) || echo "  None"
