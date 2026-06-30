import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { hashToken } from '../../utils/auth'
import { createPasswordHash } from '../../utils/password'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const token = String(body?.token ?? '')
  const password = String(body?.password ?? '')
  if (!token || password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request. Password must be at least 8 characters.',
    })
  }

  const db = useDb()
  const now = new Date()
  const [row] = await db
    .select()
    .from(schema.passwordResetTokens)
    .where(
      and(
        eq(schema.passwordResetTokens.tokenHash, hashToken(token)),
        isNull(schema.passwordResetTokens.usedAt),
        gt(schema.passwordResetTokens.expiresAt, now),
      ),
    )
    .limit(1)
  if (!row) {
    throw createError({
      statusCode: 400,
      statusMessage: 'This reset link is invalid or has expired.',
    })
  }

  const passwordHash = await createPasswordHash(password)
  // Bump tokenVersion to invalidate existing sessions.
  await db
    .update(schema.users)
    .set({ passwordHash, tokenVersion: sql`${schema.users.tokenVersion} + 1`, updatedAt: now })
    .where(eq(schema.users.id, row.userId))
  // Consume this token and any other outstanding tokens for the user.
  await db
    .update(schema.passwordResetTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(schema.passwordResetTokens.userId, row.userId),
        isNull(schema.passwordResetTokens.usedAt),
      ),
    )

  await clearUserSession(event)
  return { ok: true }
})
