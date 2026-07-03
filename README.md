# Notebook++

Single-user, self-hosted notes & knowledge base (Outline-style UX, no team features). Nuxt 3 +
PostgreSQL 18 + Drizzle, with a React editor island (BlockNote + Excalidraw) bridged into the Vue
shell. Notebooks → notes (nestable), embedded database tables (Table + Kanban), Markdown
import/export, bring-your-own AI keys with fallback, full-text search (Cmd-K), and an installable PWA.

- **Repository:** https://github.com/uri-travoski/Notebook-Plus-Plus
- **Container image:** `ghcr.io/uri-travoski/notebookpp` — published to GitHub Container Registry
  (GHCR), **private**. Tags: `latest` and a semver per release (e.g. `0.28.0`).

## Run with Docker Compose

The published image plus PostgreSQL run as a self-contained stack — no build step or reverse proxy
required. The full walkthrough (env vars, generating secrets, HTTPS, backups) is in
[`installation-instructions.html`](installation-instructions.html).

```bash
# 1. Put docker-compose.standalone.yml into an empty folder.

# 2. Generate three secrets and put them in a .env file beside it:
#      DB_PASSWORD       = openssl rand -hex 16
#      SESSION_PASSWORD  = openssl rand -base64 48    (must be >= 32 characters)
#      ENCRYPTION_KEY    = openssl rand -hex 32

# 3. The image is private on GHCR — authenticate once (token needs read:packages):
echo <YOUR_GITHUB_TOKEN> | docker login ghcr.io -u <your-github-username> --password-stdin

# 4. Start it:
docker compose -f docker-compose.standalone.yml up -d
```

Open <http://localhost:3000> (or `http://<host-ip>:3000` on your LAN). The first visit lands on the
**registration** screen; every new account starts pre-loaded with a *Getting Started* notebook of
sample notes. Database migrations run automatically at boot; data persists in the
`notebookpp-pgdata` and `notebookpp-uploads` Docker volumes.

- **Pin a version:** set `IMAGE_TAG=0.28.0` in `.env` (defaults to `latest`).
- **Update:** `docker compose -f docker-compose.standalone.yml pull && docker compose -f docker-compose.standalone.yml up -d`
- **Start clean:** add `docker compose -f docker-compose.standalone.yml down -v` first (deletes both volumes).

## Features

- Notebooks → notes, with notes nestable under other notes (drag a note onto another to nest it).
- Rich block editor (BlockNote): headings, lists, code, callouts, math, images/files, tables.
- Excalidraw canvases as first-class notes.
- Embedded database blocks with **Table** and **Kanban (Board)** views.
- Full-text search and a Cmd-K command palette.
- Markdown import (files or `.zip`) and export (single note or the whole workspace).
- Bring-your-own AI keys (Anthropic / OpenAI / Google / Groq / OpenAI-compatible), encrypted at
  rest, with ordered fallback across providers.
- Per-account starter content cloned on registration; installable PWA.

## Develop

Requires Node 20.19+ and Docker.

```bash
# Dev Postgres (published on 127.0.0.1:5438)
docker run -d --name notebookpp-dev-db \
  -e POSTGRES_USER=notebookpp -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=notebookpp \
  -p 127.0.0.1:5438:5432 -v notebookpp_devdata:/var/lib/postgresql postgres:18-alpine

npm install
cp .env.example .env
npm run db:migrate
npm run db:seed                  # local dev account: dev / notebookpp
npm run dev -- --port 3939       # 3000 may be taken on a shared host
```

Quality gate: `npm run typecheck && npm run lint && npm run build && npm test`.

## Environment

See `.env.example` and [`installation-instructions.html`](installation-instructions.html).
Required: `SESSION_PASSWORD` / `NUXT_SESSION_PASSWORD` (≥ 32 chars), `ENCRYPTION_KEY`, and
`DB_PASSWORD` (Docker). Optional: `APP_PORT`, `IMAGE_TAG`, `ALLOW_REGISTRATION`,
`NUXT_PUBLIC_APP_URL`, `NUXT_SESSION_COOKIE_SECURE`, `SMTP_URL`.
