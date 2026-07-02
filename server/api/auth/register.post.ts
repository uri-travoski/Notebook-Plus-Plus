import { asc, eq, or } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { createPasswordHash } from '../../utils/password'
import { isValidEmail, isValidUsername, defaultPreferences, sessionUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const db = useDb()

  // Registration gate: the owner's saved setting (preferences.allowRegistration) overrides the
  // ALLOW_REGISTRATION env default; a fresh install (no accounts yet) always allows the first.
  const [owner] = await db
    .select({ preferences: schema.users.preferences })
    .from(schema.users)
    .orderBy(asc(schema.users.createdAt))
    .limit(1)
  if (owner) {
    const pref = (owner.preferences as Record<string, unknown> | null)?.allowRegistration
    const enabled = typeof pref === 'boolean' ? pref : String(config.allowRegistration) === 'true'
    if (!enabled) {
      throw createError({ statusCode: 403, statusMessage: 'Registration is disabled.' })
    }
  }

  const body = await readBody<Record<string, unknown>>(event)
  const email = String(body?.email ?? '')
    .trim()
    .toLowerCase()
  const username = String(body?.username ?? '').trim()
  const password = String(body?.password ?? '')
  const displayName = body?.displayName ? String(body.displayName).trim() : null

  if (!isValidEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid email address.' })
  }
  if (!isValidUsername(username)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username must be 3-32 characters (letters, numbers, . _ -).',
    })
  }
  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters.' })
  }

  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(or(eq(schema.users.email, email), eq(schema.users.username, username)))
    .limit(1)
  if (existing.length) {
    throw createError({
      statusCode: 409,
      statusMessage: 'That email or username is already taken.',
    })
  }

  const passwordHash = await createPasswordHash(password)
  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      username,
      passwordHash,
      displayName: displayName || username,
      preferences: defaultPreferences(),
    })
    .returning()

  await setUserSession(event, { user: sessionUser(user) })
  return { user: sessionUser(user) }
})
