import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'
import { getUserId } from '../../../utils/guard'
import { encryptSecret } from '../../../utils/crypto'
import { validateKey, type Provider } from '../../../utils/ai'

// Update a key's label, model, priority, enabled flag, base URL, and/or the secret itself.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const id = getRouterParam(event, 'id') as string
  const body = (await readBody<Record<string, unknown>>(event)) ?? {}

  const db = useDb()
  const [existing] = await db
    .select()
    .from(schema.aiKeys)
    .where(and(eq(schema.aiKeys.id, id), eq(schema.aiKeys.userId, userId)))
    .limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Key not found.' })

  const patch: Record<string, unknown> = {}
  if ('label' in body) patch.label = body.label ? String(body.label).trim() : null
  if ('model' in body) patch.model = body.model ? String(body.model).trim() : null
  if ('baseUrl' in body) patch.baseUrl = body.baseUrl ? String(body.baseUrl).trim() : null
  if ('priority' in body && Number.isFinite(Number(body.priority)))
    patch.priority = Number(body.priority)
  if ('enabled' in body) patch.enabled = Boolean(body.enabled)

  // Replacing the secret: re-encrypt and re-validate.
  const newKey = typeof body.key === 'string' ? body.key.trim() : ''
  let valid: boolean | undefined
  if (newKey) {
    const { ciphertext, iv, authTag } = encryptSecret(newKey)
    patch.encryptedKey = ciphertext
    patch.iv = iv
    patch.authTag = authTag
    const model = (patch.model ?? existing.model) as string | null
    const baseUrl = (patch.baseUrl ?? existing.baseUrl) as string | null
    const error = await validateKey(existing.provider as Provider, newKey, model, baseUrl)
    patch.lastOkAt = error ? null : new Date()
    patch.lastError = error ? error.slice(0, 300) : null
    valid = !error
  }

  if (!Object.keys(patch).length)
    throw createError({ statusCode: 400, statusMessage: 'Nothing to update.' })

  await db
    .update(schema.aiKeys)
    .set(patch)
    .where(and(eq(schema.aiKeys.id, id), eq(schema.aiKeys.userId, userId)))
  return { ok: true, valid }
})
