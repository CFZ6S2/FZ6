.PHONY: help setup dev test test-unit test-integration test-coverage format lint clean install

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)TuCitaSegura Backend - Available Commands$(NC)"
	@echo "=========================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

setup: ## Setup development environment
	@echo "$(BLUE)Setting up development environment...$(NC)"
	@bash scripts/setup.sh

install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	pip install -r requirements.txt

dev: ## Run development server
	@echo "$(BLUE)Starting development server...$(NC)"
	@bash scripts/dev.sh

test: ## Run all tests
	@echo "$(BLUE)Running all tests...$(NC)"
	@bash scripts/test.sh all

test-unit: ## Run unit tests only
	@echo "$(BLUE)Running unit tests...$(NC)"
	@bash scripts/test.sh unit

test-integration: ## Run integration tests only
	@echo "$(BLUE)Running integration tests...$(NC)"
	@bash scripts/test.sh integration

test-api: ## Run API tests only
	@echo "$(BLUE)Running API tests...$(NC)"
	@bash scripts/test.sh api

test-security: ## Run security tests only
	@echo "$(BLUE)Running security tests...$(NC)"
	@bash scripts/test.sh security

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	@bash scripts/test.sh coverage

test-quick: ## Run quick tests (exclude slow)
	@echo "$(BLUE)Running quick tests...$(NC)"
	@bash scripts/test.sh quick

format: ## Format code with black and isort
	@echo "$(BLUE)Formatting code...$(NC)"
	@bash scripts/format.sh

lint: ## Lint code with pylint, black, and isort
	@echo "$(BLUE)Linting code...$(NC)"
	@bash scripts/lint.sh

clean: ## Clean up cache and temporary files
	@echo "$(BLUE)Cleaning up...$(NC)"
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.coverage" -delete
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage
	rm -rf dist
	rm -rf build
	rm -rf *.egg-info
	@echo "$(GREEN)✅ Cleanup complete!$(NC)"

clean-all: clean ## Clean everything including venv
	@echo "$(YELLOW)Removing virtual environment...$(NC)"
	rm -rf venv
	rm -rf .venv
	@echo "$(GREEN)✅ Full cleanup complete!$(NC)"

check: lint test-quick ## Run linting and quick tests

ci: lint test-coverage ## Run CI checks (lint + full test coverage)
	@echo "$(GREEN)✅ CI checks passed!$(NC)"

install-dev: ## Install development dependencies
	@echo "$(BLUE)Installing development dependencies...$(NC)"
	pip install -e ".[dev]"

migrations: ## Generate database migrations (placeholder)
	@echo "$(YELLOW)Database migrations not implemented yet$(NC)"

migrate: ## Run database migrations (placeholder)
	@echo "$(YELLOW)Database migrations not implemented yet$(NC)"

serve-prod: ## Serve in production mode
	@echo "$(BLUE)Starting production server...$(NC)"
	uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

docs: ## Generate API documentation
	@echo "$(BLUE)Opening API documentation...$(NC)"
	@echo "Visit: http://localhost:8000/docs"

shell: ## Open Python shell with app context
	@echo "$(BLUE)Opening Python shell...$(NC)"
	python -i -c "from app import *; print('App context loaded')"

requirements: ## Update requirements.txt from pyproject.toml
	@echo "$(BLUE)Updating requirements.txt...$(NC)"
	pip freeze > requirements.txt

security: ## Run security checks
	@echo "$(BLUE)Running security checks...$(NC)"
	pip install safety bandit
	safety check
	bandit -r app/

outdated: ## Check for outdated dependencies
	@echo "$(BLUE)Checking for outdated dependencies...$(NC)"
	pip list --outdated
