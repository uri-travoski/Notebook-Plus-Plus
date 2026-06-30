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
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'

// Postgres 18 ships uuidv7(); use it for time-ordered UUID primary keys.
const pk = () =>
  uuid('id')
    .primaryKey()
    .default(sql`uuidv7()`)
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
const archivedAt = () => timestamp('archived_at', { withTimezone: true })

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

export const projects = pgTable(
  'projects',
  {
    id: pk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    icon: text('icon'),
    color: text('color'),
    position: text('position').notNull().default('a0'), // fractional index
    archivedAt: archivedAt(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('projects_user_idx').on(t.userId)],
)

export const notebooks = pgTable(
  'notebooks',
  {
    id: pk(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    icon: text('icon'),
    position: text('position').notNull().default('a0'),
    archivedAt: archivedAt(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('notebooks_project_idx').on(t.projectId)],
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

export type User = typeof users.$inferSelect
export type Project = typeof projects.$inferSelect
export type Notebook = typeof notebooks.$inferSelect
export type Document = typeof documents.$inferSelect
export type Database = typeof databases.$inferSelect
export type DatabaseRow = typeof databaseRows.$inferSelect
export type AiKey = typeof aiKeys.$inferSelect
