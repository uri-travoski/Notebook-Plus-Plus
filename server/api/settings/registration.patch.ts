import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'

// Enable/disable self-registration. Persisted on the owner's preferences.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const { enabled } = await readBody<{ enabled?: boolean }>(event)
  if (typeof enabled !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'enabled (boolean) is required.' })
  }
  const db = useDb()
  const [u] = await db
    .select({ preferences: schema.users.preferences })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1)
  const current = (u?.preferences ?? {}) as Record<string, unknown>
  await db
    .update(schema.users)
    .set({ preferences: { ...current, allowRegistration: enabled }, updatedAt: new Date() })
    .where(eq(schema.users.id, userId))
  return { enabled }
})
