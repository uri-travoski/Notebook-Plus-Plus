<script setup lang="ts">
import type { TreeNote } from '~/composables/useTree'

const props = defineProps<{ note: TreeNote }>()
const open = defineModel<boolean>('open', { default: false })
const { tree, updateNote } = useTree()
const { expand } = usePreferences()

const options = computed(() => {
  const out: { id: string; label: string }[] = []
  for (const p of tree.value?.projects ?? []) {
    for (const nb of p.notebooks) out.push({ id: nb.id, label: `${p.name} / ${nb.name}` })
  }
  return out
})

async function move(notebookId: string) {
  if (notebookId !== props.note.notebookId) {
    // Expand the target notebook + its project so the moved note is visible.
    for (const p of tree.value?.projects ?? []) {
      if (p.notebooks.some((nb) => nb.id === notebookId)) {
        expand(p.id)
        break
      }
    }
    expand(notebookId)
    await updateNote(props.note.id, { notebookId })
  }
  open.value = false
}
</script>

<template>
  <UiModal v-model:open="open">
    <h2 class="mb-1 text-base font-semibold text-heading">Move note</h2>
    <p class="mb-4 truncate text-sm text-text-muted">
      Choose a notebook for “{{ note.title || 'Untitled' }}”.
    </p>
    <ul v-if="options.length" class="max-h-72 space-y-1 overflow-y-auto">
      <li v-for="o in options" :key="o.id">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-row-hover"
          :class="o.id === note.notebookId ? 'text-text-muted' : 'text-text'"
          @click="move(o.id)"
        >
          <span class="truncate">{{ o.label }}</span>
          <span v-if="o.id === note.notebookId" class="shrink-0 text-xs text-text-muted"
            >current</span
          >
        </button>
      </li>
    </ul>
    <p v-else class="text-sm text-text-muted">No notebooks available. Create one first.</p>
  </UiModal>
</template>
