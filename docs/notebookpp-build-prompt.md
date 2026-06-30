# Notebook++ — Autonomous Build Prompt (Claude Code / Opus)

> Hand this entire document to Claude Code. It is the complete, self-contained specification **and** the execution directive.

---

## 0. EXECUTION DIRECTIVE — read first, obey throughout

You are building **Notebook++**, a self-hosted single-user notes & knowledge base, from scratch, in one continuous autonomous run.

**Operating rules — non-negotiable:**
1. **Do not stop and do not ask for confirmation.** Build the entire application end to end. Make every decision yourself using the defaults in this document. Where something is genuinely ambiguous, choose the most sensible option consistent with the spec and **keep going** — never halt to ask a question.
2. **Work through all phases in §21 in order.** When a phase's acceptance check passes, immediately begin the next phase. Never end your turn with "shall I continue?" — always continue.
3. **Self-verify after every phase:** run typecheck, lint, and a production build; run/verify Drizzle migrations. A failing build, type error, or broken migration is a bug to fix on the spot — not a reason to stop. Fix it, re-verify, then proceed.
4. **No stack substitutions.** Use exactly the stack in §2. Do not swap the editor, ORM, framework, or styling system.
5. **Design is a first-class deliverable.** Apply your **frontend-design skill** (read its `SKILL.md` if your environment exposes it) to every screen. Anchor to the §3 brief — **do not reinvent the palette or direction**, execute it — but bring real craft, and meet the **§3A quality floor**. After building each UI surface, **take a screenshot, critique it against §3 + §3A, and refine** before moving on. Templated, scaffold-looking UI is a defect, not "good enough."
6. **Test as you build.** Every phase includes writing and running tests (**§23**) in addition to typecheck/lint/build. A failing test is a bug to fix on the spot. Never skip, disable, weaken, or delete a test to make a phase "pass."
7. **Prefer working software at each step.** If a non-critical sub-feature blocks you, stub it behind a clearly marked `// TODO(notebookpp):` with a graceful fallback and continue the build rather than stalling the whole project. Critical-path features (auth, editor, persistence, the two custom blocks, deploy) must actually work.
8. **Seed for testability:** create a default dev account and a small amount of seed data (one project → one notebook → one page note + one canvas note) so the app is immediately usable.
9. **This is a long build.** Budget for many steps. Do not summarize-and-stop midway. After the build satisfies the **Definition of Done (§22)**, **run the automated user-simulation pass (§24)** and fix everything it surfaces; only finish once it is green. Then give a concise summary of what was built, how to run it, the default login, and where the simulation screenshots are.

If git is available, commit after each phase with a clear message (`phase-N: …`).

---

## 1. Project overview

A **single-user, self-hosted** knowledge base in the spirit of Outline — same editing experience and document formatting, a similar sidebar — but with no team features. Visual theme comes from the design system in §3.

### Explicit non-goals (do NOT build)
- No teams, workspaces, members, groups, roles, or permissions.
- No real-time collaboration / multiplayer / comments. **Single user → no CRDT, no sync server.**
- No SSO / OAuth. Username + password only.
- No external-service embeds (Airtable, Figma, etc.).
- No public sharing / shared links / "Publish" / guest access (ignore those in the reference mockup).
- Email is used **only** for password reset.

### Core features (DO build)
1. Block-based editor (BlockNote) with Outline-parity formatting (§11).
2. Notion-style **database tables** in documents — custom block, exports as GFM table (§12).
3. **Excalidraw** — inline block *and* a dedicated full-page "canvas" document type (§13).
4. **GitHub-Flavoured Markdown** import/export (§14).
5. Auth: register, login, logout, forgot password, reset password (§9).
6. Responsive, installable **PWA** (§18).
7. **Bring-your-own AI keys** — multiple providers, ordered fallback, encrypted, server-proxied (§16).
8. Hierarchy **Projects → Notebooks → Notes** in the sidebar (§7).
9. **New-document chooser**: "Page" or "Canvas" (§8).

---

## 2. Tech stack (LOCKED)

Two runtime services.

| Layer | Choice |
|---|---|
| **App** | **Nuxt 3** (Vue 3 + TypeScript) — Vue frontend + Nitro server routes + PWA in one process |
| **DB** | **PostgreSQL 18** + **Drizzle ORM** |
| **Uploads** | **Docker volume** (local disk); S3-swappable driver for later (Backblaze B2 + Cloudflare) |

**No Redis, no sync server.** Sessions → sealed cookies (`nuxt-auth-utils`). Background jobs → **pg-boss** (Postgres-backed). Caching → Postgres + HTTP headers.

**Libraries:** `nuxt-auth-utils`, `drizzle-orm` + `drizzle-kit`, `@vite-pwa/nuxt`, `pg-boss`, `nodemailer`. Tailwind **v4** for the Vue shell. **Editor island (React, isolated):** `@blocknote/core`, `@blocknote/react`, `@blocknote/mantine`, `@excalidraw/excalidraw`, `@tanstack/react-table`. **Vue↔React bridge:** `veaury`. **AI:** `ai` (Vercel AI SDK) + `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `@openrouter/ai-sdk-provider`, Groq (OpenAI-compatible). **Rendering:** `katex` (math), `shiki` (code highlighting).

---

## 3. Design system (LOCKED) — derived from the reference screenshot

Implement these as CSS custom properties + Tailwind v4 `@theme` tokens. Values are tuned from the reference; keep them centralized so they're trivially adjustable. **Take colours, typography, spacing, card/sidebar styling from the reference; the layout is Outline-style (sidebar + top bar + centered document card).**

### Brand / primary (teal)
```
--color-primary:          #0E9F8E   /* buttons, active states, checkbox fill, accents */
--color-primary-hover:    #0C8576
--color-primary-active:   #0A6F63
--color-primary-contrast: #FFFFFF   /* text/icons on primary */
--color-primary-subtle:   #E3F4F1   /* tag/pill bg, checklist accent bg */
--color-primary-subtle-fg:#0B7264   /* tag/pill text */
```

### Neutrals (light theme — default)
```
--color-bg:            #EEF2F7   /* app/page background behind cards */
--color-surface:       #FFFFFF   /* content card, editor surface */
--color-sidebar:       #F7F9FB   /* sidebar background */
--color-surface-subtle:#F8FAFC   /* callout/checklist box bg, hovers */
--color-border:        #E2E8F0   /* borders, dividers, hr under headings */
--color-border-strong: #CBD5E1   /* checkbox borders, stronger dividers */
--color-heading:       #1E293B   /* document title + section headings (deep slate-navy) */
--color-text:          #334155   /* body text */
--color-text-muted:    #64748B   /* secondary text */
--color-text-subtle:   #94A3B8   /* sidebar section labels, timestamps, placeholders */
--color-row-hover:     #EFF3F8   /* sidebar row hover */
--color-row-selected:  #E5EBF2   /* sidebar selected row */
```

### Dark theme (for the theme toggle)
```
--color-bg:#0F172A  --color-surface:#1E293B  --color-sidebar:#111A2E
--color-surface-subtle:#172033  --color-border:#334155  --color-border-strong:#475569
--color-heading:#F1F5F9  --color-text:#E2E8F0  --color-text-muted:#94A3B8  --color-text-subtle:#64748B
--color-row-hover:#1B2740  --color-row-selected:#243049
--color-primary:#14B8A6  --color-primary-hover:#0F9C8C  --color-primary-subtle:#0F2C2A  --color-primary-subtle-fg:#5EEAD4
```

### Callout / notice status colours
```
info:    text #2563EB  bg #EFF6FF
tip:     text #0E9F8E  bg #E3F4F1   (reuse primary)
success: text #059669  bg #ECFDF5
warning: text #D97706  bg #FFFBEB
danger:  text #DC2626  bg #FEF2F2
```

### Typography
- **Font:** Inter (UI + body), system-sans fallback. Self-host the Inter webfont (no Google Fonts CDN). Headings use Inter 600–700.
- **Scale:** doc title 32/700 · section H1 24/650 · H2 20/600 · H3 17/600 · body 16/400 line-height **1.7** · meta/section-labels 12/600 uppercase, letter-spacing 0.06em, color `--color-text-subtle`.
- **Reading width:** content column max **720px**, centered.

### Shape, shadow, spacing, layout
- Radius: inputs/buttons **8px**, cards **12px**, pills **9999px**, callout/checklist box **10px**.
- Card shadow: `0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)`.
- Spacing base 4px. Sidebar width **280px**. Top bar height ~56px.

### Component cues from the reference
- **Primary button** (e.g. "New Project"): solid `--color-primary`, white text, 8px radius, medium weight; leading "+" in a circle.
- **Sidebar section label**: uppercase 12px, `--color-text-subtle`, letter-spaced (e.g. "WORKSPACE", "SYSTEM").
- **Sidebar item**: icon + label, rounded hover (`--color-row-hover`), selected uses `--color-row-selected` with the leading icon tinted `--color-primary`.
- **Tag/pill** (e.g. "CONTENT STRATEGY"): uppercase, `--color-primary-subtle` bg + `--color-primary-subtle-fg` text, pill radius; followed by muted "Last revision …" meta.
- **Checklist**: bordered box on `--color-surface-subtle`; checked = `--color-primary` square + white check; unchecked = white square + `--color-border-strong` border; pending labels in `--color-text-muted`.
- **Blockquote**: 3–4px left border in `--color-primary`, `--color-surface-subtle` bg, italic `--color-heading` text, padded.
- **Heading rule**: 1px `--color-border` divider beneath section headings.
- **Top bar**: search input (rounded, `--color-border`), muted icon actions, avatar at right. (No Publish/Share/Insights — out of scope.)

### Logo / name
App name **"Notebook++"** with a small leading accent bar in `--color-primary` (as the reference shows a colored bar before the wordmark).

## 3A. Design excellence (LOCKED) — apply your frontend-design skill

§3 is the **fixed brief**: the palette, type, and direction are decided by the reference and must be followed, not reinvented. Your job is to **execute that direction with the craft of a senior product designer**. Apply your frontend-design skill throughout. The bar is: this should feel like a real, lovingly-built product, never a scaffold with default styling.

**This is a writing tool — the reading/writing surface is the hero.** Spend the most care on the editor and document view: type rhythm, comfortable line length (720px), generous line-height (1.7), balanced heading scale, quiet chrome that disappears while writing. The sidebar, top bar, and dialogs are supporting cast — keep them disciplined and out of the way.

**One signature, everything else quiet.** Pick a single memorable detail and make it excellent — e.g. the active-note treatment in the sidebar (the teal-tinted icon + soft selected row), the page/canvas chooser, or the checklist/callout styling — and keep all surrounding UI restrained. Do not decorate. Cut anything that doesn't earn its place.

**Hit every interaction state — these are where polish lives:**
- Hover, focus-visible, active, disabled, selected, and loading states for every interactive element.
- **Empty states** as invitations, not blank space: "No notes yet — create your first page or canvas." with the action right there. Every list (projects, notebooks, search, trash, AI keys) gets a designed empty state.
- **Loading**: skeletons or subtle spinners; never layout-shift jank. Show the editor shell immediately while the island hydrates.
- **Errors**: explain what happened and how to fix it, in the product's voice (see microcopy below). Never a raw stack trace in the UI.

**Spacing & rhythm:** use the 4px base consistently; align to a vertical rhythm; equal optical padding. Watch CSS specificity so section/element selectors don't cancel each other's margins (a common generated-code bug).

**Motion, with restraint:** a few deliberate, fast (~150–200ms) transitions — sidebar disclosure, chooser/dialog open, hover affordances, toast in/out. Nothing bouncy or ambient. Respect `prefers-reduced-motion`.

**Microcopy (design material, not filler):**
- Active voice; the control says what happens: "Create page", "Save changes", "Delete note" — not "Submit".
- An action keeps its name through the flow: a "Publish"-style button produces a matching past-tense toast ("Saved", "Archived", "Deleted").
- Name things by what the user controls ("AI keys", "Appearance"), never by implementation.
- Sentence case, no exclamation spam, no marketing tone.

**Accessibility quality floor (non-negotiable):**
- Visible keyboard focus everywhere; full keyboard operability (sidebar, slash menu, chooser, command palette, dialogs).
- WCAG AA contrast for text and UI (verify the §3 tokens meet it; nudge a token rather than ship low contrast).
- Touch targets ≥ 40px on mobile; the layout is responsive down to ~360px.
- Semantic HTML and ARIA where components are custom (menus, dialogs, tree).

**Self-critique loop (do this, don't skip):** after each UI surface, take a screenshot, look at it as a skeptical designer, list what's off (alignment, contrast, weight, spacing, state coverage, copy), fix it, and re-screenshot. Keep a short running `DESIGN-NOTES.md` of decisions and fixes so later passes stay consistent. A picture is worth a thousand tokens — actually look.

---

## 4. Architecture: Nuxt shell + one React editor island

BlockNote and Excalidraw are both React, and Excalidraw is client-only (no SSR). Keep the **entire app in Nuxt** and isolate **one** React island: the editor.

```
NUXT 3 (Vue) — shell: auth pages · sidebar (Projects→Notebooks→Notes) · document chrome
               · settings · Nitro REST API · pg-boss jobs
  └── REACT ISLAND (veaury, <ClientOnly>, SSR off): <Editor>
        ├─ BlockNote (standard blocks + marks)
        ├─ custom block: DatabaseTable (TanStack Table)
        └─ custom block: Excalidraw
      props: { initialContent, docType, readOnly }   emits: onChange(content)→debounced autosave
            │ REST                                   │
       PostgreSQL (Drizzle)                     Docker volume (/srv/docker/notebookpp/uploads)
```

The island mounts client-side only, receives the document JSON, emits changes; it never calls the API directly. The Vue shell owns loading, debounced autosave (1.5s), title, breadcrumb, read-only toggle, and the headings-outline panel. Styling isolation: the island uses BlockNote's theme + a prose stylesheet tuned to §3; the shell uses Tailwind v4 with the §3 tokens.

---

## 5. Repository layout

```
notebookpp/
├─ nuxt.config.ts  drizzle.config.ts  Dockerfile  docker-compose.yml  .env.example
├─ server/
│  ├─ api/                    # Nitro REST routes (§19)
│  ├─ db/{schema.ts,index.ts} # Drizzle (§6)
│  ├─ utils/{auth,crypto,ai,markdown,storage}.ts
│  └─ jobs/                   # pg-boss workers (reindex, export, ai)
├─ components/                # Vue: Sidebar, DocList, TopBar, Settings, NewDocChooser…
├─ editor/                    # the React island
│  ├─ Editor.tsx  schema.ts
│  ├─ blocks/{DatabaseTable.tsx,Excalidraw.tsx}
│  └─ EditorIsland.client.vue # <ClientOnly> Veaury wrapper
├─ pages/{index,login,register,forgot}.vue  pages/reset/[token].vue
│  pages/doc/[id].vue  pages/settings/*.vue
├─ composables/  assets/css/  public/ (manifest, icons, inter fonts, excalidraw fonts)
```

---

## 6. Data model (Drizzle / PostgreSQL)

UUID v7 PKs; `created_at`/`updated_at` everywhere; soft-delete via `archived_at`/`deleted_at`. Implement the full schema:

```ts
// server/db/schema.ts
users(id, email unique, username unique, passwordHash, displayName, avatarUrl,
      preferences jsonb /* theme, font, editorWidth, defaultDocType, dateFormat */,
      createdAt, updatedAt)

passwordResetTokens(id, userId→users.id cascade, tokenHash, expiresAt, usedAt)

projects(id, userId→users.id cascade, name, icon, color, position /*fractional index*/,
         archivedAt, createdAt, updatedAt)

notebooks(id, projectId→projects.id cascade, name, icon, position, archivedAt, createdAt, updatedAt)

documents( -- "Notes"
  id, notebookId→notebooks.id cascade nullable, parentDocumentId nullable /*optional nesting*/,
  title default 'Untitled', icon,
  type 'page'|'canvas' default 'page',
  content jsonb default []  -- page: BlockNote blocks; canvas: {elements,appState,files}
  searchText text default '' -- derived plaintext for FTS
  isTemplate bool, isStarred bool, isDraft bool,
  position, archivedAt, deletedAt, createdAt, updatedAt)
  -- indexes: notebookId, parentDocumentId; FTS: generated tsvector(title+searchText) + GIN

documentVersions(id, documentId→documents.id cascade, content jsonb, title, createdAt)

-- Database-table block: data stored relationally (queryable). Block in the doc holds only databaseId.
databases(id, documentId→documents.id cascade, name default 'Untitled table',
          columns jsonb /* [{id,name,type:text|number|select|multiselect|date|checkbox|url, options?}] */,
          createdAt, updatedAt)
databaseRows(id, databaseId→databases.id cascade, values jsonb /* keyed by column id */, position)

attachments(id, userId→users.id cascade, documentId nullable, key, name, contentType, size, createdAt)

aiKeys(id, userId→users.id cascade, provider 'anthropic'|'openai'|'google'|'openrouter'|'groq',
       label, encryptedKey, iv, authTag, model, priority int default 0 /*lower tried first*/,
       enabled bool default true, lastOkAt, lastError, createdAt)
```

`searchText` is recomputed server-side on every page save by flattening BlockNote blocks to plaintext.

---

## 7. Content hierarchy & sidebar

**Projects → Notebooks → Notes.** Projects and Notebooks are containers; a Note is a document (`page`|`canvas`). Notes may optionally nest under notes (`parentDocumentId`); default is the three levels.

**Sidebar (top → bottom), styled per §3:**
1. Header — "Notebook++" wordmark with primary accent bar. Below it: a primary **"New Project"** button.
2. **Overview** (= Home) — recent + starred dashboard.
3. **Search** — opens Cmd/Ctrl-K command palette (§17).
4. Section label **WORKSPACE** → the Projects tree: each Project collapsible → Notebooks collapsible → Notes. Folder icon for containers, doc icon for notes. Drag-to-reorder + drag-to-move (fractional `position`). Hover actions: new child, rename, star, move, archive, delete. Collapse state persists in `users.preferences`.
5. **Starred** — starred notes.
6. Section label **SYSTEM** → **Drafts** (`isDraft`), **Templates** (`isTemplate`), **Archive** (`archivedAt`), **Trash** (`deletedAt`, purgeable).
7. **Settings** (bottom, gear icon) — switches sidebar into Settings mode (§15) with a "Return to app" affordance.

(Do not build "Team Directory" or the top-bar Publish/Share/Insights/Review from the mockup.)

---

## 8. New-document flow (page vs canvas)

Every note-creation entry point (the "+" on a Notebook row, a sidebar "New" action, the command palette, empty-state buttons) opens a **chooser** popover with two tiles:
- **📄 Page — write with the block editor** → `documents` row `type:'page'`, content `[]`, opens the editor island in page mode.
- **🎨 Canvas — sketch, diagram, mind-map** → `documents` row `type:'canvas'`, content `{elements:[],appState:{},files:{}}`, opens a full-page Excalidraw.

Remember the last choice as a soft default in preferences, but always show the chooser. A page may also contain inline Excalidraw and database blocks; a canvas is a dedicated whiteboard with no text-document chrome.

---

## 9. Authentication

Username + password only. Flows: **register** (email + username + password; hash with `nuxt-auth-utils` `hashPassword`), **login** (username/email + password → `verifyPassword` → sealed session cookie), **logout**, **forgot password** (store only a token *hash* in `passwordResetTokens`, TTL ~1h, email a reset link; respond identically whether or not the user exists — no enumeration), **reset password** (`reset/[token]` verifies hash+expiry+unused → set new password, mark used, invalidate other sessions).

Sessions via `nuxt-auth-utils` sealed cookies (no server store). `requireUserSession(event)` guards all `/api/**` except auth endpoints; global route middleware guards pages. Gate registration behind `ALLOW_REGISTRATION` env (default `true`; lock to `false` after the single account exists). Email via `nodemailer` (SMTP env); if SMTP is unset, log the reset link to server output (dev fallback).

---

## 10. Editor island (BlockNote, React)

`EditorIsland.client.vue` uses `<ClientOnly>` + Veaury (`applyReactInVue`) to render `Editor.tsx` (SSR off — mandatory for Excalidraw). Flow: `doc/[id].vue` loads the document → passes `initialContent`, `docType`, `readOnly` → island emits `onChange` → debounce 1.5s → `PATCH /api/documents/:id { content }` → server recomputes `searchText`.

`Editor.tsx`: builds a BlockNote schema (`editor/schema.ts`) extending default blocks with the two custom blocks; renders `<BlockNoteView>` with slash menu + formatting toolbar + drag handles for `type:'page'`; renders full-page Excalidraw for `type:'canvas'`. Document JSON: page → BlockNote block array; canvas → `{elements,appState,files}`. Both stored in `documents.content`.

---

## 11. Editor feature set & document formatting (Outline parity)

Theme everything per §3. BlockNote provides many of these natively (✅); build the rest as custom blocks / inline styles (🔧 — BlockNote supports custom blocks, custom inline content, and custom styles).

**Blocks:** ✅ paragraph · ✅ headings (H1–H3, add H4–H6) · ✅ bullet / numbered / **check** lists · ✅ quote (style per §3 blockquote) · ✅ code block (wire **Shiki** + language picker) · ✅ image (upload→§storage, paste & drag-drop) · ✅ simple table · 🔧 **callout/notice** (info/tip/warning/success/danger per §3) · 🔧 **toggle/collapsible** · 🔧 **divider** · 🔧 **math** (KaTeX inline `$…$` + block `$$…$$`) · 🔧 **file attachment** chip · 🔧 **video/audio** of uploaded files only · 🔧 **database table** (§12) · 🔧 **Excalidraw** (§13).

**Marks:** ✅ bold · ✅ italic · ✅ strikethrough · ✅ inline code · ✅ link · 🔧 **underline** · 🔧 **highlight** (color options) · text/background color (native).

**Interactions:** native slash "/" menu (register all custom blocks, styled per §3), markdown typing shortcuts (`#`,`-`,`1.`,`>`,```` ``` ````,`[]`,`---`,`**`,`*`,`` ` ``), drag handles + nesting, selection formatting toolbar (extend with highlight/underline/math), headings-outline panel in the Vue chrome, empty-block placeholders. Checklist visuals match §3 (teal checked box; muted pending labels).

---

## 12. Custom block — Database table (Notion-style)

Typed, sortable/filterable grid inside a document; **exports as a GFM table**.

- **Storage:** relational and queryable — the BlockNote block stores only `{ databaseId }`; structure/data live in `databases` + `databaseRows` (§6). The NodeView/component fetches and mutates via the database API (§19), debounced.
- **Render:** `@tanstack/react-table` (headless) + custom cells, styled per §3.
- **Columns** typed: `text|number|select|multiselect|date|checkbox|url`, with per-column options for (multi)select. Add/rename/delete/reorder columns; change type.
- **Rows:** add/delete/reorder (fractional index), inline per-type cell editing. Client-side sort + simple per-column filter.
- **GFM export:** header row from column names; one row per record; multiselect → comma-joined, checkbox → `[x]`/`[ ]`, date → `YYYY-MM-DD`, url → the url. (Importing a GFM table may create a database with all-`text` columns.)
- Lifecycle: deleting/duplicating a document must cascade/clone its databases; exporting a document fetches rows.

*(v1 = single grid view. Multiple/kanban/grouped views are out of scope.)*

---

## 13. Custom block — Excalidraw

- `@excalidraw/excalidraw`, **client-only** (the reason the island is SSR-off; render only under `<ClientOnly>`).
- **Self-host assets:** copy `node_modules/@excalidraw/excalidraw/dist/prod/fonts` into `public/` and set `window.EXCALIDRAW_ASSET_PATH = "/"` (no CDN). Container must have non-zero height.
- **Inline block:** sized container with `<Excalidraw>`; scene `{elements,appState,files}` stored in the block's data (use a side table only if jsonb size becomes an issue — inline is fine for v1).
- **Canvas document** (`type:'canvas'`): full-scale Excalidraw; `documents.content` holds the scene. This is what the §8 "Canvas" choice creates.
- Store embedded scene images/files via the uploads driver, not base64, where possible.
- **Markdown export:** no native markdown form → on change, export the scene to PNG/SVG (Excalidraw export), upload as an attachment, and emit `![diagram](url)`; optionally preserve the scene JSON in an HTML comment for re-import.

---

## 14. Markdown import/export (GFM)

Use BlockNote core: `blocksToMarkdownLossy()` (export) and `tryParseMarkdownToBlocks()` (import). **Round-trips:** headings, paragraphs, bold/italic/strike/code, links, bullet/numbered/check lists, quotes, code blocks, dividers, **tables (incl. the database block → GFM table)**. **Lossy/special-cased:** Excalidraw → rendered image (+ optional scene JSON in HTML comment); callouts/toggles → degrade to blockquote/nested list or a controlled HTML-comment convention; math → literal `$…$`/`$$…$$`. **Surfaces:** per-document "Export → Markdown"; bulk "Export all" as a pg-boss zip job mirroring the Projects/Notebooks tree; import of `.md` and `.md` zips (folders → notebooks). Canonical stored form is BlockNote JSON; markdown is derivable on demand.

---

## 15. Settings (single-user subset)

**Account:** Profile (display name, username, avatar) · Preferences (theme light/dark/system, font, editor width, default new-doc type, markdown-shortcut toggles, date format) · Security (change password) · Notifications (in-app only; minimal). **General/App:** **AI** (BYO keys manager — §16, primary AI surface) · Import (markdown) · Export (markdown zip) · Appearance (logo/name, accent — defaults to §3). Same sidebar-mode pattern as the app with "Return to app". *Personal API tokens are out of scope for v1.* Settings UI styled per §3.

---

## 16. Bring-your-own AI keys (multi-provider, fallback)

User adds one or more provider keys; on failure, fall through to the next. Keys never reach the client after entry; all AI calls are server-proxied.

- **Providers:** Anthropic, OpenAI, Google (Gemini), OpenRouter, Groq — all cloud APIs (no self-hosted models).
- **Storage:** `aiKeys` rows; key encrypted with **AES-256-GCM** (`server/utils/crypto.ts`) using `ENCRYPTION_KEY` (32 bytes from env); store `iv` + `authTag` with ciphertext. Return only a masked preview to the client; never the plaintext.
- **Entry:** Settings → AI → "Add key" (provider, label, key, optional default model, priority). Validate with a cheap call on save; record `lastOkAt`/`lastError`.
- **Fallback engine** (`server/utils/ai.ts`): order enabled keys by `priority`; per request try each, catch auth/rate/5xx, advance, update status; surface "all providers failed" cleanly.
- **SDK:** Vercel AI SDK (`ai` + `@ai-sdk/*`; Groq via OpenAI-compatible). One `generateText`/`streamText` call site; enforce no-store/no-train where supported (prefer OpenRouter ZDR routing if used).
- **Where used (v1):** a slash-menu "Ask AI / Write with AI" command and selection actions (summarise, improve, continue, translate, fix grammar), streamed into the editor.

---

## 17. Search

Postgres FTS over `documents.title` + `documents.searchText` (generated `tsvector` + GIN). `searchText` maintained on each save by flattening blocks to plaintext. **Command palette** (Cmd/Ctrl-K) from sidebar Search: fuzzy title + FTS body, grouped by Project/Notebook, keyboard-navigable. Reindex via a pg-boss job after bulk import.

---

## 18. PWA

`@vite-pwa/nuxt`, `registerType:'autoUpdate'`. **Manifest:** name "Notebook++", short_name "Notebook++", icons 192/512 + maskable, `theme_color:"#0E9F8E"`, `background_color:"#EEF2F7"`, `display:'standalone'`, `start_url:'/'`. **Service worker:** precache app shell; runtime-cache static assets; **network-first for `/api/**`** (single live user → data must stay fresh). Offline = installable + cached shell + read recently-opened, with a clear offline indicator (no offline editing in v1 — no CRDT). **Responsive:** sidebar collapses to a drawer on mobile; toolbar adapts; Excalidraw and the database grid are touch-usable; verify the slash menu on narrow viewports. Installable on iOS/Android home screen.

---

## 19. API routes (Nitro)

REST under `/api`, all (except auth) behind `requireUserSession`.

```
Auth:      POST register|login|logout|forgot|reset · GET session
Tree:      GET /api/tree (projects→notebooks→notes)
           POST/PATCH/DELETE /api/projects[/:id] · /api/notebooks[/:id] · reorder endpoints
Documents: GET /api/documents/:id · POST /api/documents {notebookId,type} ·
           PATCH /api/documents/:id (title,content,icon,move,star,draft) ·
           POST .../archive|restore · DELETE (→trash) · DELETE .../purge ·
           GET/POST .../versions
Databases: POST /api/databases · PATCH /api/databases/:id (columns/name) ·
           POST/PATCH/DELETE /api/databases/:id/rows[/:rowId] · rows/reorder
Uploads:   POST /api/uploads (multipart→volume) · GET /api/uploads/:key (auth-checked stream)
AI:        GET/POST /api/ai/keys · PATCH/DELETE /api/ai/keys/:id · POST .../:id/validate ·
           POST /api/ai/complete (streamed; runs fallback engine)
Search/IO: GET /api/search?q= · POST /api/import/markdown · POST /api/export/markdown (pg-boss; GET to download)
Settings:  GET/PATCH /api/me/preferences · POST /api/me/password
```

---

## 20. Deployment (these conventions exactly)

- Stack file: `/opt/stacks/notebookpp/docker-compose.yml` (**always `docker-compose.yml`, never `compose.yml`**). Persistent data: `/srv/docker/notebookpp/`. `restart: unless-stopped` on every service. App port bound to `127.0.0.1`, public via Nginx Proxy Manager on external `npm_proxy` network.

```yaml
services:
  app:
    build: .
    container_name: notebookpp-app
    restart: unless-stopped
    depends_on:
      db: { condition: service_healthy }
    environment:
      NUXT_DATABASE_URL: postgres://notebookpp:${DB_PASSWORD}@db:5432/notebookpp
      NUXT_SESSION_PASSWORD: ${SESSION_PASSWORD}   # >=32 chars (sealed cookies)
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}            # 32-byte key for AES-256-GCM
      NUXT_PUBLIC_APP_URL: https://notes.example.com
      SMTP_URL: ${SMTP_URL}
      ALLOW_REGISTRATION: "true"                   # lock to "false" after first account
    volumes:
      - /srv/docker/notebookpp/uploads:/app/.data/uploads
    ports: ["127.0.0.1:3000:3000"]
    networks: [default, npm_proxy]
  db:
    image: postgres:18-alpine
    container_name: notebookpp-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: notebookpp
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: notebookpp
    volumes: ["/srv/docker/notebookpp/pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U notebookpp"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks: [default]
networks:
  default: {}
  npm_proxy: { external: true }
```

**Dockerfile:** multi-stage — `npm ci && npm run build`; run `node .output/server/index.mjs`; entrypoint runs `drizzle-kit migrate` before boot. Provide `.env.example` with every variable above.

---

## 21. Build phases (execute in order; do not stop between them)

Each phase has an acceptance check; when it passes, **immediately continue to the next**. **Every phase additionally requires:** (a) the relevant tests from §23 written and passing, and (b) for any UI built in the phase, a screenshot taken and critiqued against §3 + §3A and refined. A phase is not "done" until its acceptance check, its tests, and its design pass are all green.

1. **Scaffold + infra** — Nuxt 3 + TS + Tailwind v4 with §3 tokens, Drizzle + Postgres, docker-compose, migrations run, Inter self-hosted. *Done when:* app boots, DB connects, a health page renders in the theme.
2. **Auth** — register/login/logout/forgot/reset, sealed sessions, guards, `ALLOW_REGISTRATION`, seed default account. *Done when:* full auth cycle works incl. reset (link logged if no SMTP).
3. **Hierarchy + sidebar** — schema + `/api/tree`, the §7 sidebar with CRUD, drag-reorder, collapse persistence, Overview/Starred/Drafts/Templates/Archive/Trash. *Done when:* projects/notebooks/notes can be created, moved, archived, trashed from the UI.
4. **Editor island (pages)** — Veaury + BlockNote under `<ClientOnly>`, §8 page/canvas chooser, load + debounced autosave, `searchText` maintenance. Standard blocks/marks only. *Done when:* a page note edits and persists across reload.
5. **Outline-parity formatting** — custom blocks/marks: callout, toggle, divider, math (KaTeX), highlight, underline, Shiki code highlighting, attachments; slash menu + markdown shortcuts + outline panel + §3 prose theme. *Done when:* every block/mark in §11 works and is styled per §3.
6. **Excalidraw** — inline block + canvas document type, self-hosted assets, scene persistence. *Done when:* both an inline drawing and a full canvas note save/reload.
7. **Database table block** — `databases`/`databaseRows` + API, TanStack grid, typed columns, CRUD, GFM export. *Done when:* a table persists relationally and exports as a GFM table.
8. **Markdown import/export** — per-doc + bulk (pg-boss zip), lossy handling for custom blocks. *Done when:* export→import round-trips standard content; bulk export produces a tree of `.md`.
9. **AI keys + fallback** — encrypted multi-provider store, validation, Vercel AI SDK fallback engine, slash "Ask AI" + selection actions (streamed). *Done when:* with a key configured, a streamed completion writes into the editor; an invalid first key falls through.
10. **Search** — FTS + Cmd-K palette. *Done when:* titles and body content are findable, grouped by Project/Notebook.
11. **PWA + responsive** — manifest, service worker (network-first API), mobile drawer, touch passes. *Done when:* the app is installable and usable on a narrow viewport.
12. **Polish & design pass** — document version snapshots, settings completeness, designed empty/loading/error states, keyboard shortcuts, microcopy pass (§3A), motion + reduced-motion, a11y/contrast audit, and a final whole-app screenshot-critique sweep against §3 + §3A. *Done when:* §22 design + functional criteria pass.
13. **Automated user-simulation & visual QA** — run the full §24 user-simulation pass against the running app (real-user Playwright driving the UI: 10 page notes each with a 5-row table, 5 canvas mindmaps), verify persistence on reload, capture screenshots, review them, and fix any functional or visual defect found. *Done when:* §24 completes green and all content is present under the default account for the user to review.

---

## 22. Definition of Done (finish only when ALL are true)

- `npm run build` succeeds with no type errors; lint passes.
- `docker compose up` brings up `notebookpp-app` + `notebookpp-db`; migrations apply automatically; the app is reachable.
- Auth works end to end (register, login, logout, forgot, reset).
- Sidebar shows Projects → Notebooks → Notes with full CRUD, drag-reorder, archive, trash; Overview/Starred/Drafts/Templates present.
- New-doc chooser creates both **page** and **canvas** notes.
- Page editor supports every block/mark in §11, styled per §3, with slash menu + markdown shortcuts; pages autosave and survive reload.
- **Database table** block persists relationally and exports as a GFM table.
- **Excalidraw** works inline and as a canvas document; assets self-hosted.
- Markdown import/export works (per-doc + bulk).
- BYO AI keys: multiple providers, encrypted at rest, server-proxied, ordered fallback, streamed completions in-editor.
- Cmd-K search returns title + body matches.
- PWA installs and is responsive on mobile.
- The visual theme matches §3 **and** meets the §3A design bar: designed empty/loading/error states, full interaction states, visible keyboard focus, AA contrast, restrained motion (reduced-motion respected), responsive to ~360px. UI reads as a polished product, not a scaffold.
- A seeded default account + sample data exist; a README documents env vars and run steps.
- **Tests pass:** the §23 suites (unit/integration + component + E2E) all run green; `DESIGN-NOTES.md` and screenshots exist.
- **§24 user-simulation is complete and green:** 10 page notes (each with a 5-row database table) and 5 canvas mindmaps were created through the UI, all survived reload, and screenshots are saved in `e2e/artifacts/`.

When all of the above hold, stop and give a concise summary: what was built, how to run it (dev + docker), the default login, where the §24 screenshots are, and any `TODO(notebookpp)` stubs left — so the user can log in and review the 10 notes + 5 canvases.

---

## 23. Testing strategy & quality gates

Test continuously, not at the end. Each phase writes the tests covering what it just built and must leave them green before moving on.

**Tooling:** **Vitest** + `@nuxt/test-utils` for unit/integration and component tests; **`@playwright/test`** for end-to-end (also powers §24); **`@axe-core/playwright`** for automated accessibility scans.

**Quality gate run after every phase (all must pass to advance):** typecheck (`vue-tsc`/`tsc`) → eslint → prettier check → production build → Drizzle migrations apply → `vitest run` → the phase's Playwright spec. Fix any failure on the spot; never weaken a test to pass a gate.

**Unit / integration (server):**
- Auth: register, login, logout, forgot (token hashed, TTL, no user enumeration), reset (consumes token, invalidates sessions), route guards reject unauthenticated `/api/**`.
- Tree: create/rename/move/reorder/archive/restore/trash/purge for projects, notebooks, documents; fractional-index ordering stays consistent.
- Documents: create (page & canvas), autosave PATCH, `searchText` derivation from blocks, version snapshot.
- Database block: columns + rows CRUD, reorder, cascade-delete with the document, **database → GFM-table** serialization (and GFM-table → database import).
- Crypto: AES-256-GCM encrypt→decrypt round-trip; tamper (wrong authTag) fails closed.
- AI fallback engine (mock providers): first key fails → second succeeds; all fail → single clean error; `lastOkAt`/`lastError` updated; plaintext key never serialized to a client-facing shape.
- Markdown: export→import round-trip preserves standard content; lossy blocks handled per §14.
- Search: FTS returns title and body matches.

**Component:** NewDocChooser (page/canvas branch), Sidebar tree (disclosure, selected state, hover actions), callout/toggle/checklist rendering and states, AI-key form (masks key, never echoes plaintext), empty states render their CTA.

**Accessibility:** run axe on login, sidebar/home, the editor, settings, and a dialog; fail the gate on serious/critical violations; verify keyboard focus order and operability.

**Artifacts:** Playwright screenshots + traces to `e2e/artifacts/`; keep `DESIGN-NOTES.md`. Provide npm scripts: `test`, `test:e2e`, `test:sim` (§24), and `db:reset` (drop → migrate → seed) so §24 can run against a known-clean DB for exact counts.

---

## 24. Automated user-simulation acceptance pass (post-build)

After the build satisfies §22, **run this automatically** (it is phase 13). A Playwright spec (`e2e/simulation.spec.ts`) drives the **running app through the real UI as a user** — typing with real keyboard events, opening menus by clicking/typing, navigating like a person. Run it against a freshly reset DB (`db:reset`) so counts are exact. Headless by default; `--headed` available. **Do not inject content via the API** except the single documented Excalidraw fallback below.

**Step 0 — log in & set up structure (via UI):** log in with the seeded default account. Create **2 projects** ("Workspace", "Personal"), each with **2 notebooks** (4 notebooks total). Distribute the content below across these notebooks.

**Step 1 — 10 page notes, each with one 5-row database table.** For `NN` = 01…10:
1. New → chooser → **Page**. Type title `Note NN — <topic>` (topics: Project Kickoff, Research Log, Reading List, Meeting Notes, Sprint Plan, Bug Triage, Content Calendar, Expense Tracker, Habit Tracker, Recipe Box).
2. Type body: an **H2** (`## ` + heading), a paragraph, and **one rotating extra block** so all block types get exercised across the ten — cycle through checklist → callout → quote → code → checklist …
3. Insert a **database table** via the slash menu (`/` → "Database"). Define 5 columns: **Name** (text), **Status** (select: Todo/Doing/Done), **Priority** (select: Low/Med/High), **Due** (date), **Done** (checkbox). Add **5 rows** of realistic values (so 10 tables × 5 rows = 50 rows total).
4. Wait for the "Saved" indicator (or network idle), then **reload**. Assert the title, the H2, and **all 5 table rows** are present. Screenshot → `e2e/artifacts/note-NN.png`.

**Step 2 — 5 canvas notes, each an Excalidraw mindmap with other data.** For `NN` = 01…05:
1. New → chooser → **Canvas**. Title `Canvas NN — Mindmap: <theme>` (themes: Product Strategy, System Architecture, Q4 Roadmap, User Journey, Feature Brainstorm).
2. Build a **mindmap** using the Excalidraw toolbar + pointer: a **central node** (rounded rect/ellipse) labeled with the theme; **5 child nodes** placed around it, each labeled; **arrows** connecting center → each child; plus **other data** — a title text at the top and 2 free-floating note/text blocks (or a small extra shape cluster). Use tool keyboard shortcuts (`r`/`o` shape, `a` arrow, `t` text, `v` select), `page.mouse.down/move/up` at computed coordinates, and the text tool to type each label.
3. Wait for autosave, then **reload**. Assert the scene persisted: expected element count present and key label text retrievable. Screenshot → `e2e/artifacts/canvas-NN.png`.

> **Excalidraw robustness fallback (documented):** pure pointer-driven drawing on a canvas is brittle. Attempt genuine toolbar/pointer interaction first. **Only if** a step proves flaky after honest retries, construct a well-formed mindmap scene object in the spec and apply it through the app's own editor change path — the canvas note is still created via the UI, and the result is real, labeled, persisted mindmap data the user can open and see. Note in the summary which canvases used the fallback.

**Step 3 — verify & report (no teardown).** Assert all **10 notes + 5 canvases** exist, are filed under the expected notebooks, and survive a fresh reload (ideally a fresh login). **Leave all data in place** under the default account for the user's manual review. Write a run summary (each title, its project/notebook, table-row count, canvas element count, and whether the canvas fallback was used) and save every screenshot to `e2e/artifacts/`.

**Step 4 — self-review & fix loop.** Open the screenshots and review them as a skeptical user/designer: are tables filled and aligned, are mindmaps legible and connected, do pages match §3 + §3A? For any functional or visual defect, **fix the app and re-run §24** until it completes green with content that genuinely looks right. Only then report completion so the user can log in and check the 10 notes and 5 canvases.
