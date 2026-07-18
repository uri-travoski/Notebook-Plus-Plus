import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { readFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import * as schema from './schema'
import { createPasswordHash } from '../utils/password'
import { defaultPreferences } from '../utils/auth'

const DEFAULT_EMAIL = 'dev@notebookpp.local'
const DEFAULT_USERNAME = 'dev'
const DEFAULT_PASSWORD = 'notebookpp'

type Row = Record<string, unknown>
type Template = {
  notebooks: Row[]
  documents: Row[]
  databases: Row[]
  databaseRows: Row[]
  attachments: Row[]
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const SEED_DIR = join(__dirname, 'seed')

function loadTemplate(): Template | null {
  try {
    return JSON.parse(readFileSync(join(SEED_DIR, 'template.json'), 'utf8')) as Template
  } catch {
    return null
  }
}

export async function runSeed() {
  const url = process.env.NUXT_DATABASE_URL
  if (!url) throw new Error('NUXT_DATABASE_URL is not set')
  const pool = new pg.Pool({ connectionString: url })
  const db = drizzle(pool, { schema, casing: 'snake_case' })
  try {
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, DEFAULT_EMAIL))
      .limit(1)
    if (existing.length) {
      console.log('Seed: default account already exists, skipping.')
      return
    }

    const passwordHash = await createPasswordHash(DEFAULT_PASSWORD)
    const [user] = await db
      .insert(schema.users)
      .values({
        email: DEFAULT_EMAIL,
        username: DEFAULT_USERNAME,
        passwordHash,
        displayName: 'Dev',
        preferences: defaultPreferences(),
      })
      .returning()

    const t = loadTemplate()
    if (!t || !t.notebooks?.length) {
      console.log('Seed: no template.json found, skipping starter content.')
      return
    }

    const notebookMap = new Map<string, string>()
    const docMap = new Map<string, string>()
    const dbMap = new Map<string, string>()
    const attMap = new Map<string, { id: string; key: string }>()
    for (const nb of t.notebooks) notebookMap.set(nb.id as string, randomUUID())
    for (const d of t.documents) docMap.set(d.id as string, randomUUID())
    for (const d of t.databases) dbMap.set(d.id as string, randomUUID())
    for (const a of t.attachments) attMap.set(a.id as string, { id: randomUUID(), key: randomUUID() })

    const remap = (content: unknown): unknown => {
      let s = JSON.stringify(content)
      for (const [oldId, newId] of dbMap) s = s.split(oldId).join(newId)
      for (const [oldId, m] of attMap) s = s.split(oldId).join(m.id)
      return JSON.parse(s)
    }

    // Copy upload files
    if (existsSync(join(SEED_DIR, 'uploads'))) {
      const uploadDir = join(process.cwd(), '.data', 'uploads')
      mkdirSync(uploadDir, { recursive: true })
      for (const a of t.attachments) {
        const m = attMap.get(a.id as string)!
        const src = join(SEED_DIR, 'uploads', a.key as string)
        if (existsSync(src)) copyFileSync(src, join(uploadDir, m.key))
      }
    }

    await db.transaction(async (tx) => {
      await tx.insert(schema.notebooks).values(
        t.notebooks.map((nb) => ({
          id: notebookMap.get(nb.id as string)!,
          userId: user.id,
          name: nb.name as string,
          icon: (nb.icon as string | null) ?? null,
          position: nb.position as string,
        })),
      )
      await tx.insert(schema.documents).values(
        t.documents.map((d) => ({
          id: docMap.get(d.id as string)!,
          userId: user.id,
          notebookId: notebookMap.get(d.notebookId as string)!,
          parentDocumentId: d.parentDocumentId ? docMap.get(d.parentDocumentId as string)! : null,
          title: d.title as string,
          icon: (d.icon as string | null) ?? null,
          type: d.type as 'page' | 'canvas',
          content: remap(d.content),
          searchText: (d.searchText as string) ?? '',
          isTemplate: !!d.isTemplate,
          isStarred: !!d.isStarred,
          isDraft: !!d.isDraft,
          position: d.position as string,
        })),
      )
      if (t.databases.length)
        await tx.insert(schema.databases).values(
          t.databases.map((d) => ({
            id: dbMap.get(d.id as string)!,
            documentId: docMap.get(d.documentId as string)!,
            name: d.name as string,
            columns: d.columns,
          })),
        )
      if (t.databaseRows.length)
        await tx.insert(schema.databaseRows).values(
          t.databaseRows.map((r) => ({
            id: randomUUID(),
            databaseId: dbMap.get(r.databaseId as string)!,
            values: r.values,
            position: r.position as string,
          })),
        )
      if (t.attachments.length)
        await tx.insert(schema.attachments).values(
          t.attachments.map((a) => {
            const m = attMap.get(a.id as string)!
            return {
              id: m.id,
              userId: user.id,
              documentId: a.documentId ? docMap.get(a.documentId as string)! : null,
              key: m.key,
              name: a.name as string,
              contentType: a.contentType as string,
              size: a.size as number,
            }
          }),
        )
    })

    console.log(
      `Seed: created default account -> username "${DEFAULT_USERNAME}" / password "${DEFAULT_PASSWORD}"`,
    )
  } finally {
    await pool.end()
  }
}

await runSeed()
