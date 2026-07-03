import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../db'

// Guards every /api/** route except the auth + health endpoints. Accepts EITHER a logged-in
// session cookie OR an `Authorization: Bearer <api-token>` (for agents/scripts). Resolves the
// caller into event.context.userId (read by getUserId). Page routes are guarded separately by
// middleware/auth.global.ts.
const PUBLIC_PREFIXES = ['/api/auth/', '/api/_auth/', '/api/health']

export default defineEventHandler(async (event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/')) return
  if (PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p))) return

  const db = useDb()

  // API-token auth: Authorization: Bearer nbp_...
  const auth = getRequestHeader(event, 'authorization')
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7).trim()
    const hash = token ? createHash('sha256').update(token).digest('hex') : ''
    const [t] = hash
      ? await db
          .select({ id: schema.apiTokens.id, userId: schema.apiTokens.userId })
          .from(schema.apiTokens)
          .where(eq(schema.apiTokens.tokenHash, hash))
          .limit(1)
      : []
    if (!t) throw createError({ statusCode: 401, statusMessage: 'Invalid API token.' })
    event.context.userId = t.userId
    // Best-effort last-used stamp; never block the request on it.
    void db
      .update(schema.apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.apiTokens.id, t.id))
      .then(
        () => {},
        () => {},
      )
    return
  }

  // Session auth (+ token-version check, invalidated on password reset).
  const { user } = await requireUserSession(event)
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
  event.context.userId = user.id
})
