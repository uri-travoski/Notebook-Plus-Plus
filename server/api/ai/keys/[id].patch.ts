import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'
import { getUserId } from '../../../utils/guard'

// Update a key's label, model, priority, or enabled flag (not the secret itself).
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const id = getRouterParam(event, 'id') as string
  const body = await readBody<Record<string, unknown>>(event)

  const patch: Record<string, unknown> = {}
  if ('label' in body) patch.label = body.label ? String(body.label).trim() : null
  if ('model' in body) patch.model = body.model ? String(body.model).trim() : null
  if ('baseUrl' in body) patch.baseUrl = body.baseUrl ? String(body.baseUrl).trim() : null
  if ('priority' in body && Number.isFinite(Number(body.priority)))
    patch.priority = Number(body.priority)
  if ('enabled' in body) patch.enabled = Boolean(body.enabled)
  if (!Object.keys(patch).length)
    throw createError({ statusCode: 400, statusMessage: 'Nothing to update.' })

  const db = useDb()
  const [row] = await db
    .update(schema.aiKeys)
    .set(patch)
    .where(and(eq(schema.aiKeys.id, id), eq(schema.aiKeys.userId, userId)))
    .returning({ id: schema.aiKeys.id })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Key not found.' })
  return { ok: true }
})
