import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../../db'
import { requireOwnedDocument } from '../../../../../utils/owners'
import { blocksToPlainText } from '../../../../../utils/blocks'
import { snapshotIfDue } from '../../../../../utils/versions'

// Restore a document to a prior version. The current content is snapshotted first, so a restore
// is itself undoable.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') as string
  const vid = getRouterParam(event, 'vid') as string
  const doc = await requireOwnedDocument(event, id)

  const db = useDb()
  const [version] = await db
    .select()
    .from(schema.documentVersions)
    .where(and(eq(schema.documentVersions.id, vid), eq(schema.documentVersions.documentId, id)))
    .limit(1)
  if (!version) throw createError({ statusCode: 404, statusMessage: 'Version not found.' })

  await snapshotIfDue(id, doc.content, doc.title, true)

  const content = version.content
  const searchText = Array.isArray(content)
    ? (version.title ? version.title + ' ' : '') + blocksToPlainText(content)
    : doc.searchText
  const [updated] = await db
    .update(schema.documents)
    .set({
      content: content as object,
      title: version.title ?? doc.title,
      searchText,
      updatedAt: new Date(),
    })
    .where(eq(schema.documents.id, id))
    .returning()
  return updated
})
