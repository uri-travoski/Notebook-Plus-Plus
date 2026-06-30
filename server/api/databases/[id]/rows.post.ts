import { desc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'
import { requireOwnedDatabase } from '../../../utils/owners'
import { keyAfter } from '../../../utils/order'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') as string
  await requireOwnedDatabase(event, id)
  const body = await readBody<Record<string, unknown>>(event)

  const db = useDb()
  const [last] = await db
    .select({ position: schema.databaseRows.position })
    .from(schema.databaseRows)
    .where(eq(schema.databaseRows.databaseId, id))
    .orderBy(desc(schema.databaseRows.position))
    .limit(1)

  const [row] = await db
    .insert(schema.databaseRows)
    .values({
      databaseId: id,
      values: (body?.values as object) ?? {},
      position: keyAfter(last?.position ?? null),
    })
    .returning()
  return row
})
