import type { H3Event } from 'h3'

/** Current authenticated user id (throws 401 if no session). */
export async function getUserId(event: H3Event): Promise<string> {
  const { user } = await requireUserSession(event)
  return user.id
}
