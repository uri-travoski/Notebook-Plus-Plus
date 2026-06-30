import { and, desc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'
import { keyAfter } from '../../utils/order'

export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const body = await readBody<Record<string, unknown>>(event)
  const projectId = String(body?.projectId ?? '')
  const name = String(body?.name ?? 'New notebook').trim() || 'New notebook'
  if (!projectId) throw createError({ statusCode: 400, statusMessage: 'projectId is required.' })

  const db = useDb()
  const [project] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), eq(schema.projects.userId, userId)))
    .limit(1)
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found.' })

  const [last] = await db
    .select({ position: schema.notebooks.position })
    .from(schema.notebooks)
    .where(eq(schema.notebooks.projectId, projectId))
    .orderBy(desc(schema.notebooks.position))
    .limit(1)

  const [notebook] = await db
    .insert(schema.notebooks)
    .values({
      projectId,
      name,
      icon: body?.icon ? String(body.icon) : 'book',
      position: keyAfter(last?.position ?? null),
    })
    .returning()
  return notebook
})
