#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

command -v git >/dev/null 2>&1 || {
  printf 'Git is required.\n' >&2
  exit 1
}

command -v make >/dev/null 2>&1 || {
  printf 'Make is required.\n' >&2
  exit 1
}

chmod +x scripts/*.sh .githooks/pre-commit
git config core.hooksPath .githooks

if [[ ! -f submission/metadata.env ]]; then
  cp submission/metadata.example.env submission/metadata.env
  printf 'Created ignored local file: submission/metadata.env\n'
fi

printf 'Configured Git hooks at .githooks\n'
printf 'Run "make preflight" now and "make submission-check" before submission.\n'

