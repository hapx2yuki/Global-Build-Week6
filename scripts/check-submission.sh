#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

metadata="submission/metadata.env"
if [[ ! -f "$metadata" ]]; then
  printf 'Missing %s. Run "make setup" first.\n' "$metadata" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$metadata"
set +a

errors=0

require_value() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    printf 'Missing required metadata: %s\n' "$name" >&2
    errors=$((errors + 1))
  fi
}

require_true() {
  local name="$1"
  local value="${!name:-false}"
  if [[ "$value" != "true" ]]; then
    printf '%s must be true before submission.\n' "$name" >&2
    errors=$((errors + 1))
  fi
}

for name in \
  PROJECT_NAME \
  TAGLINE \
  CATEGORY \
  SUBMITTER_TYPE \
  COUNTRY \
  REPOSITORY_URL \
  REPOSITORY_ACCESS_MODE \
  DEMO_VIDEO_URL \
  DEMO_DURATION_SECONDS \
  CODEX_SESSION_ID \
  DEVPOST_PROJECT_URL; do
  require_value "$name"
done

case "${CATEGORY:-}" in
  "Apps for Your Life"|"Work & Productivity"|"Developer Tools"|"Education")
    ;;
  *)
    printf 'CATEGORY must match one of the four official categories.\n' >&2
    errors=$((errors + 1))
    ;;
esac

case "${REPOSITORY_ACCESS_MODE:-}" in
  private_shared|public_licensed)
    ;;
  *)
    printf 'REPOSITORY_ACCESS_MODE must be private_shared or public_licensed.\n' >&2
    errors=$((errors + 1))
    ;;
esac

for name in REPOSITORY_URL DEMO_VIDEO_URL DEVPOST_PROJECT_URL; do
  value="${!name:-}"
  if [[ -n "$value" && ! "$value" =~ ^https:// ]]; then
    printf '%s must be an HTTPS URL.\n' "$name" >&2
    errors=$((errors + 1))
  fi
done

if [[ -n "${LIVE_DEMO_URL:-}" && ! "${LIVE_DEMO_URL}" =~ ^https:// ]]; then
  printf 'LIVE_DEMO_URL must be an HTTPS URL when provided.\n' >&2
  errors=$((errors + 1))
fi

if [[ -n "${DEMO_DURATION_SECONDS:-}" ]]; then
  if [[ ! "${DEMO_DURATION_SECONDS}" =~ ^[0-9]+$ ]]; then
    printf 'DEMO_DURATION_SECONDS must be an integer.\n' >&2
    errors=$((errors + 1))
  elif (( DEMO_DURATION_SECONDS >= 180 )); then
    printf 'The demo must be shorter than 180 seconds.\n' >&2
    errors=$((errors + 1))
  fi
fi

require_true REPOSITORY_ACCESS_CONFIRMED
require_true FINAL_AUDIO_APPROVED
require_true DEMO_PUBLIC
require_true README_COMPLETE
require_true REPOSITORY_TESTED

if [[ "${PLUGIN_OR_DEVTOOL:-false}" == "true" ]]; then
  require_value INSTALLATION_NOTES_PATH
  if [[ -n "${INSTALLATION_NOTES_PATH:-}" && ! -s "${INSTALLATION_NOTES_PATH}" ]]; then
    printf 'INSTALLATION_NOTES_PATH does not identify a non-empty file.\n' >&2
    errors=$((errors + 1))
  fi
fi

for path in \
  "${PROJECT_DESCRIPTION_PATH:-}" \
  "${DEMO_SCRIPT_PATH:-}" \
  "${JUDGING_EVIDENCE_PATH:-}"; do
  if [[ -z "$path" || ! -s "$path" ]]; then
    printf 'A required submission document is missing or empty: %s\n' "${path:-unset}" >&2
    errors=$((errors + 1))
  fi
done

case "${SUBMISSION_STATUS:-draft}" in
  ready|submitted)
    ;;
  *)
    printf 'SUBMISSION_STATUS must be ready or submitted.\n' >&2
    errors=$((errors + 1))
    ;;
esac

if [[ "$errors" -gt 0 ]]; then
  printf 'Submission check failed with %d issue(s).\n' "$errors" >&2
  exit 1
fi

printf 'Submission check passed. Recheck the live Devpost form before submitting.\n'
