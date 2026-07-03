import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'

// Hard delete — cascades to documents via FK.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const id = getRouterParam(event, 'id') as string
  const db = useDb()

  const deleted = await db
    .delete(schema.notebooks)
    .where(and(eq(schema.notebooks.id, id), eq(schema.notebooks.userId, userId)))
    .returning({ id: schema.notebooks.id })
  if (!deleted.length) throw createError({ statusCode: 404, statusMessage: 'Notebook not found.' })
  return { ok: true }
})
