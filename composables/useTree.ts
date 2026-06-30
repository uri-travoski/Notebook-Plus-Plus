export type TreeNote = {
  id: string
  title: string
  icon: string | null
  type: 'page' | 'canvas'
  notebookId: string | null
  parentDocumentId: string | null
  position: string
  isStarred: boolean
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

  return {
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
  }
}
