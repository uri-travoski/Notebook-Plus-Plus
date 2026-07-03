import { and, desc, eq, isNull } from 'drizzle-orm'
import { useDb, schema } from '../db'
import { getUserId } from '../utils/guard'

// Notebooks -> Notes (flat note list per notebook; client nests by parentDocumentId).
// Excludes archived/trashed/template/draft items (those live in the SYSTEM sections).
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const db = useDb()

  const notebooks = await db
    .select()
    .from(schema.notebooks)
    .where(
      and(
        eq(schema.notebooks.userId, userId),
        isNull(schema.notebooks.archivedAt),
        isNull(schema.notebooks.deletedAt),
      ),
    )
    .orderBy(desc(schema.notebooks.position))

  const notes = await db
    .select({
      id: schema.documents.id,
      title: schema.documents.title,
      icon: schema.documents.icon,
      type: schema.documents.type,
      notebookId: schema.documents.notebookId,
      parentDocumentId: schema.documents.parentDocumentId,
      position: schema.documents.position,
      isStarred: schema.documents.isStarred,
      updatedAt: schema.documents.updatedAt,
    })
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.userId, userId),
        isNull(schema.documents.archivedAt),
        isNull(schema.documents.deletedAt),
        eq(schema.documents.isTemplate, false),
        eq(schema.documents.isDraft, false),
      ),
    )
    .orderBy(desc(schema.documents.position))

  const notesByNotebook = new Map<string, typeof notes>()
  for (const n of notes) {
    if (!n.notebookId) continue
    const list = notesByNotebook.get(n.notebookId)
    if (list) list.push(n)
    else notesByNotebook.set(n.notebookId, [n])
  }

  return {
    notebooks: notebooks.map((nb) => ({
      ...nb,
      notes: notesByNotebook.get(nb.id) ?? [],
    })),
  }
})
