import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const db = useDb()
  const [u] = await db
    .select({ preferences: schema.users.preferences })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1)
  return (u?.preferences ?? {}) as Record<string, unknown>
})
