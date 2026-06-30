import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { requireOwnedDatabase } from '../../utils/owners'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') as string
  const database = await requireOwnedDatabase(event, id)
  const db = useDb()
  const rows = await db
    .select()
    .from(schema.databaseRows)
    .where(eq(schema.databaseRows.databaseId, id))
    .orderBy(asc(schema.databaseRows.position))
  return { ...database, rows }
})
