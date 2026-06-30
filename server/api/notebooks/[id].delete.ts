import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'

// Hard delete — cascades to documents via FK.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const id = getRouterParam(event, 'id') as string
  const db = useDb()

  const [existing] = await db
    .select({ id: schema.notebooks.id })
    .from(schema.notebooks)
    .innerJoin(schema.projects, eq(schema.notebooks.projectId, schema.projects.id))
    .where(and(eq(schema.notebooks.id, id), eq(schema.projects.userId, userId)))
    .limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Notebook not found.' })

  await db.delete(schema.notebooks).where(eq(schema.notebooks.id, id))
  return { ok: true }
})
