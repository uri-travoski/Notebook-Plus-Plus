import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../db'
import { requireOwnedDatabase } from '../../../../utils/owners'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') as string
  const rowId = getRouterParam(event, 'rowId') as string
  await requireOwnedDatabase(event, id)

  const db = useDb()
  await db
    .delete(schema.databaseRows)
    .where(and(eq(schema.databaseRows.id, rowId), eq(schema.databaseRows.databaseId, id)))
  return { ok: true }
})
