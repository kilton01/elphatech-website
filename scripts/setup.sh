#!/usr/bin/env bash
set -euo pipefail

echo "==> Starting PostgreSQL via Docker Compose..."
docker compose up -d

echo "==> Waiting for PostgreSQL to be healthy..."
until docker compose exec postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done
echo "    PostgreSQL is ready."

echo "==> Pushing Drizzle schema..."
npm run db:push

echo "==> Running seed script..."
npm run db:seed

echo ""
echo "Done! Run 'npm run dev' to start the dev server."
