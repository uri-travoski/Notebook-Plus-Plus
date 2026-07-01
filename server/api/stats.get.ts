import { and, count, eq, isNull } from 'drizzle-orm'
import { useDb, schema } from '../db'
import { getUserId } from '../utils/guard'

// Overview dashboard counts: active (non-archived / non-trashed) projects, notebooks, notes.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const db = useDb()

  const [projects] = await db
    .select({ n: count() })
    .from(schema.projects)
    .where(and(eq(schema.projects.userId, userId), isNull(schema.projects.archivedAt)))

  const [notebooks] = await db
    .select({ n: count() })
    .from(schema.notebooks)
    .innerJoin(schema.projects, eq(schema.notebooks.projectId, schema.projects.id))
    .where(
      and(
        eq(schema.projects.userId, userId),
        isNull(schema.projects.archivedAt),
        isNull(schema.notebooks.archivedAt),
      ),
    )

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

  return { projects: projects?.n ?? 0, notebooks: notebooks?.n ?? 0, notes: notes?.n ?? 0 }
})
