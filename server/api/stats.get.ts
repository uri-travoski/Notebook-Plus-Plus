import { and, count, eq, isNull } from 'drizzle-orm'
import { useDb, schema } from '../db'
import { getUserId } from '../utils/guard'

// Overview dashboard counts: active (non-archived / non-trashed) notebooks, notes.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const db = useDb()

  const [notebooks] = await db
    .select({ n: count() })
    .from(schema.notebooks)
    .where(and(eq(schema.notebooks.userId, userId), isNull(schema.notebooks.archivedAt)))

  const [notes] = await db
    .select({ n: count() })
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.userId, userId),
        isNull(schema.documents.archivedAt),
        isNull(schema.documents.deletedAt),
      ),
    )

  return { notebooks: notebooks?.n ?? 0, notes: notes?.n ?? 0 }
})
