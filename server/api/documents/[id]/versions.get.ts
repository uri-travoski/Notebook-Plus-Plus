import { desc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../db'
import { requireOwnedDocument } from '../../../utils/owners'

// List a document's version snapshots (metadata only), newest first.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') as string
  await requireOwnedDocument(event, id)
  return useDb()
    .select({
      id: schema.documentVersions.id,
      title: schema.documentVersions.title,
      createdAt: schema.documentVersions.createdAt,
    })
    .from(schema.documentVersions)
    .where(eq(schema.documentVersions.documentId, id))
    .orderBy(desc(schema.documentVersions.createdAt))
})
