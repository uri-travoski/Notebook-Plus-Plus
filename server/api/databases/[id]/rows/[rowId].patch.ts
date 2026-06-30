import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../db'
import { requireOwnedDatabase } from '../../../../utils/owners'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') as string
  const rowId = getRouterParam(event, 'rowId') as string
  await requireOwnedDatabase(event, id)
  const body = await readBody<Record<string, unknown>>(event)

  const patch: Record<string, unknown> = {}
  if (body.values && typeof body.values === 'object') patch.values = body.values
  if (typeof body.position === 'string') patch.position = body.position
  if (!Object.keys(patch).length) return { ok: true }

  const db = useDb()
  const [updated] = await db
    .update(schema.databaseRows)
    .set(patch)
    .where(and(eq(schema.databaseRows.id, rowId), eq(schema.databaseRows.databaseId, id)))
    .returning()
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Row not found.' })
  return updated
})
