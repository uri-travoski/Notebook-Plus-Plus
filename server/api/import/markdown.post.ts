import JSZip from 'jszip'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'
import { keyAfter } from '../../utils/order'
import { markdownToBlocks } from '../../utils/markdown'
import { blocksToPlainText } from '../../utils/blocks'

type FileIn = { name?: string; markdown?: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any

// Parse one markdown file into a page document (leading H1 -> title) and insert it.
async function createPage(
  db: Db,
  userId: string,
  notebookId: string | null,
  name: string,
  markdown: string,
) {
  const blocks = await markdownToBlocks(markdown)
  let title = name.replace(/\.md$/i, '').trim()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const first = blocks[0] as any
  if (first && first.type === 'heading' && first.props?.level === 1) {
    const t = blocksToPlainText([first])
    if (t) {
      title = t
      blocks.shift()
    }
  }
  if (!title) title = 'Untitled'

  const [last] = await db
    .select({ position: schema.documents.position })
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.userId, userId),
        notebookId
          ? eq(schema.documents.notebookId, notebookId)
          : isNull(schema.documents.notebookId),
        isNull(schema.documents.parentDocumentId),
      ),
    )
    .orderBy(desc(schema.documents.position))
    .limit(1)

  const [doc] = await db
    .insert(schema.documents)
    .values({
      userId,
      notebookId,
      type: 'page',
      title,
      content: blocks,
      searchText: (title + ' ' + blocksToPlainText(blocks)).trim(),
      position: keyAfter(last?.position ?? null),
      isDraft: !notebookId,
    })
    .returning({ id: schema.documents.id, title: schema.documents.title })
  return doc
}

// Import Markdown: a flat list of files into one notebook, OR a .zip whose top-level folders
// become top-level notebooks under the user (nested .md files become their pages).
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const body = await readBody<Record<string, unknown>>(event)
  const db = useDb()

  // --- Zip import (folders -> notebooks) ---
  if (body?.zip) {
    const zip = await JSZip.loadAsync(Buffer.from(String(body.zip), 'base64'))
    const entries = Object.values(zip.files).filter((f) => !f.dir && /\.md$/i.test(f.name))
    if (!entries.length)
      throw createError({ statusCode: 400, statusMessage: 'No .md files found in the zip.' })

    const nbCache = new Map<string, string>()
    const notebookFor = async (name: string) => {
      const existing = nbCache.get(name)
      if (existing) return existing
      const [last] = await db
        .select({ position: schema.notebooks.position })
        .from(schema.notebooks)
        .where(eq(schema.notebooks.userId, userId))
        .orderBy(desc(schema.notebooks.position))
        .limit(1)
      const [nb] = await db
        .insert(schema.notebooks)
        .values({ userId, name, position: keyAfter(last?.position ?? null) })
        .returning({ id: schema.notebooks.id })
      nbCache.set(name, nb.id)
      return nb.id
    }

    const created: { id: string; title: string }[] = []
    for (const entry of entries) {
      const parts = entry.name.replace(/^\/+/, '').split('/')
      const folder = parts.length > 1 ? parts[0] : 'Imported'
      const fname = parts[parts.length - 1]
      const nbId = await notebookFor(folder)
      created.push(await createPage(db, userId, nbId, fname, await entry.async('string')))
    }
    return { created, notebooks: [...nbCache.keys()] }
  }

  // --- Flat file import ---
  const notebookId = body?.notebookId ? String(body.notebookId) : null
  const files: FileIn[] = Array.isArray(body?.files)
    ? (body.files as FileIn[])
    : body?.markdown != null
      ? [{ name: body?.name ? String(body.name) : undefined, markdown: String(body.markdown) }]
      : []
  if (!files.length) throw createError({ statusCode: 400, statusMessage: 'No markdown provided.' })

  if (notebookId) {
    const [nb] = await db
      .select({ id: schema.notebooks.id })
      .from(schema.notebooks)
      .where(and(eq(schema.notebooks.id, notebookId), eq(schema.notebooks.userId, userId)))
      .limit(1)
    if (!nb) throw createError({ statusCode: 404, statusMessage: 'Notebook not found.' })
  }

  const created: { id: string; title: string }[] = []
  for (const f of files) {
    created.push(
      await createPage(db, userId, notebookId, String(f.name ?? ''), String(f.markdown ?? '')),
    )
  }
  return { created }
})
