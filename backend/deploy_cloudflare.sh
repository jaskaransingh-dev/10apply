#!/usr/bin/env bash
# ==============================================================================
# rec - Cloudflare Workers & Cloudflare D1 Deployment Script
# ==============================================================================

set -e

MODE="${1:---remote}"
DB_NAME="rec_db"
SCHEMA_FILE="cloudflare/d1/schema.sql"
SEED_FILE="cloudflare/d1/seed.sql"

echo "=== Cloudflare Deployment: rec Backend & D1 Database ==="

if [ "$MODE" = "--local" ]; then
  echo "[*] Initializing local Cloudflare D1 database..."
  npx wrangler d1 execute "$DB_NAME" --local --file="$SCHEMA_FILE"
  if [ -f "$SEED_FILE" ]; then
    echo "[*] Seeding local Cloudflare D1 database..."
    npx wrangler d1 execute "$DB_NAME" --local --file="$SEED_FILE"
  fi
  echo "[OK] Local Cloudflare D1 database ready!"
  echo "[*] To start local Cloudflare Worker development server, run:"
  echo "    npx wrangler dev"
  exit 0
fi

echo "[*] Checking Cloudflare authentication status..."
if ! npx wrangler whoami >/dev/null 2>&1; then
  echo "[!] Wrangler is not authenticated. Please log in or provide CLOUDFLARE_API_TOKEN:"
  echo "    npx wrangler login"
  echo "    Or: export CLOUDFLARE_API_TOKEN=your_token_here"
  echo ""
  echo "[*] Running in local verification mode instead..."
  npx wrangler d1 execute "$DB_NAME" --local --file="$SCHEMA_FILE"
  echo "[OK] Verified D1 schema against Cloudflare D1 engine locally."
  exit 0
fi

echo "[*] Applying schema to remote Cloudflare D1 database ($DB_NAME)..."
npx wrangler d1 execute "$DB_NAME" --remote --file="$SCHEMA_FILE" --yes || {
  echo "[!] If database '$DB_NAME' does not exist yet, creating it now:"
  npx wrangler d1 create "$DB_NAME"
  echo "[*] Retrying schema execution on newly created remote D1 database..."
  npx wrangler d1 execute "$DB_NAME" --remote --file="$SCHEMA_FILE" --yes
}

if [ -f "$SEED_FILE" ]; then
  echo "[*] Applying initial seed to remote Cloudflare D1 database..."
  npx wrangler d1 execute "$DB_NAME" --remote --file="$SEED_FILE" --yes || true
fi

echo "[*] Deploying Cloudflare Worker API..."
npx wrangler deploy

echo "[OK] Cloudflare Worker and Cloudflare D1 deployment complete!"
