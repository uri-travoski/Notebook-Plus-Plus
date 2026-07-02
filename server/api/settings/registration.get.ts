import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'

// Whether self-registration is currently enabled. Stored in the owner's preferences
// (`allowRegistration`); falls back to the ALLOW_REGISTRATION env default when unset.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const config = useRuntimeConfig()
  const db = useDb()
  const [u] = await db
    .select({ preferences: schema.users.preferences })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1)
  const pref = (u?.preferences as Record<string, unknown> | null)?.allowRegistration
  const enabled = typeof pref === 'boolean' ? pref : String(config.allowRegistration) === 'true'
  return { enabled }
})
