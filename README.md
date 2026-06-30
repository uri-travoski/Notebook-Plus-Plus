# Notebook++

Single-user, self-hosted notes & knowledge base (Outline-style UX, no team features). Nuxt 3 +
PostgreSQL 18 + Drizzle, with a React editor island (BlockNote + Excalidraw) bridged into the Vue
shell via a manual `createRoot` mount. Database tables, Markdown import/export, bring-your-own AI
keys with fallback, full-text search (Cmd-K), and an installable PWA.
Full spec in `docs/build-spec.md`; architecture in `docs/architecture.md`.

## Develop

Requires Node 20.19+ and Docker.

```bash
# 1. Postgres (dev) — published on 127.0.0.1:5438
docker run -d --name notebookpp-dev-db \
  -e POSTGRES_USER=notebookpp -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=notebookpp \
  -p 127.0.0.1:5438:5432 -v notebookpp_devdata:/var/lib/postgresql postgres:18-alpine

# 2. Install + env
npm install
cp .env.example .env          # dev defaults already point at the container above

# 3. Migrate + seed (creates the default account + sample notes)
npm run db:migrate
npm run db:seed

# 4. Run (port 3000 may be taken on a shared host — pass --port)
npm run dev
```

**Default account:** username `dev` / password `notebookpp`.

## Scripts

- `dev` / `build` / `start` — develop, build, run the built server
- `typecheck` / `lint` / `format` — quality gate
- `test` (Vitest) · `test:e2e` (Playwright) · `test:sim` (§24 user-simulation)
- `db:generate` / `db:migrate` / `db:seed` / `db:reset` / `db:studio`

## Deploy

Docker stack at `/opt/stacks/notebookpp/docker-compose.yml` (app + `postgres:18`). Copy
`.env.example` → `.env` and fill `DB_PASSWORD`, `SESSION_PASSWORD` (≥32 chars), `ENCRYPTION_KEY`,
then `docker compose up -d`. The app binds `127.0.0.1:3000` (front it with a reverse proxy);
migrations run automatically at boot.

## Environment

See `.env.example`. Key vars: `NUXT_DATABASE_URL`, `NUXT_SESSION_PASSWORD` (≥32 chars),
`ENCRYPTION_KEY` (encrypts stored AI keys), `NUXT_PUBLIC_APP_URL`, `ALLOW_REGISTRATION`,
`SMTP_URL` (optional — password-reset links log to the server console when unset).
