import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'
import { createPasswordHash, verifyPasswordHash } from '../../utils/password'

// Change the current user's password (verifies the existing one first).
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const body = await readBody<Record<string, unknown>>(event)
  const current = String(body?.currentPassword ?? '')
  const next = String(body?.newPassword ?? '')
  if (next.length < 8)
    throw createError({
      statusCode: 400,
      statusMessage: 'New password must be at least 8 characters.',
    })

  const db = useDb()
  const [u] = await db
    .select({ passwordHash: schema.users.passwordHash })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1)
  if (!u) throw createError({ statusCode: 404, statusMessage: 'User not found.' })
  if (!(await verifyPasswordHash(u.passwordHash, current)))
    throw createError({ statusCode: 400, statusMessage: 'Current password is incorrect.' })

  await db
    .update(schema.users)
    .set({ passwordHash: await createPasswordHash(next), updatedAt: new Date() })
    .where(eq(schema.users.id, userId))
  return { ok: true }
})
