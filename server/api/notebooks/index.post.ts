import { desc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'
import { keyAfter } from '../../utils/order'

export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const body = await readBody<Record<string, unknown>>(event)
  const name = String(body?.name ?? 'New notebook').trim() || 'New notebook'

  const db = useDb()
  const [last] = await db
    .select({ position: schema.notebooks.position })
    .from(schema.notebooks)
    .where(eq(schema.notebooks.userId, userId))
    .orderBy(desc(schema.notebooks.position))
    .limit(1)

  const [notebook] = await db
    .insert(schema.notebooks)
    .values({
      userId,
      name,
      icon: body?.icon ? String(body.icon) : 'book',
      position: keyAfter(last?.position ?? null),
    })
    .returning()
  return notebook
})
