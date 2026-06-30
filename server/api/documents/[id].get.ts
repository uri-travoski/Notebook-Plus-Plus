import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'

export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const id = getRouterParam(event, 'id') as string
  const db = useDb()
  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.id, id), eq(schema.documents.userId, userId)))
    .limit(1)
  if (!doc) throw createError({ statusCode: 404, statusMessage: 'Document not found.' })
  return doc
})
