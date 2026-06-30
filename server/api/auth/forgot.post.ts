import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { generateResetToken, hashToken, isValidEmail } from '../../utils/auth'
import { sendResetEmail } from '../../utils/mailer'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const email = String(body?.email ?? '')
    .trim()
    .toLowerCase()

  // Respond identically whether or not the account exists (no enumeration).
  const generic = { ok: true }
  if (!isValidEmail(email)) return generic

  const db = useDb()
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1)

  if (user) {
    const token = generateResetToken()
    await db.insert(schema.passwordResetTokens).values({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 3600_000), // 1 hour
    })
    await sendResetEmail(email, `${useRuntimeConfig().public.appUrl}/reset/${token}`)
  }

  return generic
})
