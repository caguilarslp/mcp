# Makefile for WADM

.PHONY: help install test lint format clean build docker-build docker-run

# Default target
help:
	@echo "WADM - Available commands:"
	@echo "  install      - Install dependencies"
	@echo "  test         - Run tests"
	@echo "  lint         - Run linting"
	@echo "  format       - Format code"
	@echo "  clean        - Clean build artifacts"
	@echo "  build        - Build package"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run   - Run Docker container"
	@echo "  dev          - Start development server"
	@echo "  prod         - Start production server"

# Install dependencies
install:
	pip install -r requirements.txt

# Testing
test:
	pytest -v

test-cov:
	pytest -v --cov=src --cov-report=term-missing

# Code quality
lint:
	flake8 src/ tests/
	mypy src/

format:
	black src/ tests/
	isort src/ tests/

# Clean up
clean:
	rm -rf build/ dist/ *.egg-info/ .pytest_cache/ .coverage htmlcov/ .mypy_cache/
	find . -type d -name __pycache__ -delete
	find . -type f -name "*.pyc" -delete

# Build package
build: clean
	python -m build

# Docker
docker-build:
	docker build -t wadm:latest .

docker-run:
	docker-compose up -d

docker-logs:
	docker-compose logs -f

docker-stop:
	docker-compose down

# Development
dev:
	uvicorn src.presentation.api.main:app --reload --host 0.0.0.0 --port 8920

# Production
prod:
	uvicorn src.presentation.api.main:app --host 0.0.0.0 --port 8920

# Quick status
status:
	@echo "WADM Status:"
	@docker ps --filter "name=wadm" || echo "No containers running"
	@curl -s http://localhost:8920/health || echo "API not responding"
