import { createElement } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

type Scene = {
  elements?: unknown[]
  appState?: Record<string, unknown>
  files?: Record<string, unknown>
}
type Props = {
  initialScene?: Scene
  viewMode?: boolean
  theme?: 'light' | 'dark'
  onChange?: (scene: Scene) => void
}

// Full-page Excalidraw canvas. createElement only (no JSX). Client-only — this is
// why the island is SSR-off (Excalidraw cannot render on the server).
export default function Canvas({ initialScene, viewMode, theme = 'light', onChange }: Props) {
  const initialData = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    elements: (initialScene?.elements as any) ?? [],
    appState: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewBackgroundColor: (initialScene?.appState as any)?.viewBackgroundColor ?? '#ffffff',
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    files: (initialScene?.files as any) ?? {},
    scrollToContent: true,
  }

  return createElement(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Excalidraw as any,
    {
      initialData,
      theme,
      viewModeEnabled: !!viewMode,
      // Persist only durable scene data (appState is mostly transient view state;
      // its `collaborators` is a Map and not JSON-serialisable).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange: (elements: any, appState: any, files: any) => {
        onChange?.({
          elements,
          appState: { viewBackgroundColor: appState?.viewBackgroundColor },
          files,
        })
      },
    },
  )
}
