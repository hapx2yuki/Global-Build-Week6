SHELL := /usr/bin/env bash

.PHONY: setup preflight web-check demo-check submission-check secret-check status

setup:
	@./scripts/setup.sh

preflight:
	@./scripts/preflight.sh

web-check:
	@cd apps/web && npm run typecheck && npm run lint && npm test && npm run build

demo-check:
	@cd apps/web && npm run build:demo

submission-check:
	@./scripts/check-submission.sh

secret-check:
	@./scripts/check-secrets.sh

status:
	@printf 'Repository: %s\n' "$$(git remote get-url origin 2>/dev/null || printf 'not connected')"
	@printf 'Branch: %s\n' "$$(git branch --show-current 2>/dev/null || printf 'not created')"
	@if [ -f submission/metadata.env ]; then \
		grep -E '^(PROJECT_NAME|CATEGORY|SUBMISSION_STATUS)=' submission/metadata.env; \
	else \
		printf 'Submission metadata: not initialized\n'; \
	fi
