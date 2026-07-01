import { and, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb, schema } from '../db'
import { getUserId } from './guard'

/** Returns the document if it belongs to the session user, else 404. */
export async function requireOwnedDocument(event: H3Event, documentId: string) {
  const userId = await getUserId(event)
  const db = useDb()
  const [row] = await db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.id, documentId), eq(schema.documents.userId, userId)))
    .limit(1)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Document not found.' })
  return row
}

/** Returns the database if its document belongs to the session user, else 404. */
export async function requireOwnedDatabase(event: H3Event, databaseId: string) {
  const userId = await getUserId(event)
  const db = useDb()
  const [row] = await db
    .select({ database: schema.databases })
    .from(schema.databases)
    .innerJoin(schema.documents, eq(schema.databases.documentId, schema.documents.id))
    .where(and(eq(schema.databases.id, databaseId), eq(schema.documents.userId, userId)))
    .limit(1)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Table not found.' })
  return row.database
}
