import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const id = getRouterParam(event, 'id') as string
  const body = await readBody<Record<string, unknown>>(event)
  const db = useDb()

  const [existing] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)))
    .limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Project not found.' })

  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (typeof body.name === 'string') patch.name = body.name.trim() || 'Untitled'
  if (typeof body.icon === 'string') patch.icon = body.icon
  if (typeof body.color === 'string' || body.color === null) patch.color = body.color
  if (typeof body.position === 'string') patch.position = body.position
  if (typeof body.archived === 'boolean') patch.archivedAt = body.archived ? new Date() : null

  const [updated] = await db
    .update(schema.projects)
    .set(patch)
    .where(eq(schema.projects.id, id))
    .returning()
  return updated
})
