type Prefs = Record<string, unknown> & { sidebarCollapsed?: string[] }

export function usePreferences() {
  const prefs = useState<Prefs>('prefs', () => ({}))
  const loaded = useState('prefs-loaded', () => false)

  async function refresh() {
    prefs.value = await $fetch<Prefs>('/api/me/preferences')
    loaded.value = true
  }
  async function ensure() {
    if (!loaded.value) await refresh()
  }
  async function patch(p: Record<string, unknown>) {
    prefs.value = await $fetch<Prefs>('/api/me/preferences', { method: 'PATCH', body: p })
  }

  function isCollapsed(id: string) {
    return (prefs.value.sidebarCollapsed ?? []).includes(id)
  }
  async function toggleCollapse(id: string) {
    const set = new Set<string>(prefs.value.sidebarCollapsed ?? [])
    if (set.has(id)) set.delete(id)
    else set.add(id)
    await patch({ sidebarCollapsed: [...set] })
  }
  // Ensure a project/notebook is expanded (used when a child is added/imported/moved
  // into it, so the new item is visible even under the collapsed-by-default sidebar).
  function expand(id: string) {
    const cur = prefs.value.sidebarCollapsed ?? []
    if (!cur.includes(id)) return
    const next = cur.filter((x) => x !== id)
    prefs.value = { ...prefs.value, sidebarCollapsed: next }
    patch({ sidebarCollapsed: next }).catch(() => {})
  }

  return { prefs, loaded, refresh, ensure, patch, isCollapsed, toggleCollapse, expand }
}
