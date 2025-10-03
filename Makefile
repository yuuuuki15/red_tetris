# Makefile for Red Tetris Project

# Variables
COMPOSE        := docker-compose -f docker-compose.yml
COMPOSE_PROD   := docker-compose -f docker-compose.prod.yml
SERVICE_DEV    := red-tetris-dev
SERVICE_PROD   := red-tetris-prod

.PHONY: help dev dev-d dev-build dev-build-nc dev-up-recreate dev-rebuild-hard stop stop-v logs sh node-version npm-install \
        build prod-up prod-up-d prod-down prod-build-nc prod-logs prod-sh \
        test coverage lint db-reset clean clean-images clean-volumes

# Default command
help:
	@echo "Available commands:"
	@echo "  make dev              - Start the development environment (client + server with hot-reload)"
	@echo "  make dev-d            - Start dev in detached mode"
	@echo "  make dev-build        - Build dev image"
	@echo "  make dev-build-nc     - Build dev image with --no-cache"
	@echo "  make dev-up-recreate  - Up dev with --build --force-recreate"
	@echo "  make dev-rebuild-hard - Down -v, build --no-cache, then up (full refresh incl. volumes)"
	@echo "  make stop             - Stop the development environment"
	@echo "  make stop-v           - Stop dev and remove volumes (-v)"
	@echo "  make logs             - Follow combined logs of the dev service"
	@echo "  make sh               - Open a shell in the dev container"
	@echo "  make node-version     - Print Node and NPM versions in the dev container"
	@echo "  make npm-install      - Run npm install in dev container"
	@echo "  make build            - Build the production Docker image"
	@echo "  make prod-up          - Start the production environment (depends on build)"
	@echo "  make prod-up-d        - Start the production environment in detached mode"
	@echo "  make prod-down        - Stop the production environment"
	@echo "  make prod-build-nc    - Build production image with --no-cache"
	@echo "  make prod-logs        - Follow logs of the production service"
	@echo "  make prod-sh          - Open a shell in the prod container"
	@echo "  make test             - Run unit tests inside the development container"
	@echo "  make lint             - Run ESLint in the dev container"
	@echo "  make db-reset         - Remove local SQLite DB file (leaderboard.db)"
	@echo "  make clean            - Docker system prune (dangling images/networks)"
	@echo "  make clean-images     - Remove dangling images only"
	@echo "  make clean-volumes    - Prune ALL local Docker volumes (DANGEROUS)"

# --- Development ---
dev:
	@echo "Starting development environment..."
	$(COMPOSE) up --remove-orphans

dev-d:
	@echo "Starting development environment (detached)..."
	$(COMPOSE) up -d --remove-orphans

dev-build:
	@echo "Building dev image..."
	$(COMPOSE) build

dev-build-nc:
	@echo "Building dev image (no cache)..."
	$(COMPOSE) build --no-cache

dev-up-recreate:
	@echo "Up dev with rebuild and forced recreate..."
	$(COMPOSE) up --build --force-recreate

dev-rebuild-hard:
	@echo "Full rebuild: down -v, build --no-cache, up..."
	$(COMPOSE) down -v
	$(COMPOSE) build --no-cache
	$(COMPOSE) up

stop:
	@echo "Stopping development environment..."
	$(COMPOSE) down

stop-v:
	@echo "Stopping dev and removing volumes..."
	$(COMPOSE) down -v

logs:
	@echo "Following dev service logs..."
	$(COMPOSE) logs -f

sh:
	@echo "Opening shell in dev container..."
	$(COMPOSE) exec $(SERVICE_DEV) sh

node-version:
	@echo "Node & NPM versions in dev container:"
	$(COMPOSE) exec $(SERVICE_DEV) node -v
	$(COMPOSE) exec $(SERVICE_DEV) npm -v

npm-install:
	@echo "Installing dependencies in dev container..."
	$(COMPOSE) exec $(SERVICE_DEV) sh -c "npm ci || npm install"

# --- Production ---
build:
	@echo "Building production Docker image..."
	$(COMPOSE_PROD) build

prod-build-nc:
	@echo "Building production image (no cache)..."
	$(COMPOSE_PROD) build --no-cache

prod-up: build
	@echo "Starting production environment..."
	$(COMPOSE_PROD) up --remove-orphans

prod-up-d: build
	@echo "Starting production environment (detached)..."
	$(COMPOSE_PROD) up -d --remove-orphans

prod-down:
	@echo "Stopping production environment..."
	$(COMPOSE_PROD) down

prod-logs:
	@echo "Following production logs..."
	$(COMPOSE_PROD) logs -f

prod-sh:
	@echo "Opening shell in prod container..."
	$(COMPOSE_PROD) exec $(SERVICE_PROD) sh

# --- Testing & Quality ---
test:
	@echo "Running tests..."
	$(COMPOSE) exec $(SERVICE_DEV) npm test

test-coverage:
	@echo "Running tests with coverage..."
	$(COMPOSE) exec $(SERVICE_DEV) npm test -- --coverage

lint:
	@echo "Running ESLint..."
	$(COMPOSE) exec $(SERVICE_DEV) npm run lint

# --- Utilities ---
db-reset:
	@echo "Removing local SQLite DB file (leaderboard.db)..."
	rm -f leaderboard.db || true

clean:
	@echo "Cleaning up Docker resources (dangling)..."
	docker system prune -f

clean-images:
	@echo "Removing dangling images..."
	docker image prune -f

clean-volumes:
	@echo "Pruning ALL local Docker volumes (DANGEROUS) ..."
	docker volume prune -f
