.PHONY: help install dev test lint build preview clean

help: ## Show available targets
	@echo "Targets:"
	@echo "  make install         Install dev dependencies (first time / after clone)"
	@echo "  make dev             Start Vite dev server"
	@echo "  make build           Production bundle to dist/"
	@echo "  make preview         Build then preview dist/ locally (do not run build in parallel)"
	@echo "  make clean           Remove dist/"
	@echo "  make lint            Run Biome linter"
	@echo "  make test            Run solver + version tests"

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

lint: node_modules
	npm run lint

test: node_modules
	npm test

node_modules:
	@echo "Missing dev dependencies. Run: make install"
	@exit 1
