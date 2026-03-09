#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="${1:-bun-elysia-paseto-api}"
IMAGE_TAG="${2:-latest}"
REGISTRY="${3:-}"
NAMESPACE="${4:-default}"

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    log_info "Checking requirements..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi

    log_info "All requirements met."
}

# Build Docker image
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

# Push Docker image to registry
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

# Deploy to Kubernetes
deploy_kubernetes() {
    local image_name="$1"

    log_info "Deploying to Kubernetes namespace: ${NAMESPACE}"

    # Update image in deployment
    kubectl set image deployment/bun-elysia-paseto-api \
        api="${image_name}" \
        --namespace="${NAMESPACE}"

    # Apply ConfigMap and Secret
    kubectl apply -f infra/kubernetes/configmap.yaml --namespace="${NAMESPACE}"
    kubectl apply -f infra/kubernetes/secret.yaml --namespace="${NAMESPACE}"

    # Apply other resources
    kubectl apply -f infra/kubernetes/deployment.yaml --namespace="${NAMESPACE}"
    kubectl apply -f infra/kubernetes/service.yaml --namespace="${NAMESPACE}"
    kubectl apply -f infra/kubernetes/hpa.yaml --namespace="${NAMESPACE}"
    kubectl apply -f infra/kubernetes/poddisruptionbudget.yaml --namespace="${NAMESPACE}"

    log_info "Deployment completed successfully."
}

# Wait for rollout to complete
wait_for_rollout() {
    log_info "Waiting for rollout to complete..."
    kubectl rollout status deployment/bun-elysia-paseto-api --namespace="${NAMESPACE}"
    log_info "Rollout completed successfully."
}

# Main execution
main() {
    log_info "Starting deployment process..."

    check_requirements
    image_name=$(build_image)
    push_image "${image_name}"
    deploy_kubernetes "${image_name}"
    wait_for_rollout

    log_info "Deployment completed successfully!"
    log_info "Access your API at: http://localhost:3000"
}

# Run main function
main "$@"
