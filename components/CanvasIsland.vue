<script setup lang="ts">
import { useTemplateRef } from 'vue'

// Manual React-island bridge for Excalidraw (same approach as EditorIsland; no
// Veaury). React deps + Excalidraw imported dynamically in onMounted so SSR never
// loads them. Render under <ClientOnly>.
const props = defineProps<{ initialScene?: unknown; viewMode?: boolean }>()
const emit = defineEmits<{ change: [scene: unknown] }>()

const host = useTemplateRef<HTMLElement>('host')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let root: any

onMounted(async () => {
  const [{ createElement }, { createRoot }, mod] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('~/editor/Canvas'),
  ])
  if (!host.value) return
  root = createRoot(host.value)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Canvas = mod.default as any
  root.render(
    createElement(Canvas, {
      initialScene: props.initialScene,
      viewMode: props.viewMode ?? false,
      onChange: (scene: unknown) => emit('change', scene),
    }),
  )
})

onBeforeUnmount(() => {
  root?.unmount()
  root = undefined
})
</script>

<template>
  <div ref="host" class="h-full w-full"></div>
</template>
