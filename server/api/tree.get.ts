import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { useDb, schema } from '../db'
import { getUserId } from '../utils/guard'

// Projects -> Notebooks -> Notes (flat note list per notebook; client nests by
// parentDocumentId). Excludes archived/trashed/template/draft items (those live
// in the SYSTEM sections).
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const db = useDb()

  const projects = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.userId, userId), isNull(schema.projects.archivedAt)))
    .orderBy(asc(schema.projects.position))

  const projectIds = projects.map((p) => p.id)
  const notebooks = projectIds.length
    ? await db
        .select()
        .from(schema.notebooks)
        .where(
          and(inArray(schema.notebooks.projectId, projectIds), isNull(schema.notebooks.archivedAt)),
        )
        .orderBy(asc(schema.notebooks.position))
    : []

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
    .orderBy(asc(schema.documents.position))

  const notesByNotebook = new Map<string, typeof notes>()
  for (const n of notes) {
    if (!n.notebookId) continue
    const list = notesByNotebook.get(n.notebookId)
    if (list) list.push(n)
    else notesByNotebook.set(n.notebookId, [n])
  }

  const notebooksByProject = new Map<string, typeof notebooks>()
  for (const nb of notebooks) {
    const list = notebooksByProject.get(nb.projectId)
    if (list) list.push(nb)
    else notebooksByProject.set(nb.projectId, [nb])
  }

  return {
    projects: projects.map((p) => ({
      ...p,
      notebooks: (notebooksByProject.get(p.id) ?? []).map((nb) => ({
        ...nb,
        notes: notesByNotebook.get(nb.id) ?? [],
      })),
    })),
  }
})
