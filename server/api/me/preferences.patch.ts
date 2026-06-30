import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'

// Shallow-merges the posted keys into users.preferences.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const body = await readBody<Record<string, unknown>>(event)
  const db = useDb()

  const [u] = await db
    .select({ preferences: schema.users.preferences })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1)
  const current = (u?.preferences ?? {}) as Record<string, unknown>
  const merged = { ...current, ...body }

  await db
    .update(schema.users)
    .set({ preferences: merged, updatedAt: new Date() })
    .where(eq(schema.users.id, userId))
  return merged
})
