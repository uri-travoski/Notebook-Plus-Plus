import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../db'
import { requireOwnedDocument } from '../../../../utils/owners'

// Fetch a single version's full content (for preview / restore).
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') as string
  const vid = getRouterParam(event, 'vid') as string
  await requireOwnedDocument(event, id)
  const [version] = await useDb()
    .select()
    .from(schema.documentVersions)
    .where(and(eq(schema.documentVersions.id, vid), eq(schema.documentVersions.documentId, id)))
    .limit(1)
  if (!version) throw createError({ statusCode: 404, statusMessage: 'Version not found.' })
  return version
})
