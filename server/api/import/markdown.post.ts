import { and, desc, eq, isNull } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'
import { keyAfter } from '../../utils/order'
import { markdownToBlocks } from '../../utils/markdown'
import { blocksToPlainText } from '../../utils/blocks'

type FileIn = { name?: string; markdown?: string }

// Import one or more Markdown files as page documents. A leading H1 becomes the title.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const body = await readBody<Record<string, unknown>>(event)
  const notebookId = body?.notebookId ? String(body.notebookId) : null
  const files: FileIn[] = Array.isArray(body?.files)
    ? (body.files as FileIn[])
    : body?.markdown != null
      ? [{ name: body?.name ? String(body.name) : undefined, markdown: String(body.markdown) }]
      : []
  if (!files.length) throw createError({ statusCode: 400, statusMessage: 'No markdown provided.' })

  const db = useDb()
  if (notebookId) {
    const [nb] = await db
      .select({ id: schema.notebooks.id })
      .from(schema.notebooks)
      .innerJoin(schema.projects, eq(schema.notebooks.projectId, schema.projects.id))
      .where(and(eq(schema.notebooks.id, notebookId), eq(schema.projects.userId, userId)))
      .limit(1)
    if (!nb) throw createError({ statusCode: 404, statusMessage: 'Notebook not found.' })
  }

  const created: { id: string; title: string }[] = []
  for (const f of files) {
    const blocks = await markdownToBlocks(String(f.markdown ?? ''))
    let title = String(f.name ?? '')
      .replace(/\.md$/i, '')
      .trim()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const first = blocks[0] as any
    if (first && first.type === 'heading' && first.props?.level === 1) {
      const t = blocksToPlainText([first])
      if (t) {
        title = t
        blocks.shift()
      }
    }
    if (!title) title = 'Untitled'

    const [last] = await db
      .select({ position: schema.documents.position })
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.userId, userId),
          notebookId
            ? eq(schema.documents.notebookId, notebookId)
            : isNull(schema.documents.notebookId),
          isNull(schema.documents.parentDocumentId),
        ),
      )
      .orderBy(desc(schema.documents.position))
      .limit(1)

    const [doc] = await db
      .insert(schema.documents)
      .values({
        userId,
        notebookId,
        type: 'page',
        title,
        content: blocks,
        searchText: (title + ' ' + blocksToPlainText(blocks)).trim(),
        position: keyAfter(last?.position ?? null),
        isDraft: !notebookId,
      })
      .returning({ id: schema.documents.id, title: schema.documents.title })
    created.push(doc)
  }
  return { created }
})
