<script setup lang="ts">
import type { TreeNote } from '~/composables/useTree'

const props = defineProps<{ note: TreeNote }>()
const open = defineModel<boolean>('open', { default: false })
const { tree, moveNoteToNotebook } = useTree()
const { expand } = usePreferences()

const options = computed(() =>
  (tree.value?.notebooks ?? []).map((nb) => ({ id: nb.id, label: nb.name })),
)

async function move(notebookId: string) {
  if (notebookId !== props.note.notebookId) {
    // Expand the target notebook so the moved note is visible.
    expand(notebookId)
    await moveNoteToNotebook(props.note.id, notebookId)
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
