import JSZip from 'jszip'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { useDb, schema } from '../db'
import { documentToMarkdown } from '../utils/markdown'

// Build a zip of the user's notes as Markdown, mirroring the Notebooks tree.
// Stored back into the export_jobs row (base64) for the client to download.

function slug(s: string): string {
  return (
    (s || 'untitled')
      .trim()
      .replace(/[/\\:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .slice(0, 80) || 'untitled'
  )
}

export async function runExportJob({ exportId }: { exportId: string }) {
  const db = useDb()
  const [job] = await db
    .select()
    .from(schema.exportJobs)
    .where(eq(schema.exportJobs.id, exportId))
    .limit(1)
  if (!job) return

  try {
    const userId = job.userId
    const zip = new JSZip()
    const used = new Set<string>()

    const addDoc = async (
      folder: string,
      doc: { title: string; type: string; content: unknown },
    ) => {
      let path = `${folder}/${slug(doc.title)}.md`
      let n = 2
      while (used.has(path.toLowerCase())) path = `${folder}/${slug(doc.title)} (${n++}).md`
      used.add(path.toLowerCase())
      zip.file(path, await documentToMarkdown(doc))
    }

    const notebooks = await db
      .select()
      .from(schema.notebooks)
      .where(and(eq(schema.notebooks.userId, userId), isNull(schema.notebooks.archivedAt)))
      .orderBy(asc(schema.notebooks.position))

    for (const nb of notebooks) {
      const docs = await db
        .select()
        .from(schema.documents)
        .where(
          and(
            eq(schema.documents.notebookId, nb.id),
            isNull(schema.documents.deletedAt),
            isNull(schema.documents.archivedAt),
          ),
        )
        .orderBy(asc(schema.documents.position))
      const folder = slug(nb.name)
      for (const doc of docs) await addDoc(folder, doc)
    }

    // Documents not filed under a notebook (drafts/templates) go in a flat folder.
    const unfiled = await db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.userId, userId),
          isNull(schema.documents.notebookId),
          isNull(schema.documents.deletedAt),
          isNull(schema.documents.archivedAt),
        ),
      )
      .orderBy(asc(schema.documents.position))
    for (const doc of unfiled) await addDoc('_Unfiled', doc)

    const buf = await zip.generateAsync({ type: 'nodebuffer' })
    await db
      .update(schema.exportJobs)
      .set({ status: 'done', filename: 'notebookpp-export.zip', data: buf.toString('base64') })
      .where(eq(schema.exportJobs.id, exportId))
  } catch (e) {
    await db
      .update(schema.exportJobs)
      .set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
      .where(eq(schema.exportJobs.id, exportId))
  }
}
