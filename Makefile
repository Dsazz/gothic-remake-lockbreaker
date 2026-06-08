.PHONY: help install serve test check-version

PORT ?= 8000
SERVE_BIN := node_modules/.bin/serve

help: ## Show available targets
	@echo "Targets:"
	@echo "  make install         Install dev dependencies (first time / after clone)"
	@echo "  make serve           Start local dev server (PORT=$(PORT))"
	@echo "  make test            Run solver + version tests"
	@echo "  make check-version   Verify version strings stay in sync"

install:
	npm install

serve: $(SERVE_BIN)
	npm run serve -- -l $(PORT)

test:
	npm test

check-version:
	npm run check-version

$(SERVE_BIN):
	@echo "Missing dev dependencies. Run: make install"
	@exit 1
