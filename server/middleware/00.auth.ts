import { eq } from 'drizzle-orm'
import { useDb, schema } from '../db'

// Guards every /api/** route except the auth + health endpoints. Page routes are
// guarded separately by middleware/auth.global.ts.
const PUBLIC_PREFIXES = ['/api/auth/', '/api/_auth/', '/api/health']

export default defineEventHandler(async (event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/')) return
  if (PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p))) return

  const { user } = await requireUserSession(event)

  // Enforce session token version (invalidated on password reset).
  const db = useDb()
  const [row] = await db
    .select({ tokenVersion: schema.users.tokenVersion })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)
  if (!row || row.tokenVersion !== user.tokenVersion) {
    await clearUserSession(event)
    throw createError({
      statusCode: 401,
      statusMessage: 'Your session has expired. Please sign in again.',
    })
  }
})
