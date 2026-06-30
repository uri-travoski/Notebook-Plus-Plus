# Notebook++ — Build Progress (durable cross-session tracker)

> **Read this FIRST on every resume.** It is the durable record of how far the autonomous build has gotten, because the session task list does not survive across sessions. Source of truth for *what to build* is `docs/build-spec.md`; this file tracks *what is done*.

## How to resume
1. `cd /home/reallybasic/Projects/Notebook++`.
2. Concurrency guard: `find .notebookpp-build/heartbeat -mmin -75` — if it prints a path, another build session is active; stop. Otherwise `touch .notebookpp-build/heartbeat` and re-touch at each phase start.
3. Read this file + `git log --oneline` (phase commits tagged `phase-N: ...`) to find the last completed phase.
4. Continue the next incomplete phase end-to-end (see `build-spec.md` §21). Don't stop to ask.
5. After each phase: run the quality gate (typecheck → eslint → prettier → build → drizzle migrate → `vitest run` → the phase's Playwright spec), fix all failures, update the checklist below, commit `phase-N: ...`, touch heartbeat.

## Environment (verified 2026-06-30)
Node 20.19.2 · npm 9.2 · Docker 26.1 + Compose v5 · git 2.47 · npm registry reachable · 2 CPU / 15G RAM / 169G free. No local Postgres → run it via Docker (`postgres:18-alpine`) for dev too. Running in Anthropic cloud env `env_018QY6Wt2f6EddFza581hxgW`; deploy paths in §20 are for the user's real server (produce the compose/Dockerfile, do not deploy there from here).

## Phase checklist (build-spec.md §21)
- [x] 1. Scaffold + infra (Nuxt 3 + TS + Tailwind v4 §3 tokens, Drizzle + Postgres, docker-compose, migrations, Inter self-hosted) — health page in theme
- [x] 2. Auth (register/login/logout/forgot/reset, sealed sessions, guards, ALLOW_REGISTRATION, seed account)
- [x] 3. Hierarchy + sidebar (schema + /api/tree, §7 sidebar CRUD, collapse persist, Overview/Starred/Drafts/Templates/Archive/Trash) — drag-reorder deferred to Phase 12
- [ ] 4. Editor island — pages (Veaury + BlockNote under ClientOnly, §8 chooser, load + debounced autosave, searchText)
- [ ] 5. Outline-parity formatting (callout/toggle/divider/math/highlight/underline/Shiki/attachments, slash menu, md shortcuts, outline panel, §3 prose theme)
- [ ] 6. Excalidraw (inline block + canvas doc type, self-hosted assets, scene persistence)
- [ ] 7. Database table block (databases/databaseRows + API, TanStack grid, typed columns, CRUD, GFM export)
- [ ] 8. Markdown import/export (per-doc + bulk pg-boss zip, lossy handling)
- [ ] 9. AI keys + fallback (encrypted multi-provider store, validation, Vercel AI SDK fallback, slash Ask AI + selection actions streamed)
- [ ] 10. Search (FTS + Cmd-K palette)
- [ ] 11. PWA + responsive (manifest, SW network-first API, mobile drawer, touch)
- [ ] 12. Polish & design pass (versions, settings completeness, empty/loading/error states, shortcuts, microcopy, motion + reduced-motion, a11y/contrast, screenshot-critique sweep)
- [ ] 13. Automated user-simulation & visual QA (§24: 10 page notes w/ 5-row tables + 5 canvas mindmaps via UI, persist on reload, screenshots, fix loop)

## USER ADDITIONS (must implement — do not drop across resumes)
- **Fonts in Settings → Preferences:** user must be able to select (a) a default **body/text** font and (b) a separate **code/monospace** font. Persist in `users.preferences` as `bodyFont` + `monoFont`; apply app-wide via CSS variables (`--font-sans` for UI/body/editor prose, `--font-mono` for code blocks + inline code). Ship a small curated, self-hosted font set (no Google Fonts CDN) for each — at minimum Inter + a couple of alternates for body, and a couple of mono options (e.g. JetBrains Mono / a system-mono fallback). Live-preview the change in the editor. Tie into Phase 1 (tokens/variables) and finalize the picker UI in Phase 12 settings completeness.

## Resume trigger
Hourly cron trigger "Notebook++ autonomous build resume" (fresh session per fire, env `env_018QY6Wt2f6EddFza581hxgW`) resumes this build and retries through usage limits. The session that satisfies §22 DoD + §24 simulation must DELETE that trigger and post the final summary.

## Log
- 2026-06-30: Infra bootstrap — fixed broken git repo, created build-spec.md (source of truth) from the build prompt, set up resume trigger + heartbeat lock + this tracker. Starting Phase 1.
- 2026-06-30: **Phase 1 done.** Nuxt 3.21.8 + Vue 3.5 + TS 5.9, Tailwind v4 with §3 tokens + dark mode + `--font-sans`/`--font-mono` vars (Inter + JetBrains Mono self-hosted via fontsource). Drizzle schema (10 tables, `uuidv7()` PKs) migrated into PG18 dev container (`notebookpp-dev-db` @ 127.0.0.1:5438). Dockerfile + compose + standalone migrator. Gate green: typecheck/eslint/prettier/build/migrate/vitest. Built server verified: `/api/health` → `database:ok`, index 200 in theme.
  - **Test harness note:** Playwright + browsers NOT yet installed — Phase 1's only UI is a throwaway health page (replaced by Overview in Phase 3), so E2E + screenshot-critique start in Phase 2 (auth) where the first real user flow exists. Not silently skipped.
  - **Tooling note:** eslint needs `Object.groupBy` (Node 21+); polyfilled in `eslint.polyfill.mjs` since host is Node 20.19.
- 2026-06-30: **Phase 2 done.** Auth via nuxt-auth-utils sealed cookies: register/login/logout/forgot/reset, scrypt password util (importable by seed; spec's hashPassword isn't), `tokenVersion` session-invalidation on reset, API guard middleware + global page guard, `ALLOW_REGISTRATION` gate, nodemailer with dev console fallback, seed default account (`dev`/`notebookpp`) + sample data. Shared UI components (UiButton/UiInput/FormField) + auth layout + login/register/forgot/reset pages. Gate green incl. 6 Playwright E2E (with axe a11y) + 8 vitest.
  - **Fixed:** dual-h3 conflict (`@nuxt/eslint`→devframe pulled h3 v2 to top level, breaking `readBody`) → pinned `h3@1.15.11` as a direct dep. `app.vue` was missing `<NuxtLayout>` (layouts never applied). Primary teal nudged darker for AA. E2E webServer uses the **built** server (no dev-lock); run `npm run build` before `npm run test:e2e`.
  - Debug helpers kept: `e2e/axe-debug.mjs`, `e2e/screens.mjs`.
- 2026-06-30: **Phase 3 done.** Fractional-index ordering (`fractional-indexing`), `/api/tree` + full CRUD for projects/notebooks/documents + `/api/documents?view=` + `/api/me/preferences`. Sidebar (lucide icons) with Projects→Notebooks→Notes, inline rename, collapse persisted in preferences, create/archive/delete/star/trash + **Move-to-notebook dialog**. App shell layout (default.vue) with mobile drawer + account menu. Overview + Starred/Drafts/Templates/Archive/Trash pages (restore/purge). Shared UI: UiDropdown/UiMenuItem/UiModal/DocList/AppPage/EmptyState; useTree/usePreferences/onClickOutside composables; v-focus plugin. Gate green: 9 Playwright E2E (incl. axe + create + move), 8 vitest, typecheck/lint/build.
  - **Deferred (documented, spec rule 7):** drag-and-drop reorder/move (API supports move + reorder via `position`; UI move is the dialog; visual DnD → Phase 12). Search/Cmd-K row → Phase 10. Settings content (incl. the body/mono **font picker**) → Phase 12/settings; CSS vars already wired.
  - **a11y:** darkened `--color-text-muted` (#64748b→#5b6677) so muted text clears AA on the app bg too; `text-subtle` now icons-only. UiDropdown triggers + account menu have aria-labels.
- 2026-07-01: **Phase 4 in progress — editor island WORKS.** BlockNote page editor mounts via a manual `createRoot` bridge (`components/EditorIsland.vue`), loads content, autosaves (debounced 1.5s → `PATCH /api/documents/:id { content }` → server derives `searchText`), and persists across reload. The hard integration is solved — see gotchas "Editor island — CRITICAL" (Veaury dropped, no-JSX createElement, withDefaults boolean, plugin-react@5, etc.). `doc/[id].vue` has the title input + island + Saving indicator; canvas docs show a Phase-6 placeholder. Gate green: 10 Playwright E2E (incl. editor edit+persist), 8 vitest, typecheck/lint/build. **Remaining for Phase 4: the §8 page/canvas chooser** (sidebar "New note" currently creates a page directly).
