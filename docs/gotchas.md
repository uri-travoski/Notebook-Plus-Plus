# Gotchas

> Surprises, footguns, and hard-won lessons. Append-only.

## Dev environment (shared host — many other apps run here)
- **Busy ports.** Other self-hosted apps occupy common ports: `5432`/`5433`/`5434` (other Postgres), `3000` (docsmanager), `3002` (docmost), `3737` (outline), `4000`, `9000`. So:
  - **Dev Postgres** runs in container `notebookpp-dev-db` on **127.0.0.1:5438** (vol `notebookpp_devdata`). Start: `docker start notebookpp-dev-db` (or the `docker run` in BUILD-PROGRESS).
  - **Nuxt dev** must NOT use the default 3000 (taken). Run on a free port, e.g. `npm run dev -- --port 3939 --host 127.0.0.1`.
- This is the Anthropic cloud env, not the user's server. The §20 `/opt/stacks` + `/srv/docker` paths are produced as deploy artifacts (Dockerfile/compose), not deployed from here.

## Editor island version-compat (verify before Phase 4)
- React-island set: peers all accept **React 19** (Excalidraw 0.18 `^17||^18||^19`, BlockNote 0.51 `^18||^19`, Veaury 2.6 `>=16.4`, TanStack table `>=16.8`). Going with React 19. **Veaury's range is broad** — if it breaks under React 19 (createRoot/legacy API), fall back to React 18 (all four also accept it).

## Postgres 18 specifics
- Using native `uuidv7()` for PKs (PG18 built-in) — no JS UUID dep. Requires the DB actually be PG18 (dev container + compose both pin `postgres:18`).
- **Volume mount path changed in `postgres:18`.** The image now stores data under `/var/lib/postgresql/<major>/...` and the volume MUST mount at **`/var/lib/postgresql`**, NOT `/var/lib/postgresql/data` (it errors on boot otherwise). The build-spec §20 compose used the old `/data` path — corrected in `docker-compose.yml` and the dev container. (Deviation from spec, intentional, to make PG18 actually start.)
