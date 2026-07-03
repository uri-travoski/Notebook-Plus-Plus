import { readFileSync, copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { useDb, schema } from '../db'
import { uploadDir } from './storage'

type Row = Record<string, unknown>
type Template = {
  notebooks: Row[]
  documents: Row[]
  databases: Row[]
  databaseRows: Row[]
  attachments: Row[]
}

const SEED_DIR = join(process.cwd(), 'server', 'db', 'seed')

let template: Template | null | undefined
function loadTemplate(): Template | null {
  if (template !== undefined) return template
  try {
    template = JSON.parse(readFileSync(join(SEED_DIR, 'template.json'), 'utf8')) as Template
  } catch {
    // No bundled template (e.g. a source-only build where the data is gitignored) — nothing to seed.
    template = null
  }
  return template
}

// Clone the bundled starter content (notebooks / notes / tables / attachments) into a freshly-
// created user's account. Every id is regenerated and every cross-reference remapped — including
// the databaseId and /api/attachments/<id> ids embedded in document content — so each user gets a
// fully independent copy. Best-effort: callers should not fail registration if this throws.
export async function seedUserContent(userId: string): Promise<void> {
  const t = loadTemplate()
  if (!t || !t.notebooks?.length) return
  const db = useDb()

  const notebookMap = new Map<string, string>()
  const docMap = new Map<string, string>()
  const dbMap = new Map<string, string>()
  const attMap = new Map<string, { id: string; key: string }>()
  for (const nb of t.notebooks) notebookMap.set(nb.id as string, randomUUID())
  for (const d of t.documents) docMap.set(d.id as string, randomUUID())
  for (const d of t.databases) dbMap.set(d.id as string, randomUUID())
  for (const a of t.attachments) attMap.set(a.id as string, { id: randomUUID(), key: randomUUID() })

  // Rewrite ids referenced inside document content: databaseTable blocks hold a databaseId, image/
  // file blocks hold /api/attachments/<id>. Ids are uuids, so a plain string replace is safe.
  const remap = (content: unknown): unknown => {
    let s = JSON.stringify(content)
    for (const [oldId, newId] of dbMap) s = s.split(oldId).join(newId)
    for (const [oldId, m] of attMap) s = s.split(oldId).join(m.id)
    return JSON.parse(s)
  }

  // Copy upload files to fresh keys BEFORE writing the DB, so a copy failure aborts the whole
  // seed rather than leaving attachment rows with no file behind them.
  const dir = uploadDir()
  mkdirSync(dir, { recursive: true })
  for (const a of t.attachments) {
    const m = attMap.get(a.id as string)!
    copyFileSync(join(SEED_DIR, 'uploads', a.key as string), join(dir, m.key))
  }

  await db.transaction(async (tx) => {
    await tx.insert(schema.notebooks).values(
      t.notebooks.map((nb) => ({
        id: notebookMap.get(nb.id as string)!,
        userId,
        name: nb.name as string,
        icon: (nb.icon as string | null) ?? null,
        position: nb.position as string,
      })),
    )
    await tx.insert(schema.documents).values(
      t.documents.map((d) => ({
        id: docMap.get(d.id as string)!,
        userId,
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
            userId,
            documentId: a.documentId ? docMap.get(a.documentId as string)! : null,
            key: m.key,
            name: a.name as string,
            contentType: a.contentType as string,
            size: a.size as number,
          }
        }),
      )
  })
}
