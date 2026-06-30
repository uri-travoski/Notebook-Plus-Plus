# Gotchas

> Surprises, footguns, and hard-won lessons. Append-only.

## Dev environment (shared host — many other apps run here)
- **Busy ports.** Other self-hosted apps occupy common ports: `5432`/`5433`/`5434` (other Postgres), `3000` (docsmanager), `3002` (docmost), `3737` (outline), `4000`, `9000`. So:
  - **Dev Postgres** runs in container `notebookpp-dev-db` on **127.0.0.1:5438** (vol `notebookpp_devdata`). Start: `docker start notebookpp-dev-db` (or the `docker run` in BUILD-PROGRESS).
  - **Nuxt dev** must NOT use the default 3000 (taken). Run on a free port, e.g. `npm run dev -- --port 3939 --host 127.0.0.1`.
- This is the Anthropic cloud env, not the user's server. The §20 `/opt/stacks` + `/srv/docker` paths are produced as deploy artifacts (Dockerfile/compose), not deployed from here.

## Editor island version-compat (verify before Phase 4)
- React-island set: peers all accept **React 19** (Excalidraw 0.18 `^17||^18||^19`, BlockNote 0.51 `^18||^19`, Veaury 2.6 `>=16.4`, TanStack table `>=16.8`). Going with React 19.

## Editor island — CRITICAL (Phase 4, applies to all editor work)
The React island took real work to land. Keep these or it breaks:
1. **Veaury 2.6.3 is incompatible with Vue 3.5 + React 19** — it leaks a Vue VNode into React children (`React error #31`) even for a trivial component. We do NOT use Veaury. `components/EditorIsland.vue` is a **thin manual `createRoot` bridge** (regular component, not `.client.vue`, wrapped in `<ClientOnly>`; React deps dynamically imported inside `onMounted` so SSR never loads react-dom). Same island contract (props in / `onChange` out / SSR off).
2. **No JSX in `editor/*.tsx`** — Nuxt's `@vitejs/plugin-vue-jsx` and `@vitejs/plugin-react` both claim `.tsx`; vue-jsx wins and compiles JSX to **Vue** VNodes → React error #31. Write the island with `createElement` (no JSX syntax). Custom blocks (Phase 5+) must also use `createElement`.
3. **Vue boolean-prop coercion**: an absent `editable?: boolean` prop is `false`, not `undefined`, so `?? true` doesn't help. Use `withDefaults(defineProps<...>(), { editable: true })` or the editor renders read-only (`contenteditable="false"`).
4. `@vitejs/plugin-react@6` needs Vite 8 + babel 8 (conflicts with vue-jsx) — pin **`@vitejs/plugin-react@5.2.0`** (esbuild-based). `plugin-react` `include` set to `/\/editor\//`.
5. Pin **`h3@1.15.11`** as a direct dep (Nuxt 3.21 + nuxt-auth-utils) or `@nuxt/eslint`→devframe hoists h3 v2 and breaks `readBody`.
6. BlockNote's generic block-schema types don't unify through `createElement` — cast the view (`BlockNoteView as any`); runtime is e2e-verified.
7. **BLOCKER for custom blocks (Phases 5 callout/math, 6 Excalidraw-inline, 7 database-table):** `createReactBlockSpec(...)` added to a `BlockNoteSchema.create({ blockSpecs })` fails at editor init with `TypeError: Cannot read properties of undefined (reading 'node')` (Array.map in init) — even for a MINIMAL block (empty propSchema, trivial render). Default blocks are fine. Strong hypothesis: BlockNote 0.51 custom React blocks don't init under **React 19**. FIXES TO TRY, in order: (a) confirm exact 0.51 `createReactBlockSpec` usage via **context7** docs (maybe a subtle API change); (b) if still failing, **downgrade the island to React 18** (`npm i react@^18 react-dom@^18 -D @types/react@^18 @types/react-dom@^18`) — BlockNote/Excalidraw/TanStack all support 18 and the manual `createRoot` bridge works with 18. Until resolved, ship native blocks only (the editor is fully usable: quote/divider/toggle/code/file/lists/image/table + bold/italic/underline/strike/highlight/code/link are all native).

## Postgres 18 specifics
- Using native `uuidv7()` for PKs (PG18 built-in) — no JS UUID dep. Requires the DB actually be PG18 (dev container + compose both pin `postgres:18`).
- **Volume mount path changed in `postgres:18`.** The image now stores data under `/var/lib/postgresql/<major>/...` and the volume MUST mount at **`/var/lib/postgresql`**, NOT `/var/lib/postgresql/data` (it errors on boot otherwise). The build-spec §20 compose used the old `/data` path — corrected in `docker-compose.yml` and the dev container. (Deviation from spec, intentional, to make PG18 actually start.)
