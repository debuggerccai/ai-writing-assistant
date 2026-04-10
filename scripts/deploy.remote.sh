#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-}"
RELEASE_SHA="${RELEASE_SHA:-}"

if [[ -z "${DEPLOY_PATH}" || -z "${RELEASE_SHA}" ]]; then
  echo "DEPLOY_PATH and RELEASE_SHA are required."
  exit 1
fi

release_dir="${DEPLOY_PATH}/releases/${RELEASE_SHA}"
current_link="${DEPLOY_PATH}/current"
shared_dir="${DEPLOY_PATH}/shared"
logs_dir="${shared_dir}/logs"
env_shared_file="${shared_dir}/.env.production"
standalone_dir="${release_dir}/.next/standalone"

if [[ ! -d "${release_dir}" ]]; then
  echo "Release directory not found: ${release_dir}"
  exit 1
fi

mkdir -p "${shared_dir}" "${logs_dir}"

if [[ ! -f "${env_shared_file}" ]]; then
  echo "Missing ${env_shared_file}. Please create it on server first."
  exit 1
fi

cd "${release_dir}"
if [[ ! -f "${standalone_dir}/server.js" ]]; then
  echo "Missing standalone server entry: ${standalone_dir}/server.js"
  exit 1
fi

mkdir -p "${standalone_dir}/.next"
ln -sfn "${env_shared_file}" "${standalone_dir}/.env.production"
ln -sfn "${release_dir}/.next/static" "${standalone_dir}/.next/static"
ln -sfn "${release_dir}/public" "${standalone_dir}/public"

mkdir -p "logs"
ln -sfn "${logs_dir}/pm2-error.log" "logs/pm2-error.log"
ln -sfn "${logs_dir}/pm2-out.log" "logs/pm2-out.log"

if [[ ! -f "${release_dir}/docker-compose.yml" ]]; then
  echo "Missing docker-compose file: ${release_dir}/docker-compose.yml"
  exit 1
fi

docker compose -f "${release_dir}/docker-compose.yml" up -d

ln -sfn "${release_dir}" "${current_link}"

APP_CWD="${current_link}/.next/standalone" PM2_ERROR_LOG="${logs_dir}/pm2-error.log" PM2_OUT_LOG="${logs_dir}/pm2-out.log" pm2 startOrReload "${current_link}/ecosystem.config.js" --update-env
pm2 save

echo "Deployment finished: ${RELEASE_SHA}"
