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

  // Manual drag ordering on top of the default newest-first order. Items sort by `position`
  // (desc); reordering assigns a fractional key so the manual order sticks, and reparenting
  // drops the item at the top of its new container.
  const byPosDesc = (a: { position: string }, b: { position: string }) =>
    a.position < b.position ? 1 : a.position > b.position ? -1 : 0
  // A position that places the dragged item just above `targetId` within `siblings` (desc list).
  function posAbove(siblings: { id: string; position: string }[], targetId: string) {
    const sorted = [...siblings].sort(byPosDesc)
    const idx = sorted.findIndex((s) => s.id === targetId)
    if (idx < 0) return null
    const above = idx > 0 ? sorted[idx - 1] : null // displayed above => larger position
    try {
      return generateKeyBetween(sorted[idx].position, above ? above.position : null)
    } catch {
      return null
    }
  }
  // A position at the top of the container (larger than every sibling).
  function posTop(siblings: { position: string }[]) {
    const max = [...siblings].sort(byPosDesc)[0]?.position ?? null
    try {
      return generateKeyBetween(max, null)
    } catch {
      return null
    }
  }

  const reorderNote = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return
    const all = (tree.value?.projects ?? []).flatMap((p) => p.notebooks.flatMap((nb) => nb.notes))
    const target = all.find((n) => n.id === targetId)
    if (!target) return
    const siblings = all.filter(
      (n) =>
        n.id !== draggedId &&
        n.notebookId === target.notebookId &&
        (n.parentDocumentId ?? null) === (target.parentDocumentId ?? null),
    )
    const position = posAbove(siblings, targetId)
    if (!position) return
    await $fetch(`/api/documents/${draggedId}`, {
      method: 'PATCH',
      body: {
        notebookId: target.notebookId,
        parentDocumentId: target.parentDocumentId ?? null,
        position,
      },
    })
    await refresh()
  }
  const moveNoteToNotebook = async (noteId: string, notebookId: string) => {
    const nb = (tree.value?.projects ?? [])
      .flatMap((p) => p.notebooks)
      .find((n) => n.id === notebookId)
    const top = (nb?.notes ?? []).filter((n) => !n.parentDocumentId && n.id !== noteId)
    await $fetch(`/api/documents/${noteId}`, {
      method: 'PATCH',
      body: { notebookId, parentDocumentId: null, position: posTop(top) },
    })
    await refresh()
  }
  const reorderNotebook = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return
    const proj = (tree.value?.projects ?? []).find((p) =>
      p.notebooks.some((nb) => nb.id === targetId),
    )
    if (!proj) return
    const position = posAbove(
      proj.notebooks.filter((nb) => nb.id !== draggedId),
      targetId,
    )
    if (!position) return
    await $fetch(`/api/notebooks/${draggedId}`, {
      method: 'PATCH',
      body: { projectId: proj.id, position },
    })
    await refresh()
  }
  const moveNotebookToProject = async (notebookId: string, projectId: string) => {
    const proj = (tree.value?.projects ?? []).find((p) => p.id === projectId)
    const siblings = (proj?.notebooks ?? []).filter((nb) => nb.id !== notebookId)
    await $fetch(`/api/notebooks/${notebookId}`, {
      method: 'PATCH',
      body: { projectId, position: posTop(siblings) },
    })
    await refresh()
  }
  const reorderProject = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return
    const position = posAbove(
      (tree.value?.projects ?? []).filter((p) => p.id !== draggedId),
      targetId,
    )
    if (!position) return
    await $fetch(`/api/projects/${draggedId}`, { method: 'PATCH', body: { position } })
    await refresh()
  }

  return {
    reorderNote,
    moveNoteToNotebook,
    reorderNotebook,
    moveNotebookToProject,
    reorderProject,
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
