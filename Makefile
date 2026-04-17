.DEFAULT_GOAL := help
COMPOSE := docker compose

.PHONY: help up down dev build rebuild logs clean test test-env test-env-down lint env

help:
	@echo ""
	@echo "  StroyCord — available commands / commandes disponibles"
	@echo ""
	@echo "  Development / Développement"
	@echo "    make env          Create .env from .env.dist (if missing) / Crée .env depuis .env.dist (si absent)"
	@echo "    make dev          Start bot in watch mode (tsx) / Lance le bot en mode watch (tsx)"
	@echo "    make test         Run Vitest tests / Lance les tests Vitest"
	@echo "    make lint         Run Biome check --write / Lance Biome check --write"
	@echo ""
	@echo "  Docker"
	@echo "    make up           Start full stack (bot + MongoDB + mongo-express) / Démarre la stack complète"
	@echo "    make down         Stop the stack / Arrête la stack"
	@echo "    make rebuild      Rebuild image and restart / Rebuild l'image et redémarre"
	@echo "    make build        Build Docker image only / Build l'image Docker uniquement"
	@echo "    make logs         Stream bot logs / Affiche les logs du bot en continu"
	@echo "    make test-env     Start MongoDB only (for local dev) / Démarre MongoDB seul (pour dev local)"
	@echo "    make test-env-down Stop test environment / Arrête l'environnement de test"
	@echo "    make clean        Stop and remove volumes (DATA LOSS) / Arrête et supprime les volumes (⚠ données perdues)"
	@echo ""

env:
	@if [ ! -f .env ]; then \
		cp .env.dist .env; \
		echo ".env créé depuis .env.dist — renseigne les valeurs requises."; \
	else \
		echo ".env existe déjà."; \
	fi

dev: env
	npm run dev

test:
	npm test

lint:
	npm run lint

up: env
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

rebuild: env
	$(COMPOSE) up -d --build

build:
	$(COMPOSE) build

logs:
	$(COMPOSE) logs -f stroycord

test-env:
	$(COMPOSE) up -d mongodb mongo-express
	@echo "MongoDB:       localhost:27017"
	@echo "mongo-express: http://localhost:8081"

test-env-down:
	$(COMPOSE) stop mongodb mongo-express

clean:
	$(COMPOSE) down -v
