import { desc, eq, inArray } from 'drizzle-orm'
import { useDb, schema } from '../db'

// Keep periodic snapshots of a document's prior content so edits can be rolled back.
const THROTTLE_MS = 3 * 60 * 1000 // at most one snapshot per 3 min of active editing
const KEEP = 30 // retain the newest N snapshots per document

function isEmpty(content: unknown): boolean {
  return Array.isArray(content) && content.length === 0
}

// Snapshot the given (pre-update) content/title. Throttled unless `force` (used on restore so
// the pre-restore state is always recoverable).
export async function snapshotIfDue(
  documentId: string,
  content: unknown,
  title: string | null,
  force = false,
) {
  if (content == null || isEmpty(content)) return
  const db = useDb()
  if (!force) {
    const [latest] = await db
      .select({ createdAt: schema.documentVersions.createdAt })
      .from(schema.documentVersions)
      .where(eq(schema.documentVersions.documentId, documentId))
      .orderBy(desc(schema.documentVersions.createdAt))
      .limit(1)
    if (latest && Date.now() - new Date(latest.createdAt).getTime() < THROTTLE_MS) return
  }

  await db.insert(schema.documentVersions).values({ documentId, content: content as object, title })

  const rows = await db
    .select({ id: schema.documentVersions.id })
    .from(schema.documentVersions)
    .where(eq(schema.documentVersions.documentId, documentId))
    .orderBy(desc(schema.documentVersions.createdAt))
  const prune = rows.slice(KEEP).map((r) => r.id)
  if (prune.length)
    await db.delete(schema.documentVersions).where(inArray(schema.documentVersions.id, prune))
}
