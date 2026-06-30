import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'
import { getUserId } from '../../../utils/guard'

export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const id = getRouterParam(event, 'id') as string
  const [row] = await useDb()
    .delete(schema.aiKeys)
    .where(and(eq(schema.aiKeys.id, id), eq(schema.aiKeys.userId, userId)))
    .returning({ id: schema.aiKeys.id })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Key not found.' })
  return { ok: true }
})
