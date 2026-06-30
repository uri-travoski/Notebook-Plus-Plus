import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'

// Create a database table bound to a document. The BlockNote block stores only the
// returned id; columns/rows live relationally.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const body = await readBody<Record<string, unknown>>(event)
  const documentId = String(body?.documentId ?? '')
  if (!documentId) throw createError({ statusCode: 400, statusMessage: 'documentId is required.' })

  const db = useDb()
  const [docRow] = await db
    .select({ id: schema.documents.id })
    .from(schema.documents)
    .where(and(eq(schema.documents.id, documentId), eq(schema.documents.userId, userId)))
    .limit(1)
  if (!docRow) throw createError({ statusCode: 404, statusMessage: 'Document not found.' })

  const columns = Array.isArray(body?.columns)
    ? body.columns
    : [{ id: randomUUID(), name: 'Name', type: 'text' }]

  const [database] = await db
    .insert(schema.databases)
    .values({
      documentId,
      name: body?.name ? String(body.name) : 'Untitled table',
      columns,
    })
    .returning()

  return { ...database, rows: [] }
})
