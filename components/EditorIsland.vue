<script setup lang="ts">
import { useTemplateRef } from 'vue'

// Thin manual React-island bridge. Veaury 2.6.3 (the locked bridge) is incompatible
// with Vue 3.5 + React 19 — it leaks a Vue VNode into React children (React error #31).
// We mount the React component directly with createRoot. React deps are imported
// dynamically inside onMounted so SSR never loads react-dom; render under <ClientOnly>.
// editable defaults true via withDefaults: a bare boolean prop would otherwise
// coerce to false when absent, leaving the editor read-only.
const props = withDefaults(
  defineProps<{ initialContent?: unknown[]; editable?: boolean; documentId?: string }>(),
  { editable: true },
)
const emit = defineEmits<{ change: [doc: unknown[]] }>()

const host = useTemplateRef<HTMLElement>('host')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let root: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let createElementFn: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let EditorComp: any

// Track the app theme so BlockNote renders dark on a dark page (otherwise the editor
// stays a white card with unreadable light text in dark mode).
const dark = ref(false)
let observer: MutationObserver | undefined
function syncDark() {
  dark.value = document.documentElement.classList.contains('dark')
}

function render() {
  if (!root || !createElementFn || !EditorComp) return
  root.render(
    createElementFn(EditorComp, {
      initialContent: props.initialContent,
      editable: props.editable ?? true,
      documentId: props.documentId,
      theme: dark.value ? 'dark' : 'light',
      onChange: (doc: unknown[]) => emit('change', doc),
    }),
  )
}

onMounted(async () => {
  syncDark()
  observer = new MutationObserver(syncDark)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  const [{ createElement }, { createRoot }, mod] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('~/editor/Editor'),
  ])
  createElementFn = createElement
  EditorComp = mod.default
  if (!host.value) return
  root = createRoot(host.value)
  render()
})

watch([() => props.editable, dark], render)
onBeforeUnmount(() => {
  observer?.disconnect()
  root?.unmount()
  root = undefined
})
</script>

<template>
  <div ref="host"></div>
</template>
