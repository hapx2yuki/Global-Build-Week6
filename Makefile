SHELL := /usr/bin/env bash

.PHONY: setup preflight submission-check secret-check status

setup:
	@./scripts/setup.sh

preflight:
	@./scripts/preflight.sh

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

