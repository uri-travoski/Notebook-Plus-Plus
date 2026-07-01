// Curated, self-hosted font choices (no CDN). Keys are stored in users.preferences
// (bodyFont / monoFont); the stacks below are applied to --font-sans / --font-mono at runtime.
export const BODY_FONTS = {
  noto: { label: 'Noto Sans', stack: "'Noto Sans Variable', ui-sans-serif, system-ui, sans-serif" },
  inter: { label: 'Inter', stack: "'Inter Variable', ui-sans-serif, system-ui, sans-serif" },
  ibmplexserif: { label: 'IBM Plex Serif', stack: "'IBM Plex Serif', Georgia, serif" },
  merriweather: { label: 'Merriweather', stack: "'Merriweather Variable', Georgia, serif" },
} as const

export const FONT_SIZE = { min: 10, max: 22, default: 14 }

export const MONO_FONTS = {
  googlecode: {
    label: 'Google Sans Code',
    stack: "'Google Sans Code Variable', ui-monospace, Menlo, Consolas, monospace",
  },
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
  const body = (prefs.bodyFont as BodyFont) in BODY_FONTS ? (prefs.bodyFont as BodyFont) : 'noto'
  const mono =
    (prefs.monoFont as MonoFont) in MONO_FONTS ? (prefs.monoFont as MonoFont) : 'jetbrains'
  root.style.setProperty('--font-sans', BODY_FONTS[body].stack)
  root.style.setProperty('--font-mono', MONO_FONTS[mono].stack)
  const size = Math.min(
    FONT_SIZE.max,
    Math.max(FONT_SIZE.min, Number(prefs.fontSize) || FONT_SIZE.default),
  )
  root.style.setProperty('--reading-font-size', `${size}px`)
  applyTheme((prefs.theme as ThemePref) || 'system')
}
