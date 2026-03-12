#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

IMAGE_NAME="${1:-bun-elysia-paseto-api}"
IMAGE_TAG="${2:-latest}"
REGISTRY="${3:-}"

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
  log_info "Checking requirements..."

  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
  fi

  log_info "All requirements met."
}

build_image() {
  local full_image_name="${IMAGE_NAME}:${IMAGE_TAG}"
  if [ -n "$REGISTRY" ]; then
    full_image_name="${REGISTRY}/${full_image_name}"
  fi

  log_info "Building Docker image: ${full_image_name}"
  docker build -f infra/docker/production.dockerfile -t "${full_image_name}" .

  log_info "Docker image built successfully."
  echo "${full_image_name}"
}

push_image() {
  local image_name="$1"

  if [ -n "$REGISTRY" ]; then
    log_info "Pushing Docker image to registry..."
    docker push "${image_name}"
    log_info "Docker image pushed successfully."
  else
    log_warn "No registry specified. Skipping push."
  fi
}

run_with_compose() {
  log_info "Starting production stack with Docker Compose..."
  docker compose -f infra/docker-compose.prod.yaml up -d
  log_info "Docker Compose stack started."
}

main() {
  log_info "Starting docker-only deployment process..."

  check_requirements
  image_name=$(build_image)
  push_image "${image_name}"

  if [ "${RUN_COMPOSE:-false}" = "true" ]; then
    run_with_compose
  else
    log_info "Skipping compose startup (set RUN_COMPOSE=true to auto-start stack)."
  fi

  log_info "Deployment flow completed successfully."
}

main "$@"
