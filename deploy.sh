#!/usr/bin/env bash
# Run this ON THE DROPLET, from inside the project folder, to deploy or
# push an update. Safe to re-run any time.
set -euo pipefail

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Verifying .env.production exists"
if [ ! -f .env.production ]; then
  echo "ERROR: .env.production is missing. Copy it from .env.example and fill in real values first."
  exit 1
fi

echo "==> Building image"
docker compose build

echo "==> Starting/replacing container"
docker compose up -d --remove-orphans

echo "==> Pruning old dangling images (keeps disk usage sane on a 10GB droplet)"
docker image prune -f

echo "==> Current status"
docker compose ps

echo "==> Done. Tail logs with: docker compose logs -f"
