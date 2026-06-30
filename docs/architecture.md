# Architecture

Notebook++ — single-user, self-hosted notes & knowledge base. Two runtime services only: the
**Nuxt app** and **Postgres**. Full spec: `build-spec.md`.

## The one rule: Nuxt shell + a single React editor island
Everything is **Nuxt 3** (Vue 3 + TS) **except the editor**, which is the only React in the app.
BlockNote + Excalidraw are React and Excalidraw can't SSR, so the editor is isolated as a
**client-only React island** bridged via **Veaury** under `<ClientOnly>` (SSR off). The island
takes document JSON in and emits changes out; it **never calls the API**. The Vue shell owns
load + debounced autosave (1.5s), title, breadcrumb, outline panel, read-only toggle.

## Layers
- **Vue shell** — auth pages, sidebar (Projects→Notebooks→Notes), document chrome, settings,
  Cmd-K command palette.
- **Nitro server** (`server/`) — REST under `/api`, all (except auth) behind
  `requireUserSession`. Drizzle data access (`server/db`). pg-boss jobs (`server/jobs`) for
  export/reindex — **no Redis**.
- **React island** (`editor/`) — BlockNote + two custom blocks (DatabaseTable via TanStack
  Table; Excalidraw). Canvas docs are full-page Excalidraw.
- **Postgres 18** — Drizzle ORM, `uuidv7()` PKs, soft-delete, FTS (tsvector+GIN, Phase 10).

## Data flow (editing)
`pages/doc/[id].vue` loads doc → passes `initialContent/docType/readOnly` to the island →
island `onChange` → debounce → `PATCH /api/documents/:id` → server recomputes `searchText`.

## Styling
Vue shell: **Tailwind v4** with §3 design tokens (`assets/css/main.css`, `@theme`). Class-based
dark mode (`.dark` on `<html>`). Fonts are user-selectable CSS vars `--font-sans` / `--font-mono`
(self-hosted via `@fontsource-variable/*`, no CDN). The island uses BlockNote's theme + a prose
stylesheet tuned to §3.

## Key decisions
- Sessions: sealed cookies (nuxt-auth-utils), no server store.
- AI keys: AES-256-GCM at rest, server-proxied, ordered fallback across cloud providers.
- Uploads: local Docker volume now; S3-swappable driver later.
- Single user → no CRDT, no realtime, no teams.

## Deploy
Multi-stage Dockerfile → `node .output/server/index.mjs`; entrypoint runs the standalone
migrator (`server/db/migrate.mjs`) before boot. Compose: app (127.0.0.1:3000, `npm_proxy`
network) + `postgres:18-alpine`. Data under `/srv/docker/notebookpp/`.
