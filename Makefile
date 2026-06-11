.PHONY: help install serve dev test lint check-version build preview clean

PORT ?= 8000
SERVE_BIN := node_modules/.bin/serve

help: ## Show available targets
	@echo "Targets:"
	@echo "  make install         Install dev dependencies (first time / after clone)"
	@echo "  make dev             Start Vite dev server"
	@echo "  make serve           Start static server for dist/ (PORT=$(PORT))"
	@echo "  make build           Production bundle to dist/"
	@echo "  make preview         Build then preview dist/ locally (do not run build in parallel)"
	@echo "  make clean           Remove dist/"
	@echo "  make lint            Run Biome linter"
	@echo "  make test            Run solver + version tests"
	@echo "  make check-version   Verify version strings stay in sync"

install:
	npm install

dev: node_modules
	npm run dev

build: node_modules
	npm run build

clean:
	rm -rf dist

preview: build
	npm run preview

serve: $(SERVE_BIN)
	npm run serve -- -l $(PORT) dist

lint: node_modules
	npm run lint

test: node_modules
	npm test

check-version: node_modules
	npm run check-version

node_modules:
	@echo "Missing dev dependencies. Run: make install"
	@exit 1

$(SERVE_BIN): node_modules
