#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

required_files=(
  "README.md"
  "AGENTS.md"
  "docs/requirements.md"
  "docs/build-log.md"
  "docs/decision-log.md"
  "docs/evaluation-plan.md"
  "docs/security-privacy.md"
  "submission/metadata.example.env"
  "submission/project-description.md"
  "submission/demo-script.md"
  "submission/judging-evidence.md"
  "submission/release-checklist.md"
)

missing=0
for path in "${required_files[@]}"; do
  if [[ ! -s "$path" ]]; then
    printf 'Missing or empty required file: %s\n' "$path" >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

for script in scripts/*.sh .githooks/pre-commit; do
  bash -n "$script"
done

./scripts/check-secrets.sh

printf 'Preflight passed: structure, shell syntax, and secret checks are clean.\n'

