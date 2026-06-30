import { createElement as h, useRef } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

// Inline Excalidraw drawing embedded in a page (§13). The scene is stored as a JSON string in
// the block's `scene` prop; the Vue shell persists the document on change.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseScene(scene: string): any {
  try {
    return scene ? JSON.parse(scene) : null
  } catch {
    return null
  }
}

export default function DrawingView({
  scene,
  editable,
  onChange,
}: {
  scene: string
  editable: boolean
  onChange: (json: string) => void
}) {
  const parsed = parseScene(scene)
  const initialData = {
    elements: parsed?.elements ?? [],
    appState: { viewBackgroundColor: parsed?.appState?.viewBackgroundColor ?? '#ffffff' },
    files: parsed?.files ?? {},
    scrollToContent: true,
  }
  const last = useRef(scene)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (elements: any, appState: any, files: any) => {
    if (!editable) return
    const json = JSON.stringify({
      elements,
      appState: { viewBackgroundColor: appState?.viewBackgroundColor },
      files,
    })
    if (json === last.current) return // skip no-op (Excalidraw fires onChange on mount)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      last.current = json
      onChange(json)
    }, 700)
  }

  return h(
    'div',
    { className: 'nb-drawing', contentEditable: false },
    h(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Excalidraw as any,
      {
        initialData,
        theme: dark ? 'dark' : 'light',
        viewModeEnabled: !editable,
        onChange: handleChange,
      },
    ),
  )
}
