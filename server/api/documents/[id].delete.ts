import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'

// Permanent purge (hard delete). Soft-delete to Trash is PATCH { deleted: true }.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const id = getRouterParam(event, 'id') as string
  const db = useDb()
  const deleted = await db
    .delete(schema.documents)
    .where(and(eq(schema.documents.id, id), eq(schema.documents.userId, userId)))
    .returning({ id: schema.documents.id })
  if (!deleted.length) throw createError({ statusCode: 404, statusMessage: 'Document not found.' })
  return { ok: true }
})
