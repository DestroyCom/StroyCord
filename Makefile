.DEFAULT_GOAL := help
COMPOSE := docker compose

.PHONY: help up down dev build rebuild logs clean test test-env test-env-down lint env

help:
	@echo ""
	@echo "  StroyCord — commandes disponibles"
	@echo ""
	@echo "  Développement"
	@echo "    make env          Crée .env depuis .env.dist (si absent)"
	@echo "    make dev          Lance le bot en mode watch (tsx)"
	@echo "    make test         Lance les tests Vitest"
	@echo "    make lint         Lance Biome check --write"
	@echo ""
	@echo "  Docker"
	@echo "    make up           Démarre la stack complète (bot + MongoDB + mongo-express)"
	@echo "    make down         Arrête la stack"
	@echo "    make rebuild      Rebuild l'image et redémarre"
	@echo "    make build        Build l'image Docker uniquement"
	@echo "    make logs         Affiche les logs du bot en continu"
	@echo "    make test-env     Démarre MongoDB seul (pour dev local)"
	@echo "    make test-env-down Arrête l'environnement de test"
	@echo "    make clean        Arrête et supprime les volumes (⚠ données perdues)"
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
