import { desc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'
import { keyAfter } from '../../utils/order'

export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const body = await readBody<Record<string, unknown>>(event)
  const name = String(body?.name ?? 'New project').trim() || 'New project'

  const db = useDb()
  const [last] = await db
    .select({ position: schema.projects.position })
    .from(schema.projects)
    .where(eq(schema.projects.userId, userId))
    .orderBy(desc(schema.projects.position))
    .limit(1)

  const [project] = await db
    .insert(schema.projects)
    .values({
      userId,
      name,
      icon: body?.icon ? String(body.icon) : 'folder',
      color: body?.color ? String(body.color) : null,
      position: keyAfter(last?.position ?? null),
    })
    .returning()

  return project
})
