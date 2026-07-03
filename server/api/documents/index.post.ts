import { and, desc, eq, isNull } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'
import { keyAfter } from '../../utils/order'

export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const body = await readBody<Record<string, unknown>>(event)
  const notebookId = body?.notebookId ? String(body.notebookId) : null
  const parentDocumentId = body?.parentDocumentId ? String(body.parentDocumentId) : null
  const type = body?.type === 'canvas' ? 'canvas' : 'page'
  const title = body?.title ? String(body.title).trim() || 'Untitled' : 'Untitled'

  const db = useDb()

  if (notebookId) {
    const [nb] = await db
      .select({ id: schema.notebooks.id })
      .from(schema.notebooks)
      .where(and(eq(schema.notebooks.id, notebookId), eq(schema.notebooks.userId, userId)))
      .limit(1)
    if (!nb) throw createError({ statusCode: 404, statusMessage: 'Notebook not found.' })
  }

  const [last] = await db
    .select({ position: schema.documents.position })
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.userId, userId),
        notebookId
          ? eq(schema.documents.notebookId, notebookId)
          : isNull(schema.documents.notebookId),
        parentDocumentId
          ? eq(schema.documents.parentDocumentId, parentDocumentId)
          : isNull(schema.documents.parentDocumentId),
      ),
    )
    .orderBy(desc(schema.documents.position))
    .limit(1)

  const content = type === 'canvas' ? { elements: [], appState: {}, files: {} } : []

  const [doc] = await db
    .insert(schema.documents)
    .values({
      userId,
      notebookId,
      parentDocumentId,
      type,
      title,
      content,
      position: keyAfter(last?.position ?? null),
      isDraft: !notebookId, // unfiled notes start as drafts
    })
    .returning()
  return doc
})
