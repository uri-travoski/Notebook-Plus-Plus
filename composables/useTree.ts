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
type Tree = { notebooks: TreeNotebook[] }

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

  const createNotebook = async (name = 'New notebook') => {
    const n = await $fetch<TreeNotebook>('/api/notebooks', { method: 'POST', body: { name } })
    await refresh()
    return n
  }
  const updateNotebook = async (id: string, body: Record<string, unknown>) => {
    await $fetch(`/api/notebooks/${id}`, { method: 'PATCH', body })
    await refresh()
  }
  const deleteNotebook = async (id: string) => {
    await $fetch(`/api/notebooks/${id}`, { method: 'PATCH', body: { deleted: true } })
    await refresh()
  }

  const createNote = async (
    notebookId: string,
    type: 'page' | 'canvas' = 'page',
    title = 'Untitled',
    parentDocumentId: string | null = null,
  ) => {
    const d = await $fetch<TreeNote>('/api/documents', {
      method: 'POST',
      body: { notebookId, type, title, parentDocumentId },
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
    for (const nb of t.notebooks)
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
    const all = (tree.value?.notebooks ?? []).flatMap((nb) => nb.notes)
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
    const nb = (tree.value?.notebooks ?? []).find((n) => n.id === notebookId)
    const top = (nb?.notes ?? []).filter((n) => !n.parentDocumentId && n.id !== noteId)
    await $fetch(`/api/documents/${noteId}`, {
      method: 'PATCH',
      body: { notebookId, parentDocumentId: null, position: posTop(top) },
    })
    await refresh()
  }
  const reorderNotebook = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return
    const position = posAbove(
      (tree.value?.notebooks ?? []).filter((nb) => nb.id !== draggedId),
      targetId,
    )
    if (!position) return
    await $fetch(`/api/notebooks/${draggedId}`, {
      method: 'PATCH',
      body: { position },
    })
    await refresh()
  }

  return {
    reorderNote,
    moveNoteToNotebook,
    reorderNotebook,
    tree,
    loaded,
    refresh,
    ensure,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    createNote,
    updateNote,
    setNoteTitle,
  }
}
