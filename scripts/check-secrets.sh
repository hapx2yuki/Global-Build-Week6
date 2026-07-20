#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

unsafe_names=()
while IFS= read -r path; do
  relative="${path#./}"
  case "$relative" in
    .git/*|submission/metadata.env)
      continue
      ;;
    *.example.env|.env.example)
      continue
      ;;
    */.env|*/.env.*|.env|.env.*|*.pem|*.key|*/id_rsa|*/id_rsa.*)
      unsafe_names+=("$relative")
      ;;
  esac
done < <(find . -path './.git' -prune -o -type f -print)

if [[ "${#unsafe_names[@]}" -gt 0 ]]; then
  printf 'Potential secret files must not be committed:\n' >&2
  printf '  %s\n' "${unsafe_names[@]}" >&2
  exit 1
fi

if command -v rg >/dev/null 2>&1; then
  patterns='sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY'
  matches="$(rg -l --hidden \
    --glob '!.git/**' \
    --glob '!scripts/check-secrets.sh' \
    --glob '!submission/metadata.env' \
    -e "$patterns" . || true)"
  if [[ -n "$matches" ]]; then
    printf 'Potential secrets found in these files:\n%s\n' "$matches" >&2
    exit 1
  fi
else
  printf 'Warning: rg is unavailable; only secret filenames were checked.\n' >&2
fi

printf 'Secret check passed.\n'

