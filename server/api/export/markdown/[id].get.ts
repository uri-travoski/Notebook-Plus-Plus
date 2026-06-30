import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'
import { getUserId } from '../../../utils/guard'

// Poll a bulk-export job, or download the finished zip with ?download=1.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const id = getRouterParam(event, 'id') as string
  const db = useDb()
  const [row] = await db
    .select()
    .from(schema.exportJobs)
    .where(and(eq(schema.exportJobs.id, id), eq(schema.exportJobs.userId, userId)))
    .limit(1)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Export not found.' })

  if (getQuery(event).download && row.status === 'done' && row.data) {
    setHeader(event, 'content-type', 'application/zip')
    setHeader(
      event,
      'content-disposition',
      `attachment; filename="${row.filename || 'export.zip'}"`,
    )
    return Buffer.from(row.data, 'base64')
  }
  return { id: row.id, status: row.status, filename: row.filename, error: row.error }
})
