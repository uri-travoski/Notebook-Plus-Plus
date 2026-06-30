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
- [ ] 1. Scaffold + infra (Nuxt 3 + TS + Tailwind v4 §3 tokens, Drizzle + Postgres, docker-compose, migrations, Inter self-hosted) — health page in theme
- [ ] 2. Auth (register/login/logout/forgot/reset, sealed sessions, guards, ALLOW_REGISTRATION, seed account)
- [ ] 3. Hierarchy + sidebar (schema + /api/tree, §7 sidebar CRUD, drag-reorder, collapse persist, Overview/Starred/Drafts/Templates/Archive/Trash)
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
