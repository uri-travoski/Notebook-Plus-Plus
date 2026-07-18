# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Skip lifecycle scripts here: the project's postinstall (copy-excalidraw-assets + nuxt prepare)
# needs the full source, which isn't copied yet.
RUN npm ci --ignore-scripts
COPY . .
# Self-host the Excalidraw fonts, then build (nuxt build runs prepare itself).
RUN node scripts/copy-excalidraw-assets.mjs && npm run build

# ---- Runtime stage ----
# Debian (glibc) rather than Alpine so we can install the official postgresql-client-18 from PGDG
# — pg_dump/pg_restore for the Settings → Backup subsystem, which must match the PG18 server.
# The runtime never loads the build stage's musl native addons (Vite/Tailwind/oxc are build-only;
# the Nitro .output bundles its own pure-JS runtime deps), so mixing the Alpine-built node_modules
# with a glibc base is safe here.
FROM node:26-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# postgresql-client-18 (PGDG repo — Debian bookworm ships an older client) + tar for backups.
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates gnupg curl tar && \
    install -d /usr/share/postgresql-common/pgdg && \
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
      -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc && \
    echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends postgresql-client-18 && \
    apt-get purge -y gnupg curl && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Self-contained Nitro server output, plus the migration assets. node_modules is
# copied so the standalone migrator (drizzle-orm + pg) can run at boot.
COPY --from=build /app/.output ./.output
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/db/migrations ./server/db/migrations
COPY --from=build /app/server/db/migrate.mjs ./server/db/migrate.mjs
# Starter-content template (notebooks/notes/tables/attachments) cloned into each new account
# at registration. Committed to git so CI builds include it.
COPY --from=build /app/server/db/seed ./server/db/seed
COPY --from=build /app/package.json ./package.json
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
