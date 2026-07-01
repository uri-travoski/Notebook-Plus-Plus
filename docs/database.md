# Database

Drizzle ORM + PostgreSQL 18. Schema: `server/db/schema.ts`. Migrations live in
`server/db/migrations` (`npm run db:generate` to author, `npm run db:migrate` to apply).

## Conventions
- **PKs:** `uuid` with `default uuidv7()` (PG18 native, time-ordered) — no JS UUID dep.
- **Timestamps:** `created_at` / `updated_at` (timestamptz, default `now()`). Soft-delete via
  `archived_at` and/or `deleted_at` (never hard-delete except Trash purge).
- **Casing:** camelCase in TS, snake_case in DB (drizzle `casing: 'snake_case'`).
- **Ordering:** `position` is a string **fractional index** (drag-reorder without renumbering).
- **JSON:** `content`, `columns`, `values`, `preferences` are `jsonb`.

## Tables (overview)
- **users** — account + `preferences` jsonb (see below).
- **passwordResetTokens** — hashed reset tokens, TTL, single-use (`usedAt`).
- **projects → notebooks → documents** — the hierarchy. `documents.type` is `page|canvas`;
  nullable `notebookId` + self-ref `parentDocumentId` for nesting; `userId` owner for user-wide
  views (drafts/templates/trash). `content` jsonb = BlockNote blocks (page) or
  `{elements,appState,files}` (canvas). `searchText` = derived plaintext for FTS.
- **documentVersions** — content/title snapshots.
- **databases + databaseRows** — the in-document table block, stored relationally and queryable;
  the BlockNote block holds `databaseId` plus per-block view prefs (`view` = `table|kanban`,
  `groupBy` = a Select column id), round-tripped through the document JSON (no dedicated DB
  column). Columns typed in `columns` jsonb; each column also carries an optional `width` (px, set
  by dragging the header edge). Row data in `values` jsonb keyed by column id; `databaseRows.position`
  is a fractional-indexing key that orders rows and is rewritten on drag-reorder. The Notion-style
  Table view has a sticky header + frozen first column, click-to-edit cells, coloured Select/Multi-
  select pills (colour derived from the option label), and a per-column header menu (rename, change
  type, insert left/right, delete). The Kanban board groups rows by the chosen Select column (plus a
  "No &lt;column&gt;" lane for unset rows); dragging a card between lanes updates that column's value.
- **attachments** — uploaded files (`key` in the storage driver, content-type, size).
- **aiKeys** — encrypted provider keys (AES-256-GCM: `encryptedKey` + `iv` + `authTag`),
  `priority` (lower tried first), `enabled`, `lastOkAt`/`lastError`.

## Fields & Logic
> Grows per phase. Detailed enough to rebuild any feature's fields from this file alone.

### users.preferences (jsonb)
| Key | Type | Default | Notes |
|---|---|---|---|
| theme | `light\|dark\|system` | `system` | toggles `.dark` on `<html>` |
| bodyFont | string (font id) | `inter` | sets `--font-sans` app-wide (UI + editor prose) |
| monoFont | string (font id) | `jetbrains-mono` | sets `--font-mono` (code blocks + inline code) |
| editorWidth | `normal\|wide` | `normal` | reading column 720px vs wider |
| defaultDocType | `page\|canvas` | `page` | soft default in the new-doc chooser |
| dateFormat | string | `YYYY-MM-DD` | display format |
| markdownShortcuts | boolean | `true` | enable editor typing shortcuts |
| sidebarCollapsed | string[] | `[]` | collapsed project/notebook ids |
