import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../db'
import { getUserId } from '../../../../utils/guard'
import { decryptSecret } from '../../../../utils/crypto'
import { validateKey, type Provider } from '../../../../utils/ai'

// Re-validate a stored key with a cheap call; record the result.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const id = getRouterParam(event, 'id') as string
  const db = useDb()
  const [key] = await db
    .select()
    .from(schema.aiKeys)
    .where(and(eq(schema.aiKeys.id, id), eq(schema.aiKeys.userId, userId)))
    .limit(1)
  if (!key) throw createError({ statusCode: 404, statusMessage: 'Key not found.' })

  const plain = decryptSecret(key.encryptedKey, key.iv, key.authTag)
  const error = await validateKey(key.provider as Provider, plain, key.model, key.baseUrl)
  await db
    .update(schema.aiKeys)
    .set({
      lastOkAt: error ? key.lastOkAt : new Date(),
      lastError: error ? error.slice(0, 300) : null,
    })
    .where(eq(schema.aiKeys.id, id))
  return { ok: !error, error }
})
