# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Self-contained Nitro server output, plus the migration assets. node_modules is
# copied so the standalone migrator (drizzle-orm + pg) can run at boot.
COPY --from=build /app/.output ./.output
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/db/migrations ./server/db/migrations
COPY --from=build /app/server/db/migrate.mjs ./server/db/migrate.mjs
COPY --from=build /app/package.json ./package.json
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
