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

  return { prefs, loaded, refresh, ensure, patch, isCollapsed, toggleCollapse }
}
