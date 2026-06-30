import { sql } from 'drizzle-orm'
import { useDb } from '../db'
import { getUserId } from '../utils/guard'

// Full-text search over title + body (search_vector GIN) plus a fuzzy title match.
// Returns rows with their Notebook/Project context so the palette can group them.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const q = String(getQuery(event).q ?? '').trim()
  if (!q) return { results: [] }

  const db = useDb()
  const like = `%${q.replace(/[%_\\]/g, (m) => '\\' + m)}%`
  const result = await db.execute(sql`
    select d.id,
           d.title,
           d.type,
           d.icon,
           d.notebook_id as "notebookId",
           n.name as "notebookName",
           p.name as "projectName",
           left(d.search_text, 160) as snippet,
           ts_rank(d.search_vector, websearch_to_tsquery('english', ${q})) as rank
    from documents d
    left join notebooks n on n.id = d.notebook_id
    left join projects p on p.id = n.project_id
    where d.user_id = ${userId}
      and d.deleted_at is null
      and (
        d.search_vector @@ websearch_to_tsquery('english', ${q})
        or d.title ilike ${like}
      )
    order by rank desc, d.updated_at desc
    limit 30
  `)
  // node-postgres driver returns a QueryResult with `.rows`.
  const rows = (result as unknown as { rows?: unknown[] }).rows ?? (result as unknown[])
  return { results: rows }
})
