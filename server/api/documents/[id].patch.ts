import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'
import { blocksToPlainText } from '../../utils/blocks'

export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const id = getRouterParam(event, 'id') as string
  const body = await readBody<Record<string, unknown>>(event)
  const db = useDb()

  const [existing] = await db
    .select({ id: schema.documents.id })
    .from(schema.documents)
    .where(and(eq(schema.documents.id, id), eq(schema.documents.userId, userId)))
    .limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Document not found.' })

  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (typeof body.title === 'string') patch.title = body.title.trim() || 'Untitled'
  if (typeof body.icon === 'string' || body.icon === null) patch.icon = body.icon
  if (typeof body.position === 'string') patch.position = body.position
  if (typeof body.isStarred === 'boolean') patch.isStarred = body.isStarred
  if (typeof body.isDraft === 'boolean') patch.isDraft = body.isDraft
  if (typeof body.isTemplate === 'boolean') patch.isTemplate = body.isTemplate
  if (typeof body.archived === 'boolean') patch.archivedAt = body.archived ? new Date() : null
  if (typeof body.deleted === 'boolean') patch.deletedAt = body.deleted ? new Date() : null

  // Editor autosave: content + derived searchText (page docs are BlockNote arrays).
  if (body.content !== undefined) {
    patch.content = body.content as object
    if (Array.isArray(body.content)) patch.searchText = blocksToPlainText(body.content)
  }

  // Move within the tree.
  if (body.notebookId === null) patch.notebookId = null
  else if (typeof body.notebookId === 'string') {
    const [nb] = await db
      .select({ id: schema.notebooks.id })
      .from(schema.notebooks)
      .innerJoin(schema.projects, eq(schema.notebooks.projectId, schema.projects.id))
      .where(and(eq(schema.notebooks.id, body.notebookId), eq(schema.projects.userId, userId)))
      .limit(1)
    if (!nb) throw createError({ statusCode: 404, statusMessage: 'Target notebook not found.' })
    patch.notebookId = body.notebookId
  }
  if (body.parentDocumentId === null) patch.parentDocumentId = null
  else if (typeof body.parentDocumentId === 'string') patch.parentDocumentId = body.parentDocumentId

  const [updated] = await db
    .update(schema.documents)
    .set(patch)
    .where(eq(schema.documents.id, id))
    .returning()
  return updated
})
