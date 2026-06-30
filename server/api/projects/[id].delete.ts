import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'

// Hard delete — cascades to notebooks + documents via FK.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const id = getRouterParam(event, 'id') as string
  const db = useDb()

  const deleted = await db
    .delete(schema.projects)
    .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)))
    .returning({ id: schema.projects.id })
  if (!deleted.length) throw createError({ statusCode: 404, statusMessage: 'Project not found.' })
  return { ok: true }
})
