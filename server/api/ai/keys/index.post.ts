import { useDb, schema } from '../../../db'
import { getUserId } from '../../../utils/guard'
import { encryptSecret } from '../../../utils/crypto'
import { validateKey, type Provider } from '../../../utils/ai'

const PROVIDERS = ['anthropic', 'openai', 'google', 'openrouter', 'groq'] as const

// Add a provider key (encrypted). Validates with a cheap call but saves regardless,
// recording lastOkAt / lastError.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const body = await readBody<Record<string, unknown>>(event)
  const provider = String(body?.provider ?? '') as Provider
  if (!PROVIDERS.includes(provider))
    throw createError({ statusCode: 400, statusMessage: 'Unknown provider.' })
  const plain = String(body?.key ?? '').trim()
  if (!plain) throw createError({ statusCode: 400, statusMessage: 'Key is required.' })

  const model = body?.model ? String(body.model).trim() : null
  const label = body?.label ? String(body.label).trim() : null
  const baseUrl = body?.baseUrl ? String(body.baseUrl).trim() : null
  const priority = Number.isFinite(Number(body?.priority)) ? Number(body.priority) : 0

  const { ciphertext, iv, authTag } = encryptSecret(plain)
  const error = await validateKey(provider, plain, model, baseUrl)

  const db = useDb()
  const [row] = await db
    .insert(schema.aiKeys)
    .values({
      userId,
      provider,
      label,
      model,
      baseUrl,
      priority,
      encryptedKey: ciphertext,
      iv,
      authTag,
      lastOkAt: error ? null : new Date(),
      lastError: error ? error.slice(0, 300) : null,
    })
    .returning()

  return {
    id: row.id,
    provider: row.provider,
    label: row.label,
    model: row.model,
    priority: row.priority,
    enabled: row.enabled,
    lastOkAt: row.lastOkAt,
    lastError: row.lastError,
    valid: !error,
  }
})
