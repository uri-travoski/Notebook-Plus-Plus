// Apply the user's saved appearance (fonts + theme) as early as possible on the client,
// and keep 'system' theme in sync with the OS preference.
export default defineNuxtPlugin(async () => {
  const { loggedIn } = useUserSession()
  if (!loggedIn.value) return
  const { prefs, ensure } = usePreferences()
  try {
    await ensure()
  } catch {
    return
  }
  applyAppearance(prefs.value)
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', () => {
    if ((prefs.value.theme ?? 'system') === 'system') applyTheme('system')
  })
})
