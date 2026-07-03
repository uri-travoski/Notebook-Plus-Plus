import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const id = getRouterParam(event, 'id') as string
  const body = await readBody<Record<string, unknown>>(event)
  const db = useDb()

  const [existing] = await db
    .select({ id: schema.notebooks.id })
    .from(schema.notebooks)
    .where(and(eq(schema.notebooks.id, id), eq(schema.notebooks.userId, userId)))
    .limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Notebook not found.' })

  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (typeof body.name === 'string') patch.name = body.name.trim() || 'Untitled'
  if (typeof body.icon === 'string') patch.icon = body.icon
  if (typeof body.position === 'string') patch.position = body.position
  if (typeof body.archived === 'boolean') patch.archivedAt = body.archived ? new Date() : null
  if (typeof body.deleted === 'boolean') patch.deletedAt = body.deleted ? new Date() : null

  const [updated] = await db
    .update(schema.notebooks)
    .set(patch)
    .where(eq(schema.notebooks.id, id))
    .returning()

  // Cascade soft-delete/restore to the notebook's documents.
  if (typeof body.deleted === 'boolean') {
    await db
      .update(schema.documents)
      .set({ deletedAt: body.deleted ? new Date() : null })
      .where(and(eq(schema.documents.notebookId, id), eq(schema.documents.userId, userId)))
  }
  return updated
})
