#!/usr/bin/env bash
# Write k8s/mongodb-secret.yaml from environment variables (file is gitignored).
# Usage:
#   export MONGO_ROOT_PASSWORD='long-random-secret'
#   optional: export MONGO_ROOT_USER=admin
#   ./scripts/k8s-gen-mongodb-secret.sh           # writes k8s/mongodb-secret.yaml
#   ./scripts/k8s-gen-mongodb-secret.sh -         # print to stdout (pipe to kubectl apply -f -)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
USER="${MONGO_ROOT_USER:-admin}"
PASS="${MONGO_ROOT_PASSWORD:?Set MONGO_ROOT_PASSWORD in the environment (never commit it)}"

manifest() {
  kubectl create secret generic mongodb-credentials \
    --from-literal=mongo-root-username="$USER" \
    --from-literal=mongo-root-password="$PASS" \
    --dry-run=client -o yaml
}

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required (uses kubectl create secret --dry-run=client)." >&2
  exit 1
fi

if [[ "${1:-}" == "-" ]]; then
  manifest
  exit 0
fi

OUT="${1:-$ROOT_DIR/k8s/mongodb-secret.yaml}"
mkdir -p "$(dirname "$OUT")"
manifest >"$OUT"
echo "Wrote $OUT — this path is gitignored; do not commit real secrets." >&2
