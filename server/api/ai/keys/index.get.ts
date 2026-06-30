import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'
import { getUserId } from '../../../utils/guard'
import { decryptSecret, maskSecret } from '../../../utils/crypto'

// List the user's AI keys with a masked preview (never the plaintext).
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const rows = await useDb()
    .select()
    .from(schema.aiKeys)
    .where(eq(schema.aiKeys.userId, userId))
    .orderBy(asc(schema.aiKeys.priority))

  return rows.map((r) => {
    let preview: string
    try {
      preview = maskSecret(decryptSecret(r.encryptedKey, r.iv, r.authTag))
    } catch {
      preview = '••••'
    }
    return {
      id: r.id,
      provider: r.provider,
      label: r.label,
      model: r.model,
      baseUrl: r.baseUrl,
      priority: r.priority,
      enabled: r.enabled,
      lastOkAt: r.lastOkAt,
      lastError: r.lastError,
      preview,
    }
  })
})
