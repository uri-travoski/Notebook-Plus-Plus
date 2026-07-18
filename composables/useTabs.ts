import type { TreeNote } from './useTree'

export type Tab = {
  id: string
  title: string
  type: 'page' | 'canvas'
}

export function useTabs() {
  const tabs = useState<Tab[]>('tabs', () => [])
  const route = useRoute()
  const { tree } = useTree()

  const activeId = computed(() => {
    const m = route.path.match(/^\/doc\/([^/]+)/)
    return m ? m[1] : null
  })

  // Resolve a doc's title + type from the tree.
  function findInTree(id: string): TreeNote | undefined {
    return (tree.value?.notebooks ?? [])
      .flatMap((nb) => nb.notes)
      .find((n) => n.id === id)
  }

  // Route watcher: when navigating to /doc/:id, ensure a tab exists.
  watch(
    () => route.path,
    (path) => {
      const m = path.match(/^\/doc\/([^/]+)/)
      if (!m) return
      const id = m[1]
      const existing = tabs.value.find((t) => t.id === id)
      if (existing) return
      const note = findInTree(id)
      tabs.value = [
        ...tabs.value,
        { id, title: note?.title ?? 'Untitled', type: note?.type ?? 'page' },
      ]
    },
    { immediate: true },
  )

  // Sync tab titles when the tree updates (e.g. rename in the editor).
  watch(
    () => tree.value,
    (t) => {
      if (!t) return
      let changed = false
      const updated = tabs.value.map((tab) => {
        const note = findInTree(tab.id)
        if (note && note.title !== tab.title) {
          changed = true
          return { ...tab, title: note.title }
        }
        return tab
      })
      if (changed) tabs.value = updated
    },
  )

  // Auto-close tabs whose notes were deleted from the tree.
  watch(
    () => tree.value,
    (t) => {
      if (!t) return
      const ids = new Set(t.notebooks.flatMap((nb) => nb.notes.map((n) => n.id)))
      const filtered = tabs.value.filter((tab) => ids.has(tab.id))
      if (filtered.length !== tabs.value.length) {
        const removedActive = activeId.value && !ids.has(activeId.value)
        tabs.value = filtered
        if (removedActive) {
          const prev = filtered[filtered.length - 1]
          navigateTo(prev ? `/doc/${prev.id}` : '/')
        }
      }
    },
  )

  function openTab(id: string, title?: string, type?: 'page' | 'canvas') {
    const existing = tabs.value.find((t) => t.id === id)
    if (!existing) {
      const note = findInTree(id)
      tabs.value = [
        ...tabs.value,
        { id, title: title ?? note?.title ?? 'Untitled', type: type ?? note?.type ?? 'page' },
      ]
    }
    navigateTo(`/doc/${id}`)
  }

  async function closeTab(id: string) {
    const idx = tabs.value.findIndex((t) => t.id === id)
    if (idx < 0) return
    const wasActive = activeId.value === id
    const next = tabs.value.filter((t) => t.id !== id)
    tabs.value = next
    if (wasActive) {
      // Navigate to the previous tab (the one before the closed one), or the last tab, or home.
      const prevTab = next[Math.max(0, idx - 1)]
      await navigateTo(prevTab ? `/doc/${prevTab.id}` : '/')
    }
  }

  function closeAll() {
    tabs.value = []
    navigateTo('/')
  }

  function closeOthers(id: string) {
    tabs.value = tabs.value.filter((t) => t.id === id)
  }

  function reorderTabs(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return
    const arr = [...tabs.value]
    const [moved] = arr.splice(fromIdx, 1)
    arr.splice(toIdx, 0, moved)
    tabs.value = arr
  }

  function syncTitle(id: string, title: string) {
    const tab = tabs.value.find((t) => t.id === id)
    if (tab && tab.title !== title) {
      tabs.value = tabs.value.map((t) => (t.id === id ? { ...t, title } : t))
    }
  }

  return {
    tabs,
    activeId,
    openTab,
    closeTab,
    closeAll,
    closeOthers,
    reorderTabs,
    syncTitle,
  }
}
