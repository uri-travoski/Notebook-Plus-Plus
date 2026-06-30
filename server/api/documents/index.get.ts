import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'

// One endpoint for every saved view: ?view=recent|starred|drafts|templates|archived|trashed
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const view = String(getQuery(event).view ?? 'recent')
  const db = useDb()
  const d = schema.documents
  const base = eq(d.userId, userId)

  let where
  switch (view) {
    case 'starred':
      where = and(base, eq(d.isStarred, true), isNull(d.archivedAt), isNull(d.deletedAt))
      break
    case 'drafts':
      where = and(base, eq(d.isDraft, true), isNull(d.archivedAt), isNull(d.deletedAt))
      break
    case 'templates':
      where = and(base, eq(d.isTemplate, true), isNull(d.archivedAt), isNull(d.deletedAt))
      break
    case 'archived':
      where = and(base, isNotNull(d.archivedAt), isNull(d.deletedAt))
      break
    case 'trashed':
      where = and(base, isNotNull(d.deletedAt))
      break
    default:
      where = and(base, isNull(d.archivedAt), isNull(d.deletedAt))
  }

  return db
    .select({
      id: d.id,
      title: d.title,
      icon: d.icon,
      type: d.type,
      updatedAt: d.updatedAt,
      notebookId: d.notebookId,
      isStarred: d.isStarred,
    })
    .from(d)
    .where(where)
    .orderBy(desc(d.updatedAt))
    .limit(view === 'recent' ? 20 : 200)
})
