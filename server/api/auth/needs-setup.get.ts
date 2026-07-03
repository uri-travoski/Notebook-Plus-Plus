import { count } from 'drizzle-orm'
import { useDb, schema } from '../../db'

// Public: true when there are no accounts yet (a fresh install). The login page uses this to
// send the very first visitor straight to the registration screen.
export default defineEventHandler(async () => {
  const db = useDb()
  const [row] = await db.select({ n: count() }).from(schema.users)
  return { needsSetup: (row?.n ?? 0) === 0 }
})
