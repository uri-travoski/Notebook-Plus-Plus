import { sql } from 'drizzle-orm'
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  jsonb,
  timestamp,
  boolean,
  integer,
  bigint,
  index,
  customType,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'

// Postgres full-text search vector (§17). Stored generated column kept in sync from
// title + searchText; queried via a GIN index.
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

// Postgres 18 ships uuidv7(); use it for time-ordered UUID primary keys.
const pk = () =>
  uuid('id')
    .primaryKey()
    .default(sql`uuidv7()`)
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
const archivedAt = () => timestamp('archived_at', { withTimezone: true })
const deletedAt = () => timestamp('deleted_at', { withTimezone: true })

export const docType = pgEnum('doc_type', ['page', 'canvas'])
export const aiProvider = pgEnum('ai_provider', [
  'anthropic',
  'openai',
  'google',
  'openrouter',
  'groq',
])

export const users = pgTable('users', {
  id: pk(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  // Incremented to invalidate existing sealed-cookie sessions (e.g. on password reset).
  tokenVersion: integer('token_version').notNull().default(0),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  // { theme, bodyFont, monoFont, editorWidth, defaultDocType, dateFormat, markdownShortcuts, sidebarCollapsed[] }
  preferences: jsonb('preferences')
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: pk(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: createdAt(),
})

// Notebooks are top-level, owned directly by the user (Notebooks -> Notes; notes nest via
// parentDocumentId). There is no Project layer.
export const notebooks = pgTable(
  'notebooks',
  {
    id: pk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    icon: text('icon'),
    position: text('position').notNull().default('a0'), // fractional index
    archivedAt: archivedAt(),
    deletedAt: deletedAt(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('notebooks_user_idx').on(t.userId)],
)

export const documents = pgTable(
  'documents',
  {
    id: pk(),
    // Owner — convenient for user-wide views (drafts/templates/trash) since notebookId is nullable.
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    notebookId: uuid('notebook_id').references(() => notebooks.id, { onDelete: 'cascade' }),
    parentDocumentId: uuid('parent_document_id').references((): AnyPgColumn => documents.id, {
      onDelete: 'cascade',
    }),
    title: text('title').notNull().default('Untitled'),
    icon: text('icon'),
    type: docType('type').notNull().default('page'),
    // page: BlockNote block array; canvas: { elements, appState, files }
    content: jsonb('content')
      .notNull()
      .default(sql`'[]'::jsonb`),
    searchText: text('search_text').notNull().default(''),
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(search_text, ''))`,
    ),
    isTemplate: boolean('is_template').notNull().default(false),
    isStarred: boolean('is_starred').notNull().default(false),
    isDraft: boolean('is_draft').notNull().default(false),
    position: text('position').notNull().default('a0'),
    archivedAt: archivedAt(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('documents_user_idx').on(t.userId),
    index('documents_notebook_idx').on(t.notebookId),
    index('documents_parent_idx').on(t.parentDocumentId),
    index('documents_search_idx').using('gin', t.searchVector),
  ],
)

export const documentVersions = pgTable(
  'document_versions',
  {
    id: pk(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    content: jsonb('content').notNull(),
    title: text('title'),
    createdAt: createdAt(),
  },
  (t) => [index('document_versions_document_idx').on(t.documentId)],
)

export const databases = pgTable(
  'databases',
  {
    id: pk(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    name: text('name').notNull().default('Untitled table'),
    // [{ id, name, type: text|number|select|multiselect|date|checkbox|url, options? }]
    columns: jsonb('columns')
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('databases_document_idx').on(t.documentId)],
)

export const databaseRows = pgTable(
  'database_rows',
  {
    id: pk(),
    databaseId: uuid('database_id')
      .notNull()
      .references(() => databases.id, { onDelete: 'cascade' }),
    values: jsonb('values')
      .notNull()
      .default(sql`'{}'::jsonb`), // keyed by column id
    position: text('position').notNull().default('a0'),
    createdAt: createdAt(),
  },
  (t) => [index('database_rows_db_idx').on(t.databaseId)],
)

export const attachments = pgTable(
  'attachments',
  {
    id: pk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('attachments_user_idx').on(t.userId)],
)

export const aiKeys = pgTable(
  'ai_keys',
  {
    id: pk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: aiProvider('provider').notNull(),
    label: text('label'),
    // Optional custom endpoint for OpenAI-compatible providers (Alibaba, local LLMs, proxies…).
    baseUrl: text('base_url'),
    encryptedKey: text('encrypted_key').notNull(),
    iv: text('iv').notNull(),
    authTag: text('auth_tag').notNull(),
    model: text('model'),
    priority: integer('priority').notNull().default(0), // lower tried first
    enabled: boolean('enabled').notNull().default(true),
    lastOkAt: timestamp('last_ok_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: createdAt(),
  },
  (t) => [index('ai_keys_user_idx').on(t.userId)],
)

// Bulk markdown-export jobs (pg-boss): the worker builds a zip and stores it (base64) here;
// the client polls status then downloads.
export const exportJobs = pgTable(
  'export_jobs',
  {
    id: pk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'), // pending|done|error
    filename: text('filename'),
    data: text('data'), // base64 zip, set when status=done
    error: text('error'),
    createdAt: createdAt(),
  },
  (t) => [index('export_jobs_user_idx').on(t.userId)],
)

// Bearer API tokens for programmatic access (agents). Only the SHA-256 hash is stored; the
// plaintext token is shown once at creation. Auth resolves a token to its owner's user id.
export const apiTokens = pgTable(
  'api_tokens',
  {
    id: pk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    tokenHash: text('token_hash').notNull(),
    prefix: text('prefix').notNull(), // first chars, shown for identification
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('api_tokens_user_idx').on(t.userId), index('api_tokens_hash_idx').on(t.tokenHash)],
)

// Backup subsystem (Settings → Backup). Instance-wide, not per-user: a backup is a full
// pg_dump of the whole database plus the uploads dir, so these are singleton/global tables.
// `backup_settings` holds one row; secrets (the backup password and the S3 secret key) are
// encrypted at rest with ENCRYPTION_KEY, the same scheme used for ai_keys.
export const backupSettings = pgTable('backup_settings', {
  id: pk(),
  schedule: text('schedule').notNull().default('off'), // off | 2h | 6h | daily | weekly
  retention: integer('retention').notNull().default(14),
  includeUploads: boolean('include_uploads').notNull().default(true),
  destinationType: text('destination_type').notNull().default('local'), // local | s3
  localPath: text('local_path').notNull().default(''), // empty → <cwd>/.data/backups (dev) or /backups (container)
  s3Endpoint: text('s3_endpoint').notNull().default(''),
  s3Region: text('s3_region').notNull().default('auto'),
  s3Bucket: text('s3_bucket').notNull().default(''),
  s3ForcePathStyle: boolean('s3_force_path_style').notNull().default(false),
  s3AccessKeyId: text('s3_access_key_id').notNull().default(''),
  // encrypted S3 secret access key
  s3SecretCiphertext: text('s3_secret_ciphertext'),
  s3SecretIv: text('s3_secret_iv'),
  s3SecretAuthTag: text('s3_secret_auth_tag'),
  // encrypted backup password (encrypts every backup archive)
  passwordCiphertext: text('password_ciphertext'),
  passwordIv: text('password_iv'),
  passwordAuthTag: text('password_auth_tag'),
  updatedAt: updatedAt(),
})

// Append-only log of backup/restore runs, newest first when queried.
export const backupHistory = pgTable(
  'backup_history',
  {
    id: pk(),
    type: text('type').notNull(), // backup | restore
    ok: boolean('ok').notNull(),
    name: text('name'),
    // byte size can exceed int4 (2 GB) → bigint
    size: bigint('size', { mode: 'number' }),
    location: text('location'),
    includesUploads: boolean('includes_uploads'),
    error: text('error'),
    durationMs: integer('duration_ms'),
    createdAt: createdAt(),
  },
  (t) => [index('backup_history_created_idx').on(t.createdAt)],
)

export type User = typeof users.$inferSelect
export type Notebook = typeof notebooks.$inferSelect
export type Document = typeof documents.$inferSelect
export type Database = typeof databases.$inferSelect
export type DatabaseRow = typeof databaseRows.$inferSelect
export type AiKey = typeof aiKeys.$inferSelect
