<script setup lang="ts">
import { FileText, PenTool } from 'lucide-vue-next'

const { open, notebookId } = useNewDoc()
const { createNote } = useTree()
const { patch } = usePreferences()
const router = useRouter()
const busy = ref(false)

async function choose(type: 'page' | 'canvas') {
  if (!notebookId.value || busy.value) return
  busy.value = true
  try {
    patch({ defaultDocType: type }) // remember as a soft default
    const doc = await createNote(
      notebookId.value,
      type,
      type === 'canvas' ? 'Untitled canvas' : 'Untitled',
    )
    open.value = false
    await router.push(`/doc/${doc.id}`)
  } finally {
    busy.value = false
  }
}

const tiles = [
  { type: 'page' as const, icon: FileText, label: 'Page', hint: 'Write with the block editor.' },
  { type: 'canvas' as const, icon: PenTool, label: 'Canvas', hint: 'Sketch, diagram, mind-map.' },
]
</script>

<template>
  <UiModal v-model:open="open">
    <h2 class="mb-1 text-base font-semibold text-heading">New note</h2>
    <p class="mb-4 text-sm text-text-muted">Choose how you want to write.</p>
    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="t in tiles"
        :key="t.type"
        type="button"
        :disabled="busy"
        class="flex flex-col items-start gap-2 rounded-card border border-border p-4 text-left transition-colors hover:border-primary hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
        @click="choose(t.type)"
      >
        <component :is="t.icon" class="h-6 w-6 text-primary" />
        <span class="font-medium text-heading">{{ t.label }}</span>
        <span class="text-xs text-text-muted">{{ t.hint }}</span>
      </button>
    </div>
  </UiModal>
</template>
