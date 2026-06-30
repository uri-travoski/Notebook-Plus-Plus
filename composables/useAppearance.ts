// Curated, self-hosted font choices (no CDN). Keys are stored in users.preferences
// (bodyFont / monoFont); the stacks below are applied to --font-sans / --font-mono at runtime.
export const BODY_FONTS = {
  inter: { label: 'Inter', stack: "'Inter Variable', ui-sans-serif, system-ui, sans-serif" },
  lora: { label: 'Lora (serif)', stack: "'Lora Variable', Georgia, 'Times New Roman', serif" },
  system: {
    label: 'System',
    stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
} as const

export const MONO_FONTS = {
  jetbrains: {
    label: 'JetBrains Mono',
    stack: "'JetBrains Mono Variable', ui-monospace, Menlo, Consolas, monospace",
  },
  fira: {
    label: 'Fira Code',
    stack: "'Fira Code Variable', ui-monospace, Menlo, Consolas, monospace",
  },
  system: {
    label: 'System Mono',
    stack: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
} as const

export type BodyFont = keyof typeof BODY_FONTS
export type MonoFont = keyof typeof MONO_FONTS
export type ThemePref = 'light' | 'dark' | 'system'

export function applyTheme(theme: ThemePref) {
  if (typeof document === 'undefined') return
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

// Apply the user's appearance preferences to the document (CSS vars + theme class).
export function applyAppearance(prefs: Record<string, unknown>) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const body = (prefs.bodyFont as BodyFont) in BODY_FONTS ? (prefs.bodyFont as BodyFont) : 'inter'
  const mono =
    (prefs.monoFont as MonoFont) in MONO_FONTS ? (prefs.monoFont as MonoFont) : 'jetbrains'
  root.style.setProperty('--font-sans', BODY_FONTS[body].stack)
  root.style.setProperty('--font-mono', MONO_FONTS[mono].stack)
  applyTheme((prefs.theme as ThemePref) || 'system')
}
