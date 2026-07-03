import { randomBytes, createHash } from 'node:crypto'
import { useDb, schema } from '../../../db'
import { getUserId } from '../../../utils/guard'

// Create an API token. The plaintext is returned ONCE here and never stored (only its hash).
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const body = await readBody<{ name?: string }>(event)
  const name = String(body?.name ?? '').trim() || 'API token'

  const token = 'nbp_' + randomBytes(24).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const prefix = token.slice(0, 12)

  const db = useDb()
  const [row] = await db
    .insert(schema.apiTokens)
    .values({ userId, name, tokenHash, prefix })
    .returning({
      id: schema.apiTokens.id,
      name: schema.apiTokens.name,
      prefix: schema.apiTokens.prefix,
      createdAt: schema.apiTokens.createdAt,
    })
  return { ...row, token }
})
