#!/bin/sh
set -e

echo "[notebookpp] Running database migrations..."
node server/db/migrate.mjs

echo "[notebookpp] Starting server on :3000..."
exec node .output/server/index.mjs
