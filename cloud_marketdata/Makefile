# Makefile for Cloud MarketData

.PHONY: help build up down logs test clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

build: ## Build all containers
	docker-compose build

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

logs: ## Show logs
	docker-compose logs -f

test: ## Run tests
	docker-compose run --rm app pytest

shell: ## Open shell in app container
	docker-compose run --rm app bash

clean: ## Clean up volumes and images
	docker-compose down -v
	docker system prune -f

dev: ## Start in development mode
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

redis-cli: ## Connect to Redis CLI
	docker-compose exec redis redis-cli

mongo-shell: ## Connect to MongoDB shell
	docker-compose exec mongodb mongosh

format: ## Format Python code
	docker-compose run --rm app black .
	docker-compose run --rm app isort .

lint: ## Lint Python code
	docker-compose run --rm app flake8
	docker-compose run --rm app mypy .

migrate: ## Run database migrations
	docker-compose run --rm app python -m src.infrastructure.migrations

backup: ## Backup MongoDB data
	@mkdir -p backups
	docker-compose exec mongodb mongodump --out /backup
	docker cp $$(docker-compose ps -q mongodb):/backup ./backups/mongodb-$$(date +%Y%m%d-%H%M%S)

restore: ## Restore MongoDB data (usage: make restore FILE=backups/mongodb-20240113-120000)
	docker cp $(FILE) $$(docker-compose ps -q mongodb):/restore
	docker-compose exec mongodb mongorestore /restore
