// Response shapes for `useFetch` calls that don't carry an explicit generic. Nuxt 4's useFetch
// no longer infers these routes' Drizzle-derived return types (they resolve to `{}`), so the
// pages annotate them with these. Kept in sync with the matching server routes by hand.
export {}

declare global {
  // GET /api/documents (list views: recent | starred | drafts | archived | templates)
  type DocSummary = {
    id: string
    title: string
    icon: string | null
    type: 'page' | 'canvas'
    updatedAt: string
    notebookId: string | null
    isStarred: boolean
  }

  // GET /api/documents/:id — only the fields the doc page reads.
  type DocDetail = {
    id: string
    title: string
    type: 'page' | 'canvas'
    content: unknown
    isStarred: boolean
    createdAt: string
    updatedAt: string
  }

  // GET /api/stats
  type StatsSummary = { notebooks: number; notes: number; canvases: number }
}
