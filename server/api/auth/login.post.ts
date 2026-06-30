import { eq, or } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { verifyPasswordHash } from '../../utils/password'
import { sessionUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const raw = String(body?.username ?? body?.email ?? '').trim()
  const password = String(body?.password ?? '')
  if (!raw || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Enter your username and password.' })
  }

  const db = useDb()
  const [user] = await db
    .select()
    .from(schema.users)
    .where(or(eq(schema.users.email, raw.toLowerCase()), eq(schema.users.username, raw)))
    .limit(1)

  const ok = user ? await verifyPasswordHash(user.passwordHash, password) : false
  if (!user || !ok) {
    throw createError({ statusCode: 401, statusMessage: 'Incorrect username or password.' })
  }

  await setUserSession(event, { user: sessionUser(user) })
  return { user: sessionUser(user) }
})
