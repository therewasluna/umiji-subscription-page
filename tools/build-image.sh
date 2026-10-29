#!/usr/bin/env bash
# Build the Umiji subscription page image.
# Usage: ./tools/build-image.sh [image-tag]
set -euo pipefail
TAG=${1:-umiji-subscription-page:latest}
ROOT=$(cd "$(dirname "$0")/.." && pwd)

(cd "$ROOT/frontend" && npm ci --no-audit --no-fund && npm run start:build)
docker build -t "$TAG" "$ROOT"

echo "built $TAG"
