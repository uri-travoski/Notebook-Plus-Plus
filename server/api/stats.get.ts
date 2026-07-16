import { and, count, eq, isNull } from 'drizzle-orm'
import { useDb, schema } from '../db'
import { getUserId } from '../utils/guard'

// Overview dashboard counts: active (non-archived / non-trashed) notebooks, notes (page docs)
// and canvases (canvas docs).
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const db = useDb()

  const [notebooks] = await db
    .select({ n: count() })
    .from(schema.notebooks)
    .where(and(eq(schema.notebooks.userId, userId), isNull(schema.notebooks.archivedAt)))

  const activeDocs = and(
    eq(schema.documents.userId, userId),
    isNull(schema.documents.archivedAt),
    isNull(schema.documents.deletedAt),
  )
  const [notes] = await db
    .select({ n: count() })
    .from(schema.documents)
    .where(and(activeDocs, eq(schema.documents.type, 'page')))
  const [canvases] = await db
    .select({ n: count() })
    .from(schema.documents)
    .where(and(activeDocs, eq(schema.documents.type, 'canvas')))

  return { notebooks: notebooks?.n ?? 0, notes: notes?.n ?? 0, canvases: canvases?.n ?? 0 }
})
