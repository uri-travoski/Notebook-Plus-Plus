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
  the BlockNote block holds only `databaseId`. Columns typed in `columns` jsonb; row data in
  `values` jsonb keyed by column id.
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
