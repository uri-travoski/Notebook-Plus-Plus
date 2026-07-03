import { and, desc, eq, isNotNull, isNull, or } from 'drizzle-orm'
import { useDb, schema } from '../db'
import { getUserId } from '../utils/guard'

// Trash: top-level soft-deleted items only (cascaded children are restored with their parent,
// so a deleted notebook shows once — not its notes).
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const db = useDb()

  const notebooks = await db
    .select({
      id: schema.notebooks.id,
      name: schema.notebooks.name,
      icon: schema.notebooks.icon,
      updatedAt: schema.notebooks.updatedAt,
    })
    .from(schema.notebooks)
    .where(and(eq(schema.notebooks.userId, userId), isNotNull(schema.notebooks.deletedAt)))
    .orderBy(desc(schema.notebooks.deletedAt))

  // deleted documents whose notebook is NOT deleted (or which have no notebook / are drafts)
  const documents = await db
    .select({
      id: schema.documents.id,
      title: schema.documents.title,
      icon: schema.documents.icon,
      type: schema.documents.type,
      updatedAt: schema.documents.updatedAt,
      notebookId: schema.documents.notebookId,
      isStarred: schema.documents.isStarred,
    })
    .from(schema.documents)
    .leftJoin(schema.notebooks, eq(schema.documents.notebookId, schema.notebooks.id))
    .where(
      and(
        eq(schema.documents.userId, userId),
        isNotNull(schema.documents.deletedAt),
        or(isNull(schema.documents.notebookId), isNull(schema.notebooks.deletedAt)),
      ),
    )
    .orderBy(desc(schema.documents.deletedAt))

  return { notebooks, documents }
})
