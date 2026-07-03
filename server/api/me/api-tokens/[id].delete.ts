import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'
import { getUserId } from '../../../utils/guard'

// Revoke (delete) one of the current user's API tokens.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const id = getRouterParam(event, 'id') as string
  const db = useDb()
  const deleted = await db
    .delete(schema.apiTokens)
    .where(and(eq(schema.apiTokens.id, id), eq(schema.apiTokens.userId, userId)))
    .returning({ id: schema.apiTokens.id })
  if (!deleted.length) throw createError({ statusCode: 404, statusMessage: 'Token not found.' })
  return { ok: true }
})
