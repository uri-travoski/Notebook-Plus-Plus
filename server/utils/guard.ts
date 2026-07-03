import type { H3Event } from 'h3'

/**
 * Current authenticated user id. The /api auth middleware (server/middleware/00.auth.ts) resolves
 * the caller — session cookie or `Authorization: Bearer <api-token>` — into event.context.userId,
 * which we read here. Falls back to requireUserSession for any route not behind that middleware.
 */
export async function getUserId(event: H3Event): Promise<string> {
  const ctx = event.context.userId as string | undefined
  if (ctx) return ctx
  const { user } = await requireUserSession(event)
  return user.id
}
