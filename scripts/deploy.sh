#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd -- "${script_dir}/.." && pwd)"
env_file="${project_dir}/.env.deploy"

if [[ ! -f "${env_file}" ]]; then
  echo "Missing .env.deploy. Copy deploy.env.example to .env.deploy and fill it in." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${env_file}"
set +a

missing=()
for name in DEPLOY_HOST DEPLOY_USER DEPLOY_PATH; do
  if [[ -z "${!name:-}" ]]; then
    missing+=("${name}")
  fi
done

if (( ${#missing[@]} > 0 )); then
  printf 'Missing deploy values: %s\n' "${missing[*]}" >&2
  exit 1
fi

deploy_port="${DEPLOY_PORT:-22}"

cd "${project_dir}"
npm run build

destination="${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH%/}/"
rsync --archive --compress --progress -e "ssh -p ${deploy_port}" dist/ "${destination}"

echo "Deployment complete."
if [[ -n "${DEPLOY_URL:-}" ]]; then
  echo "${DEPLOY_URL}"
fi
