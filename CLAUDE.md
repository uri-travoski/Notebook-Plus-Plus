# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Notebook++** — a single-user, self-hosted notes & knowledge base (Outline-style UX, no team features). The full specification, build phases, Definition of Done, and the autonomous one-shot build directive live in `docs/build-spec.md` — **that file is the source of truth**. Keep the docs below distilled from it. Until the build is complete, follow the autonomous build rules: build end-to-end, don't stop for confirmation, decide from documented defaults, self-verify (typecheck/lint/build/migrate/test) after every phase, and run the user-simulation pass (`docs/build-spec.md` §24) before finishing.

## Commands
Shared host — **port 3000 and 5432/5433/5434 are taken** (see `@docs/gotchas.md`). Dev Postgres runs in a container on `127.0.0.1:5438`: `docker start notebookpp-dev-db`. Default login `dev` / `notebookpp`.
- **Dev server** — `npm run dev -- --port 3939 --host 127.0.0.1` (never the default 3000). HMR covers most edits; restart only for server/route/schema changes.
- **Quality gate** (run in this order after every phase; fix each failure, never weaken a test): `npm run typecheck` → `npm run lint` → `npm run format:check` → `npm run build` → `npm run db:migrate` → `npm test` → `npm run test:e2e`.
- **Unit tests (Vitest)** — all: `npm test`; one file: `npx vitest run <path>`; one test: `npx vitest run -t "<name>"`; watch: `npm run test:watch`.
- **E2E (Playwright)** — **`npm run build` FIRST**: the webServer runs the built `.output`, not the dev server. Then `npm run test:e2e` (excludes `@sim`). One spec: `npx playwright test e2e/<file>.spec.ts`; one test: add `-g "<name>"`. Port defaults to 3939 (`E2E_PORT`); needs the dev DB up.
- **§24 user-simulation** — `npm run test:sim` (the `@sim` spec; also needs a fresh build).
- **DB lifecycle** — `db:generate` (migration from schema diff) · `db:migrate` (apply) · `db:seed` (default account + samples) · `db:reset` (drop + recreate) · `db:studio`.

## Tech stack
For any tech stack, always search for the latest version of each tech to be used and use the newest version that's mutually compatible.
**Locked — do not substitute the libraries (newest compatible *versions* are fine):** Nuxt 3 (Vue 3 + TS) full-stack · PostgreSQL + Drizzle ORM · Tailwind v4 · nuxt-auth-utils (sealed-cookie sessions) · pg-boss (jobs — **no Redis**) · @vite-pwa/nuxt. The editor is an isolated **React island** (BlockNote + Excalidraw + TanStack Table) bridged into Vue with **Veaury**. AI via Vercel AI SDK — **cloud providers only, never self-host models**. Two runtime services only: app + Postgres.
**Version-compat watch:** React (island) + BlockNote + Excalidraw + Veaury must be one mutually-compatible set — Excalidraw needs React 18+, so pin BlockNote/Veaury to match. Verify this set before building the editor.

# Always loaded (keep tight)
@docs/architecture.md   # system overview, the Nuxt-shell + React-editor-island split, service boundaries, decision rationale. If this grows large, demote to "read on demand".
@docs/gotchas.md         # known gotchas/traps (island SSR-off rules, Veaury bridge, Excalidraw asset self-hosting, BlockNote custom blocks, pg-boss, sealed cookies). Keep pruned — overlaps Claude Code auto memory (check /memory).

# Read on demand — triggered by a task/event, not a file path. Do NOT import these.
- docs/build-spec.md      — master spec: features, schema, phases, Definition of Done, §24 user-simulation. Read when planning a phase or unsure what to build next. Source of truth.
- docs/credentials.md     — read ONLY when you actually need a credential (AI provider keys, SMTP, DB, GitHub). NEVER import. Keep gitignored. Prefer real secrets in .env / a secrets manager; this file records only what exists and where to find it.
- user-manual/manual.html — after finishing a module/feature, read it then update it: how it works, how to use it, every task it performs, how it connects to other modules. No screen or function omitted. Never load preemptively.
- CHANGELOG.md            — on "back up": record all changes here first (version number, then changes below it), then run the backup.
- docs/backups.md         — read when performing a backup.
- docs/design-system.md   — the §3 tokens + §3A design-excellence rules (theme, type, spacing, every interaction state, motion, a11y, microcopy). Follow this for every new page or component so it matches the project. Mirror of the spec's design sections — keep in sync.
- docs/api.md             — Nitro route conventions, `requireUserSession` auth, response shapes, and the editor-island ⇄ Vue-shell contract (props in / `onChange` out, shell owns autosave).
- docs/database.md        — Drizzle schema overview, migration conventions, key table relationships. At bottom add every field's name, type, default, required flag, formatting, design, and logic — detailed enough that any feature's fields can be rebuilt from this file alone.
- docs/testing.md         — Vitest + Playwright + @axe-core conventions, the per-phase quality gate, and the §24 user-simulation (10 page notes each with a 5-row table, 5 canvas mindmaps).

## UI changes
Check `@docs/design-system.md` and existing patterns before building any UI. Match existing list/edit/modal/sidebar patterns. Don't add new design tokens or layouts without asking. The **editor/reading surface is the hero** — give it the most care. After each UI surface: screenshot it, critique against the design system, refine. Designed empty/loading/error states, visible keyboard focus, AA contrast, and reduced-motion are required, not optional. Templated, scaffold-looking UI is a defect.

## Editor island — the one architectural rule (read before touching the editor)
The editor is the **only** React in the app. It lives in `editor/`, mounts client-only via Veaury under `<ClientOnly>` (**SSR off** — Excalidraw cannot SSR). It takes document JSON in and emits changes out; it **never calls the API directly** — the Vue shell owns loading + debounced autosave. Keep browser-only imports (Excalidraw) out of any isomorphic/server path. Self-host Excalidraw fonts in `public/` and set `EXCALIDRAW_ASSET_PATH`. New blocks (database table, Excalidraw) are BlockNote custom blocks; the database block stores only a `databaseId` and reads/writes rows via the API.

## After changes
Rebuild and verify the change is visible (dev uses HMR; restart the affected Docker service if a server/route/schema change needs it). Test in browser at both supported viewports: **desktop 1600 and mobile 375**. After each phase run the full quality gate — typecheck → lint → prettier → build → drizzle migrate → `vitest run` → the phase's Playwright spec + axe scan — and fix every failure before continuing. Never weaken or skip a test to make a gate pass.

## Docs & context — load strategy
Keep every doc current: when a change touches a doc's subject, update that doc in the same change. Create the docs above **early** (distilled from `docs/build-spec.md`) and maintain them as you build — `architecture.md` and `gotchas.md` stay tight; `design-system.md`, `api.md`, `database.md`, `testing.md` hold the detail.

## Deployment conventions
Stack file at `/opt/stacks/notebookpp/docker-compose.yml` (**always `docker-compose.yml`, never `compose.yml`**). Persistent data at `/srv/docker/notebookpp/`. `restart: unless-stopped` on every service. App port bound to `127.0.0.1`, public via Nginx Proxy Manager on the external `npm_proxy` network. Entrypoint runs `drizzle-kit migrate` before boot. Provide `.env.example` with every variable.

## Assets
If the user mentions an image (screenshot, logo, icon, etc.), check the `images/` folder before asking — it's the project's image location. The UI reference screenshot that defines the theme lives there.
