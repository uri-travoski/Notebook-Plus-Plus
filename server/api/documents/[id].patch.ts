import { and, eq, sql } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'
import { blocksToPlainText } from '../../utils/blocks'
import { snapshotIfDue } from '../../utils/versions'

export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const id = getRouterParam(event, 'id') as string
  const body = (await readBody<Record<string, unknown>>(event)) ?? {}
  const db = useDb()

  const [existing] = await db
    .select({
      id: schema.documents.id,
      content: schema.documents.content,
      title: schema.documents.title,
      notebookId: schema.documents.notebookId,
      parentDocumentId: schema.documents.parentDocumentId,
    })
    .from(schema.documents)
    .where(and(eq(schema.documents.id, id), eq(schema.documents.userId, userId)))
    .limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Document not found.' })

  // On a content change, snapshot the PRIOR content (throttled) so it can be restored.
  if (body.content !== undefined) await snapshotIfDue(id, existing.content, existing.title)

  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (typeof body.title === 'string') patch.title = body.title.trim() || 'Untitled'
  if (typeof body.icon === 'string' || body.icon === null) patch.icon = body.icon
  if (typeof body.position === 'string') patch.position = body.position
  if (typeof body.isStarred === 'boolean') patch.isStarred = body.isStarred
  if (typeof body.isDraft === 'boolean') patch.isDraft = body.isDraft
  if (typeof body.isTemplate === 'boolean') patch.isTemplate = body.isTemplate
  if (typeof body.archived === 'boolean') patch.archivedAt = body.archived ? new Date() : null
  if (typeof body.deleted === 'boolean') patch.deletedAt = body.deleted ? new Date() : null

  // Editor autosave: content + derived searchText (page docs are BlockNote arrays).
  if (body.content !== undefined) {
    patch.content = body.content as object
    if (Array.isArray(body.content)) patch.searchText = blocksToPlainText(body.content)
  }

  // Move within the tree.
  if (body.parentDocumentId === null) {
    patch.parentDocumentId = null
  } else if (typeof body.parentDocumentId === 'string') {
    if (body.parentDocumentId === id) {
      throw createError({ statusCode: 400, statusMessage: 'Cannot nest document under itself.' })
    }
    const [parent] = await db
      .select({ id: schema.documents.id, notebookId: schema.documents.notebookId })
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.id, body.parentDocumentId),
          eq(schema.documents.userId, userId),
        ),
      )
      .limit(1)
    if (!parent) throw createError({ statusCode: 404, statusMessage: 'Parent document not found.' })

    // Prevent cycle: verify target parent is not a descendant of id
    const cycleCheck = await db.execute(sql`
      WITH RECURSIVE ancs AS (
        SELECT id, parent_document_id FROM documents WHERE id = ${body.parentDocumentId} AND user_id = ${userId}
        UNION ALL
        SELECT d.id, d.parent_document_id FROM documents d
        JOIN ancs a ON d.id = a.parent_document_id
        WHERE d.user_id = ${userId}
      )
      SELECT id FROM ancs WHERE id = ${id} LIMIT 1;
    `)
    const cycleRows =
      (cycleCheck as unknown as { rows?: unknown[] }).rows ?? (cycleCheck as unknown as unknown[])
    if (cycleRows.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot nest document under its own descendant.',
      })
    }

    patch.parentDocumentId = body.parentDocumentId
    // Nested child documents must belong to the parent's notebook
    patch.notebookId = parent.notebookId
  }

  if (body.notebookId === null) {
    patch.notebookId = null
  } else if (typeof body.notebookId === 'string' && patch.notebookId === undefined) {
    const [nb] = await db
      .select({ id: schema.notebooks.id })
      .from(schema.notebooks)
      .where(and(eq(schema.notebooks.id, body.notebookId), eq(schema.notebooks.userId, userId)))
      .limit(1)
    if (!nb) throw createError({ statusCode: 404, statusMessage: 'Target notebook not found.' })
    patch.notebookId = body.notebookId
  }

  const [updated] = await db
    .update(schema.documents)
    .set(patch)
    .where(eq(schema.documents.id, id))
    .returning()

  // If notebookId changed, recursively cascade to all descendants
  if (patch.notebookId !== undefined && patch.notebookId !== existing.notebookId) {
    if (patch.notebookId === null) {
      await db.execute(sql`
        WITH RECURSIVE descendants AS (
          SELECT id FROM documents WHERE parent_document_id = ${id} AND user_id = ${userId}
          UNION ALL
          SELECT d.id FROM documents d
          JOIN descendants desc ON d.parent_document_id = desc.id
          WHERE d.user_id = ${userId}
        )
        UPDATE documents
        SET notebook_id = NULL, updated_at = NOW()
        WHERE id IN (SELECT id FROM descendants) AND user_id = ${userId};
      `)
    } else {
      await db.execute(sql`
        WITH RECURSIVE descendants AS (
          SELECT id FROM documents WHERE parent_document_id = ${id} AND user_id = ${userId}
          UNION ALL
          SELECT d.id FROM documents d
          JOIN descendants desc ON d.parent_document_id = desc.id
          WHERE d.user_id = ${userId}
        )
        UPDATE documents
        SET notebook_id = ${patch.notebookId}, updated_at = NOW()
        WHERE id IN (SELECT id FROM descendants) AND user_id = ${userId};
      `)
    }
  }

  return updated
})
