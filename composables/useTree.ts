import { generateKeyBetween } from 'fractional-indexing'

export type TreeNote = {
  id: string
  title: string
  icon: string | null
  type: 'page' | 'canvas'
  notebookId: string | null
  parentDocumentId: string | null
  position: string
  isStarred: boolean
  updatedAt: string
}
export type TreeNotebook = {
  id: string
  name: string
  icon: string | null
  position: string
  notes: TreeNote[]
}
export type TreeProject = {
  id: string
  name: string
  icon: string | null
  color: string | null
  position: string
  notebooks: TreeNotebook[]
}
type Tree = { projects: TreeProject[] }

export function useTree() {
  const tree = useState<Tree | null>('tree', () => null)
  const loaded = useState('tree-loaded', () => false)

  async function refresh() {
    tree.value = await $fetch<Tree>('/api/tree')
    loaded.value = true
  }
  async function ensure() {
    if (!loaded.value) await refresh()
  }

  const createProject = async (name = 'New project') => {
    const p = await $fetch('/api/projects', { method: 'POST', body: { name } })
    await refresh()
    return p
  }
  const updateProject = async (id: string, body: Record<string, unknown>) => {
    await $fetch(`/api/projects/${id}`, { method: 'PATCH', body })
    await refresh()
  }
  const deleteProject = async (id: string) => {
    await $fetch(`/api/projects/${id}`, { method: 'DELETE' })
    await refresh()
  }

  const createNotebook = async (projectId: string, name = 'New notebook') => {
    const n = await $fetch('/api/notebooks', { method: 'POST', body: { projectId, name } })
    await refresh()
    return n
  }
  const updateNotebook = async (id: string, body: Record<string, unknown>) => {
    await $fetch(`/api/notebooks/${id}`, { method: 'PATCH', body })
    await refresh()
  }
  const deleteNotebook = async (id: string) => {
    await $fetch(`/api/notebooks/${id}`, { method: 'DELETE' })
    await refresh()
  }

  const createNote = async (
    notebookId: string,
    type: 'page' | 'canvas' = 'page',
    title = 'Untitled',
  ) => {
    const d = await $fetch<TreeNote>('/api/documents', {
      method: 'POST',
      body: { notebookId, type, title },
    })
    await refresh()
    return d
  }
  const updateNote = async (id: string, body: Record<string, unknown>) => {
    await $fetch(`/api/documents/${id}`, { method: 'PATCH', body })
    await refresh()
  }
  // Optimistic, no-refetch title update so the sidebar name tracks the note title live
  // as it's typed on the document page.
  const setNoteTitle = (id: string, title: string) => {
    const t = tree.value
    if (!t) return
    for (const p of t.projects)
      for (const nb of p.notebooks)
        for (const n of nb.notes)
          if (n.id === id) {
            n.title = title
            return
          }
  }

  // Drag-reorder: place `draggedId` immediately before `targetId`, adopting the target's
  // notebook/parent (so a drag can both reorder within a list and move between notebooks).
  const reorderNote = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return
    const all = (tree.value?.projects ?? []).flatMap((p) => p.notebooks.flatMap((nb) => nb.notes))
    const dragged = all.find((n) => n.id === draggedId)
    const target = all.find((n) => n.id === targetId)
    if (!dragged || !target) return
    const siblings = all
      .filter(
        (n) =>
          n.id !== draggedId &&
          n.notebookId === target.notebookId &&
          (n.parentDocumentId ?? null) === (target.parentDocumentId ?? null),
      )
      .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0))
    const idx = siblings.findIndex((n) => n.id === targetId)
    const before = idx > 0 ? siblings[idx - 1] : null
    let position: string
    try {
      position = generateKeyBetween(before ? before.position : null, target.position)
    } catch {
      return
    }
    await updateNote(draggedId, {
      notebookId: target.notebookId,
      parentDocumentId: target.parentDocumentId ?? null,
      position,
    })
  }

  return {
    reorderNote,
    tree,
    loaded,
    refresh,
    ensure,
    createProject,
    updateProject,
    deleteProject,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    createNote,
    updateNote,
    setNoteTitle,
  }
}
