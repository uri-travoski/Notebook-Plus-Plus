import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { requireOwnedDatabase } from '../../utils/owners'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') as string
  await requireOwnedDatabase(event, id)
  const body = (await readBody<Record<string, unknown>>(event)) ?? {}

  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (typeof body.name === 'string') patch.name = body.name.trim() || 'Untitled table'
  if (Array.isArray(body.columns)) patch.columns = body.columns

  const db = useDb()
  const [updated] = await db
    .update(schema.databases)
    .set(patch)
    .where(eq(schema.databases.id, id))
    .returning()
  return updated
})
