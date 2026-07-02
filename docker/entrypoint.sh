#!/bin/sh
set -e

echo "[notebookpp] Running database migrations..."
node server/db/migrate.mjs

# Load the bundled sample content on a FRESH database only (no accounts yet). Existing
# deployments keep their data untouched.
SEED_SQL="server/db/seed/seed.sql"
if [ -f "$SEED_SQL" ]; then
  USER_COUNT=$(psql "$NUXT_DATABASE_URL" -tAc "SELECT count(*) FROM users" 2>/dev/null || echo "?")
  if [ "$USER_COUNT" = "0" ]; then
    echo "[notebookpp] Fresh database — loading bundled seed content..."
    psql "$NUXT_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SEED_SQL"
    UPLOAD_DIR="${NUXT_UPLOAD_DIR:-/app/.data/uploads}"
    if [ -d server/db/seed/uploads ] && [ -z "$(ls -A "$UPLOAD_DIR" 2>/dev/null)" ]; then
      mkdir -p "$UPLOAD_DIR"
      cp server/db/seed/uploads/* "$UPLOAD_DIR"/ 2>/dev/null || true
      echo "[notebookpp] Seeded uploaded files into $UPLOAD_DIR"
    fi
  else
    echo "[notebookpp] Existing data found ($USER_COUNT users) — skipping seed."
  fi
fi

echo "[notebookpp] Starting server on :3000..."
exec node .output/server/index.mjs
